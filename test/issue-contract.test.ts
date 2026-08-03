import assert from "node:assert/strict";
import test from "node:test";
import { parseIssueContract } from "../src/index.js";

function block(content: string): string {
  return `A synthetic issue.\n\n<!-- yukh:issue:v1\n${content}\n-->\n`;
}

const valid = `schema: 1
work_type: feature
area: runtime
priority: P1
size: M
estimate: 3
iteration: cycle-1
project:
  status: ready
  start_date: 2026-08-01
  target_date: 2026-08-31
relationships:
  parent: 41
  blocked_by: [52, 53]`;

test("returns no contract and no diagnostic when the envelope is absent", () => {
  assert.deepEqual(parseIssueContract("ordinary issue text"), { contract: null, diagnostics: [] });
});

test("parses a valid synthetic contract", () => {
  const result = parseIssueContract(block(valid), { issueNumber: 40 });
  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.contract?.schema, 1);
  assert.deepEqual(result.contract?.relationships?.blocked_by, [52, 53]);
});

test("rejects duplicate and unterminated envelopes", () => {
  assert.equal(parseIssueContract(`${block(valid)}\n${block(valid)}`).diagnostics[0]?.code, "YKP-CONTRACT-002");
  assert.equal(parseIssueContract(`<!-- yukh:issue:v1\n${valid}`).diagnostics[0]?.code, "YKP-CONTRACT-002");
});

test("rejects body and block byte limits before semantic parsing", () => {
  assert.equal(parseIssueContract("x".repeat(256 * 1024 + 1)).diagnostics[0]?.code, "YKP-CONTRACT-003");
  assert.equal(parseIssueContract(block(`schema: 1\nwork_type: feature\narea: ${"x".repeat(17 * 1024)}`)).diagnostics[0]?.code, "YKP-CONTRACT-003");
});

test("emits exactly one diagnostic for every missing required field", () => {
  const diagnostics = parseIssueContract(block("priority: P1")).diagnostics;
  assert.deepEqual(diagnostics.map((item) => [item.code, item.path]), [
    ["YKP-CONTRACT-001", "$.area"],
    ["YKP-CONTRACT-001", "$.schema"],
    ["YKP-CONTRACT-001", "$.work_type"]
  ]);
});

test("rejects aliases, explicit tags, duplicate keys, and multiple documents", () => {
  const samples = [
    "schema: 1\nwork_type: feature\narea: &area runtime\npriority: *area",
    "schema: 1\nwork_type: feature\narea: !!str runtime",
    "schema: 1\nschema: 1\nwork_type: feature\narea: runtime",
    "schema: 1\nwork_type: feature\narea: runtime\n---\nschema: 1"
  ];
  for (const sample of samples) assert.equal(parseIssueContract(block(sample)).diagnostics[0]?.code, "YKP-CONTRACT-004");
});

test("rejects unknown fields and invalid types without echoing input", () => {
  const diagnostics = parseIssueContract(block("schema: 1\nwork_type: feature\narea: runtime\nsecret: should-not-echo\nestimate: three")).diagnostics;
  assert.deepEqual(diagnostics.map((item) => item.code), ["YKP-CONTRACT-006", "YKP-CONTRACT-007"]);
  assert.ok(diagnostics.every((item) => !item.message.includes("should-not-echo")));
});

test("rejects unsupported values and inconsistent dates", () => {
  const result = parseIssueContract(block("schema: 2\nwork_type: story\narea: runtime\nproject:\n  start_date: 2026-09-01\n  target_date: 2026-08-31"));
  assert.deepEqual(result.diagnostics.map((item) => item.code), ["YKP-CONTRACT-008", "YKP-CONTRACT-008", "YKP-CONTRACT-011"]);
});

test("rejects duplicate and self relationships", () => {
  const result = parseIssueContract(block("schema: 1\nwork_type: feature\narea: runtime\nrelationships:\n  parent: 40\n  blocked_by: [52, 52, 40]"), { issueNumber: 40 });
  assert.deepEqual(result.diagnostics.map((item) => item.code), ["YKP-CONTRACT-009", "YKP-CONTRACT-010", "YKP-CONTRACT-010"]);
});

test("enforces mapping depth and sequence length", () => {
  const deep = "schema: 1\nwork_type: feature\narea: runtime\nproject:\n  status: value";
  const tooMany = Array.from({ length: 101 }, (_, index) => index + 1).join(", ");
  assert.equal(parseIssueContract(block(deep)).diagnostics.length, 0);
  assert.equal(parseIssueContract(block(`schema: 1\nwork_type: feature\narea: runtime\nrelationships:\n  blocks: [${tooMany}]`)).diagnostics[0]?.code, "YKP-CONTRACT-005");
});

test("normalizes vocabulary edges while preserving inert content", () => {
  const result = parseIssueContract(block("schema: 1\nwork_type: feature\narea: \"  runtime  \"\npriority: \"$(not-executed)\""));
  assert.equal(result.contract?.area, "runtime");
  assert.equal(result.contract?.priority, "$(not-executed)");
});
