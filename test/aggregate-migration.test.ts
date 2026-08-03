import assert from "node:assert/strict";
import test from "node:test";
import { planAggregateManifestMigration } from "../src/aggregate-migration.js";

const manifest = `schema: 1
programs:
  sample_program:
    issues: [issue_alpha, issue_beta]
    gates: [design_gate]
issues:
  issue_beta:
    number: 102
    kind: task
    area: runtime
    depends_on: [issue_alpha]
  issue_alpha:
    number: 101
    kind: feature
    area: runtime
    priority: high
gates:
  design_gate:
    status: open
    blocks: [issue_beta]
`;
const mapping = `schema: 1
fields:
  kind:
    source: issue.kind
    target: work_type
    values: {feature: feature, task: task}
  area:
    source: issue.area
    target: area
    values: {runtime: runtime}
  priority:
    source: issue.priority
    target: priority
    values: {high: P1}
relationships:
  depends_on: blocked_by
unsupported: report
`;

test("produces deterministic issue-number ordered inert candidates", () => {
  const first = planAggregateManifestMigration(manifest, mapping);
  const second = planAggregateManifestMigration(manifest, mapping);
  assert.deepEqual(first, second);
  assert.equal(first.complete, true);
  assert.deepEqual(first.candidates.map((item) => item.issueNumber), [101, 102]);
  assert.match(first.candidates[0]!.contract!, /work_type: feature/);
  assert.match(first.candidates[1]!.contract!, /blocked_by: \[101\]/);
  assert.match(first.outputDigest!, /^[0-9a-f]{64}$/u);
  assert.doesNotMatch(JSON.stringify(first), /apply|credential|https?:/iu);
});

test("does not turn a gate into readiness or a relationship", () => {
  const result = planAggregateManifestMigration(manifest, mapping);
  assert.doesNotMatch(result.candidates[1]!.contract!, /status|ready|design_gate/iu);
  assert.ok(result.candidates[1]!.observations.some((item) => item.disposition === "preserved"));
});

test("suppresses all candidate text when the graph is invalid", () => {
  const invalid = manifest.replace("depends_on: [issue_alpha]", "depends_on: [issue_beta]");
  const result = planAggregateManifestMigration(invalid, mapping);
  assert.equal(result.complete, false);
  assert.deepEqual(result.candidates, []);
  assert.ok(result.diagnostics.some((item) => item.code === "YKP-MIG-GRAPH-002"));
});

test("rejects dependency cycles and missing endpoints atomically", () => {
  const cycle = manifest.replace("priority: high", "priority: high\n    depends_on: [issue_beta]");
  assert.ok(planAggregateManifestMigration(cycle, mapping).diagnostics.some((item) => item.code === "YKP-MIG-GRAPH-003"));
  const missing = manifest.replace("depends_on: [issue_alpha]", "depends_on: [issue_gamma]");
  assert.ok(planAggregateManifestMigration(missing, mapping).diagnostics.some((item) => item.code === "YKP-MIG-GRAPH-001"));
});

test("requires explicit mappings for required contract fields", () => {
  const missingArea = mapping.replace(/  area:\n(?:    .*\n){3}/u, "");
  const result = planAggregateManifestMigration(manifest, missingArea);
  assert.equal(result.complete, false);
  assert.deepEqual(result.candidates, []);
  assert.ok(result.diagnostics.some((item) => item.code === "YKP-MIG-MAP-001"));
});

test("rejects reversed relationships and forbidden YAML features", () => {
  const reversed = mapping.replace("depends_on: blocked_by", "depends_on: blocks");
  assert.ok(planAggregateManifestMigration(manifest, reversed).diagnostics.some((item) => item.code === "YKP-MIG-MAP-002"));
  const aliased = manifest.replace("issues: [issue_alpha, issue_beta]", "issues: &items [issue_alpha, issue_beta]").replace("blocks: [issue_beta]", "blocks: *items");
  assert.ok(planAggregateManifestMigration(aliased, mapping).diagnostics.some((item) => item.code === "YKP-MIG-DOC-001"));
});

test("redacts source values and logical keys from diagnostics", () => {
  const secretLike = manifest.replaceAll("area: runtime", "area: private_consumer_name");
  const result = planAggregateManifestMigration(secretLike, mapping);
  assert.equal(result.candidates[0]!.disposition, "non_emittable");
  assert.doesNotMatch(JSON.stringify(result.diagnostics), /private_consumer_name|issue_alpha|issue_beta/u);
});

test("reports or rejects explicitly unsupported source information", () => {
  const reportMapping = mapping.replace(/  priority:\n(?:    .*\n){3}/u, "");
  const reported = planAggregateManifestMigration(manifest, reportMapping);
  assert.equal(reported.complete, true);
  assert.ok(reported.candidates[0]!.observations.some((item) => item.disposition === "unsupported"));
  const rejected = planAggregateManifestMigration(manifest, reportMapping.replace("unsupported: report", "unsupported: reject"));
  assert.equal(rejected.candidates[0]!.disposition, "non_emittable");
  assert.equal(rejected.candidates[0]!.contract, null);
});

test("fails closed on duplicate issue numbers and unknown fields", () => {
  const duplicate = manifest.replace("number: 102", "number: 101");
  assert.ok(planAggregateManifestMigration(duplicate, mapping).diagnostics.some((item) => item.code === "YKP-MIG-GRAPH-002"));
  const extra = manifest.replace("priority: high", "priority: high\n    owner: operator");
  assert.ok(planAggregateManifestMigration(extra, mapping).diagnostics.some((item) => item.code === "YKP-MIG-DOC-003"));
});

test("requires explicit value maps for enumerated targets", () => {
  const implicit = mapping.replace("    values: {runtime: runtime}\n", "");
  const result = planAggregateManifestMigration(manifest, implicit);
  assert.equal(result.complete, false);
  assert.ok(result.diagnostics.some((item) => item.code === "YKP-MIG-MAP-001"));
});

test("rejects duplicate keys and multiple YAML documents", () => {
  const duplicate = manifest.replace("schema: 1", "schema: 1\nschema: 1");
  assert.ok(planAggregateManifestMigration(duplicate, mapping).diagnostics.some((item) => item.code === "YKP-MIG-DOC-001"));
  const multiple = `${manifest}\n---\nschema: 1\n`;
  assert.ok(planAggregateManifestMigration(multiple, mapping).diagnostics.some((item) => item.code === "YKP-MIG-DOC-001"));
});

test("redacts logical and unknown keys from diagnostic paths", () => {
  const invalid = manifest.replace("priority: high", "private_field: private_value");
  const result = planAggregateManifestMigration(invalid, mapping);
  assert.doesNotMatch(JSON.stringify(result.diagnostics), /issue_alpha|private_field|private_value/u);
  assert.match(JSON.stringify(result.diagnostics), /issues\[\*\]/u);
});
