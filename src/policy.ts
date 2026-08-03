import { isAlias, isMap, isScalar, isSeq, parseAllDocuments } from "yaml";

export type FieldKind = "text" | "number" | "date" | "single_select" | "iteration";
export type FieldMode = "managed" | "observed";

export interface PolicyField {
  name: string;
  kind: FieldKind;
  mode: FieldMode;
  options?: Readonly<Record<string, string>>;
}

export interface RepositoryPolicy {
  schema: 1;
  fields: Readonly<Record<string, PolicyField>>;
}

export type PolicyDiagnosticCode =
  | "YKP-POLICY-001" | "YKP-POLICY-002" | "YKP-POLICY-003"
  | "YKP-POLICY-004" | "YKP-POLICY-005" | "YKP-POLICY-006"
  | "YKP-POLICY-007" | "YKP-SCHEMA-001" | "YKP-SCHEMA-002"
  | "YKP-SCHEMA-003" | "YKP-SCHEMA-004" | "YKP-SCHEMA-005";

export interface PolicyDiagnostic {
  code: PolicyDiagnosticCode;
  path: string;
  severity: "error";
  message: string;
}

type InternalDiagnostic = PolicyDiagnostic & { offset: number };

const MESSAGES: Record<PolicyDiagnosticCode, string> = {
  "YKP-POLICY-001": "required policy field is missing",
  "YKP-POLICY-002": "YAML syntax or feature is forbidden",
  "YKP-POLICY-003": "policy resource limit is exceeded",
  "YKP-POLICY-004": "policy field is not recognized",
  "YKP-POLICY-005": "policy value has an invalid type",
  "YKP-POLICY-006": "policy value is invalid",
  "YKP-POLICY-007": "policy display name is duplicated or ambiguous",
  "YKP-SCHEMA-001": "observed schema boundary is invalid",
  "YKP-SCHEMA-002": "observed field or option is ambiguous",
  "YKP-SCHEMA-003": "required observed field is missing",
  "YKP-SCHEMA-004": "observed field kind conflicts with policy",
  "YKP-SCHEMA-005": "policy name collides with observed state"
};

const LOGICAL_KEY = /^[a-z][a-z0-9_]{0,63}$/u;
const KINDS = new Set<FieldKind>(["text", "number", "date", "single_select", "iteration"]);
const MODES = new Set<FieldMode>(["managed", "observed"]);
const ROOT_FIELDS = new Set(["schema", "fields"]);
const FIELD_FIELDS = new Set(["name", "kind", "mode", "options"]);

function add(target: InternalDiagnostic[], code: PolicyDiagnosticCode, path: string, offset = Number.MAX_SAFE_INTEGER): void {
  target.push({ code, path, severity: "error", message: MESSAGES[code], offset });
}

function finalize(source: InternalDiagnostic[]): PolicyDiagnostic[] {
  const seen = new Set<string>();
  return source
    .sort((a, b) => a.offset - b.offset || a.code.localeCompare(b.code) || a.path.localeCompare(b.path))
    .filter((item) => {
      const key = `${item.code}\0${item.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ offset: _offset, ...item }) => item);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function comparisonFold(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

function displayName(value: unknown, path: string, diagnostics: InternalDiagnostic[]): string | undefined {
  if (typeof value !== "string") { add(diagnostics, "YKP-POLICY-005", path); return undefined; }
  const normalized = value.trim();
  if (!normalized || [...normalized].length > 128 || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    add(diagnostics, "YKP-POLICY-006", path);
    return undefined;
  }
  return normalized;
}

function inspectYaml(node: unknown, depth: number, path: string, diagnostics: InternalDiagnostic[], state: { scalars: number }): void {
  const value = node as { anchor?: string; tag?: string; range?: [number, number, number] };
  const offset = value?.range?.[0] ?? Number.MAX_SAFE_INTEGER;
  if (depth > 8) add(diagnostics, "YKP-POLICY-003", path, offset);
  if (isAlias(node) || value?.anchor || value?.tag) { add(diagnostics, "YKP-POLICY-002", path, offset); return; }
  if (isMap(node)) {
    for (const pair of node.items) {
      if (!isScalar(pair.key) || typeof pair.key.value !== "string" || pair.key.value === "<<") {
        add(diagnostics, "YKP-POLICY-002", path, offset);
        continue;
      }
      inspectYaml(pair.value, depth + 1, `${path}.${pair.key.value}`, diagnostics, state);
    }
    return;
  }
  if (isSeq(node)) {
    add(diagnostics, "YKP-POLICY-005", path, offset);
    return;
  }
  if (isScalar(node)) {
    state.scalars += 1;
    if (state.scalars > 2048) add(diagnostics, "YKP-POLICY-003", path, offset);
    if (typeof node.value === "string" && [...node.value].length > 512) add(diagnostics, "YKP-POLICY-003", path, offset);
  }
}

function unknownFields(value: Record<string, unknown>, allowed: Set<string>, path: string, diagnostics: InternalDiagnostic[]): void {
  for (const key of Object.keys(value)) if (!allowed.has(key)) add(diagnostics, "YKP-POLICY-004", `${path}.${key}`);
}

export interface ParsePolicyResult { policy: RepositoryPolicy | null; diagnostics: PolicyDiagnostic[] }

export function parseRepositoryPolicy(source: string): ParsePolicyResult {
  const internal: InternalDiagnostic[] = [];
  if (Buffer.byteLength(source, "utf8") > 64 * 1024) {
    add(internal, "YKP-POLICY-003", "$", 0);
    return { policy: null, diagnostics: finalize(internal) };
  }
  const documents = parseAllDocuments(source, { schema: "core", uniqueKeys: true, strict: true, prettyErrors: false });
  if (documents.length !== 1 || documents.some((document) => document.errors.length > 0)) {
    add(internal, "YKP-POLICY-002", "$", 0);
    return { policy: null, diagnostics: finalize(internal) };
  }
  const document = documents[0]!;
  inspectYaml(document.contents, 0, "$", internal, { scalars: 0 });
  if (internal.length > 0) return { policy: null, diagnostics: finalize(internal) };
  let raw: unknown;
  try { raw = document.toJS({ maxAliasCount: 0, mapAsMap: false }); }
  catch { add(internal, "YKP-POLICY-002", "$", 0); return { policy: null, diagnostics: finalize(internal) }; }
  if (!isRecord(raw)) { add(internal, "YKP-POLICY-005", "$" ); return { policy: null, diagnostics: finalize(internal) }; }
  unknownFields(raw, ROOT_FIELDS, "$", internal);
  for (const required of ["schema", "fields"] as const) if (!(required in raw)) add(internal, "YKP-POLICY-001", `$.${required}`);
  if ("schema" in raw && raw.schema !== 1) add(internal, typeof raw.schema === "number" ? "YKP-POLICY-006" : "YKP-POLICY-005", "$.schema");
  const fields: Record<string, PolicyField> = {};
  const names = new Map<string, string>();
  if ("fields" in raw) {
    if (!isRecord(raw.fields)) add(internal, "YKP-POLICY-005", "$.fields");
    else if (Object.keys(raw.fields).length < 1 || Object.keys(raw.fields).length > 64) add(internal, "YKP-POLICY-003", "$.fields");
    else for (const key of Object.keys(raw.fields).sort()) {
      const path = `$.fields.${key}`;
      if (!LOGICAL_KEY.test(key)) add(internal, "YKP-POLICY-006", path);
      const declaration = raw.fields[key];
      if (!isRecord(declaration)) { add(internal, "YKP-POLICY-005", path); continue; }
      unknownFields(declaration, FIELD_FIELDS, path, internal);
      for (const required of ["name", "kind", "mode"] as const) if (!(required in declaration)) add(internal, "YKP-POLICY-001", `${path}.${required}`);
      const name = "name" in declaration ? displayName(declaration.name, `${path}.name`, internal) : undefined;
      const kind = declaration.kind;
      const mode = declaration.mode;
      if ("kind" in declaration && (typeof kind !== "string" || !KINDS.has(kind as FieldKind))) add(internal, typeof kind === "string" ? "YKP-POLICY-006" : "YKP-POLICY-005", `${path}.kind`);
      if ("mode" in declaration && (typeof mode !== "string" || !MODES.has(mode as FieldMode))) add(internal, typeof mode === "string" ? "YKP-POLICY-006" : "YKP-POLICY-005", `${path}.mode`);
      const options: Record<string, string> = {};
      if ("options" in declaration) {
        if (kind !== "single_select" || mode !== "managed") add(internal, "YKP-POLICY-006", `${path}.options`);
        else if (!isRecord(declaration.options)) add(internal, "YKP-POLICY-005", `${path}.options`);
        else if (Object.keys(declaration.options).length < 1 || Object.keys(declaration.options).length > 128) add(internal, "YKP-POLICY-003", `${path}.options`);
        else {
          const optionNames = new Map<string, string>();
          for (const optionKey of Object.keys(declaration.options).sort()) {
            const optionPath = `${path}.options.${optionKey}`;
            if (!LOGICAL_KEY.test(optionKey)) add(internal, "YKP-POLICY-006", optionPath);
            const optionName = displayName(declaration.options[optionKey], optionPath, internal);
            if (optionName) {
              const folded = comparisonFold(optionName);
              if (optionNames.has(folded)) add(internal, "YKP-POLICY-007", optionPath);
              else { optionNames.set(folded, optionKey); options[optionKey] = optionName; }
            }
          }
        }
      } else if (kind === "single_select" && mode === "managed") add(internal, "YKP-POLICY-001", `${path}.options`);
      if (name) {
        const folded = comparisonFold(name);
        if (names.has(folded)) add(internal, "YKP-POLICY-007", `${path}.name`);
        else names.set(folded, key);
      }
      if (name && KINDS.has(kind as FieldKind) && MODES.has(mode as FieldMode) && LOGICAL_KEY.test(key)) {
        fields[key] = { name, kind: kind as FieldKind, mode: mode as FieldMode, ...(Object.keys(options).length ? { options } : {}) };
      }
    }
  }
  const diagnostics = finalize(internal);
  return { policy: diagnostics.length === 0 ? { schema: 1, fields } : null, diagnostics };
}

export interface ObservedOption { providerId: string; name: string }
export interface ObservedField { providerId: string; name: string; kind: FieldKind; options?: readonly ObservedOption[] }
export interface ObservedSchema { fields: readonly ObservedField[] }

export type SchemaOperation =
  | { type: "create_field"; fieldKey: string; name: string; kind: FieldKind; options: readonly { optionKey: string; name: string }[] }
  | { type: "preserve_field"; fieldKey: string; fieldProviderId: string; name: string; kind: FieldKind }
  | { type: "add_option"; fieldKey: string; fieldProviderId: string; optionKey: string; name: string }
  | { type: "preserve_option"; fieldKey: string; fieldProviderId: string; optionKey: string; optionProviderId: string; name: string };

export interface SchemaObservation { type: "preserve_unmanaged_field"; name: string }
export interface EffectiveSchemaResult {
  executable: boolean;
  diagnostics: readonly PolicyDiagnostic[];
  observations: readonly SchemaObservation[];
  operations: readonly SchemaOperation[];
}

function boundedOpaque(value: unknown): value is string {
  return typeof value === "string" && [...value].length > 0 && [...value].length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value);
}

function validateObserved(schema: ObservedSchema, diagnostics: InternalDiagnostic[]): void {
  if (!schema || !Array.isArray(schema.fields) || schema.fields.length > 256) { add(diagnostics, "YKP-SCHEMA-001", "$.observed.fields"); return; }
  const ids = new Set<string>();
  const names = new Map<string, string>();
  let totalOptions = 0;
  schema.fields.forEach((field, index) => {
    const path = `$.observed.fields[${index}]`;
    if (!field || !boundedOpaque(field.providerId) || !boundedOpaque(field.name) || !KINDS.has(field.kind)) { add(diagnostics, "YKP-SCHEMA-001", path); return; }
    if (ids.has(field.providerId)) add(diagnostics, "YKP-SCHEMA-002", `${path}.providerId`); else ids.add(field.providerId);
    const folded = comparisonFold(field.name);
    if (names.has(folded)) add(diagnostics, "YKP-SCHEMA-002", `${path}.name`); else names.set(folded, path);
    const options = field.options ?? [];
    if (!Array.isArray(options) || options.length > 256 || (field.kind !== "single_select" && options.length > 0)) { add(diagnostics, "YKP-SCHEMA-001", `${path}.options`); return; }
    totalOptions += options.length;
    const optionNames = new Map<string, string>();
    options.forEach((option, optionIndex) => {
      const optionPath = `${path}.options[${optionIndex}]`;
      if (!option || !boundedOpaque(option.providerId) || !boundedOpaque(option.name)) { add(diagnostics, "YKP-SCHEMA-001", optionPath); return; }
      if (ids.has(option.providerId)) add(diagnostics, "YKP-SCHEMA-002", `${optionPath}.providerId`); else ids.add(option.providerId);
      const optionFold = comparisonFold(option.name);
      if (optionNames.has(optionFold)) add(diagnostics, "YKP-SCHEMA-002", `${optionPath}.name`); else optionNames.set(optionFold, optionPath);
    });
  });
  if (totalOptions > 2048) add(diagnostics, "YKP-SCHEMA-001", "$.observed.fields");
}

const OPERATION_RANK: Record<SchemaOperation["type"], number> = { create_field: 0, preserve_field: 1, add_option: 2, preserve_option: 3 };

export function calculateEffectiveSchema(policy: RepositoryPolicy, observed: ObservedSchema): EffectiveSchemaResult {
  const internal: InternalDiagnostic[] = [];
  validateObserved(observed, internal);
  if (internal.length > 0) return { executable: false, diagnostics: finalize(internal), observations: [], operations: [] };
  const operations: SchemaOperation[] = [];
  const managedNames = new Set<string>();
  for (const fieldKey of Object.keys(policy.fields).sort()) {
    const desired = policy.fields[fieldKey]!;
    managedNames.add(desired.name);
    const exact = observed.fields.filter((field) => field.name === desired.name);
    const folded = observed.fields.filter((field) => comparisonFold(field.name) === comparisonFold(desired.name));
    const path = `$.fields.${fieldKey}`;
    if (exact.length === 0) {
      if (folded.length > 0) add(internal, "YKP-SCHEMA-005", `${path}.name`);
      else if (desired.mode === "observed") add(internal, "YKP-SCHEMA-003", path);
      else operations.push({ type: "create_field", fieldKey, name: desired.name, kind: desired.kind, options: Object.entries(desired.options ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([optionKey, name]) => ({ optionKey, name })) });
      continue;
    }
    const current = exact[0]!;
    if (current.kind !== desired.kind) { add(internal, "YKP-SCHEMA-004", `${path}.kind`); continue; }
    operations.push({ type: "preserve_field", fieldKey, fieldProviderId: current.providerId, name: current.name, kind: current.kind });
    if (desired.mode !== "managed" || desired.kind !== "single_select") continue;
    for (const [optionKey, optionName] of Object.entries(desired.options ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
      const optionPath = `${path}.options.${optionKey}`;
      const exactOption = (current.options ?? []).find((option) => option.name === optionName);
      const foldedOption = (current.options ?? []).find((option) => comparisonFold(option.name) === comparisonFold(optionName));
      if (exactOption) operations.push({ type: "preserve_option", fieldKey, fieldProviderId: current.providerId, optionKey, optionProviderId: exactOption.providerId, name: exactOption.name });
      else if (foldedOption) add(internal, "YKP-SCHEMA-005", optionPath);
      else operations.push({ type: "add_option", fieldKey, fieldProviderId: current.providerId, optionKey, name: optionName });
    }
  }
  const observations: SchemaObservation[] = observed.fields
    .filter((field) => !managedNames.has(field.name))
    .map((field) => ({ type: "preserve_unmanaged_field" as const, name: field.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  operations.sort((a, b) => a.fieldKey.localeCompare(b.fieldKey) || OPERATION_RANK[a.type] - OPERATION_RANK[b.type] || ("optionKey" in a ? a.optionKey : "").localeCompare("optionKey" in b ? b.optionKey : ""));
  const diagnostics = finalize(internal);
  return { executable: diagnostics.length === 0, diagnostics, observations, operations };
}
