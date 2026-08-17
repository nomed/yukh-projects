import {
  DiscardPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  PersistMode,
  RetentionPolicy,
  StorageType,
  type JetStreamClient,
  type JetStreamManager,
  type StreamConfig
} from "@nats-io/jetstream";
import {
  encodeWorkGovernanceEventV1,
  parseWorkGovernanceEventV1,
  workGovernancePartitionTokenV1,
  type WorkGovernanceEventV1
} from "./work-governance-events.js";

export const WORK_GOVERNANCE_STREAM_V1 = "YKP_WORK_EVENTS_V1";
export const WORK_GOVERNANCE_SUBJECT_PREFIX_V1 = "ykp.v1.events";
export const WORK_GOVERNANCE_PUBLISH_TIMEOUT_MILLIS_V1 = 5_000;
export const WORK_GOVERNANCE_MAX_RECOVERY_EVENTS_V1 = 4_096;
export const WORK_GOVERNANCE_MAX_RECOVERY_BYTES_V1 = 16 * 1024 * 1024;

export type WorkGovernanceJetStreamErrorCode =
  | "YKP-WORK-JS-001"
  | "YKP-WORK-JS-002"
  | "YKP-WORK-JS-003"
  | "YKP-WORK-JS-004"
  | "YKP-WORK-JS-005"
  | "YKP-WORK-JS-006";

export class WorkGovernanceJetStreamError extends Error {
  constructor(readonly code: WorkGovernanceJetStreamErrorCode) {
    super("work-governance JetStream append failed");
    this.name = "WorkGovernanceJetStreamError";
  }
}

export interface WorkGovernanceStoredMessageV1 {
  sequence: number;
  data: Uint8Array;
}

export interface WorkGovernancePublishRequestV1 {
  stream: typeof WORK_GOVERNANCE_STREAM_V1;
  messageId: string;
  lastSubjectSequence: number;
  timeoutMillis: typeof WORK_GOVERNANCE_PUBLISH_TIMEOUT_MILLIS_V1;
}

export interface WorkGovernancePublishAckV1 {
  outcome: "acknowledged";
  stream: string;
  sequence: number;
  duplicate: boolean;
}
export type WorkGovernancePublishResultV1 = WorkGovernancePublishAckV1 | { outcome: "conflict" };

export interface WorkGovernanceJetStreamPortsV1 {
  getStreamConfig(stream: typeof WORK_GOVERNANCE_STREAM_V1): Promise<unknown>;
  getLastMessage(stream: typeof WORK_GOVERNANCE_STREAM_V1, subject: string): Promise<WorkGovernanceStoredMessageV1 | null>;
  getSubjectHistory(
    stream: typeof WORK_GOVERNANCE_STREAM_V1,
    subject: string,
    maximumEvents: number,
    maximumBytes: number
  ): Promise<WorkGovernanceStoredMessageV1[]>;
  publish(subject: string, data: Uint8Array, request: WorkGovernancePublishRequestV1): Promise<WorkGovernancePublishResultV1>;
}

export interface WorkGovernanceJetStreamAppendResultV1 {
  outcome: "appended" | "replayed";
  event: WorkGovernanceEventV1;
  /** Internal persistence position for projectors; this is not a public command receipt. */
  persistence: { stream_sequence: number };
}

export interface WorkGovernanceStorageProfileV1 { storage_epoch: number; replicas: number }

function fail(code: WorkGovernanceJetStreamErrorCode): never {
  throw new WorkGovernanceJetStreamError(code);
}

function safePositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

export function workGovernanceJetStreamSubjectV1(event: WorkGovernanceEventV1): string {
  try {
    const parsed = parseWorkGovernanceEventV1(encodeWorkGovernanceEventV1(event));
    const token = workGovernancePartitionTokenV1(parsed.namespace_id, parsed.aggregate.kind, parsed.aggregate.id);
    return `${WORK_GOVERNANCE_SUBJECT_PREFIX_V1}.${token}`;
  } catch {
    fail("YKP-WORK-JS-001");
  }
}

/** Strict append-only stream configuration. Capacity exhaustion rejects new writes. */
export function workGovernanceJetStreamConfigV1(options: { maxBytes: number; replicas: number }): StreamConfig {
  if (!options || !safePositiveInteger(options.maxBytes) || options.maxBytes < 64 * 1024 ||
      !Number.isSafeInteger(options.replicas) || ![1, 3, 4, 5].includes(options.replicas)) {
    fail("YKP-WORK-JS-001");
  }
  return {
    name: WORK_GOVERNANCE_STREAM_V1,
    description: "Yukh Projects work-governance event log v1",
    subjects: [`${WORK_GOVERNANCE_SUBJECT_PREFIX_V1}.*`],
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    discard: DiscardPolicy.New,
    discard_new_per_subject: false,
    max_consumers: -1,
    max_msgs: -1,
    max_msgs_per_subject: -1,
    max_age: 0,
    max_bytes: options.maxBytes,
    max_msg_size: 64 * 1024,
    duplicate_window: 0,
    num_replicas: options.replicas,
    deny_delete: true,
    deny_purge: true,
    allow_rollup_hdrs: false,
    allow_direct: true,
    mirror_direct: false,
    allow_msg_ttl: false,
    sealed: false,
    first_seq: 0,
    allow_msg_counter: false,
    persist_mode: PersistMode.Default
  };
}

function optionalEmptyArray(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.length === 0);
}

/** Fail closed if an existing stream differs from the reviewed append-only profile. */
export function verifyWorkGovernanceJetStreamConfigV1(
  source: unknown,
  options: { maxBytes: number; replicas: number }
): void {
  const expected = workGovernanceJetStreamConfigV1(options);
  try {
    if (source === null || typeof source !== "object" || Array.isArray(source)) fail("YKP-WORK-JS-003");
    const actual = source as Record<string, unknown>;
    const subjects = actual.subjects;
    if (actual.name !== expected.name || !Array.isArray(subjects) || subjects.length !== 1 ||
        subjects[0] !== expected.subjects[0] || actual.retention !== expected.retention ||
        actual.storage !== expected.storage || actual.discard !== expected.discard ||
        actual.discard_new_per_subject === true ||
        actual.max_msgs !== expected.max_msgs || actual.max_msgs_per_subject !== expected.max_msgs_per_subject ||
        actual.max_age !== expected.max_age || actual.max_bytes !== expected.max_bytes ||
        actual.max_msg_size !== expected.max_msg_size || actual.num_replicas !== expected.num_replicas ||
        actual.deny_delete !== true || actual.deny_purge !== true || actual.allow_rollup_hdrs !== false ||
        actual.allow_direct !== true || actual.mirror_direct !== false || actual.allow_msg_ttl === true ||
        actual.allow_msg_schedules === true || actual.allow_atomic === true || actual.allow_batched === true ||
        actual.sealed !== false || (actual.persist_mode !== undefined && actual.persist_mode !== expected.persist_mode) || actual.no_ack === true ||
        actual.republish !== undefined || actual.mirror !== undefined || actual.subject_transform !== undefined ||
        !optionalEmptyArray(actual.sources)) {
      fail("YKP-WORK-JS-003");
    }
  } catch (error) {
    if (error instanceof WorkGovernanceJetStreamError) throw error;
    fail("YKP-WORK-JS-003");
  }
}

/** Bind already-authorized SDK clients. This layer never discovers URLs or credentials. */
export function workGovernanceJetStreamPortsV1(
  client: JetStreamClient,
  manager: JetStreamManager
): WorkGovernanceJetStreamPortsV1 {
  if (!client || typeof client.publish !== "function" || !manager || typeof manager.streams?.getMessage !== "function") {
    fail("YKP-WORK-JS-001");
  }
  return {
    async getStreamConfig(stream) {
      return (await manager.streams.info(stream)).config;
    },
    async getLastMessage(stream, subject) {
      const message = await manager.streams.getMessage(stream, { last_by_subj: subject });
      return message === null ? null : { sequence: message.seq, data: message.data };
    },
    async getSubjectHistory(stream, subject, maximumEvents, maximumBytes) {
      if (!safePositiveInteger(maximumEvents) || maximumEvents > WORK_GOVERNANCE_MAX_RECOVERY_EVENTS_V1 ||
          !safePositiveInteger(maximumBytes) || maximumBytes > WORK_GOVERNANCE_MAX_RECOVERY_BYTES_V1) fail("YKP-WORK-JS-003");
      const messages: WorkGovernanceStoredMessageV1[] = [];
      let bytes = 0;
      const batch = await manager.direct.getBatch(stream, { seq: 1, batch: maximumEvents, next_by_subj: subject });
      for await (const message of batch) {
        if (messages.length >= maximumEvents || !(message.data instanceof Uint8Array) ||
            message.data.byteLength > maximumBytes - bytes) fail("YKP-WORK-JS-003");
        bytes += message.data.byteLength;
        messages.push({ sequence: message.seq, data: message.data });
      }
      return messages;
    },
    async publish(subject, data, request) {
      try {
        const acknowledgement = await client.publish(subject, data, {
          msgID: request.messageId,
          timeout: request.timeoutMillis,
          expect: {
            streamName: request.stream,
            lastSubjectSequence: request.lastSubjectSequence
          }
        });
        return {
          outcome: "acknowledged",
          stream: acknowledgement.stream,
          sequence: acknowledgement.seq,
          duplicate: acknowledgement.duplicate
        };
      } catch (error) {
        if (error instanceof JetStreamApiError &&
            (error.code === JetStreamApiCodes.StreamWrongLastSequence ||
             error.code === JetStreamApiCodes.StreamWrongLastSequenceUnknown)) {
          return { outcome: "conflict" };
        }
        throw error;
      }
    }
  };
}

function sameAggregate(left: WorkGovernanceEventV1, right: WorkGovernanceEventV1): boolean {
  return left.storage_epoch === right.storage_epoch && left.namespace_id === right.namespace_id &&
    left.aggregate.kind === right.aggregate.kind && left.aggregate.id === right.aggregate.id;
}

export function createWorkGovernanceJetStreamAppenderV1(options: {
  storageEpoch: number;
  stream: { maxBytes: number; replicas: number };
  ports: WorkGovernanceJetStreamPortsV1;
}) {
  if (!options || !safePositiveInteger(options.storageEpoch) || !options.ports ||
      typeof options.ports.getStreamConfig !== "function" || typeof options.ports.getLastMessage !== "function" ||
      typeof options.ports.getSubjectHistory !== "function" ||
      typeof options.ports.publish !== "function") {
    fail("YKP-WORK-JS-001");
  }
  workGovernanceJetStreamConfigV1(options.stream);
  let configuration: Promise<void> | undefined;
  const verifyConfiguration = async () => {
    configuration ??= options.ports.getStreamConfig(WORK_GOVERNANCE_STREAM_V1)
      .then((actual) => verifyWorkGovernanceJetStreamConfigV1(actual, options.stream));
    try { await configuration; } catch (error) {
      if (error instanceof WorkGovernanceJetStreamError) throw error;
      fail("YKP-WORK-JS-004");
    }
  };
  const findExactInHistory = async (
    event: WorkGovernanceEventV1,
    subject: string,
    tail: WorkGovernanceStoredMessageV1,
    tailEvent: WorkGovernanceEventV1,
    failureCode: "YKP-WORK-JS-003" | "YKP-WORK-JS-006"
  ): Promise<WorkGovernanceStoredMessageV1 | null> => {
    if (tailEvent.aggregate.revision > WORK_GOVERNANCE_MAX_RECOVERY_EVENTS_V1) fail(failureCode);
    let history: WorkGovernanceStoredMessageV1[];
    try {
      history = await options.ports.getSubjectHistory(
        WORK_GOVERNANCE_STREAM_V1, subject, tailEvent.aggregate.revision, WORK_GOVERNANCE_MAX_RECOVERY_BYTES_V1
      );
    } catch { fail(failureCode); }
    if (!Array.isArray(history) || history.length !== tailEvent.aggregate.revision ||
        history.reduce((bytes, message) => bytes + (message.data instanceof Uint8Array ? message.data.byteLength : WORK_GOVERNANCE_MAX_RECOVERY_BYTES_V1 + 1), 0) >
          WORK_GOVERNANCE_MAX_RECOVERY_BYTES_V1) fail(failureCode);
    let previous: WorkGovernanceEventV1 | undefined;
    let exact: WorkGovernanceStoredMessageV1 | null = null;
    for (let index = 0; index < history.length; index++) {
      const observed = history[index]!;
      if (!safePositiveInteger(observed.sequence) || !(observed.data instanceof Uint8Array) ||
          (index > 0 && observed.sequence <= history[index - 1]!.sequence)) fail(failureCode);
      let stored: WorkGovernanceEventV1;
      try { stored = parseWorkGovernanceEventV1(observed.data); } catch { fail(failureCode); }
      if (!sameAggregate(stored, tailEvent) || stored.aggregate.revision !== index + 1 ||
          stored.command.expected_revision !== index ||
          (previous === undefined
            ? stored.previous !== undefined
            : stored.previous?.event_id !== previous.event_id || stored.previous.digest !== previous.event_digest)) {
        fail(failureCode);
      }
      if (stored.event_id === event.event_id) {
        if (stored.event_digest !== event.event_digest) fail(failureCode);
        exact = observed;
      }
      previous = stored;
    }
    if (previous?.event_id !== tailEvent.event_id || previous.event_digest !== tailEvent.event_digest ||
        history.at(-1)!.sequence !== tail.sequence) fail(failureCode);
    return exact;
  };
  return {
    storageProfile: { storage_epoch: options.storageEpoch, replicas: options.stream.replicas } as const,
    async append(input: WorkGovernanceEventV1): Promise<WorkGovernanceJetStreamAppendResultV1> {
      let event: WorkGovernanceEventV1;
      let encoded: Uint8Array;
      let subject: string;
      try {
        const source = encodeWorkGovernanceEventV1(input);
        event = parseWorkGovernanceEventV1(source);
        encoded = new TextEncoder().encode(source);
        subject = workGovernanceJetStreamSubjectV1(event);
      } catch {
        fail("YKP-WORK-JS-001");
      }
      if (event.storage_epoch !== options.storageEpoch) fail("YKP-WORK-JS-002");
      await verifyConfiguration();

      let current: WorkGovernanceStoredMessageV1 | null;
      try {
        current = await options.ports.getLastMessage(WORK_GOVERNANCE_STREAM_V1, subject);
      } catch {
        fail("YKP-WORK-JS-004");
      }

      let expectedSequence = 0;
      if (current !== null) {
        if (!safePositiveInteger(current.sequence) || !(current.data instanceof Uint8Array)) fail("YKP-WORK-JS-003");
        let previous: WorkGovernanceEventV1;
        try { previous = parseWorkGovernanceEventV1(current.data); } catch { fail("YKP-WORK-JS-003"); }
        if (!sameAggregate(previous, event)) fail("YKP-WORK-JS-003");
        if (previous.event_id === event.event_id && previous.event_digest === event.event_digest) {
          return { outcome: "replayed", event, persistence: { stream_sequence: current.sequence } };
        }
        if (previous.aggregate.revision >= event.aggregate.revision) {
          const historical = await findExactInHistory(event, subject, current, previous, "YKP-WORK-JS-003");
          if (historical !== null) {
            return { outcome: "replayed", event, persistence: { stream_sequence: historical.sequence } };
          }
          fail("YKP-WORK-JS-002");
        }
        if (event.aggregate.revision !== previous.aggregate.revision + 1 ||
            event.command.expected_revision !== previous.aggregate.revision ||
            event.previous?.event_id !== previous.event_id || event.previous.digest !== previous.event_digest) {
          fail("YKP-WORK-JS-002");
        }
        expectedSequence = current.sequence;
      } else if (event.aggregate.revision !== 1 || event.command.expected_revision !== 0 || event.previous !== undefined) {
        fail("YKP-WORK-JS-002");
      }

      let publication: WorkGovernancePublishResultV1;
      try {
        publication = await options.ports.publish(subject, encoded, {
          stream: WORK_GOVERNANCE_STREAM_V1,
          messageId: event.event_id,
          lastSubjectSequence: expectedSequence,
          timeoutMillis: WORK_GOVERNANCE_PUBLISH_TIMEOUT_MILLIS_V1
        });
      } catch { fail("YKP-WORK-JS-005"); }
      if (publication.outcome === "conflict") {
        let observed: WorkGovernanceStoredMessageV1 | null;
        try { observed = await options.ports.getLastMessage(WORK_GOVERNANCE_STREAM_V1, subject); }
        catch { fail("YKP-WORK-JS-006"); }
        if (observed !== null && safePositiveInteger(observed.sequence) && observed.data instanceof Uint8Array) {
          let stored: WorkGovernanceEventV1;
          try { stored = parseWorkGovernanceEventV1(observed.data); } catch { fail("YKP-WORK-JS-006"); }
          if (stored.event_id === event.event_id && stored.event_digest === event.event_digest) {
            return { outcome: "replayed", event, persistence: { stream_sequence: observed.sequence } };
          }
          const historical = await findExactInHistory(event, subject, observed, stored, "YKP-WORK-JS-006");
          if (historical !== null) {
            return { outcome: "replayed", event, persistence: { stream_sequence: historical.sequence } };
          }
        }
        fail("YKP-WORK-JS-002");
      }
      const acknowledgement = publication;
      if (acknowledgement.stream !== WORK_GOVERNANCE_STREAM_V1 ||
          !safePositiveInteger(acknowledgement.sequence) || acknowledgement.sequence <= expectedSequence) {
        fail("YKP-WORK-JS-006");
      }
      if (acknowledgement.duplicate) {
        let observed: WorkGovernanceStoredMessageV1 | null;
        try { observed = await options.ports.getLastMessage(WORK_GOVERNANCE_STREAM_V1, subject); }
        catch { fail("YKP-WORK-JS-006"); }
        if (observed !== null && safePositiveInteger(observed.sequence) && observed.data instanceof Uint8Array) {
          let stored: WorkGovernanceEventV1;
          try { stored = parseWorkGovernanceEventV1(observed.data); } catch { fail("YKP-WORK-JS-006"); }
          if (stored.event_id === event.event_id && stored.event_digest === event.event_digest) {
            return { outcome: "replayed", event, persistence: { stream_sequence: observed.sequence } };
          }
          const historical = await findExactInHistory(event, subject, observed, stored, "YKP-WORK-JS-006");
          if (historical !== null) {
            return { outcome: "replayed", event, persistence: { stream_sequence: historical.sequence } };
          }
        }
        fail("YKP-WORK-JS-006");
      }
      return {
        outcome: "appended",
        event,
        persistence: { stream_sequence: acknowledgement.sequence }
      };
    }
  };
}
