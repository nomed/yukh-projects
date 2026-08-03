import { createHash } from "node:crypto";
import { isAlias, isMap, isScalar, isSeq, parseAllDocuments } from "yaml";

export type MigrationDisposition = "mapped" | "preserved" | "unsupported" | "ambiguous" | "missing_required";
export interface MigrationObservation { disposition: MigrationDisposition; path: string }
export interface MigrationDiagnostic { code: string; path: string; severity: "error"; message: string }
export interface MigrationCandidate {
  issueNumber: number;
  disposition: "emittable" | "non_emittable";
  contract: string | null;
  observations: readonly MigrationObservation[];
}
export interface AggregateMigrationPlan {
  version: 1;
  complete: boolean;
  inputDigest: string;
  mappingDigest: string;
  outputDigest: string | null;
  candidates: readonly MigrationCandidate[];
  diagnostics: readonly MigrationDiagnostic[];
}

type RawIssue = {
  number: number; kind?: string; area?: string; priority?: string; size?: string; estimate?: number;
  start_date?: string; target_date?: string; parent?: string; depends_on?: string[];
};
type Manifest = {
  schema: 1;
  programs: Record<string, { issues: string[]; gates: string[] }>;
  issues: Record<string, RawIssue>;
  gates: Record<string, { status: string; blocks: string[] }>;
};
type FieldTarget = "work_type" | "area" | "priority" | "size" | "estimate" | "start_date" | "target_date";
type Mapping = {
  schema: 1;
  fields: Record<string, { source: string; target: FieldTarget; values?: Record<string, string> }>;
  relationships: { parent?: "parent"; depends_on?: "blocked_by" };
  unsupported: "report" | "reject";
};
type InternalDiagnostic = MigrationDiagnostic & { rank: number };

const KEY = /^[a-z][a-z0-9_]{0,63}$/u;
const ROOT_MANIFEST = new Set(["schema", "programs", "issues", "gates"]);
const PROGRAM_FIELDS = new Set(["issues", "gates"]);
const ISSUE_FIELDS = new Set(["number", "kind", "area", "priority", "size", "estimate", "start_date", "target_date", "parent", "depends_on"]);
const GATE_FIELDS = new Set(["status", "blocks"]);
const ROOT_MAPPING = new Set(["schema", "fields", "relationships", "unsupported"]);
const MAPPING_FIELDS = new Set(["source", "target", "values"]);
const RELATIONSHIP_FIELDS = new Set(["parent", "depends_on"]);
const TARGETS = new Set<FieldTarget>(["work_type", "area", "priority", "size", "estimate", "start_date", "target_date"]);
const WORK_TYPES = new Set(["epic", "gate", "feature", "task", "bug", "technical-debt"]);
const MESSAGES: Record<string, string> = {
  "YKP-MIG-DOC-001": "migration document is malformed or uses a forbidden YAML feature",
  "YKP-MIG-DOC-002": "migration document exceeds a resource limit",
  "YKP-MIG-DOC-003": "migration document contains an unknown field",
  "YKP-MIG-DOC-004": "migration document value is invalid",
  "YKP-MIG-MAP-001": "required mapping is missing",
  "YKP-MIG-MAP-002": "mapping is incompatible or ambiguous",
  "YKP-MIG-MAP-003": "source value is not explicitly mapped",
  "YKP-MIG-GRAPH-001": "relationship endpoint is missing",
  "YKP-MIG-GRAPH-002": "relationship is duplicated or self-referential",
  "YKP-MIG-GRAPH-003": "relationship graph contains a cycle",
  "YKP-MIG-CANDIDATE-001": "candidate is missing required information",
  "YKP-MIG-CANDIDATE-002": "candidate contains unsupported information",
  "YKP-MIG-PROVENANCE-001": "migration provenance cannot be canonicalized"
};

function diagnostic(target: InternalDiagnostic[], code: string, path: string, rank = Number.MAX_SAFE_INTEGER): void {
  target.push({ code, path, severity: "error", message: MESSAGES[code]!, rank });
}
function finishDiagnostics(source: InternalDiagnostic[]): MigrationDiagnostic[] {
  const seen = new Set<string>();
  return source.sort((a, b) => a.rank - b.rank || a.code.localeCompare(b.code) || a.path.localeCompare(b.path))
    .filter((item) => { const key = `${item.code}\0${item.path}`; if (seen.has(key)) return false; seen.add(key); return true; })
    .map(({ rank: _rank, ...item }) => ({ ...item, path: redactPath(item.path) }));
}
function redactPath(path: string): string {
  return path
    .replace(/\.(issues|programs|gates|fields)\.[^.\[]+/gu, ".$1[*]")
    .replace(/\.values\.[^.\[]+/gu, ".values[*]");
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function unknown(value: Record<string, unknown>, allowed: Set<string>, path: string, diagnostics: InternalDiagnostic[], rank: number): void {
  for (const key of Object.keys(value)) if (!allowed.has(key)) diagnostic(diagnostics, "YKP-MIG-DOC-003", `${path}.*`, rank);
}
function logical(value: unknown): value is string { return typeof value === "string" && KEY.test(value); }
function text(value: unknown, max = 512): value is string {
  return typeof value === "string" && value.length > 0 && [...value].length <= max && !/[\u0000-\u001f\u007f]/u.test(value);
}
function date(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number); const parsed = new Date(Date.UTC(y!, m! - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m! - 1 && parsed.getUTCDate() === d;
}
function stringList(value: unknown, max = 100): value is string[] {
  return Array.isArray(value) && value.length <= max && value.every(logical) && new Set(value).size === value.length;
}
function inspect(node: unknown, depth: number, path: string, limits: { depth: number; scalars: number; maxScalars: number }, diagnostics: InternalDiagnostic[], rank: number): void {
  const meta = node as { anchor?: string; tag?: string };
  if (depth > limits.depth) diagnostic(diagnostics, "YKP-MIG-DOC-002", path, rank);
  if (isAlias(node) || meta?.anchor || meta?.tag) { diagnostic(diagnostics, "YKP-MIG-DOC-001", path, rank); return; }
  if (isMap(node)) {
    for (const pair of node.items) {
      if (!isScalar(pair.key) || typeof pair.key.value !== "string" || pair.key.value === "<<") { diagnostic(diagnostics, "YKP-MIG-DOC-001", path, rank); continue; }
      inspect(pair.value, depth + 1, `${path}.${pair.key.value}`, limits, diagnostics, rank);
    }
  } else if (isSeq(node)) {
    node.items.forEach((item, index) => inspect(item, depth + 1, `${path}[${index}]`, limits, diagnostics, rank));
  } else if (isScalar(node)) {
    limits.scalars += 1;
    if (limits.scalars > limits.maxScalars || (typeof node.value === "string" && [...node.value].length > 512)) diagnostic(diagnostics, "YKP-MIG-DOC-002", path, rank);
  }
}
function parseYaml(source: string, maxBytes: number, maxScalars: number, rank: number, diagnostics: InternalDiagnostic[]): unknown {
  if (Buffer.byteLength(source, "utf8") > maxBytes) { diagnostic(diagnostics, "YKP-MIG-DOC-002", "$", rank); return null; }
  const docs = parseAllDocuments(source, { schema: "core", uniqueKeys: true, strict: true, prettyErrors: false });
  if (docs.length !== 1 || docs.some((doc) => doc.errors.length > 0)) { diagnostic(diagnostics, "YKP-MIG-DOC-001", "$", rank); return null; }
  inspect(docs[0]!.contents, 0, "$", { depth: 10, scalars: 0, maxScalars }, diagnostics, rank);
  if (diagnostics.some((item) => item.rank === rank)) return null;
  try { return docs[0]!.toJS({ maxAliasCount: 0, mapAsMap: false }); }
  catch { diagnostic(diagnostics, "YKP-MIG-DOC-001", "$", rank); return null; }
}

function parseManifest(source: string, diagnostics: InternalDiagnostic[]): Manifest | null {
  const raw = parseYaml(source, 256 * 1024, 32768, 0, diagnostics);
  if (!record(raw)) { if (raw !== null) diagnostic(diagnostics, "YKP-MIG-DOC-004", "$", 0); return null; }
  unknown(raw, ROOT_MANIFEST, "$", diagnostics, 0);
  if (raw.schema !== 1 || !record(raw.programs) || !record(raw.issues) || !record(raw.gates)) diagnostic(diagnostics, "YKP-MIG-DOC-004", "$", 0);
  if (!record(raw.programs) || Object.keys(raw.programs).length > 64 || !record(raw.issues) || Object.keys(raw.issues).length > 1000 || Object.keys(raw.issues).length === 0 || !record(raw.gates) || Object.keys(raw.gates).length > 256) return null;
  const programs: Manifest["programs"] = {}; const issues: Manifest["issues"] = {}; const gates: Manifest["gates"] = {};
  for (const [key, value] of Object.entries(raw.programs)) {
    const path = `$.programs.${key}`; if (!KEY.test(key) || !record(value)) { diagnostic(diagnostics, "YKP-MIG-DOC-004", path, 0); continue; }
    unknown(value, PROGRAM_FIELDS, path, diagnostics, 0);
    if (!stringList(value.issues) || !stringList(value.gates)) diagnostic(diagnostics, "YKP-MIG-DOC-004", path, 0); else programs[key] = { issues: value.issues, gates: value.gates };
  }
  for (const [key, value] of Object.entries(raw.issues)) {
    const path = `$.issues.${key}`; if (!KEY.test(key) || !record(value)) { diagnostic(diagnostics, "YKP-MIG-DOC-004", path, 0); continue; }
    unknown(value, ISSUE_FIELDS, path, diagnostics, 0);
    if (!Number.isSafeInteger(value.number) || (value.number as number) <= 0) diagnostic(diagnostics, "YKP-MIG-DOC-004", `${path}.number`, 0);
    for (const field of ["kind", "area", "priority", "size", "parent"] as const) if (field in value && !logical(value[field])) diagnostic(diagnostics, "YKP-MIG-DOC-004", `${path}.${field}`, 0);
    if ("estimate" in value && (typeof value.estimate !== "number" || !Number.isFinite(value.estimate) || value.estimate < 0 || value.estimate > 10000)) diagnostic(diagnostics, "YKP-MIG-DOC-004", `${path}.estimate`, 0);
    for (const field of ["start_date", "target_date"] as const) if (field in value && !date(value[field])) diagnostic(diagnostics, "YKP-MIG-DOC-004", `${path}.${field}`, 0);
    if ("depends_on" in value && !stringList(value.depends_on)) diagnostic(diagnostics, "YKP-MIG-DOC-004", `${path}.depends_on`, 0);
    if (Number.isSafeInteger(value.number) && (value.number as number) > 0) issues[key] = value as RawIssue;
  }
  for (const [key, value] of Object.entries(raw.gates)) {
    const path = `$.gates.${key}`; if (!KEY.test(key) || !record(value)) { diagnostic(diagnostics, "YKP-MIG-DOC-004", path, 0); continue; }
    unknown(value, GATE_FIELDS, path, diagnostics, 0);
    if (!logical(value.status) || !stringList(value.blocks)) diagnostic(diagnostics, "YKP-MIG-DOC-004", path, 0); else gates[key] = { status: value.status, blocks: value.blocks };
  }
  return diagnostics.some((item) => item.rank === 0) ? null : { schema: 1, programs, issues, gates };
}

function parseMapping(source: string, diagnostics: InternalDiagnostic[]): Mapping | null {
  const raw = parseYaml(source, 64 * 1024, 4096, 1, diagnostics);
  if (!record(raw)) { if (raw !== null) diagnostic(diagnostics, "YKP-MIG-DOC-004", "$", 1); return null; }
  unknown(raw, ROOT_MAPPING, "$", diagnostics, 1);
  if (raw.schema !== 1 || !record(raw.fields) || !record(raw.relationships) || (raw.unsupported !== "report" && raw.unsupported !== "reject")) diagnostic(diagnostics, "YKP-MIG-DOC-004", "$", 1);
  if (!record(raw.fields) || Object.keys(raw.fields).length > 32 || !record(raw.relationships)) return null;
  const fields: Mapping["fields"] = {}; const targets = new Set<string>();
  for (const [key, value] of Object.entries(raw.fields)) {
    const path = `$.fields.${key}`; if (!KEY.test(key) || !record(value)) { diagnostic(diagnostics, "YKP-MIG-DOC-004", path, 1); continue; }
    unknown(value, MAPPING_FIELDS, path, diagnostics, 1);
    if (!text(value.source) || value.source !== `issue.${key}` || typeof value.target !== "string" || !TARGETS.has(value.target as FieldTarget)) { diagnostic(diagnostics, "YKP-MIG-MAP-002", path, 1); continue; }
    if (targets.has(value.target)) { diagnostic(diagnostics, "YKP-MIG-MAP-002", `${path}.target`, 1); continue; } targets.add(value.target);
    let values: Record<string, string> | undefined;
    if ("values" in value) {
      if (!record(value.values) || Object.keys(value.values).length > 256) diagnostic(diagnostics, "YKP-MIG-MAP-002", `${path}.values`, 1);
      else { values = {}; for (const [from, to] of Object.entries(value.values)) { if (!KEY.test(from) || !text(to, 128)) diagnostic(diagnostics, "YKP-MIG-MAP-002", `${path}.values`, 1); else values[from] = to; } }
    }
    if (["work_type", "area", "priority", "size"].includes(value.target as string) && !values) diagnostic(diagnostics, "YKP-MIG-MAP-001", `${path}.values`, 1);
    fields[key] = { source: value.source, target: value.target as FieldTarget, ...(values ? { values } : {}) };
  }
  unknown(raw.relationships, RELATIONSHIP_FIELDS, "$.relationships", diagnostics, 1);
  const relationships: Mapping["relationships"] = {};
  if ("parent" in raw.relationships) { if (raw.relationships.parent !== "parent") diagnostic(diagnostics, "YKP-MIG-MAP-002", "$.relationships.parent", 1); else relationships.parent = "parent"; }
  if ("depends_on" in raw.relationships) { if (raw.relationships.depends_on !== "blocked_by") diagnostic(diagnostics, "YKP-MIG-MAP-002", "$.relationships.depends_on", 1); else relationships.depends_on = "blocked_by"; }
  for (const required of ["work_type", "area"]) if (!targets.has(required)) diagnostic(diagnostics, "YKP-MIG-MAP-001", `$.fields.${required}`, 1);
  return diagnostics.some((item) => item.rank === 1) ? null : { schema: 1, fields, relationships, unsupported: raw.unsupported as Mapping["unsupported"] };
}

function cycles(edges: Map<string, string[]>, diagnostics: InternalDiagnostic[], path: string): void {
  const active = new Set<string>(); const done = new Set<string>();
  const visit = (node: string): boolean => {
    if (active.has(node)) return true; if (done.has(node)) return false; active.add(node);
    if ((edges.get(node) ?? []).some(visit)) return true; active.delete(node); done.add(node); return false;
  };
  for (const node of [...edges.keys()].sort()) if (visit(node)) { diagnostic(diagnostics, "YKP-MIG-GRAPH-003", path, 2); return; }
}
function validateGraph(manifest: Manifest, diagnostics: InternalDiagnostic[]): void {
  const numbers = new Set<number>(); const parent = new Map<string, string[]>(); const dependencies = new Map<string, string[]>(); let edges = 0;
  for (const [key, issue] of Object.entries(manifest.issues)) {
    if (numbers.has(issue.number)) diagnostic(diagnostics, "YKP-MIG-GRAPH-002", `$.issues.${key}.number`, 2); numbers.add(issue.number);
    parent.set(key, issue.parent ? [issue.parent] : []); dependencies.set(key, issue.depends_on ?? []);
    for (const [field, endpoints] of [["parent", issue.parent ? [issue.parent] : []], ["depends_on", issue.depends_on ?? []]] as const) {
      edges += endpoints.length;
      for (const endpoint of endpoints) {
        if (!(endpoint in manifest.issues)) diagnostic(diagnostics, "YKP-MIG-GRAPH-001", `$.issues.${key}.${field}`, 2);
        else if (endpoint === key) diagnostic(diagnostics, "YKP-MIG-GRAPH-002", `$.issues.${key}.${field}`, 2);
      }
    }
  }
  for (const [key, program] of Object.entries(manifest.programs)) {
    for (const issue of program.issues) if (!(issue in manifest.issues)) diagnostic(diagnostics, "YKP-MIG-GRAPH-001", `$.programs.${key}.issues`, 2);
    for (const gate of program.gates) if (!(gate in manifest.gates)) diagnostic(diagnostics, "YKP-MIG-GRAPH-001", `$.programs.${key}.gates`, 2);
  }
  for (const [key, gate] of Object.entries(manifest.gates)) for (const issue of gate.blocks) if (!(issue in manifest.issues)) diagnostic(diagnostics, "YKP-MIG-GRAPH-001", `$.gates.${key}.blocks`, 2);
  if (edges > 10000) diagnostic(diagnostics, "YKP-MIG-DOC-002", "$.issues", 2);
  cycles(parent, diagnostics, "$.issues.parent"); cycles(dependencies, diagnostics, "$.issues.depends_on");
}

function canonical(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("non-finite"); return JSON.stringify(value); }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (record(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  throw new Error("unsupported");
}
function digest(value: unknown): string { return createHash("sha256").update(canonical(value), "utf8").digest("hex"); }
function renderContract(mapped: Record<string, unknown>, relations: { parent?: number; blocked_by?: number[] }): string {
  const lines = ["<!-- yukh:issue:v1", "schema: 1", `work_type: ${mapped.work_type}`, `area: ${mapped.area}`];
  for (const key of ["priority", "size", "estimate"] as const) if (mapped[key] !== undefined) lines.push(`${key}: ${mapped[key]}`);
  if (mapped.start_date !== undefined || mapped.target_date !== undefined) {
    lines.push("project:"); if (mapped.start_date !== undefined) lines.push(`  start_date: ${mapped.start_date}`); if (mapped.target_date !== undefined) lines.push(`  target_date: ${mapped.target_date}`);
  }
  if (relations.parent !== undefined || (relations.blocked_by?.length ?? 0) > 0) {
    lines.push("relationships:"); if (relations.parent !== undefined) lines.push(`  parent: ${relations.parent}`); if (relations.blocked_by?.length) lines.push(`  blocked_by: [${relations.blocked_by.join(", ")}]`);
  }
  lines.push("-->"); return `${lines.join("\n")}\n`;
}

export function planAggregateManifestMigration(manifestSource: string, mappingSource: string): AggregateMigrationPlan {
  const internal: InternalDiagnostic[] = [];
  const manifest = parseManifest(manifestSource, internal); const mapping = parseMapping(mappingSource, internal);
  let inputDigest = ""; let mappingDigest = "";
  try { inputDigest = digest(manifest ?? { invalid: true }); mappingDigest = digest(mapping ?? { invalid: true }); }
  catch { diagnostic(internal, "YKP-MIG-PROVENANCE-001", "$", 3); }
  if (manifest) validateGraph(manifest, internal);
  if (!manifest || !mapping || internal.length > 0) return { version: 1, complete: false, inputDigest, mappingDigest, outputDigest: null, candidates: [], diagnostics: finishDiagnostics(internal) };
  const byNumber = new Map(Object.entries(manifest.issues).map(([key, issue]) => [key, issue.number])); const candidates: MigrationCandidate[] = [];
  for (const [issueKey, issue] of Object.entries(manifest.issues).sort((a, b) => a[1].number - b[1].number)) {
    const mapped: Record<string, unknown> = {}; const observations: MigrationObservation[] = []; let emittable = true;
    const mappedSources = new Set(Object.keys(mapping.fields));
    for (const key of ["kind", "area", "priority", "size", "estimate", "start_date", "target_date"] as const) {
      if (issue[key] !== undefined && !mappedSources.has(key)) {
        observations.push({ disposition: "unsupported", path: `$.issues.${issueKey}.${key}` });
        if (mapping.unsupported === "reject") emittable = false;
      }
    }
    for (const [key, declaration] of Object.entries(mapping.fields).sort(([a], [b]) => a.localeCompare(b))) {
      const source = issue[key as keyof RawIssue]; if (source === undefined) { if (declaration.target === "work_type" || declaration.target === "area") { observations.push({ disposition: "missing_required", path: `$.issues.${issueKey}.${key}` }); emittable = false; } continue; }
      let target: unknown = source;
      if (declaration.values) { const selected = declaration.values[String(source)]; if (selected === undefined) { observations.push({ disposition: "missing_required", path: `$.issues.${issueKey}.${key}` }); emittable = false; continue; } target = selected; }
      if (declaration.target === "work_type" && !WORK_TYPES.has(String(target))) { observations.push({ disposition: "ambiguous", path: `$.issues.${issueKey}.${key}` }); emittable = false; continue; }
      mapped[declaration.target] = target; observations.push({ disposition: "mapped", path: `$.issues.${issueKey}.${key}` });
    }
    const relations: { parent?: number; blocked_by?: number[] } = {};
    if (issue.parent && mapping.relationships.parent) relations.parent = byNumber.get(issue.parent);
    if (issue.depends_on?.length && mapping.relationships.depends_on) relations.blocked_by = issue.depends_on.map((key) => byNumber.get(key)!).sort((a, b) => a - b);
    for (const gate of Object.values(manifest.gates)) if (gate.blocks.includes(issueKey)) observations.push({ disposition: "preserved", path: `$.issues.${issueKey}` });
    const contract = emittable ? renderContract(mapped, relations) : null;
    candidates.push({ issueNumber: issue.number, disposition: emittable ? "emittable" : "non_emittable", contract, observations: observations.sort((a, b) => a.path.localeCompare(b.path) || a.disposition.localeCompare(b.disposition)) });
  }
  let outputDigest: string | null = null; try { outputDigest = digest(candidates); } catch { diagnostic(internal, "YKP-MIG-PROVENANCE-001", "$", 3); }
  return { version: 1, complete: internal.length === 0, inputDigest, mappingDigest, outputDigest, candidates, diagnostics: finishDiagnostics(internal) };
}
