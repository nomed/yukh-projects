import { createHash } from "node:crypto";

export type WorkGovernanceJson = null | boolean | number | string | WorkGovernanceJson[] | { [key: string]: WorkGovernanceJson };
export type WorkGovernanceAggregateKind = "project" | "run" | "work_item" | "namespace_graph" | "project_roadmap" | "namespace_admission" | "external_mapping";
export type WorkGovernanceEventErrorCode = "YKP-WORK-001" | "YKP-WORK-002" | "YKP-WORK-003";

export class WorkGovernanceEventError extends Error {
  constructor(readonly code: WorkGovernanceEventErrorCode) {
    super("work-governance event operation failed");
    this.name = "WorkGovernanceEventError";
  }
}

export interface WorkGovernanceAggregateCommandV1 {
  kind: WorkGovernanceAggregateKind;
  id: string;
  expected_revision: number;
}
export interface WorkGovernanceActorV1 { subject_id: string; claim_id?: string; lease_id?: string }
export interface WorkGovernancePolicyV1 { version: string; digest: string }
export interface WorkGovernanceCommandV1 {
  schema: "yukh-projects-command-v1";
  command_id: string;
  storage_epoch: number;
  namespace_id: string;
  project_id?: string;
  run_id?: string;
  aggregate: WorkGovernanceAggregateCommandV1;
  actor: WorkGovernanceActorV1;
  policy: WorkGovernancePolicyV1;
  correlation_id: string;
  causation_id: string;
  data: { [key: string]: WorkGovernanceJson };
}
export interface WorkGovernanceEvidenceV1 { kind: string; uri: string; digest: string }
export interface WorkGovernanceEventV1 {
  schema: "yukh-projects-event-v1";
  specversion: "1.0";
  event_id: string;
  type: string;
  occurred_at: string;
  storage_epoch: number;
  namespace_id: string;
  project_id?: string;
  run_id?: string;
  aggregate: { kind: WorkGovernanceAggregateKind; id: string; revision: number };
  previous?: { event_id: string; digest: string };
  command: { id: string; expected_revision: number };
  actor: WorkGovernanceActorV1;
  policy: WorkGovernancePolicyV1;
  correlation_id: string;
  causation_id: string;
  evidence: WorkGovernanceEvidenceV1[];
  data: { [key: string]: WorkGovernanceJson };
  event_digest: string;
}
export interface WorkGovernanceAppendV1 {
  command: WorkGovernanceCommandV1;
  event_type: string;
  evidence?: readonly WorkGovernanceEvidenceV1[];
  data: { [key: string]: WorkGovernanceJson };
}
export interface WorkGovernanceAppendResultV1 { outcome: "appended" | "replayed"; event: WorkGovernanceEventV1 }

const MAX_BYTES = 64 * 1024;
const MAX_DEPTH = 32;
const MAX_NODES = 8192;
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DIGEST = /^sha-256:[0-9a-f]{64}$/u;
const OPAQUE_ID = /^[a-z][a-z0-9_-]{0,31}:[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
const EVENT_TYPE = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+\.v[1-9][0-9]*$/u;
const TOKEN = /^[a-z][a-z0-9_-]{0,63}$/u;
const AGGREGATE_KINDS = new Set<WorkGovernanceAggregateKind>(["project", "run", "work_item", "namespace_graph", "project_roadmap", "namespace_admission", "external_mapping"]);

function fail(code: WorkGovernanceEventErrorCode = "YKP-WORK-001"): never { throw new WorkGovernanceEventError(code); }
function record(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function exact(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): void {
  const allowed = new Set([...required, ...optional]);
  if (required.some((key) => !Object.hasOwn(value, key)) || Object.keys(value).some((key) => !allowed.has(key))) fail();
}
function unicode(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}
function text(value: unknown, maximum = 256): value is string {
  return typeof value === "string" && value.length > 0 && Buffer.byteLength(value, "utf8") <= maximum && unicode(value) && !/[\u0000-\u001f\u007f]/u.test(value);
}
function opaque(value: unknown): value is string { return typeof value === "string" && OPAQUE_ID.test(value); }
function uuid(value: unknown): value is string { return typeof value === "string" && UUID_V7.test(value); }
function digest(value: unknown): value is string { return typeof value === "string" && DIGEST.test(value); }
function integer(value: unknown, minimum = 0): value is number { return Number.isSafeInteger(value) && Number(value) >= minimum; }
function timestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

function canonical(value: unknown, seen: Set<object>, depth: number, count: { value: number }): string {
  if (++count.value > MAX_NODES || depth > MAX_DEPTH) fail();
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") { if (!unicode(value)) fail(); return JSON.stringify(value); }
  if (typeof value === "number") { if (!Number.isFinite(value)) fail(); return JSON.stringify(value); }
  if (Array.isArray(value)) {
    if (seen.has(value)) fail(); seen.add(value);
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => key !== "length" && (typeof key !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(key)))) fail();
    for (let index = 0; index < value.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) fail();
    }
    const output = `[${value.map((item) => canonical(item, seen, depth + 1, count)).join(",")}]`;
    seen.delete(value); return output;
  }
  if (!record(value) || seen.has(value)) fail();
  seen.add(value);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) fail();
  const keys = (ownKeys as string[]).sort();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) fail();
  }
  for (const key of keys) if (!unicode(key)) fail();
  const output = `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key], seen, depth + 1, count)}`).join(",")}}`;
  seen.delete(value); return output;
}

/** RFC 8785 JSON canonicalization for bounded JSON-compatible values. */
export function canonicalWorkGovernanceJson(value: unknown): string {
  return canonical(value, new Set<object>(), 0, { value: 0 });
}
function sha256(value: string): string { return `sha-256:${createHash("sha256").update(value, "utf8").digest("hex")}`; }
function boundedCanonical(value: unknown): string {
  const source = canonicalWorkGovernanceJson(value);
  if (Buffer.byteLength(source, "utf8") > MAX_BYTES) fail();
  return source;
}
function cloneJson<T>(value: T): T { return JSON.parse(canonicalWorkGovernanceJson(value)) as T; }

function parseAggregateCommand(value: unknown): WorkGovernanceAggregateCommandV1 {
  if (!record(value)) fail(); exact(value, ["kind", "id", "expected_revision"]);
  if (!AGGREGATE_KINDS.has(value.kind as WorkGovernanceAggregateKind) || !opaque(value.id) || !integer(value.expected_revision)) fail();
  return value as unknown as WorkGovernanceAggregateCommandV1;
}
function parseActor(value: unknown): WorkGovernanceActorV1 {
  if (!record(value)) fail(); exact(value, ["subject_id"], ["claim_id", "lease_id"]);
  if (!opaque(value.subject_id) || (value.claim_id !== undefined && !opaque(value.claim_id)) || (value.lease_id !== undefined && !opaque(value.lease_id)) || (value.lease_id !== undefined && value.claim_id === undefined)) fail();
  return value as unknown as WorkGovernanceActorV1;
}
function parsePolicy(value: unknown): WorkGovernancePolicyV1 {
  if (!record(value)) fail(); exact(value, ["version", "digest"]);
  if (!text(value.version, 128) || !TOKEN.test(value.version) || !digest(value.digest)) fail();
  return value as unknown as WorkGovernancePolicyV1;
}
function parseData(value: unknown): { [key: string]: WorkGovernanceJson } {
  if (!record(value)) fail();
  boundedCanonical(value);
  return value as { [key: string]: WorkGovernanceJson };
}
function parseEvidence(value: unknown): WorkGovernanceEvidenceV1[] {
  if (!Array.isArray(value) || value.length > 16) fail();
  return value.map((item) => {
    if (!record(item)) fail(); exact(item, ["kind", "uri", "digest"]);
    if (!text(item.kind, 64) || !TOKEN.test(item.kind) || !text(item.uri, 512) || !String(item.uri).startsWith("urn:") || !digest(item.digest)) fail();
    return item as unknown as WorkGovernanceEvidenceV1;
  });
}

export function parseWorkGovernanceCommandV1(source: string | Uint8Array): WorkGovernanceCommandV1 {
  let textSource: string;
  try { textSource = typeof source === "string" ? source : new TextDecoder("utf-8", { fatal: true }).decode(source); } catch { fail(); }
  if (Buffer.byteLength(textSource, "utf8") > MAX_BYTES) fail();
  let value: unknown; try { value = JSON.parse(textSource); } catch { fail(); }
  if (canonicalWorkGovernanceJson(value) !== textSource || !record(value)) fail();
  exact(value, ["schema", "command_id", "storage_epoch", "namespace_id", "aggregate", "actor", "policy", "correlation_id", "causation_id", "data"], ["project_id", "run_id"]);
  if (value.schema !== "yukh-projects-command-v1" || !uuid(value.command_id) || !integer(value.storage_epoch, 1) || !opaque(value.namespace_id) || (value.project_id !== undefined && !opaque(value.project_id)) || (value.run_id !== undefined && !opaque(value.run_id)) || !uuid(value.correlation_id) || !uuid(value.causation_id)) fail();
  parseAggregateCommand(value.aggregate); parseActor(value.actor); parsePolicy(value.policy); parseData(value.data);
  return cloneJson(value) as unknown as WorkGovernanceCommandV1;
}

function unsignedEvent(event: WorkGovernanceEventV1): Omit<WorkGovernanceEventV1, "event_digest"> {
  const { event_digest: _digest, ...unsigned } = event;
  return unsigned;
}
export function encodeWorkGovernanceEventV1(event: WorkGovernanceEventV1): string {
  const source = boundedCanonical(event);
  const parsed = parseEventObject(event);
  if (sha256(canonicalWorkGovernanceJson(unsignedEvent(parsed))) !== parsed.event_digest) fail();
  return source;
}
function parseEventObject(value: unknown): WorkGovernanceEventV1 {
  if (!record(value)) fail();
  exact(value, ["schema", "specversion", "event_id", "type", "occurred_at", "storage_epoch", "namespace_id", "aggregate", "command", "actor", "policy", "correlation_id", "causation_id", "evidence", "data", "event_digest"], ["project_id", "run_id", "previous"]);
  if (value.schema !== "yukh-projects-event-v1" || value.specversion !== "1.0" || !uuid(value.event_id) || typeof value.type !== "string" || !EVENT_TYPE.test(value.type) || !timestamp(value.occurred_at) || !integer(value.storage_epoch, 1) || !opaque(value.namespace_id) || (value.project_id !== undefined && !opaque(value.project_id)) || (value.run_id !== undefined && !opaque(value.run_id)) || !uuid(value.correlation_id) || !uuid(value.causation_id) || !digest(value.event_digest)) fail();
  if (!record(value.aggregate)) fail(); exact(value.aggregate, ["kind", "id", "revision"]);
  if (!AGGREGATE_KINDS.has(value.aggregate.kind as WorkGovernanceAggregateKind) || !opaque(value.aggregate.id) || !integer(value.aggregate.revision, 1)) fail();
  if (!record(value.command)) fail(); exact(value.command, ["id", "expected_revision"]);
  if (!uuid(value.command.id) || !integer(value.command.expected_revision) || value.aggregate.revision !== Number(value.command.expected_revision) + 1) fail();
  if (value.aggregate.revision === 1 && value.previous !== undefined) fail();
  if (value.aggregate.revision > 1) {
    if (!record(value.previous)) fail(); exact(value.previous, ["event_id", "digest"]);
    if (!uuid(value.previous.event_id) || !digest(value.previous.digest)) fail();
  }
  parseActor(value.actor); parsePolicy(value.policy); parseEvidence(value.evidence); parseData(value.data);
  return value as unknown as WorkGovernanceEventV1;
}
export function parseWorkGovernanceEventV1(source: string | Uint8Array): WorkGovernanceEventV1 {
  let textSource: string;
  try { textSource = typeof source === "string" ? source : new TextDecoder("utf-8", { fatal: true }).decode(source); } catch { fail(); }
  if (Buffer.byteLength(textSource, "utf8") > MAX_BYTES) fail();
  let value: unknown; try { value = JSON.parse(textSource); } catch { fail(); }
  if (canonicalWorkGovernanceJson(value) !== textSource) fail();
  const event = parseEventObject(value);
  if (sha256(canonicalWorkGovernanceJson(unsignedEvent(event))) !== event.event_digest) fail();
  return cloneJson(event);
}

const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";
function base32(bytes: Uint8Array): string {
  let buffer = 0; let bits = 0; let output = "";
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte; bits += 8;
    while (bits >= 5) { output += BASE32[(buffer >>> (bits -= 5)) & 31]; }
  }
  if (bits > 0) output += BASE32[(buffer << (5 - bits)) & 31];
  return output;
}
export function workGovernancePartitionTokenV1(namespaceId: string, kind: WorkGovernanceAggregateKind, aggregateId: string): string {
  if (!opaque(namespaceId) || !AGGREGATE_KINDS.has(kind) || !opaque(aggregateId)) fail();
  const bytes = createHash("sha256").update(`${namespaceId}\n${kind}\n${aggregateId}`, "utf8").digest().subarray(0, 20);
  return base32(bytes);
}

export function createInMemoryWorkGovernanceEventStoreV1(options: { eventId: () => string; occurredAt: () => string }) {
  if (!options || typeof options.eventId !== "function" || typeof options.occurredAt !== "function") fail();
  const aggregates = new Map<string, WorkGovernanceEventV1[]>();
  const receipts = new Map<string, { request_digest: string; event: WorkGovernanceEventV1 }>();
  const aggregateKey = (command: WorkGovernanceCommandV1) => `${command.namespace_id}\n${command.aggregate.kind}\n${command.aggregate.id}`;
  return {
    append(input: WorkGovernanceAppendV1): WorkGovernanceAppendResultV1 {
      if (!record(input)) fail(); exact(input, ["command", "event_type", "data"], ["evidence"]);
      const command = parseWorkGovernanceCommandV1(boundedCanonical(input.command));
      if (typeof input.event_type !== "string" || !EVENT_TYPE.test(input.event_type)) fail();
      const evidence = parseEvidence(input.evidence ?? []); const data = parseData(input.data);
      const requestDigest = sha256(boundedCanonical({ command, event_type: input.event_type, evidence, data }));
      const receipt = receipts.get(command.command_id);
      if (receipt) {
        if (receipt.request_digest !== requestDigest) fail("YKP-WORK-003");
        return { outcome: "replayed", event: cloneJson(receipt.event) };
      }
      const key = aggregateKey(command); const events = aggregates.get(key) ?? []; const previous = events.at(-1);
      const currentRevision = previous?.aggregate.revision ?? 0;
      if (command.aggregate.expected_revision !== currentRevision) fail("YKP-WORK-002");
      const eventId = options.eventId(); const occurredAt = options.occurredAt();
      if (!uuid(eventId) || !timestamp(occurredAt)) fail();
      const base = {
        schema: "yukh-projects-event-v1" as const, specversion: "1.0" as const, event_id: eventId,
        type: input.event_type, occurred_at: occurredAt, storage_epoch: command.storage_epoch,
        namespace_id: command.namespace_id,
        ...(command.project_id === undefined ? {} : { project_id: command.project_id }),
        ...(command.run_id === undefined ? {} : { run_id: command.run_id }),
        aggregate: { kind: command.aggregate.kind, id: command.aggregate.id, revision: currentRevision + 1 },
        ...(previous ? { previous: { event_id: previous.event_id, digest: previous.event_digest } } : {}),
        command: { id: command.command_id, expected_revision: command.aggregate.expected_revision },
        actor: command.actor, policy: command.policy, correlation_id: command.correlation_id,
        causation_id: command.causation_id, evidence, data
      };
      const event = parseWorkGovernanceEventV1(boundedCanonical({ ...base, event_digest: sha256(canonicalWorkGovernanceJson(base)) }));
      events.push(event); aggregates.set(key, events); receipts.set(command.command_id, { request_digest: requestDigest, event });
      return { outcome: "appended", event: cloneJson(event) };
    },
    events(namespaceId: string, kind: WorkGovernanceAggregateKind, aggregateId: string): readonly WorkGovernanceEventV1[] {
      if (!opaque(namespaceId) || !AGGREGATE_KINDS.has(kind) || !opaque(aggregateId)) fail();
      return cloneJson(aggregates.get(`${namespaceId}\n${kind}\n${aggregateId}`) ?? []);
    }
  };
}
