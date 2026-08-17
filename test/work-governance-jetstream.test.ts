import assert from "node:assert/strict";
import test from "node:test";
import {
  WORK_GOVERNANCE_STREAM_V1,
  WorkGovernanceJetStreamError,
  createWorkGovernanceJetStreamAppenderV1,
  workGovernanceJetStreamConfigV1,
  workGovernanceJetStreamSubjectV1,
  type WorkGovernanceJetStreamPortsV1,
  type WorkGovernancePublishRequestV1,
  type WorkGovernanceEventV1
} from "../src/index.js";
import { createInMemoryWorkGovernanceEventStoreV1, encodeWorkGovernanceEventV1, type WorkGovernanceCommandV1 } from "../src/work-governance-events.js";

const ids = [
  "018f0000-0000-7000-8000-000000000001",
  "018f0000-0000-7000-8000-000000000002",
  "018f0000-0000-7000-8000-000000000003",
  "018f0000-0000-7000-8000-000000000004",
  "018f0000-0000-7000-8000-000000000005"
];
const digest = (character: string) => `sha-256:${character.repeat(64)}`;

function command(id: string, expectedRevision: number, aggregateId = "work-item:alpha"): WorkGovernanceCommandV1 {
  return {
    schema: "yukh-projects-command-v1", command_id: id, storage_epoch: 7,
    namespace_id: "namespace:synthetic", project_id: "project:synthetic",
    aggregate: { kind: "work_item", id: aggregateId, expected_revision: expectedRevision },
    actor: { subject_id: "subject:synthetic" }, policy: { version: "policy-v1", digest: digest("a") },
    correlation_id: ids[3]!, causation_id: ids[4]!, data: { intent: "qualification" }
  };
}

function events() {
  let sequence = 0;
  const store = createInMemoryWorkGovernanceEventStoreV1({
    storageEpoch: 7,
    eventId: () => `018f0000-0000-7000-8000-${String(++sequence).padStart(12, "0")}`,
    occurredAt: () => `2026-08-17T13:00:0${sequence}.000Z`
  });
  const first = store.append({ command: command(ids[0]!, 0), event_type: "work_item.created.v1", data: { title: "Alpha" } }).event;
  const second = store.append({ command: command(ids[1]!, 1), event_type: "work_item.workflow_transitioned.v1", data: { to: "ready" } }).event;
  const other = store.append({ command: command(ids[2]!, 0, "work-item:beta"), event_type: "work_item.created.v1", data: { title: "Beta" } }).event;
  return { first, second, other };
}

function isCode(code: string) {
  return (error: unknown) => error instanceof WorkGovernanceJetStreamError && error.code === code &&
    error.message === "work-governance JetStream append failed";
}

function fakePorts(last: WorkGovernanceEventV1 | null, lastSequence = 0) {
  const calls: Array<{ subject: string; data: Uint8Array; request: WorkGovernancePublishRequestV1 }> = [];
  const ports: WorkGovernanceJetStreamPortsV1 = {
    async getLastMessage() {
      return last === null ? null : { sequence: lastSequence, data: new TextEncoder().encode(encodeWorkGovernanceEventV1(last)) };
    },
    async publish(subject, data, request) {
      calls.push({ subject, data, request });
      return { stream: WORK_GOVERNANCE_STREAM_V1, sequence: Math.max(1, lastSequence + 7), duplicate: false };
    }
  };
  return { ports, calls };
}

test("builds a fixed append-only file stream configuration", () => {
  const config = workGovernanceJetStreamConfigV1({ maxBytes: 8 * 1024 * 1024, replicas: 3 });
  assert.equal(config.name, WORK_GOVERNANCE_STREAM_V1);
  assert.deepEqual(config.subjects, ["ykp.v1.events.*"]);
  assert.equal(config.storage, "file"); assert.equal(config.retention, "limits"); assert.equal(config.discard, "new");
  assert.equal(config.max_msgs, -1); assert.equal(config.max_msgs_per_subject, -1); assert.equal(config.max_age, 0);
  assert.equal(config.deny_delete, true); assert.equal(config.deny_purge, true); assert.equal(config.allow_rollup_hdrs, false);
  assert.equal(config.allow_direct, false); assert.equal(config.allow_msg_ttl, false); assert.equal(config.persist_mode, "default");
  assert.throws(() => workGovernanceJetStreamConfigV1({ maxBytes: 1024, replicas: 2 }), isCode("YKP-WORK-JS-001"));
});

test("publishes the first event with broker-enforced empty-subject expectation", async () => {
  const { first } = events(); const fake = fakePorts(null);
  const result = await createWorkGovernanceJetStreamAppenderV1({ storageEpoch: 7, ports: fake.ports }).append(first);
  assert.equal(result.outcome, "appended"); assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0]!.subject, workGovernanceJetStreamSubjectV1(first));
  assert.deepEqual(fake.calls[0]!.request, { stream: WORK_GOVERNANCE_STREAM_V1, messageId: first.event_id, lastSubjectSequence: 0 });
  assert.deepEqual(new TextDecoder().decode(fake.calls[0]!.data), encodeWorkGovernanceEventV1(first));
});

test("uses the last subject stream sequence, not the aggregate revision", async () => {
  const { first, second } = events(); const fake = fakePorts(first, 41);
  const result = await createWorkGovernanceJetStreamAppenderV1({ storageEpoch: 7, ports: fake.ports }).append(second);
  assert.equal(result.receipt.sequence, 48);
  assert.equal(fake.calls[0]!.request.lastSubjectSequence, 41);
  assert.notEqual(fake.calls[0]!.request.lastSubjectSequence, first.aggregate.revision);
});

test("replays an exact existing event without publishing", async () => {
  const { first } = events(); const fake = fakePorts(first, 17);
  const result = await createWorkGovernanceJetStreamAppenderV1({ storageEpoch: 7, ports: fake.ports }).append(first);
  assert.equal(result.outcome, "replayed"); assert.equal(result.receipt.sequence, 17); assert.equal(fake.calls.length, 0);
});

test("rejects stale chains and corrupted stored messages before publishing", async () => {
  const { first, second, other } = events();
  await assert.rejects(
    createWorkGovernanceJetStreamAppenderV1({ storageEpoch: 7, ports: fakePorts(second, 12).ports }).append(first),
    isCode("YKP-WORK-JS-002")
  );
  await assert.rejects(
    createWorkGovernanceJetStreamAppenderV1({ storageEpoch: 7, ports: fakePorts(other, 12).ports }).append(second),
    isCode("YKP-WORK-JS-003")
  );
});

test("redacts transport failures and fails closed on invalid acknowledgements", async () => {
  const { first } = events();
  const unavailable: WorkGovernanceJetStreamPortsV1 = {
    async getLastMessage() { throw new Error("nats://secret.internal private-token"); },
    async publish() { throw new Error("unreachable"); }
  };
  await assert.rejects(
    createWorkGovernanceJetStreamAppenderV1({ storageEpoch: 7, ports: unavailable }).append(first),
    isCode("YKP-WORK-JS-004")
  );
  const invalidAck: WorkGovernanceJetStreamPortsV1 = {
    async getLastMessage() { return null; },
    async publish() { return { stream: "WRONG", sequence: 1, duplicate: false }; }
  };
  await assert.rejects(
    createWorkGovernanceJetStreamAppenderV1({ storageEpoch: 7, ports: invalidAck }).append(first),
    isCode("YKP-WORK-JS-003")
  );
});
