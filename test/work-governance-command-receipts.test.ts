import assert from "node:assert/strict";
import test from "node:test";
import {
  WORK_GOVERNANCE_COMMAND_RECEIPTS_BUCKET_V1,
  WorkGovernanceCommandReceiptError,
  WorkGovernanceJetStreamError,
  createInMemoryWorkGovernanceEventStoreV1,
  createWorkGovernanceCommandAppendCoordinatorV1,
  createWorkGovernanceCommandReceiptStoreV1,
  encodeWorkGovernanceCommandReceiptV1,
  parseWorkGovernanceCommandReceiptV1,
  workGovernanceCommandReceiptKeyV1,
  verifyWorkGovernanceCommandReceiptKvConfigV1,
  type WorkGovernanceCommandReceiptKvPortsV1,
  type WorkGovernanceCommandV1
} from "../src/index.js";

const commandId = "018f3000-0000-7000-8000-000000000001";
const correlationId = "018f3000-0000-7000-8000-000000000002";
const causationId = "018f3000-0000-7000-8000-000000000003";
const eventId = "018f3000-0000-7000-8000-000000000004";
const digest = `sha-256:${"a".repeat(64)}`;
const bucket = { maxBytes: 1024 * 1024, replicas: 1 } as const;

function command(): WorkGovernanceCommandV1 {
  return {
    schema: "yukh-projects-command-v1", command_id: commandId, storage_epoch: 23,
    namespace_id: "namespace:synthetic", project_id: "project:synthetic",
    aggregate: { kind: "work_item", id: "work-item:synthetic", expected_revision: 0 },
    actor: { subject_id: "subject:synthetic" }, policy: { version: "policy-v1", digest },
    correlation_id: correlationId, causation_id: causationId, data: { intent: "create" }
  };
}
function fixture() {
  const value = command();
  const events = createInMemoryWorkGovernanceEventStoreV1({
    storageEpoch: 23, eventId: () => eventId, occurredAt: () => "2026-08-17T20:00:00.000Z"
  });
  return { command: value, event: events.append({ command: value, event_type: "work_item.created.v1", data: { title: "Synthetic" } }).event };
}
function status() {
  return {
    bucket: WORK_GOVERNANCE_COMMAND_RECEIPTS_BUCKET_V1, history: 1, ttl: 0, markerTTL: 0,
    storage: "file", replicas: 1, description: "Yukh Projects command receipts v1",
    max_bytes: bucket.maxBytes, maxValueSize: 8 * 1024,
    streamInfo: { config: { subjects: ["$KV.YKP_COMMAND_RECEIPTS_V1.>"], retention: "limits", discard: "new",
      max_msgs: -1, max_msgs_per_subject: 1, max_age: 0, storage: "file", num_replicas: 1,
      max_bytes: bucket.maxBytes, max_msg_size: 8 * 1024, allow_direct: false, allow_msg_ttl: false,
      allow_rollup_hdrs: true } }
  };
}
function memoryPorts(): WorkGovernanceCommandReceiptKvPortsV1 & { writes: number } {
  const values = new Map<string, { data: Uint8Array; revision: number }>(); let revision = 0;
  return {
    writes: 0,
    async status() { return status(); },
    async get(key) { const found = values.get(key); return found ? { data: found.data.slice(), revision: found.revision } : null; },
    async create(key, data) {
      await new Promise<void>((resolve) => setImmediate(resolve));
      if (values.has(key)) return { outcome: "conflict" };
      const entry = { data: data.slice(), revision: ++revision }; values.set(key, entry); this.writes++;
      return { outcome: "created", revision: entry.revision };
    },
    async update(key, data, expected) {
      const found = values.get(key); if (!found || found.revision !== expected) return { outcome: "conflict" };
      const entry = { data: data.slice(), revision: ++revision }; values.set(key, entry); this.writes++;
      return { outcome: "updated", revision: entry.revision };
    }
  };
}
function isReceiptCode(code: string) {
  return (error: unknown) => error instanceof WorkGovernanceCommandReceiptError && error.code === code &&
    error.message === "work-governance command receipt operation failed";
}

test("encodes strict bounded receipts and derives opaque fixed keys", () => {
  const receipt = {
    schema: "yukh-projects-command-receipt-v1" as const, storage_epoch: 23, command_id: commandId,
    command_digest: digest, event_id: eventId, event_digest: digest, aggregate_revision: 1, state: "reserved" as const
  };
  const encoded = encodeWorkGovernanceCommandReceiptV1(receipt);
  assert.deepEqual(parseWorkGovernanceCommandReceiptV1(encoded), receipt);
  const key = workGovernanceCommandReceiptKeyV1(commandId);
  assert.match(key, /^[0-9a-f]{64}$/u); assert.doesNotMatch(key, /018f3000/u);
  assert.throws(() => parseWorkGovernanceCommandReceiptV1(JSON.stringify(receipt)), isReceiptCode("YKP-WORK-RECEIPT-003"));
  assert.throws(() => parseWorkGovernanceCommandReceiptV1(`${encoded} `), isReceiptCode("YKP-WORK-RECEIPT-003"));
});

test("verifies the exact file-backed no-TTL history-one bucket", () => {
  assert.doesNotThrow(() => verifyWorkGovernanceCommandReceiptKvConfigV1(status(), bucket));
  for (const unsafe of [
    { ...status(), history: 2 }, { ...status(), ttl: 1 }, { ...status(), storage: "memory" },
    { ...status(), streamInfo: { config: { ...status().streamInfo.config, discard: "old" } } },
    { ...status(), streamInfo: { config: { ...status().streamInfo.config, discard_new_per_subject: true } } },
    { ...status(), streamInfo: { config: { ...status().streamInfo.config, sealed: true } } },
    { ...status(), streamInfo: { config: { ...status().streamInfo.config, no_ack: true } } },
    { ...status(), streamInfo: { config: { ...status().streamInfo.config, allow_direct: true } } },
    { ...status(), streamInfo: { config: { ...status().streamInfo.config, republish: { src: ">", dest: "copy.>" } } } }
  ]) assert.throws(() => verifyWorkGovernanceCommandReceiptKvConfigV1(unsafe, bucket), isReceiptCode("YKP-WORK-RECEIPT-003"));
});

test("concurrent exact reservations converge and changed command bytes fail closed", async () => {
  const ports = memoryPorts(); const store = createWorkGovernanceCommandReceiptStoreV1({ storageEpoch: 23, bucket, ports });
  const { command: value, event } = fixture();
  const [left, right] = await Promise.all([store.reserve(value, event), store.reserve(value, event)]);
  assert.deepEqual(new Set([left.outcome, right.outcome]), new Set(["reserved", "existing"]));
  assert.equal(left.record.receipt.command_digest, right.record.receipt.command_digest); assert.equal(ports.writes, 1);
  await assert.rejects(store.reserve({ ...value, data: { intent: "different" } }, event), isReceiptCode("YKP-WORK-RECEIPT-002"));
  assert.equal(ports.writes, 1);
});

test("persists completion_unknown and requires explicit exact-event resolution", async () => {
  const ports = memoryPorts();
  const receipts = createWorkGovernanceCommandReceiptStoreV1({ storageEpoch: 23, bucket, ports });
  const { command: value, event } = fixture(); let calls = 0;
  const coordinator = createWorkGovernanceCommandAppendCoordinatorV1({
    receipts,
    appender: { storageProfile: { storage_epoch: 23, replicas: 1 }, async append(input) {
      calls++;
      if (calls === 1) throw new WorkGovernanceJetStreamError("YKP-WORK-JS-005");
      return { outcome: "replayed", event: input, persistence: { stream_sequence: 41 } };
    } }
  });
  await assert.rejects(coordinator.append(value, event), (error: unknown) =>
    error instanceof WorkGovernanceJetStreamError && error.code === "YKP-WORK-JS-005");
  const unknown = await receipts.reserve(value, event); assert.equal(unknown.record.receipt.state, "completion_unknown");
  await assert.rejects(coordinator.append(value, event), isReceiptCode("YKP-WORK-RECEIPT-006"));
  assert.equal(calls, 1);
  const resolved = await coordinator.resolveCompletionUnknown(value, event);
  assert.equal(resolved.outcome, "replayed"); assert.equal(resolved.receipt.state, "appended");
  assert.equal(resolved.receipt.stream_sequence, 41); assert.equal(calls, 2);
  const replay = await coordinator.append(value, event); assert.equal(replay.outcome, "replayed"); assert.equal(calls, 2);
});

test("an existing reservation blocks ordinary publication after a crash boundary", async () => {
  const ports = memoryPorts();
  const receipts = createWorkGovernanceCommandReceiptStoreV1({ storageEpoch: 23, bucket, ports });
  const { command: value, event } = fixture(); let calls = 0;
  await receipts.reserve(value, event);
  const coordinator = createWorkGovernanceCommandAppendCoordinatorV1({
    receipts, appender: { storageProfile: { storage_epoch: 23, replicas: 1 }, async append(input) { calls++; return { outcome: "appended", event: input, persistence: { stream_sequence: 7 } }; } }
  });
  await assert.rejects(coordinator.append(value, event), isReceiptCode("YKP-WORK-RECEIPT-006"));
  assert.equal(calls, 0);
  const resolved = await coordinator.resolveCompletionUnknown(value, event);
  assert.equal(resolved.receipt.state, "appended"); assert.equal(calls, 1);
});

test("coordinator rejects a receipt bucket with a different epoch or replica profile", () => {
  const receipts = createWorkGovernanceCommandReceiptStoreV1({ storageEpoch: 23, bucket, ports: memoryPorts() });
  const append = async (event: ReturnType<typeof fixture>["event"]) =>
    ({ outcome: "appended" as const, event, persistence: { stream_sequence: 1 } });
  assert.throws(
    () => createWorkGovernanceCommandAppendCoordinatorV1({ receipts, appender: { storageProfile: { storage_epoch: 23, replicas: 3 }, append } }),
    isReceiptCode("YKP-WORK-RECEIPT-001")
  );
  assert.throws(
    () => createWorkGovernanceCommandAppendCoordinatorV1({ receipts, appender: { storageProfile: { storage_epoch: 24, replicas: 1 }, append } }),
    isReceiptCode("YKP-WORK-RECEIPT-001")
  );
});

test("post-publication verification ambiguity becomes durable completion_unknown", async () => {
  const receipts = createWorkGovernanceCommandReceiptStoreV1({ storageEpoch: 23, bucket, ports: memoryPorts() });
  const { command: value, event } = fixture();
  const coordinator = createWorkGovernanceCommandAppendCoordinatorV1({
    receipts,
    appender: {
      storageProfile: { storage_epoch: 23, replicas: 1 },
      async append() { throw new WorkGovernanceJetStreamError("YKP-WORK-JS-006"); }
    }
  });
  await assert.rejects(coordinator.append(value, event), (error: unknown) =>
    error instanceof WorkGovernanceJetStreamError && error.code === "YKP-WORK-JS-006");
  assert.equal((await receipts.reserve(value, event)).record.receipt.state, "completion_unknown");
});
