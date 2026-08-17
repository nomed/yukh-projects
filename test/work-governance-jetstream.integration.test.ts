import assert from "node:assert/strict";
import test from "node:test";
import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import {
  createInMemoryWorkGovernanceEventStoreV1,
  createWorkGovernanceJetStreamAppenderV1,
  workGovernanceJetStreamConfigV1,
  workGovernanceJetStreamPortsV1,
  type WorkGovernanceCommandV1
} from "../src/index.js";

const enabled = process.env.YUKH_RUN_JETSTREAM_QUALIFICATION === "1";
const server = process.env.YUKH_NATS_URL;
const ids = [
  "018f1000-0000-7000-8000-000000000001", "018f1000-0000-7000-8000-000000000002",
  "018f1000-0000-7000-8000-000000000003", "018f1000-0000-7000-8000-000000000004",
  "018f1000-0000-7000-8000-000000000005"
];
const digest = `sha-256:${"a".repeat(64)}`;
const stream = { maxBytes: 16 * 1024 * 1024, replicas: 1 } as const;
function command(commandId: string, aggregateId: string, revision: number): WorkGovernanceCommandV1 {
  return {
    schema: "yukh-projects-command-v1", command_id: commandId, storage_epoch: 19,
    namespace_id: "namespace:qualification", aggregate: { kind: "work_item", id: aggregateId, expected_revision: revision },
    actor: { subject_id: "subject:qualification" }, policy: { version: "qualification-v1", digest },
    correlation_id: ids[3]!, causation_id: ids[4]!, data: {}
  };
}

function competingEvent(secondEventId: string, secondCommandId: string, target: string) {
  let index = 0;
  const eventIds = ["018f2000-0000-7000-8000-000000000001", secondEventId];
  const store = createInMemoryWorkGovernanceEventStoreV1({
    storageEpoch: 19,
    eventId: () => eventIds[index++]!,
    occurredAt: () => index === 1 ? "2026-08-17T14:01:00.000Z" : "2026-08-17T14:01:01.000Z"
  });
  const first = store.append({
    command: command("018f2000-0000-7000-8000-000000000010", "work-item:race", 0),
    event_type: "work_item.created.v1", data: {}
  }).event;
  const second = store.append({
    command: command(secondCommandId, "work-item:race", 1),
    event_type: "work_item.workflow_transitioned.v1", data: { to: target }
  }).event;
  return { first, second };
}

test("qualifies interleaved aggregate appends against local JetStream", { skip: !enabled }, async () => {
  assert.ok(server, "YUKH_NATS_URL is required");
  const connection = await connect({ servers: server!, maxReconnectAttempts: 0 });
  try {
    const manager = await jetstreamManager(connection);
    await manager.streams.add(workGovernanceJetStreamConfigV1(stream));
    const ports = workGovernanceJetStreamPortsV1(jetstream(connection), manager);
    const appender = createWorkGovernanceJetStreamAppenderV1({
      storageEpoch: 19,
      stream,
      ports
    });
    let sequence = 0;
    const store = createInMemoryWorkGovernanceEventStoreV1({
      storageEpoch: 19,
      eventId: () => `018f1000-0000-7000-8000-${String(++sequence).padStart(12, "0")}`,
      occurredAt: () => `2026-08-17T14:00:0${sequence}.000Z`
    });
    const alpha1 = store.append({ command: command(ids[0]!, "work-item:alpha", 0), event_type: "work_item.created.v1", data: {} }).event;
    const beta1 = store.append({ command: command(ids[1]!, "work-item:beta", 0), event_type: "work_item.created.v1", data: {} }).event;
    const alpha2 = store.append({ command: command(ids[2]!, "work-item:alpha", 1), event_type: "work_item.workflow_transitioned.v1", data: { to: "ready" } }).event;
    assert.equal((await appender.append(alpha1)).persistence.stream_sequence, 1);
    assert.equal((await appender.append(beta1)).persistence.stream_sequence, 2);
    assert.equal((await appender.append(alpha2)).persistence.stream_sequence, 3);
    assert.equal((await appender.append(alpha2)).outcome, "replayed");

    const left = competingEvent(
      "018f2000-0000-7000-8000-000000000002",
      "018f2000-0000-7000-8000-000000000011",
      "ready"
    );
    const right = competingEvent(
      "018f2000-0000-7000-8000-000000000003",
      "018f2000-0000-7000-8000-000000000012",
      "done"
    );
    assert.deepEqual(left.first, right.first);
    assert.equal((await appender.append(left.first)).persistence.stream_sequence, 4);

    let reads = 0; let release!: () => void;
    const bothRead = new Promise<void>((resolve) => { release = resolve; });
    const racingPorts = (): typeof ports => ({
      getStreamConfig: (name) => ports.getStreamConfig(name),
      async getLastMessage(name, subject) {
        const current = await ports.getLastMessage(name, subject);
        if (++reads === 2) release();
        await bothRead;
        return current;
      },
      publish: (subject, data, request) => ports.publish(subject, data, request)
    });
    const contenders = [left.second, right.second].map((event) =>
      createWorkGovernanceJetStreamAppenderV1({ storageEpoch: 19, stream, ports: racingPorts() }).append(event)
    );
    const results = await Promise.allSettled(contenders);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = results.find((result) => result.status === "rejected");
    assert.ok(rejected?.status === "rejected");
    assert.equal(rejected.reason?.code, "YKP-WORK-JS-002");
    const winner = results[0]!.status === "fulfilled" ? left.second : right.second;
    assert.equal((await appender.append(winner)).outcome, "replayed");
  } finally {
    await connection.close();
  }
});
