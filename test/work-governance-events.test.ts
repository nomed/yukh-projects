import assert from "node:assert/strict";
import test from "node:test";
import {
  WorkGovernanceEventError,
  canonicalWorkGovernanceJson,
  createInMemoryWorkGovernanceEventStoreV1,
  encodeWorkGovernanceEventV1,
  parseWorkGovernanceCommandV1,
  parseWorkGovernanceEventV1,
  workGovernancePartitionTokenV1,
  type WorkGovernanceCommandV1
} from "../src/work-governance-events.js";

const ids = [
  "018f0000-0000-7000-8000-000000000001",
  "018f0000-0000-7000-8000-000000000002",
  "018f0000-0000-7000-8000-000000000003"
];
const digest = (character: string) => `sha-256:${character.repeat(64)}`;
function command(revision = 0, commandId = ids[0]!): WorkGovernanceCommandV1 {
  return {
    schema: "yukh-projects-command-v1", command_id: commandId, storage_epoch: 1,
    namespace_id: "namespace:example", project_id: "project:example", run_id: "run:example",
    aggregate: { kind: "work_item", id: "work-item:example", expected_revision: revision },
    actor: { subject_id: "subject:example", claim_id: "claim:example", lease_id: "lease:example" },
    policy: { version: "policy-v1", digest: digest("a") }, correlation_id: ids[1]!, causation_id: ids[2]!,
    data: { intent: "synthetic" }
  };
}
function fixtureStore() {
  let sequence = 0;
  return createInMemoryWorkGovernanceEventStoreV1({
    eventId: () => `018f0000-0000-7000-8000-${String(++sequence).padStart(12, "0")}`,
    occurredAt: () => `2026-08-17T12:00:0${sequence}.000Z`
  });
}
function isCode(code: string) { return (error: unknown) => error instanceof WorkGovernanceEventError && error.code === code; }

test("canonicalizes bounded JSON and rejects unsafe values", () => {
  assert.equal(canonicalWorkGovernanceJson({ z: 1, a: [true, "é"] }), '{"a":[true,"é"],"z":1}');
  assert.equal(canonicalWorkGovernanceJson([333333333.33333329, 1e30, 4.50, 2e-3, 1e-27]), "[333333333.3333333,1e+30,4.5,0.002,1e-27]");
  assert.throws(() => canonicalWorkGovernanceJson({ value: Number.NaN }), isCode("YKP-WORK-001"));
  assert.throws(() => canonicalWorkGovernanceJson({ value: "\ud800" }), isCode("YKP-WORK-001"));
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
  assert.throws(() => canonicalWorkGovernanceJson(cyclic), isCode("YKP-WORK-001"));
  const accessor = Object.defineProperty({}, "value", { enumerable: true, get: () => "not evaluated" });
  assert.throws(() => canonicalWorkGovernanceJson(accessor), isCode("YKP-WORK-001"));
  assert.throws(() => canonicalWorkGovernanceJson(new Array(1)), isCode("YKP-WORK-001"));
});

test("strict command codec accepts canonical input and rejects aliases", () => {
  const source = canonicalWorkGovernanceJson(command());
  assert.deepEqual(parseWorkGovernanceCommandV1(source), command());
  assert.throws(() => parseWorkGovernanceCommandV1(` ${source}`), isCode("YKP-WORK-001"));
  assert.throws(() => parseWorkGovernanceCommandV1(canonicalWorkGovernanceJson({ ...command(), provider_url: "https://private.invalid" })), isCode("YKP-WORK-001"));
});

test("appends revision-bound events and chains their digests", () => {
  const store = fixtureStore();
  const first = store.append({ command: command(), event_type: "work_item.created.v1", data: { title: "Synthetic task" } });
  assert.equal(first.outcome, "appended"); assert.equal(first.event.aggregate.revision, 1); assert.equal(first.event.previous, undefined);
  assert.equal(parseWorkGovernanceEventV1(encodeWorkGovernanceEventV1(first.event)).event_id, first.event.event_id);
  const second = store.append({ command: command(1, ids[1]!), event_type: "work_item.workflow_transitioned.v1", evidence: [{ kind: "verification", uri: "urn:example:evidence:1", digest: digest("b") }], data: { from: "backlog", to: "ready" } });
  assert.equal(second.event.aggregate.revision, 2);
  assert.deepEqual(second.event.previous, { event_id: first.event.event_id, digest: first.event.event_digest });
  assert.deepEqual(store.events("namespace:example", "work_item", "work-item:example"), [first.event, second.event]);
});

test("exact retries replay while stale and divergent requests fail closed", () => {
  const store = fixtureStore(); const request = { command: command(), event_type: "work_item.created.v1", data: { title: "Synthetic task" } } as const;
  const first = store.append(request); const replay = store.append(request);
  assert.equal(replay.outcome, "replayed"); assert.deepEqual(replay.event, first.event); assert.equal(store.events("namespace:example", "work_item", "work-item:example").length, 1);
  assert.throws(() => store.append({ ...request, data: { title: "Changed" } }), isCode("YKP-WORK-003"));
  assert.throws(() => store.append({ command: command(0, ids[1]!), event_type: "work_item.content_updated.v1", data: {} }), isCode("YKP-WORK-002"));
});

test("event codec rejects noncanonical, broken, and oversized events", () => {
  const event = fixtureStore().append({ command: command(), event_type: "work_item.created.v1", data: {} }).event;
  const source = encodeWorkGovernanceEventV1(event);
  assert.throws(() => parseWorkGovernanceEventV1(`${source}\n`), isCode("YKP-WORK-001"));
  assert.throws(() => parseWorkGovernanceEventV1(canonicalWorkGovernanceJson({ ...event, event_digest: digest("f") })), isCode("YKP-WORK-001"));
  assert.throws(() => fixtureStore().append({ command: command(), event_type: "work_item.created.v1", data: { body: "x".repeat(70_000) } }), isCode("YKP-WORK-001"));
});

test("partition tokens are stable, opaque, and aggregate-specific", () => {
  const first = workGovernancePartitionTokenV1("namespace:example", "work_item", "work-item:example");
  assert.match(first, /^[a-z2-7]{32}$/u);
  assert.equal(first, workGovernancePartitionTokenV1("namespace:example", "work_item", "work-item:example"));
  assert.notEqual(first, workGovernancePartitionTokenV1("namespace:example", "namespace_graph", "graph:example"));
  assert.doesNotMatch(first, /namespace|work|example/u);
});
