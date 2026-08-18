import assert from "node:assert/strict";
import test from "node:test";
import {
  WORK_GOVERNANCE_STREAM_V1,
  WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_CONSUMER_DURABLE_V1,
  WorkGovernanceProjectorConsumerError,
  createInMemoryWorkGovernanceEventStoreV1,
  createWorkGovernanceWorkItemProjectorConsumerV1,
  encodeWorkGovernanceEventV1,
  verifyWorkGovernanceProjectorConsumerConfigV1,
  workGovernanceJetStreamConfigV1,
  workGovernanceProjectorConsumerConfigV1,
  type WorkGovernanceCommandV1,
  type WorkGovernanceEventV1,
  type WorkGovernanceProjectorConsumerMessageV1,
  type WorkGovernanceProjectorConsumerPortsV1
} from "../src/index.js";

const digest = `sha-256:${"a".repeat(64)}`;
const stream = { maxBytes: 2 * 1024 * 1024, replicas: 1 } as const;
const consumer = { replicas: 1 } as const;
const ids = [
  "018f7000-0000-7000-8000-000000000001", "018f7000-0000-7000-8000-000000000002",
  "018f7000-0000-7000-8000-000000000003", "018f7000-0000-7000-8000-000000000004",
  "018f7000-0000-7000-8000-000000000005", "018f7000-0000-7000-8000-000000000006"
];

function command(id: string, revision: number): WorkGovernanceCommandV1 {
  return {
    schema: "yukh-projects-command-v1", command_id: id, storage_epoch: 37,
    namespace_id: "namespace:synthetic", project_id: "project:synthetic",
    aggregate: { kind: "work_item", id: "work-item:synthetic", expected_revision: revision },
    actor: { subject_id: "subject:synthetic" }, policy: { version: "policy-v1", digest },
    correlation_id: ids[4]!, causation_id: ids[5]!, data: {}
  };
}

function events() {
  let index = 0;
  const store = createInMemoryWorkGovernanceEventStoreV1({
    storageEpoch: 37,
    eventId: () => [ids[0]!, ids[2]!][index]!,
    occurredAt: () => ["2026-08-18T01:00:00.000Z", "2026-08-18T01:00:01.000Z"][index++]!
  });
  const created = store.append({
    command: command(ids[1]!, 0), event_type: "work_item.created.v1", data: { title: "Synthetic" }
  }).event;
  const transitioned = store.append({
    command: command(ids[3]!, 1), event_type: "work_item.workflow_transitioned.v1", data: { to: "ready" }
  }).event;
  return { created, transitioned };
}

function message(sequence: number, event: WorkGovernanceEventV1, ack: () => Promise<{ outcome: "acknowledged" } | { outcome: "rejected" }>): WorkGovernanceProjectorConsumerMessageV1 {
  return {
    stream_sequence: sequence,
    data: new TextEncoder().encode(encodeWorkGovernanceEventV1(event)),
    ack
  };
}

function ports(messages: WorkGovernanceProjectorConsumerMessageV1[], consumerConfig: unknown = workGovernanceProjectorConsumerConfigV1(consumer)): WorkGovernanceProjectorConsumerPortsV1 {
  return {
    async getStreamConfig(name) {
      assert.equal(name, WORK_GOVERNANCE_STREAM_V1);
      return workGovernanceJetStreamConfigV1(stream);
    },
    async getConsumerConfig(name, durable) {
      assert.equal(name, WORK_GOVERNANCE_STREAM_V1);
      assert.equal(durable, WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_CONSUMER_DURABLE_V1);
      return consumerConfig;
    },
    async fetch(request) {
      assert.equal(request.stream, WORK_GOVERNANCE_STREAM_V1);
      assert.equal(request.durable, WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_CONSUMER_DURABLE_V1);
      assert.equal(request.maxMessages, 32);
      assert.equal(request.expiresMillis, 1000);
      return messages.splice(0, request.maxMessages);
    }
  };
}

function isCode(code: string) {
  return (error: unknown) => error instanceof WorkGovernanceProjectorConsumerError && error.code === code &&
    error.message === "work-governance projector consumer operation failed";
}

test("verifies the exact durable pull-consumer runtime profile", () => {
  const config = workGovernanceProjectorConsumerConfigV1(consumer);
  assert.doesNotThrow(() => verifyWorkGovernanceProjectorConsumerConfigV1(config, consumer));
  assert.doesNotThrow(() => verifyWorkGovernanceProjectorConsumerConfigV1({
    ...config,
    mem_storage: undefined,
    headers_only: undefined,
    metadata: { "_nats.ver": "2.12.0" }
  }, consumer));
  for (const unsafe of [
    { ...config, ack_policy: "none" },
    { ...config, deliver_policy: "new" },
    { ...config, max_ack_pending: 2 },
    { ...config, filter_subject: "ykp.v1.events.private" },
    { ...config, mem_storage: true },
    { ...config, metadata: { adopter: "example" } }
  ]) {
    assert.throws(() => verifyWorkGovernanceProjectorConsumerConfigV1(unsafe, consumer),
      isCode("YKP-WORK-CONSUMER-003"));
  }
});

test("acknowledges a fetched message only after the projector checkpoint path returns", async () => {
  const { created } = events();
  const order: string[] = [];
  const runtime = createWorkGovernanceWorkItemProjectorConsumerV1({
    storageEpoch: 37, stream, consumer,
    ports: ports([message(1, created, async () => { order.push("ack"); return { outcome: "acknowledged" }; })]),
    projector: { async apply(input) {
      assert.equal(input.stream_sequence, 1);
      assert.equal(input.event.event_id, created.event_id);
      order.push("apply");
    } }
  });
  const result = await runtime.runOnce();
  assert.deepEqual(order, ["apply", "ack"]);
  assert.deepEqual(result, { outcome: "processed", fetched: 1, acknowledged: 1, last_stream_sequence: 1 });
});

test("does not acknowledge when projector application fails", async () => {
  const { created } = events();
  let acked = false;
  const runtime = createWorkGovernanceWorkItemProjectorConsumerV1({
    storageEpoch: 37, stream, consumer,
    ports: ports([message(1, created, async () => { acked = true; return { outcome: "acknowledged" }; })]),
    projector: { async apply() { throw new Error("private checkpoint failure"); } }
  });
  await assert.rejects(runtime.runOnce(), /private checkpoint failure/u);
  assert.equal(acked, false);
});

test("fails after a non-durable ack and allows redelivery to replay safely", async () => {
  const { created } = events();
  const applied: number[] = [];
  const first = message(1, created, async () => ({ outcome: "rejected" }));
  const second = message(1, created, async () => ({ outcome: "acknowledged" }));
  const redeliveries = [first, second];
  const runtime = createWorkGovernanceWorkItemProjectorConsumerV1({
    storageEpoch: 37, stream, consumer,
    ports: { ...ports([]), async fetch() { return redeliveries.splice(0, 1); } },
    projector: { async apply(input) { applied.push(input.stream_sequence); } }
  });
  await assert.rejects(runtime.runOnce(), isCode("YKP-WORK-CONSUMER-005"));
  const recovered = await runtime.runOnce();
  assert.deepEqual(applied, [1, 1]);
  assert.equal(recovered.outcome, "processed");
  assert.equal(recovered.acknowledged, 1);
});

test("fails closed before fetch when stream or consumer binding is unsafe", async () => {
  const { created } = events();
  let fetched = false;
  const unsafe = { ...workGovernanceProjectorConsumerConfigV1(consumer), deliver_policy: "new" };
  const runtime = createWorkGovernanceWorkItemProjectorConsumerV1({
    storageEpoch: 37, stream, consumer,
    ports: { ...ports([message(1, created, async () => ({ outcome: "acknowledged" }))], unsafe),
      async fetch(request) { fetched = true; return ports([], unsafe).fetch(request); } },
    projector: { async apply() { assert.fail("projector must not run"); } }
  });
  await assert.rejects(runtime.runOnce(), isCode("YKP-WORK-CONSUMER-003"));
  assert.equal(fetched, false);
});

test("rejects malformed or wrong-epoch messages without acknowledging them", async () => {
  let acked = false;
  const malformed: WorkGovernanceProjectorConsumerMessageV1 = {
    stream_sequence: 1,
    data: new TextEncoder().encode("{}"),
    async ack() { acked = true; return { outcome: "acknowledged" }; }
  };
  const runtime = createWorkGovernanceWorkItemProjectorConsumerV1({
    storageEpoch: 37, stream, consumer,
    ports: ports([malformed]),
    projector: { async apply() { assert.fail("projector must not run"); } }
  });
  await assert.rejects(runtime.runOnce(), isCode("YKP-WORK-CONSUMER-002"));
  assert.equal(acked, false);
});
