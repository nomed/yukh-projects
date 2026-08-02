import assert from "node:assert/strict";
import test from "node:test";
import { calculateEffectiveSchema, parseRepositoryPolicy, type ObservedSchema, type RepositoryPolicy } from "../src/index.js";

const validPolicy = `schema: 1
fields:
  area:
    name: Area
    kind: single_select
    mode: managed
    options:
      architecture: Architecture
      runtime: Runtime
  target_date:
    name: Target date
    kind: date
    mode: observed
`;

function acceptedPolicy(): RepositoryPolicy {
  const result = parseRepositoryPolicy(validPolicy);
  assert.equal(result.diagnostics.length, 0);
  assert.ok(result.policy);
  return result.policy;
}

test("parses a bounded synthetic policy", () => {
  const result = parseRepositoryPolicy(validPolicy);
  assert.equal(result.policy?.schema, 1);
  assert.deepEqual(result.policy?.fields.area?.options, { architecture: "Architecture", runtime: "Runtime" });
});

test("emits one stable diagnostic for each missing root field", () => {
  assert.deepEqual(parseRepositoryPolicy("{}").diagnostics.map((item) => [item.code, item.path]), [
    ["YKP-POLICY-001", "$.fields"],
    ["YKP-POLICY-001", "$.schema"]
  ]);
});

test("rejects aliases, explicit tags, duplicate keys, and multiple documents", () => {
  const samples = [
    "schema: 1\nfields: &fields {}\ncopy: *fields",
    "schema: 1\nfields: !!map {}",
    "schema: 1\nschema: 1\nfields: {}",
    "schema: 1\nfields: {}\n---\nschema: 1"
  ];
  for (const sample of samples) assert.equal(parseRepositoryPolicy(sample).diagnostics[0]?.code, "YKP-POLICY-002");
});

test("rejects invalid logical keys, modes, kinds, and option placement", () => {
  const source = `schema: 1
fields:
  Bad-Key:
    name: Example
    kind: text
    mode: managed
    options:
      one: One
  valid:
    name: Valid
    kind: unsupported
    mode: automatic
`;
  const codes = parseRepositoryPolicy(source).diagnostics.map((item) => item.code);
  assert.ok(codes.includes("YKP-POLICY-006"));
  assert.ok(codes.length >= 4);
});

test("requires non-empty options for managed single-select fields", () => {
  const result = parseRepositoryPolicy("schema: 1\nfields:\n  state:\n    name: State\n    kind: single_select\n    mode: managed");
  assert.deepEqual(result.diagnostics.map((item) => [item.code, item.path]), [["YKP-POLICY-001", "$.fields.state.options"]]);
});

test("rejects comparison-fold display collisions", () => {
  const source = `schema: 1
fields:
  first:
    name: Runtime
    kind: text
    mode: managed
  second:
    name: Ｒuntime
    kind: text
    mode: managed
`;
  assert.equal(parseRepositoryPolicy(source).diagnostics[0]?.code, "YKP-POLICY-007");
});

test("enforces document and field bounds", () => {
  assert.equal(parseRepositoryPolicy("x".repeat(64 * 1024 + 1)).diagnostics[0]?.code, "YKP-POLICY-003");
  const fields = Array.from({ length: 65 }, (_, index) => `  field_${index}:\n    name: Field ${index}\n    kind: text\n    mode: managed`).join("\n");
  assert.equal(parseRepositoryPolicy(`schema: 1\nfields:\n${fields}`).diagnostics[0]?.code, "YKP-POLICY-003");
});

test("creates missing managed fields and preserves required observed fields", () => {
  const observed: ObservedSchema = { fields: [{ providerId: "field-date", name: "Target date", kind: "date" }] };
  const result = calculateEffectiveSchema(acceptedPolicy(), observed);
  assert.equal(result.executable, true);
  assert.deepEqual(result.operations.map((item) => item.type), ["create_field", "preserve_field"]);
  assert.deepEqual(result.operations[0], {
    type: "create_field",
    fieldKey: "area",
    name: "Area",
    kind: "single_select",
    options: [
      { optionKey: "architecture", name: "Architecture" },
      { optionKey: "runtime", name: "Runtime" }
    ]
  });
});

test("preserves matching options and proposes only missing options", () => {
  const observed: ObservedSchema = { fields: [
    { providerId: "field-area", name: "Area", kind: "single_select", options: [{ providerId: "option-runtime", name: "Runtime" }] },
    { providerId: "field-date", name: "Target date", kind: "date" }
  ] };
  const result = calculateEffectiveSchema(acceptedPolicy(), observed);
  assert.equal(result.executable, true);
  assert.deepEqual(result.operations.map((item) => item.type), ["preserve_field", "add_option", "preserve_option", "preserve_field"]);
});

test("fails the whole plan for missing observed fields and kind conflicts", () => {
  const missing = calculateEffectiveSchema(acceptedPolicy(), { fields: [] });
  assert.equal(missing.executable, false);
  assert.ok(missing.operations.some((item) => item.type === "create_field"));
  assert.equal(missing.diagnostics[0]?.code, "YKP-SCHEMA-003");

  const conflict = calculateEffectiveSchema(acceptedPolicy(), { fields: [
    { providerId: "field-area", name: "Area", kind: "text" },
    { providerId: "field-date", name: "Target date", kind: "date" }
  ] });
  assert.equal(conflict.executable, false);
  assert.equal(conflict.diagnostics[0]?.code, "YKP-SCHEMA-004");
});

test("rejects policy-to-observed comparison-fold collisions", () => {
  const result = calculateEffectiveSchema(acceptedPolicy(), { fields: [
    { providerId: "field-area", name: "Ａrea", kind: "single_select", options: [] },
    { providerId: "field-date", name: "Target date", kind: "date" }
  ] });
  assert.equal(result.executable, false);
  assert.equal(result.diagnostics[0]?.code, "YKP-SCHEMA-005");
});

test("rejects ambiguous observed names and duplicate provider identifiers", () => {
  const result = calculateEffectiveSchema(acceptedPolicy(), { fields: [
    { providerId: "same-id", name: "Area", kind: "single_select", options: [] },
    { providerId: "same-id", name: "Ａrea", kind: "single_select", options: [] }
  ] });
  assert.equal(result.executable, false);
  assert.equal(result.operations.length, 0);
  assert.ok(result.diagnostics.every((item) => item.code === "YKP-SCHEMA-002"));
});

test("preserves unmanaged observed fields without proposing deletion", () => {
  const result = calculateEffectiveSchema(acceptedPolicy(), { fields: [
    { providerId: "field-area", name: "Area", kind: "single_select", options: [
      { providerId: "option-architecture", name: "Architecture" },
      { providerId: "option-runtime", name: "Runtime" },
      { providerId: "option-extra", name: "Extra" }
    ] },
    { providerId: "field-date", name: "Target date", kind: "date" },
    { providerId: "field-extra", name: "Unmanaged", kind: "text" }
  ] });
  assert.equal(result.executable, true);
  assert.deepEqual(result.observations, [{ type: "preserve_unmanaged_field", name: "Unmanaged" }]);
  assert.ok(result.operations.every((item) => !item.type.includes("delete") && !item.type.includes("rename")));
});

test("produces identical output for repeated identical input", () => {
  const policy = acceptedPolicy();
  const observed: ObservedSchema = { fields: [{ providerId: "field-date", name: "Target date", kind: "date" }] };
  assert.deepEqual(calculateEffectiveSchema(policy, observed), calculateEffectiveSchema(policy, observed));
});
