import assert from "node:assert/strict";
import test from "node:test";
import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { Kvm } from "@nats-io/kv";
import { connect } from "@nats-io/transport-node";
import {
  appendWorkGovernanceManagerAdmissionCoordinatedV1,
  createInMemoryWorkGovernanceEventStoreV1,
  createWorkGovernanceManagerAdmissionCommandCandidateV1,
  createWorkGovernanceCommandAppendCoordinatorV1,
  createWorkGovernanceCommandReceiptStoreV1,
  createWorkGovernanceJetStreamAppenderV1,
  createWorkGovernanceWorkItemProjectorActivationRunnerV1,
  createWorkGovernanceWorkItemProjectorV1,
  createWorkGovernanceWorkItemProjectorConsumerV1,
  previewWorkGovernanceManagerAdmissionV1,
  openWorkGovernanceProjectorKvPortsV1,
  openWorkGovernanceProjectorConsumerPortsV1,
  openWorkGovernanceCommandReceiptKvPortsV1,
  parseWorkGovernanceProjectorCheckpointV1,
  parseWorkGovernanceEventV1,
  workGovernanceProjectorCheckpointKeyV1,
  workGovernanceProjectorConsumerConfigV1,
  workGovernanceProjectorKvConfigV1,
  workGovernanceCommandReceiptKvConfigV1,
  workGovernanceJetStreamConfigV1,
  workGovernanceJetStreamPortsV1,
  WorkGovernanceJetStreamError,
  WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1,
  WORK_GOVERNANCE_STREAM_V1,
  WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1,
  type WorkGovernanceProjectorKvPortsV1,
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
      getSubjectHistory: (name, subject, maximumEvents, maximumBytes) =>
        ports.getSubjectHistory(name, subject, maximumEvents, maximumBytes),
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

    const receiptBucket = { maxBytes: 1024 * 1024, replicas: 1 } as const;
    await new Kvm(jetstream(connection)).create(
      "YKP_COMMAND_RECEIPTS_V1",
      workGovernanceCommandReceiptKvConfigV1(receiptBucket)
    );
    const receiptStore = createWorkGovernanceCommandReceiptStoreV1({
      storageEpoch: 19, bucket: receiptBucket,
      ports: await openWorkGovernanceCommandReceiptKvPortsV1(jetstream(connection), receiptBucket)
    });
    let receiptEventIndex = 0;
    const receiptEventIds = [
      "018f4000-0000-7000-8000-000000000001",
      "018f4000-0000-7000-8000-000000000003"
    ];
    const receiptEvents = createInMemoryWorkGovernanceEventStoreV1({
      storageEpoch: 19,
      eventId: () => receiptEventIds[receiptEventIndex++]!,
      occurredAt: () => receiptEventIndex === 1 ? "2026-08-17T14:02:00.000Z" : "2026-08-17T14:02:01.000Z"
    });
    const receiptCommand = command("018f4000-0000-7000-8000-000000000002", "work-item:receipt", 0);
    const receiptEvent = receiptEvents.append({
      command: receiptCommand, event_type: "work_item.created.v1", data: { title: "Receipt" }
    }).event;
    const reservations = await Promise.all([
      receiptStore.reserve(receiptCommand, receiptEvent), receiptStore.reserve(receiptCommand, receiptEvent)
    ]);
    assert.deepEqual(new Set(reservations.map((result) => result.outcome)), new Set(["reserved", "existing"]));

    let ambiguous = true;
    const receiptCoordinator = createWorkGovernanceCommandAppendCoordinatorV1({
      receipts: receiptStore,
      appender: { storageProfile: appender.storageProfile, async append(event) {
        const result = await appender.append(event);
        if (ambiguous) { ambiguous = false; throw new WorkGovernanceJetStreamError("YKP-WORK-JS-005"); }
        return result;
      } }
    });
    await assert.rejects(
      receiptCoordinator.resolveCompletionUnknown(receiptCommand, receiptEvent),
      (error: unknown) => error instanceof WorkGovernanceJetStreamError && error.code === "YKP-WORK-JS-005"
    );
    const unknown = await receiptStore.reserve(receiptCommand, receiptEvent);
    assert.equal(unknown.record.receipt.state, "completion_unknown");
    const laterCommand = command("018f4000-0000-7000-8000-000000000004", "work-item:receipt", 1);
    const laterEvent = receiptEvents.append({
      command: laterCommand, event_type: "work_item.workflow_transitioned.v1", data: { to: "ready" }
    }).event;
    assert.equal((await appender.append(laterEvent)).outcome, "appended");
    const resolved = await receiptCoordinator.resolveCompletionUnknown(receiptCommand, receiptEvent);
    assert.equal(resolved.outcome, "replayed"); assert.equal(resolved.receipt.state, "appended");
    assert.ok(resolved.receipt.stream_sequence! > 0);

    const admissionPreview = previewWorkGovernanceManagerAdmissionV1({
      schema: "yukh-projects-manager-activation-plan-v1",
      plan_id: "018f5000-0000-7000-8000-000000000001",
      namespace_id: "namespace:qualification",
      project_id: "project:qualification",
      run_id: "run:qualification",
      work_item_id: "work-item:qualification",
      manager_subject_id: "subject:qualification-manager",
      worker_subject_id: "subject:qualification-worker",
      role: "backend_developer",
      model: { family: "codex", capability: "coding-agent" },
      skills: ["github", "yukh-projects"],
      task: {
        objective: "Qualify synthetic manager admission without launching a worker.",
        acceptance: ["Durable admission event is appended.", "No provider is contacted."]
      },
      evidence_required: [{ kind: "test", uri: "urn:example:evidence:manager-admission", digest }],
      budgets: {
        max_turns: 2,
        max_input_tokens: 8_000,
        max_output_tokens: 4_000,
        max_wall_clock_seconds: 600
      },
      activation: {
        max_ticks: 4,
        max_acknowledgements: 8,
        max_idle_ticks: 1
      }
    });
    const admissionCandidate = createWorkGovernanceManagerAdmissionCommandCandidateV1({
      preview: admissionPreview,
      command_id: "018f5000-0000-7000-8000-000000000002",
      storage_epoch: 19,
      namespace_admission_id: "admission:qualification",
      expected_revision: 0,
      policy: { version: "qualification-v1", digest },
      correlation_id: "018f5000-0000-7000-8000-000000000003",
      causation_id: "018f5000-0000-7000-8000-000000000004"
    });
    const admissionEventStore = createInMemoryWorkGovernanceEventStoreV1({
      storageEpoch: 19,
      eventId: () => "018f5000-0000-7000-8000-000000000005",
      occurredAt: () => "2026-08-17T14:02:02.000Z"
    });
    const admissionEvent = admissionEventStore.append({
      command: admissionCandidate.command,
      event_type: "claim.admitted.v1",
      evidence: [{ kind: "decision", uri: "urn:example:evidence:manager-admission-decision", digest }],
      data: admissionCandidate.command.data
    }).event;
    const admissionPublished = await appendWorkGovernanceManagerAdmissionCoordinatedV1({
      candidate: admissionCandidate,
      event: admissionEvent,
      coordinator: receiptCoordinator
    });
    assert.equal(admissionPublished.outcome, "appended");
    assert.equal(admissionPublished.receipt_state, "appended");
    assert.ok(admissionPublished.stream_sequence! > 0);
    const admissionReplay = await appendWorkGovernanceManagerAdmissionCoordinatedV1({
      candidate: admissionCandidate,
      event: admissionEvent,
      coordinator: receiptCoordinator
    });
    assert.equal(admissionReplay.outcome, "replayed");
    assert.equal(admissionReplay.event_digest, admissionPublished.event_digest);
    const admissionSequence = admissionPublished.stream_sequence;
    assert.ok(admissionSequence !== undefined && admissionSequence > 0);
    const admissionMessage = await manager.streams.getMessage(WORK_GOVERNANCE_STREAM_V1, {
      seq: admissionSequence
    });
    if (admissionMessage === null) assert.fail("missing manager admission event");
    const decodedAdmission = parseWorkGovernanceEventV1(admissionMessage.data);
    assert.equal(decodedAdmission.type, "claim.admitted.v1");
    assert.equal(decodedAdmission.aggregate.kind, "namespace_admission");
    assert.equal(decodedAdmission.aggregate.id, "admission:qualification");

    const projectionBucket = { maxBytes: 2 * 1024 * 1024, replicas: 1 } as const;
    const checkpointBucket = { maxBytes: 1024 * 1024, replicas: 1 } as const;
    const kvm = new Kvm(jetstream(connection));
    await kvm.create(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1,
      workGovernanceProjectorKvConfigV1(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1, projectionBucket));
    await kvm.create(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1,
      workGovernanceProjectorKvConfigV1(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1, checkpointBucket));
    const projectionPorts = await openWorkGovernanceProjectorKvPortsV1(
      jetstream(connection), WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1, projectionBucket);
    const durableCheckpoints = await openWorkGovernanceProjectorKvPortsV1(
      jetstream(connection), WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1, checkpointBucket);
    let injectCrash = true;
    const crashOnceCheckpoints: WorkGovernanceProjectorKvPortsV1 = {
      ...durableCheckpoints,
      async create(key, data) {
        if (injectCrash) { injectCrash = false; throw new Error("simulated crash boundary"); }
        return durableCheckpoints.create(key, data);
      }
    };
    const projector = createWorkGovernanceWorkItemProjectorV1({
      storageEpoch: 19, bucket: projectionBucket, checkpointBucket,
      projections: projectionPorts, checkpoints: crashOnceCheckpoints
    });
    const lastSequence = (await manager.streams.info(WORK_GOVERNANCE_STREAM_V1)).state.last_seq;
    const firstMessage = await manager.streams.getMessage(WORK_GOVERNANCE_STREAM_V1, { seq: 1 });
    if (firstMessage === null) assert.fail("missing first work event");
    const firstInput = { stream_sequence: 1, event: parseWorkGovernanceEventV1(firstMessage.data) };
    await assert.rejects(projector.apply(firstInput), (error: unknown) =>
      Boolean(error && typeof error === "object" && "code" in error && error.code === "YKP-WORK-PROJECTOR-004"));
    assert.equal((await projector.apply(firstInput)).outcome, "recovered");
    let final;
    for (let streamSequence = 2; streamSequence <= lastSequence; streamSequence++) {
      const message = await manager.streams.getMessage(WORK_GOVERNANCE_STREAM_V1, { seq: streamSequence });
      if (message === null) assert.fail(`missing work event ${streamSequence}`);
      final = await projector.apply({ stream_sequence: streamSequence, event: parseWorkGovernanceEventV1(message.data) });
    }
    assert.equal(final?.checkpoint.stream_sequence, lastSequence);
    const lastMessage = await manager.streams.getMessage(WORK_GOVERNANCE_STREAM_V1, { seq: lastSequence });
    if (lastMessage === null) assert.fail("missing last work event");
    assert.equal(final && (await projector.apply({
      stream_sequence: lastSequence,
      event: parseWorkGovernanceEventV1(lastMessage.data)
    })).outcome, "replayed");

    await (await kvm.open(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1)).destroy();
    await (await kvm.open(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1)).destroy();
    await kvm.create(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1,
      workGovernanceProjectorKvConfigV1(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1, projectionBucket));
    await kvm.create(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1,
      workGovernanceProjectorKvConfigV1(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1, checkpointBucket));
    await manager.consumers.add(WORK_GOVERNANCE_STREAM_V1,
      workGovernanceProjectorConsumerConfigV1({ replicas: 1 }));
    const consumerProjections = await openWorkGovernanceProjectorKvPortsV1(
      jetstream(connection), WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1, projectionBucket);
    const consumerCheckpoints = await openWorkGovernanceProjectorKvPortsV1(
      jetstream(connection), WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1, checkpointBucket);
    const consumerRuntime = createWorkGovernanceWorkItemProjectorConsumerV1({
      storageEpoch: 19, stream, consumer: { replicas: 1 },
      ports: await openWorkGovernanceProjectorConsumerPortsV1(
        jetstream(connection), manager, { stream, consumer: { replicas: 1 } }),
      projector: createWorkGovernanceWorkItemProjectorV1({
        storageEpoch: 19, bucket: projectionBucket, checkpointBucket,
        projections: consumerProjections, checkpoints: consumerCheckpoints
      })
    });
    let tick = 0;
    const activation = createWorkGovernanceWorkItemProjectorActivationRunnerV1({
      consumer: consumerRuntime,
      now: () => `2026-08-17T14:03:${String(tick++).padStart(2, "0")}.000Z`
    });
    const activated = await activation.run({
      maxTicks: lastSequence + 1,
      maxAcknowledgements: lastSequence + 1,
      maxIdleTicks: 1,
      maxMessagesPerTick: lastSequence
    });
    assert.equal(activated.status, "processed");
    assert.equal(activated.counters.acknowledged, lastSequence);
    assert.equal(activated.last_stream_sequence, lastSequence);
    const checkpoint = await consumerCheckpoints.get(workGovernanceProjectorCheckpointKeyV1());
    if (checkpoint === null) assert.fail("missing consumer checkpoint");
    assert.equal(parseWorkGovernanceProjectorCheckpointV1(checkpoint.data).stream_sequence, lastSequence);
  } finally {
    await connection.close();
  }
});
