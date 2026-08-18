import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  WORK_GOVERNANCE_CHECKPOINT_MAX_BYTES_V1,
  WORK_GOVERNANCE_PROJECTION_MAX_BYTES_V1,
  WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1,
  WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1,
  WorkGovernanceProjectorError,
  canonicalWorkGovernanceJson,
  createInMemoryWorkGovernanceEventStoreV1,
  createWorkGovernanceWorkItemProjectorV1,
  encodeWorkGovernanceProjectionV1,
  encodeWorkGovernanceProjectorCheckpointV1,
  parseWorkGovernanceProjectionV1,
  parseWorkGovernanceProjectorCheckpointV1,
  verifyWorkGovernanceProjectorKvConfigV1,
  workGovernanceProjectorKvConfigV1,
  workGovernanceProjectorKvPortsV1,
  workGovernanceProjectionKeyV1,
  workGovernanceProjectorCheckpointKeyV1,
  type WorkGovernanceCommandV1,
  type WorkGovernanceEventV1,
  type WorkGovernanceProjectorKvPortsV1,
  type WorkGovernanceProjectionV1,
  type WorkGovernanceProjectorCheckpointV1,
  type WorkGovernanceWorkItemReducerRegistryV1
} from "../src/index.js";

const digest = (value: string) => `sha-256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
const policyDigest = `sha-256:${"a".repeat(64)}`;
const reducerDigest = `sha-256:${"b".repeat(64)}`;
const bucket = { maxBytes: 2 * 1024 * 1024, replicas: 1 } as const;
const checkpointBucket = { maxBytes: 1024 * 1024, replicas: 1 } as const;
const ids = [
  "018f5000-0000-7000-8000-000000000001", "018f5000-0000-7000-8000-000000000002",
  "018f5000-0000-7000-8000-000000000003", "018f5000-0000-7000-8000-000000000004",
  "018f5000-0000-7000-8000-000000000005", "018f5000-0000-7000-8000-000000000006"
];

function command(id: string, revision: number): WorkGovernanceCommandV1 {
  return {
    schema: "yukh-projects-command-v1", command_id: id, storage_epoch: 29,
    namespace_id: "namespace:synthetic", project_id: "project:synthetic",
    aggregate: { kind: "work_item", id: "work-item:synthetic", expected_revision: revision },
    actor: { subject_id: "subject:synthetic" }, policy: { version: "policy-v1", digest: policyDigest },
    correlation_id: ids[4]!, causation_id: ids[5]!, data: {}
  };
}

function events() {
  let index = 0;
  const store = createInMemoryWorkGovernanceEventStoreV1({
    storageEpoch: 29,
    eventId: () => [ids[0]!, ids[2]!][index]!,
    occurredAt: () => ["2026-08-17T21:00:00.000Z", "2026-08-17T21:00:01.000Z"][index++]!
  });
  const created = store.append({
    command: command(ids[1]!, 0), event_type: "work_item.created.v1", data: { title: "Synthetic" }
  }).event;
  const transitioned = store.append({
    command: command(ids[3]!, 1), event_type: "work_item.workflow_transitioned.v1", data: { to: "ready" }
  }).event;
  return { created, transitioned };
}

const reducers: WorkGovernanceWorkItemReducerRegistryV1 = {
  "work_item.created.v1": { version: "created-v1", digest: reducerDigest, reduce: (current, event) => {
    if (current !== null || typeof event.data.title !== "string") throw new TypeError("invalid create");
    return { title: event.data.title, workflow_state: "proposed" };
  } },
  "work_item.workflow_transitioned.v1": { version: "transition-v1", digest: reducerDigest, reduce: (current, event) => {
    if (current === null || typeof event.data.to !== "string") throw new TypeError("invalid transition");
    return { ...current, workflow_state: event.data.to };
  } }
};

function profile(bucketName: typeof WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1 | typeof WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1) {
  const projection = bucketName === WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1;
  const selected = projection ? bucket : checkpointBucket;
  const maxValueSize = projection ? WORK_GOVERNANCE_PROJECTION_MAX_BYTES_V1 : WORK_GOVERNANCE_CHECKPOINT_MAX_BYTES_V1;
  return {
    bucket: bucketName, history: 1, ttl: 0, markerTTL: 0, storage: "file", replicas: 1,
    description: projection ? "Yukh Projects work-item projections v1" : "Yukh Projects projector checkpoints v1",
    max_bytes: selected.maxBytes, maxValueSize,
    streamInfo: { config: {
      subjects: [`$KV.${bucketName}.>`], retention: "limits", discard: "new", max_msgs: -1,
      max_msgs_per_subject: 1, max_age: 0, storage: "file", num_replicas: 1,
      max_bytes: selected.maxBytes, max_msg_size: maxValueSize, allow_direct: false,
      allow_msg_ttl: false, allow_rollup_hdrs: true, discard_new_per_subject: false,
      sealed: false, no_ack: false
    } }
  };
}

type MemoryPorts = WorkGovernanceProjectorKvPortsV1 & {
  writes: number;
  values: Map<string, { data: Uint8Array; revision: number }>;
};

function memoryPorts(bucketName: typeof WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1 | typeof WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1): MemoryPorts {
  const values = new Map<string, { data: Uint8Array; revision: number }>();
  let revision = 0;
  return {
    writes: 0,
    values,
    async status() { return profile(bucketName); },
    async get(key) {
      const found = values.get(key);
      return found ? { data: found.data.slice(), revision: found.revision } : null;
    },
    async create(key, data) {
      if (values.has(key)) return { outcome: "conflict" };
      const entry = { data: data.slice(), revision: ++revision };
      values.set(key, entry); this.writes++;
      return { outcome: "created", revision: entry.revision };
    },
    async update(key, data, expected) {
      const found = values.get(key);
      if (!found || found.revision !== expected) return { outcome: "conflict" };
      const entry = { data: data.slice(), revision: ++revision };
      values.set(key, entry); this.writes++;
      return { outcome: "updated", revision: entry.revision };
    }
  };
}

function projector(projections = memoryPorts(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1), checkpoints = memoryPorts(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1)) {
  return {
    projections,
    checkpoints,
    value: createWorkGovernanceWorkItemProjectorV1({
      storageEpoch: 29, bucket, checkpointBucket, projections, checkpoints, reducers
    })
  };
}

function isCode(code: string) {
  return (error: unknown) => error instanceof WorkGovernanceProjectorError && error.code === code &&
    error.message === "work-governance projector operation failed";
}

function redigest(event: WorkGovernanceEventV1, patch: Partial<WorkGovernanceEventV1>): WorkGovernanceEventV1 {
  const { event_digest: _digest, ...unsigned } = { ...event, ...patch };
  return { ...unsigned, event_digest: digest(canonicalWorkGovernanceJson(unsigned)) } as WorkGovernanceEventV1;
}

test("encodes strict projection and checkpoint envelopes with opaque keys", () => {
  const { created } = events();
  const state = { title: "Synthetic", workflow_state: "proposed" };
  const projection: WorkGovernanceProjectionV1 = {
    schema: "yukh-projects-projection-v1", storage_epoch: 29,
    namespace_id: created.namespace_id, project_id: created.project_id,
    aggregate: { kind: "work_item", id: created.aggregate.id, revision: 1 },
    last_event_id: created.event_id, last_event_digest: created.event_digest, stream_sequence: 1,
    reducer_set_digest: reducerDigest,
    state_digest: digest(canonicalWorkGovernanceJson(state)), updated_at: created.occurred_at, state
  };
  const checkpoint: WorkGovernanceProjectorCheckpointV1 = {
    schema: "yukh-projects-projector-checkpoint-v1", projector_id: "work-items-v1", storage_epoch: 29,
    reducer_set_digest: reducerDigest,
    stream_sequence: 1, last_event_id: created.event_id, last_event_digest: created.event_digest,
    updated_at: created.occurred_at
  };
  assert.deepEqual(parseWorkGovernanceProjectionV1(encodeWorkGovernanceProjectionV1(projection)), projection);
  assert.deepEqual(parseWorkGovernanceProjectorCheckpointV1(encodeWorkGovernanceProjectorCheckpointV1(checkpoint)), checkpoint);
  assert.match(workGovernanceProjectionKeyV1(created.namespace_id, created.aggregate.id), /^[0-9a-f]{64}$/u);
  assert.match(workGovernanceProjectorCheckpointKeyV1(), /^[0-9a-f]{64}$/u);
  assert.throws(() => parseWorkGovernanceProjectionV1(canonicalWorkGovernanceJson({ ...projection, state_digest: policyDigest })),
    isCode("YKP-WORK-PROJECTOR-003"));
});

test("verifies exact file-backed history-one projection buckets", () => {
  assert.doesNotThrow(() => verifyWorkGovernanceProjectorKvConfigV1(profile(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1), WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1, bucket));
  assert.doesNotThrow(() => verifyWorkGovernanceProjectorKvConfigV1(profile(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1), WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1, checkpointBucket));
  for (const unsafe of [
    { ...profile(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1), history: 2 },
    { ...profile(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1), ttl: 1 },
    { ...profile(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1), streamInfo: { config: { ...profile(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1).streamInfo.config, discard: "old" } } },
    { ...profile(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1), streamInfo: { config: { ...profile(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1).streamInfo.config, allow_direct: true } } },
    { ...profile(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1), streamInfo: { config: { ...profile(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1).streamInfo.config, sealed: true } } }
  ]) assert.throws(() => verifyWorkGovernanceProjectorKvConfigV1(unsafe, WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1, bucket),
    isCode("YKP-WORK-PROJECTOR-003"));
});

test("rejects unknown runtime buckets and invalid CAS port writes", async () => {
  assert.throws(() => workGovernanceProjectorKvConfigV1("YKP_OTHER" as never, bucket),
    isCode("YKP-WORK-PROJECTOR-001"));
  const kv = {
    async status() { return profile(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1); },
    async get() { return null; },
    async create() { return 1; },
    async update() { return 2; }
  };
  const ports = workGovernanceProjectorKvPortsV1(kv as never, WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1);
  await assert.rejects(ports.create("not-opaque", new Uint8Array([1])), isCode("YKP-WORK-PROJECTOR-001"));
  await assert.rejects(ports.create("a".repeat(64), new Uint8Array()), isCode("YKP-WORK-PROJECTOR-001"));
  await assert.rejects(ports.update("a".repeat(64), new Uint8Array([1]), 0), isCode("YKP-WORK-PROJECTOR-001"));
});

test("projects ordered events and deterministic rebuilds byte-identically", async () => {
  const { created, transitioned } = events();
  const first = projector();
  const applied = await first.value.apply({ stream_sequence: 1, event: created });
  assert.equal(applied.outcome, "projected"); assert.equal(applied.projection.state.workflow_state, "proposed");
  const next = await first.value.apply({ stream_sequence: 2, event: transitioned });
  assert.equal(next.outcome, "projected"); assert.equal(next.projection.state.workflow_state, "ready");
  assert.equal(next.checkpoint.stream_sequence, 2);
  const replay = await first.value.apply({ stream_sequence: 2, event: transitioned });
  assert.equal(replay.outcome, "replayed"); assert.equal(first.projections.writes, 2); assert.equal(first.checkpoints.writes, 2);

  const rebuilt = projector();
  await rebuilt.value.apply({ stream_sequence: 1, event: created });
  const rebuiltNext = await rebuilt.value.apply({ stream_sequence: 2, event: transitioned });
  if (rebuiltNext.outcome !== "projected" || next.outcome !== "projected") assert.fail("expected projections");
  assert.equal(encodeWorkGovernanceProjectionV1(rebuiltNext.projection), encodeWorkGovernanceProjectionV1(next.projection));
  assert.equal(encodeWorkGovernanceProjectorCheckpointV1(rebuiltNext.checkpoint), encodeWorkGovernanceProjectorCheckpointV1(next.checkpoint));
});

test("observes catalogued non-work-item events in a mixed authoritative stream", async () => {
  const { created } = events();
  const projectEvent = redigest(created, {
    type: "project.created.v1",
    aggregate: { kind: "project", id: "project:mixed", revision: 1 }
  });
  const mixed = projector();
  const observed = await mixed.value.apply({ stream_sequence: 1, event: projectEvent });
  assert.equal(observed.outcome, "observed");
  assert.equal(mixed.projections.writes, 0);
  assert.equal(mixed.checkpoints.writes, 1);
  const projected = await mixed.value.apply({ stream_sequence: 2, event: created });
  assert.equal(projected.outcome, "projected");
  assert.equal(projected.projection.aggregate.revision, 1);
  assert.equal(projected.checkpoint.stream_sequence, 2);
  const replayed = await mixed.value.apply({ stream_sequence: 2, event: created });
  assert.equal(replayed.outcome, "replayed");
});

test("repairs a crash after projection durability without rerunning the reducer", async () => {
  const { created } = events();
  const projections = memoryPorts(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1);
  const base = memoryPorts(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1);
  let unavailable = true; let reducerCalls = 0;
  const checkpoints: WorkGovernanceProjectorKvPortsV1 = {
    ...base,
    async create(key, data) {
      if (unavailable) { unavailable = false; throw new Error("private transport detail"); }
      return base.create(key, data);
    }
  };
  const value = createWorkGovernanceWorkItemProjectorV1({
    storageEpoch: 29, bucket, checkpointBucket, projections, checkpoints,
    reducers: { "work_item.created.v1": { version: "created-v1", digest: reducerDigest,
      reduce: (_current, event) => { reducerCalls++; return { title: event.data.title! }; } } }
  });
  await assert.rejects(value.apply({ stream_sequence: 1, event: created }), isCode("YKP-WORK-PROJECTOR-004"));
  assert.equal(projections.writes, 1); assert.equal(reducerCalls, 1);
  const recovered = await value.apply({ stream_sequence: 1, event: created });
  assert.equal(recovered.outcome, "recovered"); assert.equal(reducerCalls, 1); assert.equal(base.writes, 1);
});

test("concurrent exact projectors converge through projection and checkpoint CAS conflicts", async () => {
  const { created } = events();
  const projections = memoryPorts(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1);
  const checkpoints = memoryPorts(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1);
  const race = (base: MemoryPorts): WorkGovernanceProjectorKvPortsV1 => {
    let arrivals = 0; let release!: () => void;
    const both = new Promise<void>((resolve) => { release = resolve; });
    return { ...base, async create(key, data) {
      if (++arrivals === 2) release();
      await both;
      return base.create(key, data);
    } };
  };
  const projectionRace = race(projections);
  const checkpointRace = race(checkpoints);
  const left = createWorkGovernanceWorkItemProjectorV1({
    storageEpoch: 29, bucket, checkpointBucket, projections: projectionRace, checkpoints: checkpointRace, reducers
  });
  const right = createWorkGovernanceWorkItemProjectorV1({
    storageEpoch: 29, bucket, checkpointBucket, projections: projectionRace, checkpoints: checkpointRace, reducers
  });
  const results = await Promise.all([
    left.apply({ stream_sequence: 1, event: created }),
    right.apply({ stream_sequence: 1, event: created })
  ]);
  assert.deepEqual(results.map((result) => result.outcome), ["projected", "projected"]);
  assert.equal(projections.writes, 1);
  assert.equal(checkpoints.writes, 1);
});

test("rejects divergent CAS winners and a changed reducer set", async () => {
  const { created } = events();
  const base = memoryPorts(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1);
  let conflictedWrite = false;
  const divergent: WorkGovernanceProjectorKvPortsV1 = {
    ...base,
    async create() { conflictedWrite = true; return { outcome: "conflict" }; },
    async get() { return conflictedWrite ? { data: new TextEncoder().encode("{}"), revision: 1 } : null; }
  };
  const conflicted = createWorkGovernanceWorkItemProjectorV1({
    storageEpoch: 29, bucket, checkpointBucket, projections: divergent,
    checkpoints: memoryPorts(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1), reducers
  });
  await assert.rejects(conflicted.apply({ stream_sequence: 1, event: created }),
    isCode("YKP-WORK-PROJECTOR-005"));

  const durableProjection = memoryPorts(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1);
  const checkpointBase = memoryPorts(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1);
  let checkpointConflict = false;
  const divergentCheckpoint: WorkGovernanceProjectorKvPortsV1 = {
    ...checkpointBase,
    async create() { checkpointConflict = true; return { outcome: "conflict" }; },
    async get() { return checkpointConflict ? { data: new TextEncoder().encode("{}"), revision: 1 } : null; }
  };
  const checkpointConflicted = createWorkGovernanceWorkItemProjectorV1({
    storageEpoch: 29, bucket, checkpointBucket, projections: durableProjection,
    checkpoints: divergentCheckpoint, reducers
  });
  await assert.rejects(checkpointConflicted.apply({ stream_sequence: 1, event: created }),
    isCode("YKP-WORK-PROJECTOR-005"));
  assert.equal(durableProjection.writes, 1);

  const stable = projector();
  await stable.value.apply({ stream_sequence: 1, event: created });
  const changed = createWorkGovernanceWorkItemProjectorV1({
    storageEpoch: 29, bucket, checkpointBucket, projections: stable.projections, checkpoints: stable.checkpoints,
    reducers: { ...reducers, "work_item.created.v1": { ...reducers["work_item.created.v1"]!, version: "created-v2" } }
  });
  await assert.rejects(changed.apply({ stream_sequence: 1, event: created }),
    isCode("YKP-WORK-PROJECTOR-002"));
});

test("fails closed on gaps, broken links, epochs, and unsupported events before mutation", async () => {
  const { created, transitioned } = events();
  const gap = projector();
  await assert.rejects(gap.value.apply({ stream_sequence: 2, event: created }), isCode("YKP-WORK-PROJECTOR-002"));
  assert.equal(gap.projections.writes + gap.checkpoints.writes, 0);

  const epoch = createWorkGovernanceWorkItemProjectorV1({
    storageEpoch: 30, bucket, checkpointBucket,
    projections: memoryPorts(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1),
    checkpoints: memoryPorts(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1), reducers
  });
  await assert.rejects(epoch.apply({ stream_sequence: 1, event: created }), isCode("YKP-WORK-PROJECTOR-002"));

  const broken = projector();
  await broken.value.apply({ stream_sequence: 1, event: created });
  const poison = redigest(transitioned, { previous: { event_id: ids[5]!, digest: created.event_digest } });
  await assert.rejects(broken.value.apply({ stream_sequence: 2, event: poison }), isCode("YKP-WORK-PROJECTOR-002"));
  assert.equal(broken.projections.writes, 1); assert.equal(broken.checkpoints.writes, 1);

  const unsupportedEventStore = createInMemoryWorkGovernanceEventStoreV1({
    storageEpoch: 29, eventId: () => ids[0]!, occurredAt: () => "2026-08-17T21:00:00.000Z"
  });
  const unsupported = unsupportedEventStore.append({
    command: command(ids[1]!, 0), event_type: "work_item.priority_evaluated.v1", data: { priority: 1 }
  }).event;
  const target = projector();
  await assert.rejects(target.value.apply({ stream_sequence: 1, event: unsupported }), isCode("YKP-WORK-PROJECTOR-006"));
  assert.equal(target.projections.writes + target.checkpoints.writes, 0);

  const unknown = redigest(unsupported, { type: "work_item.unknown.v1" });
  const unknownTarget = projector();
  await assert.rejects(unknownTarget.value.apply({ stream_sequence: 1, event: unknown }),
    isCode("YKP-WORK-PROJECTOR-006"));
  assert.equal(unknownTarget.projections.writes + unknownTarget.checkpoints.writes, 0);
});

test("rejects unsafe reducer registries and outputs", async () => {
  const projections = memoryPorts(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1);
  const checkpoints = memoryPorts(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1);
  const getter = Object.defineProperty({}, "work_item.created.v1", { enumerable: true, get() { return reducers["work_item.created.v1"]; } });
  assert.throws(() => createWorkGovernanceWorkItemProjectorV1({
    storageEpoch: 29, bucket, checkpointBucket, projections, checkpoints, reducers: getter as WorkGovernanceWorkItemReducerRegistryV1
  }), isCode("YKP-WORK-PROJECTOR-001"));
  const { created } = events();
  const invalid = createWorkGovernanceWorkItemProjectorV1({
    storageEpoch: 29, bucket, checkpointBucket, projections, checkpoints,
    reducers: { "work_item.created.v1": { version: "created-v1", digest: reducerDigest,
      reduce: () => ({ unsafe: undefined as unknown as string }) } }
  });
  await assert.rejects(invalid.apply({ stream_sequence: 1, event: created }), isCode("YKP-WORK-PROJECTOR-006"));
  assert.equal(projections.writes + checkpoints.writes, 0);
});
