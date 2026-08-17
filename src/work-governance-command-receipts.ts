import { createHash } from "node:crypto";
import { JetStreamApiCodes, JetStreamApiError, StorageType, type JetStreamClient } from "@nats-io/jetstream";
import { Kvm, type KV } from "@nats-io/kv";
import {
  canonicalWorkGovernanceJson,
  encodeWorkGovernanceEventV1,
  parseWorkGovernanceCommandV1,
  parseWorkGovernanceEventV1,
  type WorkGovernanceCommandV1,
  type WorkGovernanceEventV1
} from "./work-governance-events.js";
import {
  WorkGovernanceJetStreamError,
  type WorkGovernanceJetStreamAppendResultV1
} from "./work-governance-jetstream.js";

export const WORK_GOVERNANCE_COMMAND_RECEIPTS_BUCKET_V1 = "YKP_COMMAND_RECEIPTS_V1";
export const WORK_GOVERNANCE_COMMAND_RECEIPT_MAX_BYTES_V1 = 8 * 1024;
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DIGEST = /^sha-256:[0-9a-f]{64}$/u;
const KEY = /^[0-9a-f]{64}$/u;

export type WorkGovernanceCommandReceiptStateV1 = "reserved" | "completion_unknown" | "appended";
export type WorkGovernanceCommandReceiptErrorCode =
  | "YKP-WORK-RECEIPT-001"
  | "YKP-WORK-RECEIPT-002"
  | "YKP-WORK-RECEIPT-003"
  | "YKP-WORK-RECEIPT-004"
  | "YKP-WORK-RECEIPT-005"
  | "YKP-WORK-RECEIPT-006";

export class WorkGovernanceCommandReceiptError extends Error {
  constructor(readonly code: WorkGovernanceCommandReceiptErrorCode) {
    super("work-governance command receipt operation failed");
    this.name = "WorkGovernanceCommandReceiptError";
  }
}

/** Internal durability record. This is not the public append receipt. */
export interface WorkGovernanceCommandReceiptV1 {
  schema: "yukh-projects-command-receipt-v1";
  storage_epoch: number;
  command_id: string;
  command_digest: string;
  event_id: string;
  event_digest: string;
  aggregate_revision: number;
  state: WorkGovernanceCommandReceiptStateV1;
  stream_sequence?: number;
}

export interface WorkGovernanceCommandReceiptRecordV1 {
  receipt: WorkGovernanceCommandReceiptV1;
  cas_revision: number;
}

export interface WorkGovernanceCommandReceiptKvPortsV1 {
  status(): Promise<unknown>;
  get(key: string): Promise<{ data: Uint8Array; revision: number } | null>;
  create(key: string, data: Uint8Array): Promise<{ outcome: "created"; revision: number } | { outcome: "conflict" }>;
  update(key: string, data: Uint8Array, revision: number): Promise<{ outcome: "updated"; revision: number } | { outcome: "conflict" }>;
}

function fail(code: WorkGovernanceCommandReceiptErrorCode): never {
  throw new WorkGovernanceCommandReceiptError(code);
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
function positive(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) > 0; }
function exact(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => allowed.has(key));
}
function sha256(value: string): string { return `sha-256:${createHash("sha256").update(value, "utf8").digest("hex")}`; }

export function workGovernanceCommandReceiptKeyV1(commandId: string): string {
  if (!UUID_V7.test(commandId)) fail("YKP-WORK-RECEIPT-001");
  return createHash("sha256").update(commandId, "utf8").digest("hex");
}

export function workGovernanceCommandDigestV1(command: WorkGovernanceCommandV1): string {
  try {
    const parsed = parseWorkGovernanceCommandV1(canonicalWorkGovernanceJson(command));
    return sha256(canonicalWorkGovernanceJson(parsed));
  } catch { fail("YKP-WORK-RECEIPT-001"); }
}

export function encodeWorkGovernanceCommandReceiptV1(receipt: WorkGovernanceCommandReceiptV1): string {
  const parsed = parseWorkGovernanceCommandReceiptV1(canonicalWorkGovernanceJson(receipt));
  const source = canonicalWorkGovernanceJson(parsed);
  if (Buffer.byteLength(source, "utf8") > WORK_GOVERNANCE_COMMAND_RECEIPT_MAX_BYTES_V1) fail("YKP-WORK-RECEIPT-001");
  return source;
}

export function parseWorkGovernanceCommandReceiptV1(source: string | Uint8Array): WorkGovernanceCommandReceiptV1 {
  let text: string;
  try {
    if ((typeof source === "string" || source instanceof Uint8Array) && source.length > WORK_GOVERNANCE_COMMAND_RECEIPT_MAX_BYTES_V1) fail("YKP-WORK-RECEIPT-003");
    text = typeof source === "string" ? source : new TextDecoder("utf-8", { fatal: true }).decode(source);
    const value: unknown = JSON.parse(text);
    if (canonicalWorkGovernanceJson(value) !== text || !object(value) ||
        !exact(value, ["schema", "storage_epoch", "command_id", "command_digest", "event_id", "event_digest", "aggregate_revision", "state"], ["stream_sequence"]) ||
        value.schema !== "yukh-projects-command-receipt-v1" || !positive(value.storage_epoch) ||
        typeof value.command_id !== "string" || !UUID_V7.test(value.command_id) ||
        typeof value.command_digest !== "string" || !DIGEST.test(value.command_digest) ||
        typeof value.event_id !== "string" || !UUID_V7.test(value.event_id) ||
        typeof value.event_digest !== "string" || !DIGEST.test(value.event_digest) || !positive(value.aggregate_revision) ||
        !["reserved", "completion_unknown", "appended"].includes(String(value.state)) ||
        (value.state === "appended" ? !positive(value.stream_sequence) : value.stream_sequence !== undefined)) {
      fail("YKP-WORK-RECEIPT-003");
    }
    return JSON.parse(text) as WorkGovernanceCommandReceiptV1;
  } catch (error) {
    if (error instanceof WorkGovernanceCommandReceiptError) throw error;
    fail("YKP-WORK-RECEIPT-003");
  }
}

export function workGovernanceCommandReceiptKvConfigV1(options: { maxBytes: number; replicas: number }) {
  if (!options || !positive(options.maxBytes) || options.maxBytes < 64 * 1024 ||
      !Number.isSafeInteger(options.replicas) || ![1, 3, 5].includes(options.replicas)) fail("YKP-WORK-RECEIPT-001");
  return {
    description: "Yukh Projects command receipts v1",
    history: 1,
    ttl: 0,
    markerTTL: 0,
    storage: StorageType.File,
    replicas: options.replicas,
    max_bytes: options.maxBytes,
    maxValueSize: WORK_GOVERNANCE_COMMAND_RECEIPT_MAX_BYTES_V1,
    allow_direct: false
  } as const;
}

export function verifyWorkGovernanceCommandReceiptKvConfigV1(source: unknown, options: { maxBytes: number; replicas: number }): void {
  const expected = workGovernanceCommandReceiptKvConfigV1(options);
  try {
    if (source === null || typeof source !== "object" || Array.isArray(source)) fail("YKP-WORK-RECEIPT-003");
    const status = source as Record<string, unknown>;
    const streamInfo = status.streamInfo;
    const stream = streamInfo !== null && typeof streamInfo === "object" && !Array.isArray(streamInfo) &&
      (streamInfo as Record<string, unknown>).config !== null && typeof (streamInfo as Record<string, unknown>).config === "object" &&
      !Array.isArray((streamInfo as Record<string, unknown>).config)
      ? (streamInfo as Record<string, unknown>).config as Record<string, unknown> : null;
    if (status.bucket !== WORK_GOVERNANCE_COMMAND_RECEIPTS_BUCKET_V1 || status.history !== 1 || status.ttl !== 0 ||
        status.markerTTL !== 0 || status.storage !== expected.storage || status.replicas !== expected.replicas ||
        status.description !== expected.description || status.max_bytes !== expected.max_bytes ||
        status.maxValueSize !== expected.maxValueSize || !stream || !Array.isArray(stream.subjects) ||
        stream.subjects.length !== 1 || stream.subjects[0] !== `$KV.${WORK_GOVERNANCE_COMMAND_RECEIPTS_BUCKET_V1}.>` ||
        stream.retention !== "limits" || stream.discard !== "new" || stream.max_msgs !== -1 ||
        stream.max_msgs_per_subject !== 1 || stream.max_age !== 0 || stream.storage !== expected.storage ||
        stream.num_replicas !== expected.replicas || stream.max_bytes !== expected.max_bytes ||
        stream.max_msg_size !== expected.maxValueSize || stream.allow_direct === true || stream.allow_msg_ttl === true ||
        stream.allow_rollup_hdrs !== true || stream.subject_transform !== undefined ||
        stream.republish !== undefined || stream.mirror !== undefined ||
        (stream.sources !== undefined && (!Array.isArray(stream.sources) || stream.sources.length !== 0))) {
      fail("YKP-WORK-RECEIPT-003");
    }
  } catch (error) {
    if (error instanceof WorkGovernanceCommandReceiptError) throw error;
    fail("YKP-WORK-RECEIPT-003");
  }
}

function conflict(error: unknown): boolean {
  return error instanceof JetStreamApiError &&
    (error.code === JetStreamApiCodes.StreamWrongLastSequence || error.code === JetStreamApiCodes.StreamWrongLastSequenceUnknown);
}

export function workGovernanceCommandReceiptKvPortsV1(kv: KV): WorkGovernanceCommandReceiptKvPortsV1 {
  if (!kv || typeof kv.status !== "function" || typeof kv.get !== "function" ||
      typeof kv.create !== "function" || typeof kv.update !== "function") fail("YKP-WORK-RECEIPT-001");
  return {
    status: () => kv.status(),
    async get(key) {
      if (!KEY.test(key)) fail("YKP-WORK-RECEIPT-001");
      const entry = await kv.get(key);
      return entry === null ? null : { data: entry.value, revision: entry.revision };
    },
    async create(key, data) {
      try { return { outcome: "created", revision: await kv.create(key, data) }; }
      catch (error) { if (conflict(error)) return { outcome: "conflict" }; throw error; }
    },
    async update(key, data, revision) {
      try { return { outcome: "updated", revision: await kv.update(key, data, revision) }; }
      catch (error) { if (conflict(error)) return { outcome: "conflict" }; throw error; }
    }
  };
}

/** Bind an existing bucket. Provisioning authority remains outside the application. */
export async function openWorkGovernanceCommandReceiptKvPortsV1(
  client: JetStreamClient,
  options: { maxBytes: number; replicas: number }
): Promise<WorkGovernanceCommandReceiptKvPortsV1> {
  try {
    const kv = await new Kvm(client).open(WORK_GOVERNANCE_COMMAND_RECEIPTS_BUCKET_V1, { allow_direct: false });
    const ports = workGovernanceCommandReceiptKvPortsV1(kv);
    verifyWorkGovernanceCommandReceiptKvConfigV1(await ports.status(), options);
    return ports;
  } catch (error) {
    if (error instanceof WorkGovernanceCommandReceiptError) throw error;
    fail("YKP-WORK-RECEIPT-004");
  }
}

function binding(commandInput: WorkGovernanceCommandV1, eventInput: WorkGovernanceEventV1): WorkGovernanceCommandReceiptV1 {
  try {
    const command = parseWorkGovernanceCommandV1(canonicalWorkGovernanceJson(commandInput));
    const event = parseWorkGovernanceEventV1(encodeWorkGovernanceEventV1(eventInput));
    if (event.command.id !== command.command_id || event.command.expected_revision !== command.aggregate.expected_revision ||
        event.storage_epoch !== command.storage_epoch || event.namespace_id !== command.namespace_id ||
        event.aggregate.kind !== command.aggregate.kind || event.aggregate.id !== command.aggregate.id ||
        event.aggregate.revision !== command.aggregate.expected_revision + 1 || event.project_id !== command.project_id ||
        event.run_id !== command.run_id || event.correlation_id !== command.correlation_id ||
        event.causation_id !== command.causation_id || canonicalWorkGovernanceJson(event.actor) !== canonicalWorkGovernanceJson(command.actor) ||
        canonicalWorkGovernanceJson(event.policy) !== canonicalWorkGovernanceJson(command.policy)) fail("YKP-WORK-RECEIPT-001");
    return {
      schema: "yukh-projects-command-receipt-v1", storage_epoch: command.storage_epoch,
      command_id: command.command_id, command_digest: workGovernanceCommandDigestV1(command),
      event_id: event.event_id, event_digest: event.event_digest,
      aggregate_revision: event.aggregate.revision, state: "reserved"
    };
  } catch (error) {
    if (error instanceof WorkGovernanceCommandReceiptError) throw error;
    fail("YKP-WORK-RECEIPT-001");
  }
}

function sameBinding(left: WorkGovernanceCommandReceiptV1, right: WorkGovernanceCommandReceiptV1): boolean {
  return left.storage_epoch === right.storage_epoch && left.command_id === right.command_id &&
    left.command_digest === right.command_digest && left.event_id === right.event_id &&
    left.event_digest === right.event_digest && left.aggregate_revision === right.aggregate_revision;
}

export function createWorkGovernanceCommandReceiptStoreV1(options: {
  storageEpoch: number;
  bucket: { maxBytes: number; replicas: number };
  ports: WorkGovernanceCommandReceiptKvPortsV1;
}) {
  if (!options || !positive(options.storageEpoch) || !options.ports) fail("YKP-WORK-RECEIPT-001");
  workGovernanceCommandReceiptKvConfigV1(options.bucket);
  let configured: Promise<void> | undefined;
  const ready = async () => {
    configured ??= options.ports.status().then((status) => verifyWorkGovernanceCommandReceiptKvConfigV1(status, options.bucket));
    try { await configured; } catch (error) {
      if (error instanceof WorkGovernanceCommandReceiptError) throw error;
      fail("YKP-WORK-RECEIPT-004");
    }
  };
  const read = async (key: string): Promise<WorkGovernanceCommandReceiptRecordV1 | null> => {
    let found: Awaited<ReturnType<WorkGovernanceCommandReceiptKvPortsV1["get"]>>;
    try { found = await options.ports.get(key); } catch { fail("YKP-WORK-RECEIPT-004"); }
    if (found === null) return null;
    if (!positive(found.revision)) fail("YKP-WORK-RECEIPT-003");
    return { receipt: parseWorkGovernanceCommandReceiptV1(found.data), cas_revision: found.revision };
  };
  const matched = (record: WorkGovernanceCommandReceiptRecordV1, expected: WorkGovernanceCommandReceiptV1) => {
    if (!sameBinding(record.receipt, expected)) fail("YKP-WORK-RECEIPT-002");
    return record;
  };
  const transition = async (
    expected: WorkGovernanceCommandReceiptV1,
    state: "completion_unknown" | "appended",
    streamSequence?: number
  ): Promise<WorkGovernanceCommandReceiptRecordV1> => {
    if (expected.storage_epoch !== options.storageEpoch) fail("YKP-WORK-RECEIPT-002");
    await ready();
    const key = workGovernanceCommandReceiptKeyV1(expected.command_id);
    for (let attempt = 0; attempt < 4; attempt++) {
      const current = await read(key); if (!current) fail("YKP-WORK-RECEIPT-003"); matched(current, expected);
      if (current.receipt.state === "appended") {
        if (state === "completion_unknown") return current;
        if (state === "appended" && current.receipt.stream_sequence === streamSequence) return current;
        fail("YKP-WORK-RECEIPT-003");
      }
      if (state === "completion_unknown" && current.receipt.state === "completion_unknown") return current;
      const next: WorkGovernanceCommandReceiptV1 = state === "appended"
        ? { ...expected, state, stream_sequence: streamSequence }
        : { ...expected, state };
      if (state === "appended" && !positive(streamSequence)) fail("YKP-WORK-RECEIPT-001");
      let result: Awaited<ReturnType<WorkGovernanceCommandReceiptKvPortsV1["update"]>>;
      try { result = await options.ports.update(key, new TextEncoder().encode(encodeWorkGovernanceCommandReceiptV1(next)), current.cas_revision); }
      catch { fail("YKP-WORK-RECEIPT-004"); }
      if (result.outcome === "updated") return { receipt: next, cas_revision: result.revision };
    }
    fail("YKP-WORK-RECEIPT-005");
  };
  return {
    async reserve(command: WorkGovernanceCommandV1, event: WorkGovernanceEventV1): Promise<{ outcome: "reserved" | "existing"; record: WorkGovernanceCommandReceiptRecordV1 }> {
      const expected = binding(command, event);
      if (expected.storage_epoch !== options.storageEpoch) fail("YKP-WORK-RECEIPT-002");
      await ready();
      const key = workGovernanceCommandReceiptKeyV1(expected.command_id);
      const existing = await read(key);
      if (existing) return { outcome: "existing", record: matched(existing, expected) };
      let result: Awaited<ReturnType<WorkGovernanceCommandReceiptKvPortsV1["create"]>>;
      try { result = await options.ports.create(key, new TextEncoder().encode(encodeWorkGovernanceCommandReceiptV1(expected))); }
      catch { fail("YKP-WORK-RECEIPT-004"); }
      if (result.outcome === "created") return { outcome: "reserved", record: { receipt: expected, cas_revision: result.revision } };
      const winner = await read(key); if (!winner) fail("YKP-WORK-RECEIPT-005");
      return { outcome: "existing", record: matched(winner, expected) };
    },
    markCompletionUnknown: (command: WorkGovernanceCommandV1, event: WorkGovernanceEventV1) =>
      transition(binding(command, event), "completion_unknown"),
    markAppended: (command: WorkGovernanceCommandV1, event: WorkGovernanceEventV1, streamSequence: number) =>
      transition(binding(command, event), "appended", streamSequence)
  };
}

export function createWorkGovernanceCommandAppendCoordinatorV1(options: {
  receipts: ReturnType<typeof createWorkGovernanceCommandReceiptStoreV1>;
  appender: { append(event: WorkGovernanceEventV1): Promise<WorkGovernanceJetStreamAppendResultV1> };
}) {
  if (!options?.receipts || !options.appender || typeof options.appender.append !== "function") fail("YKP-WORK-RECEIPT-001");
  const publish = async (command: WorkGovernanceCommandV1, event: WorkGovernanceEventV1) => {
    try {
      const result = await options.appender.append(event);
      const record = await options.receipts.markAppended(command, event, result.persistence.stream_sequence);
      return { outcome: result.outcome, event: result.event, receipt: record.receipt };
    } catch (error) {
      if (error instanceof WorkGovernanceJetStreamError && error.code === "YKP-WORK-JS-005") {
        await options.receipts.markCompletionUnknown(command, event);
      }
      throw error;
    }
  };
  return {
    async append(command: WorkGovernanceCommandV1, event: WorkGovernanceEventV1) {
      const reservation = await options.receipts.reserve(command, event);
      if (reservation.record.receipt.state === "appended") {
        return { outcome: "replayed" as const, event: parseWorkGovernanceEventV1(encodeWorkGovernanceEventV1(event)), receipt: reservation.record.receipt };
      }
      if (reservation.outcome !== "reserved") fail("YKP-WORK-RECEIPT-006");
      return publish(command, event);
    },
    /** Explicit recovery only: retry the exact reserved event; aggregate CAS makes the probe safe. */
    async resolveCompletionUnknown(command: WorkGovernanceCommandV1, event: WorkGovernanceEventV1) {
      const reservation = await options.receipts.reserve(command, event);
      if (reservation.record.receipt.state === "appended") {
        return { outcome: "replayed" as const, event: parseWorkGovernanceEventV1(encodeWorkGovernanceEventV1(event)), receipt: reservation.record.receipt };
      }
      if (reservation.record.receipt.state !== "completion_unknown" && reservation.record.receipt.state !== "reserved") {
        fail("YKP-WORK-RECEIPT-006");
      }
      return publish(command, event);
    }
  };
}
