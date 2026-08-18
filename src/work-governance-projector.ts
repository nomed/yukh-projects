import { createHash } from "node:crypto";
import { JetStreamApiCodes, JetStreamApiError, StorageType, type JetStreamClient } from "@nats-io/jetstream";
import { Kvm, type KV } from "@nats-io/kv";
import {
  canonicalWorkGovernanceJson,
  encodeWorkGovernanceEventV1,
  parseWorkGovernanceEventV1,
  type WorkGovernanceAggregateKind,
  type WorkGovernanceEventV1,
  type WorkGovernanceJson
} from "./work-governance-events.js";

export const WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1 = "YKP_WORK_ITEMS_V1";
export const WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1 = "YKP_PROJECTOR_CHECKPOINTS_V1";
export const WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_ID_V1 = "work-items-v1";
export const WORK_GOVERNANCE_PROJECTION_MAX_BYTES_V1 = 64 * 1024;
export const WORK_GOVERNANCE_CHECKPOINT_MAX_BYTES_V1 = 4 * 1024;

const DIGEST = /^sha-256:[0-9a-f]{64}$/u;
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const OPAQUE_ID = /^[a-z][a-z0-9_-]{0,31}:[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
const KEY = /^[0-9a-f]{64}$/u;
const TOKEN = /^[a-z][a-z0-9_-]{0,63}$/u;

export const WORK_GOVERNANCE_EVENT_CATALOG_V1: Readonly<Record<string, WorkGovernanceAggregateKind>> = Object.freeze({
  "project.created.v1": "project",
  "project.policy_bound.v1": "project",
  "run.created.v1": "run",
  "run.closed.v1": "run",
  "work_item.created.v1": "work_item",
  "work_item.content_updated.v1": "work_item",
  "work_item.workflow_transitioned.v1": "work_item",
  "work_item.priority_evaluated.v1": "work_item",
  "graph.relationship_added.v1": "namespace_graph",
  "graph.relationship_removed.v1": "namespace_graph",
  "graph.waiver_recorded.v1": "namespace_graph",
  "roadmap.epic_placed.v1": "project_roadmap",
  "roadmap.epic_moved.v1": "project_roadmap",
  "roadmap.commitment_changed.v1": "project_roadmap",
  "roadmap.confidence_changed.v1": "project_roadmap",
  "roadmap.health_override_recorded.v1": "project_roadmap",
  "roadmap.outcome_observed.v1": "project_roadmap",
  "claim.requested.v1": "namespace_admission",
  "claim.admitted.v1": "namespace_admission",
  "claim.rejected.v1": "namespace_admission",
  "lease.renewed.v1": "namespace_admission",
  "lease.revoked.v1": "namespace_admission",
  "lease.expired.v1": "namespace_admission",
  "budget.usage_recorded.v1": "namespace_admission",
  "result.recorded.v1": "work_item",
  "external_mapping.created.v1": "external_mapping",
  "external_mapping.observation_recorded.v1": "external_mapping",
  "external_mapping.reconciled.v1": "external_mapping",
  "external_mapping.conflict_detected.v1": "external_mapping"
});

export type WorkGovernanceProjectorErrorCode =
  | "YKP-WORK-PROJECTOR-001"
  | "YKP-WORK-PROJECTOR-002"
  | "YKP-WORK-PROJECTOR-003"
  | "YKP-WORK-PROJECTOR-004"
  | "YKP-WORK-PROJECTOR-005"
  | "YKP-WORK-PROJECTOR-006";

export class WorkGovernanceProjectorError extends Error {
  constructor(readonly code: WorkGovernanceProjectorErrorCode) {
    super("work-governance projector operation failed");
    this.name = "WorkGovernanceProjectorError";
  }
}

export interface WorkGovernanceProjectionV1 {
  schema: "yukh-projects-projection-v1";
  storage_epoch: number;
  namespace_id: string;
  project_id?: string;
  aggregate: { kind: "work_item"; id: string; revision: number };
  last_event_id: string;
  last_event_digest: string;
  stream_sequence: number;
  reducer_set_digest: string;
  state_digest: string;
  updated_at: string;
  state: { [key: string]: WorkGovernanceJson };
}

export interface WorkGovernanceProjectorCheckpointV1 {
  schema: "yukh-projects-projector-checkpoint-v1";
  projector_id: typeof WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_ID_V1;
  storage_epoch: number;
  reducer_set_digest: string;
  stream_sequence: number;
  last_event_id: string;
  last_event_digest: string;
  updated_at: string;
}

export interface WorkGovernanceProjectorKvPortsV1 {
  status(): Promise<unknown>;
  get(key: string): Promise<{ data: Uint8Array; revision: number } | null>;
  create(key: string, data: Uint8Array): Promise<{ outcome: "created"; revision: number } | { outcome: "conflict" }>;
  update(key: string, data: Uint8Array, revision: number): Promise<{ outcome: "updated"; revision: number } | { outcome: "conflict" }>;
}

export type WorkGovernanceWorkItemReducerV1 = (
  current: Readonly<{ [key: string]: WorkGovernanceJson }> | null,
  event: Readonly<WorkGovernanceEventV1>
) => { [key: string]: WorkGovernanceJson };

export interface WorkGovernanceWorkItemReducerDescriptorV1 {
  version: string;
  digest: string;
  reduce: WorkGovernanceWorkItemReducerV1;
}

export type WorkGovernanceWorkItemReducerRegistryV1 = Readonly<Record<string, WorkGovernanceWorkItemReducerDescriptorV1>>;

type BucketProfile = {
  bucket: typeof WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1 | typeof WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1;
  description: string;
  maxValueSize: number;
};

function fail(code: WorkGovernanceProjectorErrorCode): never { throw new WorkGovernanceProjectorError(code); }
function object(value: unknown): value is Record<string, unknown> {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch { return false; }
}
function exact(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => allowed.has(key));
}
function positive(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) > 0; }
function timestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}
function sha256(value: string): string { return `sha-256:${createHash("sha256").update(value, "utf8").digest("hex")}`; }
function clone<T>(value: T): T { return JSON.parse(canonicalWorkGovernanceJson(value)) as T; }
function profile(bucket: BucketProfile["bucket"]): BucketProfile {
  if (bucket === WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1) {
    return { bucket, description: "Yukh Projects work-item projections v1", maxValueSize: WORK_GOVERNANCE_PROJECTION_MAX_BYTES_V1 };
  }
  if (bucket === WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1) {
    return { bucket, description: "Yukh Projects projector checkpoints v1", maxValueSize: WORK_GOVERNANCE_CHECKPOINT_MAX_BYTES_V1 };
  }
  fail("YKP-WORK-PROJECTOR-001");
}

export function workGovernanceProjectorKvConfigV1(
  bucket: BucketProfile["bucket"],
  options: { maxBytes: number; replicas: number }
) {
  const selected = profile(bucket);
  if (!options || !positive(options.maxBytes) || options.maxBytes < 64 * 1024 ||
      !Number.isSafeInteger(options.replicas) || ![1, 3, 4, 5].includes(options.replicas)) fail("YKP-WORK-PROJECTOR-001");
  return {
    description: selected.description,
    history: 1,
    ttl: 0,
    markerTTL: 0,
    storage: StorageType.File,
    replicas: options.replicas,
    max_bytes: options.maxBytes,
    maxValueSize: selected.maxValueSize,
    allow_direct: false
  } as const;
}

export function verifyWorkGovernanceProjectorKvConfigV1(
  source: unknown,
  bucket: BucketProfile["bucket"],
  options: { maxBytes: number; replicas: number }
): void {
  const expected = workGovernanceProjectorKvConfigV1(bucket, options);
  try {
    if (source === null || typeof source !== "object" || Array.isArray(source)) fail("YKP-WORK-PROJECTOR-003");
    const status = source as Record<string, unknown>;
    const streamInfo = status.streamInfo;
    const stream = streamInfo !== null && typeof streamInfo === "object" && !Array.isArray(streamInfo) &&
      (streamInfo as Record<string, unknown>).config !== null &&
      typeof (streamInfo as Record<string, unknown>).config === "object" &&
      !Array.isArray((streamInfo as Record<string, unknown>).config)
      ? (streamInfo as Record<string, unknown>).config as Record<string, unknown> : null;
    if (status.bucket !== bucket || status.history !== 1 || status.ttl !== 0 || status.markerTTL !== 0 ||
        status.storage !== expected.storage || status.replicas !== expected.replicas ||
        status.description !== expected.description || status.max_bytes !== expected.max_bytes ||
        status.maxValueSize !== expected.maxValueSize || !stream || !Array.isArray(stream.subjects) ||
        stream.subjects.length !== 1 || stream.subjects[0] !== `$KV.${bucket}.>` ||
        stream.retention !== "limits" || stream.discard !== "new" || stream.max_msgs !== -1 ||
        stream.max_msgs_per_subject !== 1 || stream.max_age !== 0 || stream.storage !== expected.storage ||
        stream.num_replicas !== expected.replicas || stream.max_bytes !== expected.max_bytes ||
        stream.max_msg_size !== expected.maxValueSize || stream.allow_direct === true || stream.allow_msg_ttl === true ||
        stream.allow_rollup_hdrs !== true || stream.discard_new_per_subject === true || stream.sealed === true ||
        stream.no_ack === true || stream.subject_transform !== undefined || stream.republish !== undefined ||
        stream.mirror !== undefined || (stream.sources !== undefined &&
          (!Array.isArray(stream.sources) || stream.sources.length !== 0))) fail("YKP-WORK-PROJECTOR-003");
  } catch (error) {
    if (error instanceof WorkGovernanceProjectorError) throw error;
    fail("YKP-WORK-PROJECTOR-003");
  }
}

function conflict(error: unknown): boolean {
  return error instanceof JetStreamApiError &&
    (error.code === JetStreamApiCodes.StreamWrongLastSequence ||
     error.code === JetStreamApiCodes.StreamWrongLastSequenceUnknown);
}

export function workGovernanceProjectorKvPortsV1(kv: KV, bucket: BucketProfile["bucket"]): WorkGovernanceProjectorKvPortsV1 {
  const selected = profile(bucket);
  if (!kv || typeof kv.status !== "function" || typeof kv.get !== "function" ||
      typeof kv.create !== "function" || typeof kv.update !== "function") fail("YKP-WORK-PROJECTOR-001");
  const write = (key: string, data: Uint8Array) => {
    if (!KEY.test(key) || !(data instanceof Uint8Array) || data.byteLength === 0 || data.byteLength > selected.maxValueSize) {
      fail("YKP-WORK-PROJECTOR-001");
    }
  };
  return {
    status: () => kv.status(),
    async get(key) {
      if (!KEY.test(key)) fail("YKP-WORK-PROJECTOR-001");
      const found = await kv.get(key);
      return found === null ? null : { data: found.value, revision: found.revision };
    },
    async create(key, data) {
      write(key, data);
      try { return { outcome: "created", revision: await kv.create(key, data) }; }
      catch (error) { if (conflict(error)) return { outcome: "conflict" }; throw error; }
    },
    async update(key, data, revision) {
      write(key, data);
      if (!positive(revision)) fail("YKP-WORK-PROJECTOR-001");
      try { return { outcome: "updated", revision: await kv.update(key, data, revision) }; }
      catch (error) { if (conflict(error)) return { outcome: "conflict" }; throw error; }
    }
  };
}

/** Bind an existing projection bucket. Provisioning remains outside the application identity. */
export async function openWorkGovernanceProjectorKvPortsV1(
  client: JetStreamClient,
  bucket: BucketProfile["bucket"],
  options: { maxBytes: number; replicas: number }
): Promise<WorkGovernanceProjectorKvPortsV1> {
  try {
    const kv = await new Kvm(client).open(bucket, { allow_direct: false });
    const ports = workGovernanceProjectorKvPortsV1(kv, bucket);
    verifyWorkGovernanceProjectorKvConfigV1(await ports.status(), bucket, options);
    return ports;
  } catch (error) {
    if (error instanceof WorkGovernanceProjectorError) throw error;
    fail("YKP-WORK-PROJECTOR-004");
  }
}

export function workGovernanceProjectionKeyV1(namespaceId: string, aggregateId: string): string {
  if (!OPAQUE_ID.test(namespaceId) || !OPAQUE_ID.test(aggregateId)) fail("YKP-WORK-PROJECTOR-001");
  return createHash("sha256").update(`${namespaceId}\nwork_item\n${aggregateId}`, "utf8").digest("hex");
}

export function workGovernanceProjectorCheckpointKeyV1(): string {
  return createHash("sha256").update(WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_ID_V1, "utf8").digest("hex");
}

function parseState(value: unknown): { [key: string]: WorkGovernanceJson } {
  if (!object(value)) fail("YKP-WORK-PROJECTOR-003");
  try { return JSON.parse(canonicalWorkGovernanceJson(value)) as { [key: string]: WorkGovernanceJson }; }
  catch { fail("YKP-WORK-PROJECTOR-003"); }
}

export function parseWorkGovernanceProjectionV1(source: string | Uint8Array): WorkGovernanceProjectionV1 {
  try {
    if ((typeof source !== "string" && !(source instanceof Uint8Array)) || source.length > WORK_GOVERNANCE_PROJECTION_MAX_BYTES_V1) {
      fail("YKP-WORK-PROJECTOR-003");
    }
    const text = typeof source === "string" ? source : new TextDecoder("utf-8", { fatal: true }).decode(source);
    const value: unknown = JSON.parse(text);
    if (canonicalWorkGovernanceJson(value) !== text || !object(value) ||
        !exact(value, ["schema", "storage_epoch", "namespace_id", "aggregate", "last_event_id", "last_event_digest", "stream_sequence", "reducer_set_digest", "state_digest", "updated_at", "state"], ["project_id"]) ||
        value.schema !== "yukh-projects-projection-v1" || !positive(value.storage_epoch) ||
        typeof value.namespace_id !== "string" || !OPAQUE_ID.test(value.namespace_id) ||
        (value.project_id !== undefined && (typeof value.project_id !== "string" || !OPAQUE_ID.test(value.project_id))) ||
        !object(value.aggregate) || !exact(value.aggregate, ["kind", "id", "revision"]) ||
        value.aggregate.kind !== "work_item" || typeof value.aggregate.id !== "string" || !OPAQUE_ID.test(value.aggregate.id) ||
        !positive(value.aggregate.revision) || typeof value.last_event_id !== "string" || !UUID_V7.test(value.last_event_id) ||
        typeof value.last_event_digest !== "string" || !DIGEST.test(value.last_event_digest) ||
        !positive(value.stream_sequence) || typeof value.reducer_set_digest !== "string" || !DIGEST.test(value.reducer_set_digest) ||
        typeof value.state_digest !== "string" || !DIGEST.test(value.state_digest) ||
        !timestamp(value.updated_at)) fail("YKP-WORK-PROJECTOR-003");
    const state = parseState(value.state);
    if (sha256(canonicalWorkGovernanceJson(state)) !== value.state_digest) fail("YKP-WORK-PROJECTOR-003");
    return clone(value) as unknown as WorkGovernanceProjectionV1;
  } catch (error) {
    if (error instanceof WorkGovernanceProjectorError) throw error;
    fail("YKP-WORK-PROJECTOR-003");
  }
}

export function encodeWorkGovernanceProjectionV1(value: WorkGovernanceProjectionV1): string {
  try {
    const source = canonicalWorkGovernanceJson(value);
    if (Buffer.byteLength(source, "utf8") > WORK_GOVERNANCE_PROJECTION_MAX_BYTES_V1) fail("YKP-WORK-PROJECTOR-001");
    parseWorkGovernanceProjectionV1(source);
    return source;
  } catch (error) {
    if (error instanceof WorkGovernanceProjectorError) throw error;
    fail("YKP-WORK-PROJECTOR-001");
  }
}

export function parseWorkGovernanceProjectorCheckpointV1(source: string | Uint8Array): WorkGovernanceProjectorCheckpointV1 {
  try {
    if ((typeof source !== "string" && !(source instanceof Uint8Array)) || source.length > WORK_GOVERNANCE_CHECKPOINT_MAX_BYTES_V1) {
      fail("YKP-WORK-PROJECTOR-003");
    }
    const text = typeof source === "string" ? source : new TextDecoder("utf-8", { fatal: true }).decode(source);
    const value: unknown = JSON.parse(text);
    if (canonicalWorkGovernanceJson(value) !== text || !object(value) ||
        !exact(value, ["schema", "projector_id", "storage_epoch", "reducer_set_digest", "stream_sequence", "last_event_id", "last_event_digest", "updated_at"]) ||
        value.schema !== "yukh-projects-projector-checkpoint-v1" ||
        value.projector_id !== WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_ID_V1 || !positive(value.storage_epoch) ||
        typeof value.reducer_set_digest !== "string" || !DIGEST.test(value.reducer_set_digest) ||
        !positive(value.stream_sequence) || typeof value.last_event_id !== "string" || !UUID_V7.test(value.last_event_id) ||
        typeof value.last_event_digest !== "string" || !DIGEST.test(value.last_event_digest) || !timestamp(value.updated_at)) {
      fail("YKP-WORK-PROJECTOR-003");
    }
    return clone(value) as unknown as WorkGovernanceProjectorCheckpointV1;
  } catch (error) {
    if (error instanceof WorkGovernanceProjectorError) throw error;
    fail("YKP-WORK-PROJECTOR-003");
  }
}

export function encodeWorkGovernanceProjectorCheckpointV1(value: WorkGovernanceProjectorCheckpointV1): string {
  try {
    const source = canonicalWorkGovernanceJson(value);
    if (Buffer.byteLength(source, "utf8") > WORK_GOVERNANCE_CHECKPOINT_MAX_BYTES_V1) fail("YKP-WORK-PROJECTOR-001");
    parseWorkGovernanceProjectorCheckpointV1(source);
    return source;
  } catch (error) {
    if (error instanceof WorkGovernanceProjectorError) throw error;
    fail("YKP-WORK-PROJECTOR-001");
  }
}

function sameProjectionEvent(projection: WorkGovernanceProjectionV1, event: WorkGovernanceEventV1, sequence: number): boolean {
  return projection.storage_epoch === event.storage_epoch && projection.namespace_id === event.namespace_id &&
    projection.project_id === event.project_id && projection.aggregate.kind === event.aggregate.kind &&
    projection.aggregate.id === event.aggregate.id && projection.aggregate.revision === event.aggregate.revision &&
    projection.last_event_id === event.event_id && projection.last_event_digest === event.event_digest &&
    projection.stream_sequence === sequence;
}

function sameCheckpointEvent(checkpoint: WorkGovernanceProjectorCheckpointV1, event: WorkGovernanceEventV1, sequence: number): boolean {
  return checkpoint.storage_epoch === event.storage_epoch && checkpoint.stream_sequence === sequence &&
    checkpoint.last_event_id === event.event_id && checkpoint.last_event_digest === event.event_digest;
}

export function createWorkGovernanceWorkItemProjectorV1(options: {
  storageEpoch: number;
  bucket: { maxBytes: number; replicas: number };
  checkpointBucket: { maxBytes: number; replicas: number };
  projections: WorkGovernanceProjectorKvPortsV1;
  checkpoints: WorkGovernanceProjectorKvPortsV1;
  reducers: WorkGovernanceWorkItemReducerRegistryV1;
}) {
  if (!options || !positive(options.storageEpoch) || !options.projections || !options.checkpoints || !object(options.reducers) ||
      options.bucket.replicas !== options.checkpointBucket.replicas) fail("YKP-WORK-PROJECTOR-001");
  workGovernanceProjectorKvConfigV1(WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1, options.bucket);
  workGovernanceProjectorKvConfigV1(WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1, options.checkpointBucket);
  let reducerEntries: Array<[string, WorkGovernanceWorkItemReducerDescriptorV1]>;
  try {
    const keys = Reflect.ownKeys(options.reducers);
    if (keys.some((key) => typeof key !== "string")) fail("YKP-WORK-PROJECTOR-001");
    reducerEntries = (keys as string[]).map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(options.reducers, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable || !object(descriptor.value) ||
          !exact(descriptor.value, ["version", "digest", "reduce"])) {
        fail("YKP-WORK-PROJECTOR-001");
      }
      const entries = ["version", "digest", "reduce"].map((field) =>
        Object.getOwnPropertyDescriptor(descriptor.value, field));
      if (entries.some((entry) => !entry || !("value" in entry) || !entry.enumerable)) fail("YKP-WORK-PROJECTOR-001");
      const value = descriptor.value as unknown as WorkGovernanceWorkItemReducerDescriptorV1;
      if (!TOKEN.test(value.version) || !DIGEST.test(value.digest) || typeof value.reduce !== "function") {
        fail("YKP-WORK-PROJECTOR-001");
      }
      return [key, value];
    });
  } catch (error) {
    if (error instanceof WorkGovernanceProjectorError) throw error;
    fail("YKP-WORK-PROJECTOR-001");
  }
  if (reducerEntries.length === 0 || reducerEntries.length > 32 ||
      reducerEntries.some(([type]) => WORK_GOVERNANCE_EVENT_CATALOG_V1[type] !== "work_item")) {
    fail("YKP-WORK-PROJECTOR-001");
  }
  reducerEntries.sort(([left], [right]) => left.localeCompare(right));
  const reducerSetDigest = sha256(canonicalWorkGovernanceJson(reducerEntries.map(([type, descriptor]) => ({
    type, version: descriptor.version, digest: descriptor.digest
  }))));
  const reducers = new Map(reducerEntries.map(([type, descriptor]) => [type, descriptor.reduce]));
  let configured: Promise<void> | undefined;
  const ready = async () => {
    configured ??= Promise.all([
      options.projections.status().then((status) => verifyWorkGovernanceProjectorKvConfigV1(status, WORK_GOVERNANCE_WORK_ITEMS_BUCKET_V1, options.bucket)),
      options.checkpoints.status().then((status) => verifyWorkGovernanceProjectorKvConfigV1(status, WORK_GOVERNANCE_PROJECTOR_CHECKPOINTS_BUCKET_V1, options.checkpointBucket))
    ]).then(() => undefined);
    try { await configured; } catch (error) {
      if (error instanceof WorkGovernanceProjectorError) throw error;
      fail("YKP-WORK-PROJECTOR-004");
    }
  };
  const readProjection = async (key: string) => {
    try {
      const found = await options.projections.get(key);
      if (found === null) return null;
      if (!positive(found.revision)) fail("YKP-WORK-PROJECTOR-003");
      return { value: parseWorkGovernanceProjectionV1(found.data), casRevision: found.revision };
    } catch (error) {
      if (error instanceof WorkGovernanceProjectorError) throw error;
      fail("YKP-WORK-PROJECTOR-004");
    }
  };
  const readCheckpoint = async () => {
    try {
      const found = await options.checkpoints.get(workGovernanceProjectorCheckpointKeyV1());
      if (found === null) return null;
      if (!positive(found.revision)) fail("YKP-WORK-PROJECTOR-003");
      return { value: parseWorkGovernanceProjectorCheckpointV1(found.data), casRevision: found.revision };
    } catch (error) {
      if (error instanceof WorkGovernanceProjectorError) throw error;
      fail("YKP-WORK-PROJECTOR-004");
    }
  };
  const exactWrite = async (
    ports: WorkGovernanceProjectorKvPortsV1,
    key: string,
    data: Uint8Array,
    currentRevision: number | null,
    verify: (source: Uint8Array) => boolean
  ) => {
    let result:
      | Awaited<ReturnType<WorkGovernanceProjectorKvPortsV1["create"]>>
      | Awaited<ReturnType<WorkGovernanceProjectorKvPortsV1["update"]>>;
    try {
      result = currentRevision === null
        ? await ports.create(key, data)
        : await ports.update(key, data, currentRevision);
    } catch { fail("YKP-WORK-PROJECTOR-004"); }
    if (result.outcome === "created" || result.outcome === "updated") return;
    let winner: Awaited<ReturnType<WorkGovernanceProjectorKvPortsV1["get"]>>;
    try { winner = await ports.get(key); } catch { fail("YKP-WORK-PROJECTOR-004"); }
    if (winner === null || !positive(winner.revision) || !verify(winner.data)) fail("YKP-WORK-PROJECTOR-005");
  };
  return {
    storageProfile: { storage_epoch: options.storageEpoch, replicas: options.bucket.replicas } as const,
    async apply(input: { stream_sequence: number; event: WorkGovernanceEventV1 }) {
      if (!input || !positive(input.stream_sequence)) fail("YKP-WORK-PROJECTOR-001");
      let event: WorkGovernanceEventV1;
      try { event = parseWorkGovernanceEventV1(encodeWorkGovernanceEventV1(input.event)); }
      catch { fail("YKP-WORK-PROJECTOR-001"); }
      if (event.storage_epoch !== options.storageEpoch) fail("YKP-WORK-PROJECTOR-002");
      const catalogKind = WORK_GOVERNANCE_EVENT_CATALOG_V1[event.type];
      if (!catalogKind || event.aggregate.kind !== catalogKind) fail("YKP-WORK-PROJECTOR-006");
      const relevant = catalogKind === "work_item";
      const reducer = reducers.get(event.type);
      if (relevant && !reducer) fail("YKP-WORK-PROJECTOR-006");
      await ready();
      const checkpoint = await readCheckpoint();
      const key = relevant ? workGovernanceProjectionKeyV1(event.namespace_id, event.aggregate.id) : null;
      const current = key === null ? null : await readProjection(key);
      if (checkpoint && checkpoint.value.reducer_set_digest !== reducerSetDigest) fail("YKP-WORK-PROJECTOR-002");
      if (current && current.value.reducer_set_digest !== reducerSetDigest) fail("YKP-WORK-PROJECTOR-002");
      if (checkpoint) {
        if (checkpoint.value.storage_epoch !== options.storageEpoch) fail("YKP-WORK-PROJECTOR-002");
        if (input.stream_sequence === checkpoint.value.stream_sequence) {
          if (!sameCheckpointEvent(checkpoint.value, event, input.stream_sequence) ||
              (relevant && (!current || !sameProjectionEvent(current.value, event, input.stream_sequence)))) {
            fail("YKP-WORK-PROJECTOR-002");
          }
          return relevant
            ? { outcome: "replayed" as const, projection: current!.value, checkpoint: checkpoint.value }
            : { outcome: "replayed" as const, checkpoint: checkpoint.value };
        }
        if (input.stream_sequence !== checkpoint.value.stream_sequence + 1) fail("YKP-WORK-PROJECTOR-002");
      } else if (input.stream_sequence !== 1) fail("YKP-WORK-PROJECTOR-002");

      let target: WorkGovernanceProjectionV1 | null = null;
      let projectionAlreadyDurable = false;
      if (!relevant) {
        // This projector has its own global checkpoint. Known events for other
        // aggregate views are deliberately observed without mutating work items.
      } else if (current && sameProjectionEvent(current.value, event, input.stream_sequence)) {
        target = current.value;
        projectionAlreadyDurable = true;
      } else {
        if (current) {
          if (current.value.storage_epoch !== event.storage_epoch || current.value.namespace_id !== event.namespace_id ||
              current.value.project_id !== event.project_id || current.value.aggregate.kind !== event.aggregate.kind ||
              current.value.aggregate.id !== event.aggregate.id ||
              event.aggregate.revision !== current.value.aggregate.revision + 1 ||
              event.previous?.event_id !== current.value.last_event_id ||
              event.previous.digest !== current.value.last_event_digest ||
              input.stream_sequence <= current.value.stream_sequence) fail("YKP-WORK-PROJECTOR-002");
        } else if (event.aggregate.revision !== 1 || event.previous !== undefined) fail("YKP-WORK-PROJECTOR-002");
        let state: { [key: string]: WorkGovernanceJson };
        try { state = parseState(reducer!(current ? clone(current.value.state) : null, clone(event))); }
        catch { fail("YKP-WORK-PROJECTOR-006"); }
        target = {
          schema: "yukh-projects-projection-v1",
          storage_epoch: event.storage_epoch,
          namespace_id: event.namespace_id,
          ...(event.project_id === undefined ? {} : { project_id: event.project_id }),
          aggregate: { kind: "work_item", id: event.aggregate.id, revision: event.aggregate.revision },
          last_event_id: event.event_id,
          last_event_digest: event.event_digest,
          stream_sequence: input.stream_sequence,
          reducer_set_digest: reducerSetDigest,
          state_digest: sha256(canonicalWorkGovernanceJson(state)),
          updated_at: event.occurred_at,
          state
        };
        const encoded = new TextEncoder().encode(encodeWorkGovernanceProjectionV1(target));
        await exactWrite(options.projections, key!, encoded, current?.casRevision ?? null, (source) => {
          try { return encodeWorkGovernanceProjectionV1(parseWorkGovernanceProjectionV1(source)) === new TextDecoder().decode(encoded); }
          catch { return false; }
        });
      }
      const nextCheckpoint: WorkGovernanceProjectorCheckpointV1 = {
        schema: "yukh-projects-projector-checkpoint-v1",
        projector_id: WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_ID_V1,
        storage_epoch: event.storage_epoch,
        reducer_set_digest: reducerSetDigest,
        stream_sequence: input.stream_sequence,
        last_event_id: event.event_id,
        last_event_digest: event.event_digest,
        updated_at: event.occurred_at
      };
      const encodedCheckpoint = new TextEncoder().encode(encodeWorkGovernanceProjectorCheckpointV1(nextCheckpoint));
      await exactWrite(options.checkpoints, workGovernanceProjectorCheckpointKeyV1(), encodedCheckpoint,
        checkpoint?.casRevision ?? null, (source) => {
          try { return encodeWorkGovernanceProjectorCheckpointV1(parseWorkGovernanceProjectorCheckpointV1(source)) === new TextDecoder().decode(encodedCheckpoint); }
          catch { return false; }
        });
      if (!relevant) return { outcome: "observed" as const, checkpoint: nextCheckpoint };
      return { outcome: projectionAlreadyDurable ? "recovered" as const : "projected" as const,
        projection: target!, checkpoint: nextCheckpoint };
    }
  };
}
