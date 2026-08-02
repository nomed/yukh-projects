import assert from "node:assert/strict";
import test from "node:test";
import { calculateEffectiveSchema, canonicalJson, planReconciliation, renderPublicReport, type IssueContract, type ObservedSchema, type PlanningInput, type RepositoryPolicy } from "../src/index.js";

const policy: RepositoryPolicy = { schema: 1, fields: {
  area: { name: "Area", kind: "single_select", mode: "managed", options: { runtime: "Runtime" } },
  work_type: { name: "Work type", kind: "single_select", mode: "managed", options: { feature: "Feature" } },
  priority: { name: "Priority", kind: "single_select", mode: "managed", options: { p1: "P1" } },
  estimate: { name: "Estimate", kind: "number", mode: "managed" },
  iteration: { name: "Iteration", kind: "iteration", mode: "managed" }
} };
const contract: IssueContract = { schema: 1, work_type: "feature", area: "runtime", priority: "p1", estimate: 3, iteration: "Cycle 1", relationships: { parent: 2, blocks: [3] } };
const observedSchema: ObservedSchema = { fields: [
  { providerId: "field-area", name: "Area", kind: "single_select", options: [{ providerId: "option-runtime", name: "Runtime" }] },
  { providerId: "field-work-type", name: "Work type", kind: "single_select", options: [{ providerId: "option-feature", name: "Feature" }] },
  { providerId: "field-priority", name: "Priority", kind: "single_select", options: [] },
  { providerId: "field-estimate", name: "Estimate", kind: "number" },
  { providerId: "field-iteration", name: "Iteration", kind: "iteration" }
] };

function input(overrides: Partial<PlanningInput> = {}): PlanningInput {
  return {
    scope: { subjectRef: "subject-private", repositoryRef: "repository-private", projectRef: "project-private", issueRef: "issue-private", issueNumber: 1 },
    contract,
    policy,
    schema: calculateEffectiveSchema(policy, observedSchema),
    observedItem: { values: { area: null, work_type: "Feature", priority: null, estimate: 2, iteration: "Cycle 1" }, fingerprint: "fingerprint-private" },
    relationships: { nodes: [1, 2, 3], parent: [], blocks: [] },
    ...overrides
  };
}

test("creates a deterministic executable plan with exact preconditions", () => {
  const first = planReconciliation(input());
  const second = planReconciliation(input());
  assert.equal(first.executable, true);
  assert.equal(first.planId, second.planId);
  assert.equal(canonicalJson(first), canonicalJson(second));
  const setArea = first.operations.find((operation) => operation.operationKey === "item.field.area.set");
  assert.deepEqual(setArea?.preconditions, [
    { kind: "item_fingerprint", logicalKey: "item", expected: "fingerprint-private" },
    { kind: "old_value", logicalKey: "area", expected: null }
  ]);
  assert.ok(first.operations.every((operation) => operation.environment === "dry-run"));
});

test("orders schema, value, parent, and dependency phases", () => {
  const plan = planReconciliation(input());
  const types = plan.operations.map((operation) => operation.type);
  assert.ok(types.indexOf("add_option") < types.indexOf("set_field_value"));
  assert.ok(types.indexOf("set_field_value") < types.indexOf("set_parent"));
  assert.ok(types.indexOf("set_parent") < types.indexOf("add_dependency"));
  const priority = plan.operations.find((operation) => operation.operationKey === "item.field.priority.set");
  assert.deepEqual(priority?.dependsOn, ["schema.field.priority.option.p1.add"]);
});

test("records identical values and existing relationships as preserves", () => {
  const plan = planReconciliation(input({
    observedItem: { values: { area: "Runtime", work_type: "Feature", priority: "P1", estimate: 3, iteration: "Cycle 1" }, fingerprint: "same" },
    relationships: { nodes: [1, 2, 3], parent: [{ from: 1, to: 2 }], blocks: [{ from: 1, to: 3 }] }
  }));
  assert.equal(plan.executable, true);
  assert.equal(plan.operations.filter((operation) => operation.type === "set_field_value").length, 0);
  assert.ok(plan.observations.some((item) => item.type === "preserve_parent"));
  assert.ok(plan.observations.some((item) => item.type === "preserve_dependency"));
});

test("fails closed for a non-executable schema and missing policy binding", () => {
  const blocked = planReconciliation(input({ schema: { executable: false, diagnostics: [], observations: [], operations: [] } }));
  assert.equal(blocked.executable, false);
  assert.equal(blocked.diagnostics[0]?.code, "YKP-PLAN-002");

  const reduced: RepositoryPolicy = { schema: 1, fields: { area: policy.fields.area! } };
  const missing = planReconciliation(input({ policy: reduced }));
  assert.equal(missing.executable, false);
  assert.ok(missing.diagnostics.some((item) => item.code === "YKP-PLAN-003"));
});

test("fails closed for invalid scope and observed values", () => {
  const badScope = planReconciliation(input({ scope: { ...input().scope, subjectRef: "" } }));
  assert.equal(badScope.executable, false);
  assert.equal(badScope.diagnostics[0]?.code, "YKP-PLAN-001");

  const badValue = planReconciliation(input({ observedItem: { values: { area: Number.NaN }, fingerprint: "fingerprint" } }));
  assert.equal(badValue.executable, false);
  assert.ok(badValue.diagnostics.some((item) => item.code === "YKP-PLAN-006"));
});

test("rejects unknown endpoints, duplicate edges, and parent cardinality", () => {
  const graph = { nodes: [1, 2, 3], parent: [{ from: 1, to: 2 }, { from: 1, to: 3 }], blocks: [{ from: 2, to: 4 }, { from: 2, to: 4 }] };
  const plan = planReconciliation(input({ relationships: graph }));
  assert.equal(plan.executable, false);
  assert.ok(plan.diagnostics.some((item) => item.code === "YKP-GRAPH-002"));
  assert.ok(plan.diagnostics.some((item) => item.code === "YKP-GRAPH-003"));
});

test("rejects parent and dependency cycles introduced by desired edges", () => {
  const parentCycle = planReconciliation(input({ relationships: { nodes: [1, 2, 3], parent: [{ from: 2, to: 1 }], blocks: [] } }));
  assert.ok(parentCycle.diagnostics.some((item) => item.code === "YKP-GRAPH-004"));
  const dependencyCycle = planReconciliation(input({ relationships: { nodes: [1, 2, 3], parent: [], blocks: [{ from: 3, to: 1 }] } }));
  assert.ok(dependencyCycle.diagnostics.some((item) => item.code === "YKP-GRAPH-005"));
});

test("rejects contradictory dependency declarations", () => {
  const contradictory: IssueContract = { ...contract, relationships: { blocks: [2], blocked_by: [2] } };
  const plan = planReconciliation(input({ contract: contradictory }));
  assert.equal(plan.executable, false);
  assert.ok(plan.diagnostics.some((item) => item.code === "YKP-GRAPH-006"));
});

test("public report excludes opaque references and internal preconditions", () => {
  const plan = planReconciliation(input());
  const report = renderPublicReport(plan);
  const serialized = canonicalJson(report);
  for (const secret of ["subject-private", "repository-private", "project-private", "issue-private", "fingerprint-private", "field-area", "option-runtime"]) assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes("preconditions"), false);
  assert.equal(report.planId, plan.planId);
});

test("plan operations expose no execution callback or client", () => {
  const serialized = canonicalJson(planReconciliation(input()));
  for (const forbidden of ["token", "credential", "client", "execute", "apply", "mutation", "url"]) assert.equal(serialized.toLowerCase().includes(forbidden), false);
});
