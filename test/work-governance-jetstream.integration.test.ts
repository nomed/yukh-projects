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
function command(commandId: string, aggregateId: string, revision: number): WorkGovernanceCommandV1 {
  return {
    schema: "yukh-projects-command-v1", command_id: commandId, storage_epoch: 19,
    namespace_id: "namespace:qualification", aggregate: { kind: "work_item", id: aggregateId, expected_revision: revision },
    actor: { subject_id: "subject:qualification" }, policy: { version: "qualification-v1", digest },
    correlation_id: ids[3]!, causation_id: ids[4]!, data: {}
  };
}

test("qualifies interleaved aggregate appends against local JetStream", { skip: !enabled }, async () => {
  assert.ok(server, "YUKH_NATS_URL is required");
  const connection = await connect({ servers: server!, maxReconnectAttempts: 0 });
  try {
    const manager = await jetstreamManager(connection);
    await manager.streams.add(workGovernanceJetStreamConfigV1({ maxBytes: 16 * 1024 * 1024, replicas: 1 }));
    const appender = createWorkGovernanceJetStreamAppenderV1({
      storageEpoch: 19,
      ports: workGovernanceJetStreamPortsV1(jetstream(connection), manager)
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
    assert.equal((await appender.append(alpha1)).receipt.sequence, 1);
    assert.equal((await appender.append(beta1)).receipt.sequence, 2);
    assert.equal((await appender.append(alpha2)).receipt.sequence, 3);
    assert.equal((await appender.append(alpha2)).outcome, "replayed");
  } finally {
    await connection.close();
  }
});
