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
  WorkGovernanceEventError,
  encodeWorkGovernanceEventV1,
  parseWorkGovernanceEventV1,
  workGovernancePartitionTokenV1,
  type WorkGovernanceEventV1
} from "./work-governance-events.js";

export const WORK_GOVERNANCE_STREAM_V1 = "YKP_WORK_EVENTS_V1";
export const WORK_GOVERNANCE_SUBJECT_PREFIX_V1 = "ykp.v1.events";

export type WorkGovernanceJetStreamErrorCode =
  | "YKP-WORK-JS-001"
  | "YKP-WORK-JS-002"
  | "YKP-WORK-JS-003"
  | "YKP-WORK-JS-004";

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
}

export interface WorkGovernancePublishAckV1 {
  stream: string;
  sequence: number;
  duplicate: boolean;
}

export interface WorkGovernanceJetStreamPortsV1 {
  getLastMessage(stream: typeof WORK_GOVERNANCE_STREAM_V1, subject: string): Promise<WorkGovernanceStoredMessageV1 | null>;
  publish(subject: string, data: Uint8Array, request: WorkGovernancePublishRequestV1): Promise<WorkGovernancePublishAckV1>;
}

export interface WorkGovernanceJetStreamAppendResultV1 {
  outcome: "appended" | "replayed";
  event: WorkGovernanceEventV1;
  receipt: {
    stream: typeof WORK_GOVERNANCE_STREAM_V1;
    subject: string;
    sequence: number;
    event_id: string;
    event_digest: string;
  };
}

class SequenceConflict extends Error {}

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
    allow_direct: false,
    mirror_direct: false,
    allow_msg_ttl: false,
    sealed: false,
    first_seq: 0,
    allow_msg_counter: false,
    persist_mode: PersistMode.Default
  };
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
    async getLastMessage(stream, subject) {
      const message = await manager.streams.getMessage(stream, { last_by_subj: subject });
      return message === null ? null : { sequence: message.seq, data: message.data };
    },
    async publish(subject, data, request) {
      try {
        const acknowledgement = await client.publish(subject, data, {
          msgID: request.messageId,
          expect: {
            streamName: request.stream,
            lastSubjectSequence: request.lastSubjectSequence
          }
        });
        return {
          stream: acknowledgement.stream,
          sequence: acknowledgement.seq,
          duplicate: acknowledgement.duplicate
        };
      } catch (error) {
        if (error instanceof JetStreamApiError &&
            (error.code === JetStreamApiCodes.StreamWrongLastSequence ||
             error.code === JetStreamApiCodes.StreamWrongLastSequenceUnknown)) {
          throw new SequenceConflict();
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

function receipt(event: WorkGovernanceEventV1, subject: string, sequence: number) {
  return {
    stream: WORK_GOVERNANCE_STREAM_V1,
    subject,
    sequence,
    event_id: event.event_id,
    event_digest: event.event_digest
  } as const;
}

export function createWorkGovernanceJetStreamAppenderV1(options: {
  storageEpoch: number;
  ports: WorkGovernanceJetStreamPortsV1;
}) {
  if (!options || !safePositiveInteger(options.storageEpoch) || !options.ports ||
      typeof options.ports.getLastMessage !== "function" || typeof options.ports.publish !== "function") {
    fail("YKP-WORK-JS-001");
  }
  return {
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
          return { outcome: "replayed", event, receipt: receipt(event, subject, current.sequence) };
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

      let acknowledgement: WorkGovernancePublishAckV1;
      try {
        acknowledgement = await options.ports.publish(subject, encoded, {
          stream: WORK_GOVERNANCE_STREAM_V1,
          messageId: event.event_id,
          lastSubjectSequence: expectedSequence
        });
      } catch (error) {
        if (error instanceof SequenceConflict) fail("YKP-WORK-JS-002");
        fail("YKP-WORK-JS-004");
      }
      if (acknowledgement.stream !== WORK_GOVERNANCE_STREAM_V1 || acknowledgement.duplicate ||
          !safePositiveInteger(acknowledgement.sequence) || acknowledgement.sequence <= expectedSequence) {
        fail("YKP-WORK-JS-003");
      }
      return {
        outcome: "appended",
        event,
        receipt: receipt(event, subject, acknowledgement.sequence)
      };
    }
  };
}
