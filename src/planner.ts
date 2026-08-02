import { createHash } from "node:crypto";
import type { IssueContract } from "./index.js";
import type { EffectiveSchemaResult, FieldKind, RepositoryPolicy, SchemaOperation } from "./policy.js";

export type PlanDiagnosticCode =
  | "YKP-PLAN-001" | "YKP-PLAN-002" | "YKP-PLAN-003" | "YKP-PLAN-004"
  | "YKP-PLAN-005" | "YKP-PLAN-006" | "YKP-PLAN-007" | "YKP-GRAPH-001"
  | "YKP-GRAPH-002" | "YKP-GRAPH-003" | "YKP-GRAPH-004" | "YKP-GRAPH-005"
  | "YKP-GRAPH-006" | "YKP-REPORT-001";

export interface PlanDiagnostic { code: PlanDiagnosticCode; path: string; severity: "error"; message: string }
interface InternalDiagnostic extends PlanDiagnostic { offset: number }

const MESSAGES: Record<PlanDiagnosticCode, string> = {
  "YKP-PLAN-001": "input boundary is invalid",
  "YKP-PLAN-002": "effective schema is not executable",
  "YKP-PLAN-003": "required managed field binding is missing",
  "YKP-PLAN-004": "policy field is incompatible with contract value",
  "YKP-PLAN-005": "policy vocabulary value cannot be resolved",
  "YKP-PLAN-006": "observed value is invalid",
  "YKP-PLAN-007": "operation dependency is invalid or cyclic",
  "YKP-GRAPH-001": "relationship graph limit is exceeded",
  "YKP-GRAPH-002": "relationship edge is invalid",
  "YKP-GRAPH-003": "parent cardinality conflicts",
  "YKP-GRAPH-004": "parent cycle is detected",
  "YKP-GRAPH-005": "dependency cycle is detected",
  "YKP-GRAPH-006": "relationship declaration is contradictory",
  "YKP-REPORT-001": "value cannot be safely rendered"
};

export interface BoundScope {
  subjectRef: string;
  repositoryRef: string;
  projectRef: string;
  issueRef: string;
  issueNumber: number;
}
export type ObservedValue = string | number | null;
export interface ObservedItem { values: Readonly<Record<string, ObservedValue>>; fingerprint: string }
export interface RelationshipEdge { from: number; to: number }
export interface ObservedRelationshipGraph { nodes: readonly number[]; parent: readonly RelationshipEdge[]; blocks: readonly RelationshipEdge[] }
export interface PlanningInput {
  scope: BoundScope;
  contract: IssueContract;
  policy: RepositoryPolicy;
  schema: EffectiveSchemaResult;
  observedItem: ObservedItem;
  relationships: ObservedRelationshipGraph;
}

export interface Precondition { kind: string; logicalKey: string; expected: unknown }
export interface PlannedOperation {
  operationKey: string;
  type: "create_field" | "add_option" | "set_field_value" | "set_parent" | "add_dependency";
  subject: { ref: string };
  resource: { kind: string; logicalKey: string; scopeRef: string; providerRef?: string };
  action: "create" | "add" | "set";
  environment: "dry-run";
  reason: string;
  preconditions: readonly Precondition[];
  dependsOn: readonly string[];
  desired?: string | number | null;
}
export interface PlanObservation { type: "preserve_field_value" | "preserve_parent" | "preserve_dependency"; logicalKey: string; displayValue: string | number }
export interface ReconciliationPlan {
  schema: 1;
  planId: string;
  executable: boolean;
  diagnostics: readonly PlanDiagnostic[];
  observations: readonly PlanObservation[];
  operations: readonly PlannedOperation[];
}

function add(target: InternalDiagnostic[], code: PlanDiagnosticCode, path: string): void {
  target.push({ code, path, severity: "error", message: MESSAGES[code], offset: Number.MAX_SAFE_INTEGER });
}
function diagnostics(source: InternalDiagnostic[]): PlanDiagnostic[] {
  const seen = new Set<string>();
  return source.sort((a, b) => compareText(a.code, b.code) || compareText(a.path, b.path)).filter((item) => {
    const key = `${item.code}\0${item.path}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).map(({ offset: _offset, ...item }) => item);
}
function boundedRef(value: unknown): value is string {
  return typeof value === "string" && [...value].length > 0 && [...value].length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value);
}
function safeString(value: unknown, max = 512): value is string {
  return typeof value === "string" && [...value].length <= max && !/[\u0000-\u001f\u007f]/u.test(value);
}
function compareText(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => compareText(a, b)).map(([key, item]) => [key, canonicalValue(item)]));
  if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("non-finite canonical number");
  return value;
}
export function canonicalJson(value: unknown): string { return JSON.stringify(canonicalValue(value)); }
function planId(plan: Omit<ReconciliationPlan, "planId">): string { return createHash("sha256").update(canonicalJson(plan), "utf8").digest("hex"); }
function opKey(...parts: (string | number)[]): string { return parts.join("."); }

const FIELD_MAP: readonly { source: (contract: IssueContract) => unknown; fieldKey: string; kind: FieldKind; path: string }[] = [
  { source: (c) => c.work_type, fieldKey: "work_type", kind: "single_select", path: "$.contract.work_type" },
  { source: (c) => c.area, fieldKey: "area", kind: "single_select", path: "$.contract.area" },
  { source: (c) => c.priority, fieldKey: "priority", kind: "single_select", path: "$.contract.priority" },
  { source: (c) => c.size, fieldKey: "size", kind: "single_select", path: "$.contract.size" },
  { source: (c) => c.estimate, fieldKey: "estimate", kind: "number", path: "$.contract.estimate" },
  { source: (c) => c.iteration, fieldKey: "iteration", kind: "iteration", path: "$.contract.iteration" },
  { source: (c) => c.project?.status, fieldKey: "status", kind: "single_select", path: "$.contract.project.status" },
  { source: (c) => c.project?.start_date, fieldKey: "start_date", kind: "date", path: "$.contract.project.start_date" },
  { source: (c) => c.project?.target_date, fieldKey: "target_date", kind: "date", path: "$.contract.project.target_date" }
];

function operationFromSchema(operation: SchemaOperation, scope: BoundScope): PlannedOperation | null {
  if (operation.type === "create_field") return {
    operationKey: opKey("schema", "field", operation.fieldKey, "create"), type: "create_field",
    subject: { ref: scope.subjectRef }, resource: { kind: "project_field", logicalKey: operation.fieldKey, scopeRef: scope.projectRef },
    action: "create", environment: "dry-run", reason: "schema.field.missing",
    preconditions: [{ kind: "field_absent", logicalKey: operation.fieldKey, expected: true }], dependsOn: []
  };
  if (operation.type === "add_option") return {
    operationKey: opKey("schema", "field", operation.fieldKey, "option", operation.optionKey, "add"), type: "add_option",
    subject: { ref: scope.subjectRef }, resource: { kind: "project_option", logicalKey: `${operation.fieldKey}.${operation.optionKey}`, scopeRef: scope.projectRef, providerRef: operation.fieldProviderId },
    action: "add", environment: "dry-run", reason: "schema.option.missing",
    preconditions: [{ kind: "option_absent", logicalKey: operation.optionKey, expected: true }], dependsOn: []
  };
  return null;
}
function hasCycle(nodes: readonly number[], edges: readonly RelationshipEdge[]): boolean {
  const adjacent = new Map<number, number[]>();
  nodes.forEach((node) => adjacent.set(node, []));
  edges.forEach((edge) => adjacent.get(edge.from)?.push(edge.to));
  const visiting = new Set<number>(); const visited = new Set<number>();
  const visit = (node: number): boolean => {
    if (visiting.has(node)) return true; if (visited.has(node)) return false;
    visiting.add(node); for (const next of adjacent.get(node) ?? []) if (visit(next)) return true;
    visiting.delete(node); visited.add(node); return false;
  };
  return nodes.some(visit);
}
function edgeKey(edge: RelationshipEdge): string { return `${edge.from}->${edge.to}`; }
function validateGraph(graph: ObservedRelationshipGraph, internal: InternalDiagnostic[]): void {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.parent) || !Array.isArray(graph.blocks) || graph.nodes.length > 512 || graph.parent.length > 511 || graph.blocks.length > 4096) { add(internal, "YKP-GRAPH-001", "$.relationships"); return; }
  const nodes = new Set<number>();
  graph.nodes.forEach((node, index) => { if (!Number.isSafeInteger(node) || node <= 0 || nodes.has(node)) add(internal, "YKP-GRAPH-002", `$.relationships.nodes[${index}]`); else nodes.add(node); });
  const validate = (edges: readonly RelationshipEdge[], name: "parent" | "blocks") => {
    const seen = new Set<string>(); const parents = new Set<number>();
    edges.forEach((edge, index) => {
      const path = `$.relationships.${name}[${index}]`; const key = edgeKey(edge);
      if (!nodes.has(edge.from) || !nodes.has(edge.to) || edge.from === edge.to || seen.has(key)) add(internal, "YKP-GRAPH-002", path);
      else seen.add(key);
      if (name === "parent" && parents.has(edge.from)) add(internal, "YKP-GRAPH-003", path); else if (name === "parent") parents.add(edge.from);
    });
  };
  validate(graph.parent, "parent"); validate(graph.blocks, "blocks");
  if (internal.length === 0 && hasCycle(graph.nodes, graph.parent)) add(internal, "YKP-GRAPH-004", "$.relationships.parent");
  if (internal.length === 0 && hasCycle(graph.nodes, graph.blocks)) add(internal, "YKP-GRAPH-005", "$.relationships.blocks");
}

export function planReconciliation(input: PlanningInput): ReconciliationPlan {
  const internal: InternalDiagnostic[] = []; const operations: PlannedOperation[] = []; const observations: PlanObservation[] = [];
  const scope = input?.scope;
  if (!scope || !boundedRef(scope.subjectRef) || !boundedRef(scope.repositoryRef) || !boundedRef(scope.projectRef) || !boundedRef(scope.issueRef) || !Number.isSafeInteger(scope.issueNumber) || scope.issueNumber <= 0) add(internal, "YKP-PLAN-001", "$.scope");
  if (!input?.schema?.executable || input.schema.diagnostics.length > 0) add(internal, "YKP-PLAN-002", "$.schema");
  const observed = input?.observedItem;
  if (!observed || !boundedRef(observed.fingerprint) || !observed.values || Object.keys(observed.values).length > 64) add(internal, "YKP-PLAN-001", "$.observedItem");
  else for (const [key, value] of Object.entries(observed.values)) if (!/^[a-z][a-z0-9_]{0,63}$/u.test(key) || !((typeof value === "number" && Number.isFinite(value)) || value === null || safeString(value))) add(internal, "YKP-PLAN-006", `$.observedItem.values.${key}`);
  validateGraph(input.relationships, internal);
  if (scope && input.relationships && !input.relationships.nodes.includes(scope.issueNumber)) add(internal, "YKP-GRAPH-002", "1relationships.nodes");
  if (internal.length > 0) return finishPlan(internal, operations, observations);

  input.schema.operations.map((operation) => operationFromSchema(operation, scope)).filter((operation): operation is PlannedOperation => operation !== null).forEach((operation) => operations.push(operation));
  for (const mapping of FIELD_MAP) {
    const raw = mapping.source(input.contract); if (raw === undefined) continue;
    const declaration = input.policy.fields[mapping.fieldKey];
    if (!declaration) { add(internal, "YKP-PLAN-003", `$.policy.fields.${mapping.fieldKey}`); continue; }
    if (declaration.mode !== "managed" || declaration.kind !== mapping.kind) { add(internal, "YKP-PLAN-004", `$.policy.fields.${mapping.fieldKey}`); continue; }
    let desired: string | number;
    let optionKey: string | undefined;
    if (mapping.kind === "single_select") {
      if (typeof raw !== "string" || !declaration.options?.[raw]) { add(internal, "YKP-PLAN-005", mapping.path); continue; }
      optionKey = raw; desired = declaration.options[raw];
    } else {
      if (!((typeof raw === "number" && Number.isFinite(raw)) || safeString(raw))) { add(internal, "YKP-PLAN-006", mapping.path); continue; }
      desired = raw as string | number;
    }
    const previous = input.observedItem.values[mapping.fieldKey] ?? null;
    if (previous === desired) { observations.push({ type: "preserve_field_value", logicalKey: mapping.fieldKey, displayValue: desired }); continue; }
    const fieldCreate = opKey("schema", "field", mapping.fieldKey, "create");
    const optionAdd = optionKey ? opKey("schema", "field", mapping.fieldKey, "option", optionKey, "add") : undefined;
    const dependencies = operations.filter((operation) => operation.operationKey === fieldCreate || operation.operationKey === optionAdd).map((operation) => operation.operationKey).sort();
    operations.push({
      operationKey: opKey("item", "field", mapping.fieldKey, "set"), type: "set_field_value",
      subject: { ref: scope.subjectRef }, resource: { kind: "project_item_field", logicalKey: mapping.fieldKey, scopeRef: scope.projectRef },
      action: "set", environment: "dry-run", reason: "item.value.differs",
      preconditions: [{ kind: "item_fingerprint", logicalKey: "item", expected: input.observedItem.fingerprint }, { kind: "old_value", logicalKey: mapping.fieldKey, expected: previous }],
      dependsOn: dependencies, desired
    });
  }

  const current = scope.issueNumber; const nodes = new Set(input.relationships.nodes);
  const desiredBlocks = new Set(input.contract.relationships?.blocks ?? []); const desiredBlockedBy = new Set(input.contract.relationships?.blocked_by ?? []);
  for (const issue of desiredBlocks) if (desiredBlockedBy.has(issue)) add(internal, "YKP-GRAPH-006", "$.contract.relationships");
  const parent = input.contract.relationships?.parent;
  const proposedParent = [...input.relationships.parent];
  if (parent !== undefined) {
    if (!nodes.has(parent) || !nodes.has(current)) add(internal, "YKP-GRAPH-002", "$.contract.relationships.parent");
    else {
      const existing = input.relationships.parent.find((edge) => edge.from === current);
      if (existing?.to === parent) observations.push({ type: "preserve_parent", logicalKey: "parent", displayValue: parent });
      else if (existing) add(internal, "YKP-GRAPH-003", "$.contract.relationships.parent");
      else { proposedParent.push({ from: current, to: parent }); operations.push({ operationKey: opKey("relationship", "parent", parent, "set"), type: "set_parent", subject: { ref: scope.subjectRef }, resource: { kind: "issue_parent", logicalKey: "parent", scopeRef: scope.repositoryRef }, action: "set", environment: "dry-run", reason: "relationship.parent.missing", preconditions: [{ kind: "parent_absent", logicalKey: "parent", expected: true }], dependsOn: [], desired: parent }); }
    }
  }
  const proposedBlocks = [...input.relationships.blocks];
  const desiredEdges: RelationshipEdge[] = [...desiredBlocks].map((to) => ({ from: current, to }));
  desiredBlockedBy.forEach((from) => desiredEdges.push({ from, to: current }));
  if (desiredEdges.length + (parent === undefined ? 0 : 1) > 100) add(internal, "YKP-GRAPH-001", "1contract.relationships");
  desiredEdges.sort((a, b) => a.from - b.from || a.to - b.to).forEach((edge) => {
    const path = "1contract.relationships";
    if (!nodes.has(edge.from) || !nodes.has(edge.to) || edge.from === edge.to) { add(internal, "YKP-GRAPH-002", path); return; }
    if (input.relationships.blocks.some((existing) => edgeKey(existing) === edgeKey(edge))) observations.push({ type: "preserve_dependency", logicalKey: edgeKey(edge), displayValue: edge.to });
    else { proposedBlocks.push(edge); operations.push({ operationKey: opKey("relationship", "dependency", edge.from, edge.to, "add"), type: "add_dependency", subject: { ref: scope.subjectRef }, resource: { kind: "issue_dependency", logicalKey: edgeKey(edge), scopeRef: scope.repositoryRef }, action: "add", environment: "dry-run", reason: "relationship.dependency.missing", preconditions: [{ kind: "dependency_absent", logicalKey: edgeKey(edge), expected: true }], dependsOn: [], desired: edge.to }); }
  });
  if (hasCycle(input.relationships.nodes, proposedParent)) add(internal, "YKP-GRAPH-004", "$.contract.relationships.parent");
  if (hasCycle(input.relationships.nodes, proposedBlocks)) add(internal, "YKP-GRAPH-005", "$.contract.relationships.blocks");
  return finishPlan(internal, operations, observations);
}

const PHASE: Record<PlannedOperation["type"], number> = { create_field: 0, add_option: 1, set_field_value: 2, set_parent: 3, add_dependency: 4 };
function finishPlan(internal: InternalDiagnostic[], operations: PlannedOperation[], observations: PlanObservation[]): ReconciliationPlan {
  operations.sort((a, b) => PHASE[a.type] - PHASE[b.type] || compareText(a.resource.logicalKey, b.resource.logicalKey) || compareText(a.operationKey, b.operationKey));
  observations.sort((a, b) => compareText(a.type, b.type) || compareText(a.logicalKey, b.logicalKey));
  const found = diagnostics(internal);
  const base: Omit<ReconciliationPlan, "planId"> = { schema: 1, executable: found.length === 0, diagnostics: found, observations, operations };
  return { ...base, planId: planId(base) };
}

export interface PublicOperation { type: PlannedOperation["type"]; logicalKey: string; desired?: string | number | null; reason: string; dependsOn: readonly string[] }
export interface PublicReport { schema: 1; planId: string; executable: boolean; counts: { diagnostics: number; observations: number; operations: number }; diagnostics: readonly PlanDiagnostic[]; observations: readonly PlanObservation[]; operations: readonly PublicOperation[] }
export function renderPublicReport(plan: ReconciliationPlan): PublicReport {
  const reportOperations = plan.operations.map((operation) => {
    const relationship = operation.type === "set_parent" || operation.type === "add_dependency";
    return { type: operation.type, logicalKey: relationship ? (operation.type === "set_parent" ? "parent" : "dependency") : operation.resource.logicalKey, ...(!relationship && operation.desired !== undefined ? { desired: operation.desired } : {}), reason: operation.reason, dependsOn: [...operation.dependsOn] };
  });
  const reportObservations = plan.observations.map((item) => item.type === "preserve_field_value" ? { ...item } : { ...item, logicalKey: item.type === "preserve_parent" ? "parent" : "dependency", displayValue: "present" });
  return { schema: 1, planId: plan.planId, executable: plan.executable, counts: { diagnostics: plan.diagnostics.length, observations: reportObservations.length, operations: reportOperations.length }, diagnostics: plan.diagnostics.map((item) => ({ ...item })), observations: reportObservations, operations: reportOperations };
}
