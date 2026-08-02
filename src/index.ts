import { isAlias, isMap, isScalar, isSeq, parseAllDocuments } from "yaml";

export type DiagnosticCode =
  | "YKP-CONTRACT-001" | "YKP-CONTRACT-002" | "YKP-CONTRACT-003"
  | "YKP-CONTRACT-004" | "YKP-CONTRACT-005" | "YKP-CONTRACT-006"
  | "YKP-CONTRACT-007" | "YKP-CONTRACT-008" | "YKP-CONTRACT-009"
  | "YKP-CONTRACT-010" | "YKP-CONTRACT-011";

export interface Diagnostic {
  code: DiagnosticCode;
  path: string;
  severity: "error";
  message: string;
}

export interface IssueContract {
  schema: 1;
  work_type: "epic" | "gate" | "feature" | "task" | "bug" | "technical-debt";
  area: string;
  priority?: string;
  size?: string;
  estimate?: number;
  iteration?: string;
  project?: { status?: string; start_date?: string; target_date?: string };
  relationships?: { parent?: number; blocks?: number[]; blocked_by?: number[] };
}

export interface ParseOptions { issueNumber?: number }
export interface ParseResult { contract: IssueContract | null; diagnostics: Diagnostic[] }

type InternalDiagnostic = Diagnostic & { offset: number };

const MESSAGES: Record<DiagnosticCode, string> = {
  "YKP-CONTRACT-001": "required field is missing",
  "YKP-CONTRACT-002": "contract envelope is ambiguous or incomplete",
  "YKP-CONTRACT-003": "input byte limit is exceeded",
  "YKP-CONTRACT-004": "YAML syntax or feature is forbidden",
  "YKP-CONTRACT-005": "structural limit is exceeded",
  "YKP-CONTRACT-006": "field is not recognized",
  "YKP-CONTRACT-007": "value has an invalid type",
  "YKP-CONTRACT-008": "value is invalid or unsupported",
  "YKP-CONTRACT-009": "sequence value is duplicated",
  "YKP-CONTRACT-010": "relationship is invalid",
  "YKP-CONTRACT-011": "date range is inconsistent"
};

const OPEN = "<!-- yukh:issue:v1";
const WORK_TYPES = new Set(["epic", "gate", "feature", "task", "bug", "technical-debt"]);
const ROOT_FIELDS = new Set(["schema", "work_type", "area", "priority", "size", "estimate", "iteration", "project", "relationships"]);
const PROJECT_FIELDS = new Set(["status", "start_date", "target_date"]);
const RELATIONSHIP_FIELDS = new Set(["parent", "blocks", "blocked_by"]);

function add(target: InternalDiagnostic[], code: DiagnosticCode, path: string, offset = Number.MAX_SAFE_INTEGER): void {
  target.push({ code, path, severity: "error", message: MESSAGES[code], offset });
}

function finish(contract: IssueContract | null, source: InternalDiagnostic[]): ParseResult {
  const seen = new Set<string>();
  const diagnostics = source
    .sort((a, b) => a.offset - b.offset || a.code.localeCompare(b.code) || a.path.localeCompare(b.path))
    .filter((item) => {
      const key = `${item.code}\0${item.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ offset: _offset, ...item }) => item);
  return { contract: diagnostics.length === 0 ? contract : null, diagnostics };
}

function exactLineOffsets(body: string, line: string): number[] {
  const result: number[] = [];
  let offset = 0;
  for (const part of body.split(/(?<=\n)/u)) {
    const value = part.replace(/\r?\n$/u, "");
    if (value === line) result.push(offset);
    offset += part.length;
  }
  return result;
}

function inspectStructure(node: unknown, depth: number, path: string, diagnostics: InternalDiagnostic[], state: { scalars: number }): void {
  const value = node as { anchor?: string; tag?: string; range?: [number, number, number]; items?: unknown[]; value?: unknown };
  const offset = value?.range?.[0] ?? Number.MAX_SAFE_INTEGER;
  if (depth > 8) add(diagnostics, "YKP-CONTRACT-005", path, offset);
  if (isAlias(node) || value?.anchor || value?.tag) {
    add(diagnostics, "YKP-CONTRACT-004", path, offset);
    return;
  }
  if (isMap(node)) {
    const limit = depth === 0 ? 32 : 16;
    if (node.items.length > limit) add(diagnostics, "YKP-CONTRACT-005", path, offset);
    for (const pair of node.items) {
      if (!isScalar(pair.key) || typeof pair.key.value !== "string" || pair.key.value === "<<") {
        add(diagnostics, "YKP-CONTRACT-004", path, (pair.key as { range?: [number, number, number] } | null)?.range?.[0] ?? offset);
        continue;
      }
      inspectStructure(pair.value, depth + 1, `${path}.${pair.key.value}`, diagnostics, state);
    }
    return;
  }
  if (isSeq(node)) {
    if (node.items.length > 100) add(diagnostics, "YKP-CONTRACT-005", path, offset);
    node.items.forEach((item, index) => inspectStructure(item, depth + 1, `${path}[${index}]`, diagnostics, state));
    return;
  }
  if (isScalar(node)) {
    state.scalars += 1;
    if (state.scalars > 512) add(diagnostics, "YKP-CONTRACT-005", path, offset);
    if (typeof node.value === "string" && [...node.value].length > 512) add(diagnostics, "YKP-CONTRACT-005", path, offset);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function vocabulary(value: unknown, max: number, path: string, diagnostics: InternalDiagnostic[]): string | undefined {
  if (typeof value !== "string") { add(diagnostics, "YKP-CONTRACT-007", path); return undefined; }
  const normalized = value.trim();
  if (!normalized || [...normalized].length > max || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    add(diagnostics, "YKP-CONTRACT-008", path);
    return undefined;
  }
  return normalized;
}

function calendarDate(value: unknown, path: string, diagnostics: InternalDiagnostic[]): string | undefined {
  if (typeof value !== "string") { add(diagnostics, "YKP-CONTRACT-007", path); return undefined; }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) { add(diagnostics, "YKP-CONTRACT-008", path); return undefined; }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) {
    add(diagnostics, "YKP-CONTRACT-008", path);
    return undefined;
  }
  return value;
}

function issueNumber(value: unknown, path: string, diagnostics: InternalDiagnostic[]): number | undefined {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    add(diagnostics, typeof value === "number" ? "YKP-CONTRACT-008" : "YKP-CONTRACT-007", path);
    return undefined;
  }
  return value as number;
}

function relationList(value: unknown, path: string, current: number | undefined, diagnostics: InternalDiagnostic[]): number[] | undefined {
  if (!Array.isArray(value)) { add(diagnostics, "YKP-CONTRACT-007", path); return undefined; }
  if (value.length > 100) { add(diagnostics, "YKP-CONTRACT-005", path); return undefined; }
  const result: number[] = [];
  const seen = new Set<number>();
  value.forEach((entry, index) => {
    const parsed = issueNumber(entry, `${path}[${index}]`, diagnostics);
    if (parsed === undefined) return;
    if (seen.has(parsed)) add(diagnostics, "YKP-CONTRACT-009", `${path}[${index}]`);
    else if (current !== undefined && parsed === current) add(diagnostics, "YKP-CONTRACT-010", `${path}[${index}]`);
    else { seen.add(parsed); result.push(parsed); }
  });
  return result;
}

function unknownFields(value: Record<string, unknown>, allowed: Set<string>, path: string, diagnostics: InternalDiagnostic[]): void {
  for (const field of Object.keys(value)) if (!allowed.has(field)) add(diagnostics, "YKP-CONTRACT-006", `${path}.${field}`);
}

function semantic(value: unknown, options: ParseOptions, diagnostics: InternalDiagnostic[]): IssueContract | null {
  if (!isRecord(value)) { add(diagnostics, "YKP-CONTRACT-007", "$" ); return null; }
  unknownFields(value, ROOT_FIELDS, "$", diagnostics);
  for (const field of ["schema", "work_type", "area"] as const) if (!(field in value)) add(diagnostics, "YKP-CONTRACT-001", `$.${field}`);

  const result = {} as Partial<IssueContract>;
  if ("schema" in value) {
    if (value.schema === 1) result.schema = 1;
    else add(diagnostics, typeof value.schema === "number" ? "YKP-CONTRACT-008" : "YKP-CONTRACT-007", "$.schema");
  }
  if ("work_type" in value) {
    if (typeof value.work_type !== "string") add(diagnostics, "YKP-CONTRACT-007", "$.work_type");
    else if (!WORK_TYPES.has(value.work_type)) add(diagnostics, "YKP-CONTRACT-008", "$.work_type");
    else result.work_type = value.work_type as IssueContract["work_type"];
  }
  if ("area" in value) result.area = vocabulary(value.area, 64, "$.area", diagnostics);
  if ("priority" in value) result.priority = vocabulary(value.priority, 32, "$.priority", diagnostics);
  if ("size" in value) result.size = vocabulary(value.size, 32, "$.size", diagnostics);
  if ("iteration" in value) result.iteration = vocabulary(value.iteration, 128, "$.iteration", diagnostics);
  if ("estimate" in value) {
    if (typeof value.estimate !== "number") add(diagnostics, "YKP-CONTRACT-007", "$.estimate");
    else if (!Number.isFinite(value.estimate) || value.estimate < 0 || value.estimate > 10000) add(diagnostics, "YKP-CONTRACT-008", "$.estimate");
    else result.estimate = value.estimate;
  }
  if ("project" in value) {
    if (!isRecord(value.project)) add(diagnostics, "YKP-CONTRACT-007", "$.project");
    else {
      unknownFields(value.project, PROJECT_FIELDS, "$.project", diagnostics);
      const project: NonNullable<IssueContract["project"]> = {};
      if ("status" in value.project) project.status = vocabulary(value.project.status, 64, "$.project.status", diagnostics);
      if ("start_date" in value.project) project.start_date = calendarDate(value.project.start_date, "$.project.start_date", diagnostics);
      if ("target_date" in value.project) project.target_date = calendarDate(value.project.target_date, "$.project.target_date", diagnostics);
      if (project.start_date && project.target_date && project.target_date < project.start_date) add(diagnostics, "YKP-CONTRACT-011", "$.project.target_date");
      result.project = project;
    }
  }
  if ("relationships" in value) {
    if (!isRecord(value.relationships)) add(diagnostics, "YKP-CONTRACT-007", "$.relationships");
    else {
      unknownFields(value.relationships, RELATIONSHIP_FIELDS, "$.relationships", diagnostics);
      const relationships: NonNullable<IssueContract["relationships"]> = {};
      if ("parent" in value.relationships) {
        const parent = issueNumber(value.relationships.parent, "$.relationships.parent", diagnostics);
        if (parent !== undefined && options.issueNumber === parent) add(diagnostics, "YKP-CONTRACT-010", "$.relationships.parent");
        else if (parent !== undefined) relationships.parent = parent;
      }
      if ("blocks" in value.relationships) relationships.blocks = relationList(value.relationships.blocks, "$.relationships.blocks", options.issueNumber, diagnostics);
      if ("blocked_by" in value.relationships) relationships.blocked_by = relationList(value.relationships.blocked_by, "$.relationships.blocked_by", options.issueNumber, diagnostics);
      result.relationships = relationships;
    }
  }
  return result as IssueContract;
}

export function parseIssueContract(body: string, options: ParseOptions = {}): ParseResult {
  const diagnostics: InternalDiagnostic[] = [];
  if (Buffer.byteLength(body, "utf8") > 256 * 1024) {
    add(diagnostics, "YKP-CONTRACT-003", "$", 0);
    return finish(null, diagnostics);
  }
  const openings = exactLineOffsets(body, OPEN);
  if (openings.length === 0) return finish(null, diagnostics);
  if (openings.length !== 1) { add(diagnostics, "YKP-CONTRACT-002", "$", openings[1] ?? openings[0]); return finish(null, diagnostics); }
  const start = openings[0]!;
  const contentStart = body.indexOf("\n", start);
  if (contentStart < 0) { add(diagnostics, "YKP-CONTRACT-002", "$", start); return finish(null, diagnostics); }
  const closing = exactLineOffsets(body.slice(contentStart + 1), "-->").map((offset) => offset + contentStart + 1);
  if (closing.length === 0) { add(diagnostics, "YKP-CONTRACT-002", "$", start); return finish(null, diagnostics); }
  const end = closing[0]!;
  const content = body.slice(contentStart + 1, end);
  if (Buffer.byteLength(content, "utf8") > 16 * 1024) { add(diagnostics, "YKP-CONTRACT-003", "$", start); return finish(null, diagnostics); }

  const documents = parseAllDocuments(content, { schema: "core", uniqueKeys: true, strict: true, prettyErrors: false });
  if (documents.length !== 1 || documents.some((document) => document.errors.length > 0)) {
    add(diagnostics, "YKP-CONTRACT-004", "$", start);
    return finish(null, diagnostics);
  }
  const document = documents[0]!;
  inspectStructure(document.contents, 0, "$", diagnostics, { scalars: 0 });
  if (diagnostics.length > 0) return finish(null, diagnostics);
  let value: unknown;
  try { value = document.toJS({ maxAliasCount: 0, mapAsMap: false }); }
  catch { add(diagnostics, "YKP-CONTRACT-004", "$", start); return finish(null, diagnostics); }
  const contract = semantic(value, options, diagnostics);
  return finish(contract, diagnostics);
}

export * from "./policy.js";
export * from "./planner.js";
export * from "./github-readonly.js";
