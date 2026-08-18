import {
  AckPolicy,
  DeliverPolicy,
  ReplayPolicy,
  type ConsumerConfig,
  type JetStreamClient,
  type JetStreamManager
} from "@nats-io/jetstream";
import {
  parseWorkGovernanceEventV1,
  type WorkGovernanceEventV1
} from "./work-governance-events.js";
import {
  verifyWorkGovernanceJetStreamConfigV1,
  WORK_GOVERNANCE_STREAM_V1,
  WORK_GOVERNANCE_SUBJECT_PREFIX_V1
} from "./work-governance-jetstream.js";

export const WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_CONSUMER_DURABLE_V1 = "YKP_WORK_ITEM_PROJECTOR_V1";
export const WORK_GOVERNANCE_PROJECTOR_CONSUMER_ACK_WAIT_NANOS_V1 = 30_000_000_000;
export const WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_DELIVER_V1 = 16;
export const WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_ACK_PENDING_V1 = 1;
export const WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_BATCH_V1 = 32;
export const WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_EXPIRES_NANOS_V1 = 5_000_000_000;
export const WORK_GOVERNANCE_PROJECTOR_CONSUMER_FETCH_EXPIRES_MILLIS_V1 = 1_000;
export const WORK_GOVERNANCE_PROJECTOR_CONSUMER_ACK_ACK_TIMEOUT_MILLIS_V1 = 5_000;

export type WorkGovernanceProjectorConsumerErrorCode =
  | "YKP-WORK-CONSUMER-001"
  | "YKP-WORK-CONSUMER-002"
  | "YKP-WORK-CONSUMER-003"
  | "YKP-WORK-CONSUMER-004"
  | "YKP-WORK-CONSUMER-005";

export class WorkGovernanceProjectorConsumerError extends Error {
  constructor(readonly code: WorkGovernanceProjectorConsumerErrorCode) {
    super("work-governance projector consumer operation failed");
    this.name = "WorkGovernanceProjectorConsumerError";
  }
}

export interface WorkGovernanceProjectorConsumerMessageV1 {
  stream_sequence: number;
  data: Uint8Array;
  ack(): Promise<{ outcome: "acknowledged" } | { outcome: "rejected" }>;
}

export interface WorkGovernanceProjectorConsumerPortsV1 {
  getStreamConfig(stream: typeof WORK_GOVERNANCE_STREAM_V1): Promise<unknown>;
  getConsumerConfig(
    stream: typeof WORK_GOVERNANCE_STREAM_V1,
    durable: typeof WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_CONSUMER_DURABLE_V1
  ): Promise<unknown>;
  fetch(options: {
    stream: typeof WORK_GOVERNANCE_STREAM_V1;
    durable: typeof WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_CONSUMER_DURABLE_V1;
    maxMessages: number;
    expiresMillis: number;
  }): Promise<WorkGovernanceProjectorConsumerMessageV1[]>;
}

export interface WorkGovernanceProjectorRuntimeV1 {
  apply(input: { stream_sequence: number; event: WorkGovernanceEventV1 }): Promise<unknown>;
}

export interface WorkGovernanceProjectorConsumerResultV1 {
  outcome: "idle" | "processed";
  fetched: number;
  acknowledged: number;
  last_stream_sequence?: number;
}

const TOKEN = /^[A-Z][A-Z0-9_]{0,63}$/u;

function fail(code: WorkGovernanceProjectorConsumerErrorCode): never {
  throw new WorkGovernanceProjectorConsumerError(code);
}

function object(value: unknown): value is Record<string, unknown> {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function exact(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => allowed.has(key));
}

function positive(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function natsMetadata(value: unknown): boolean {
  return value === undefined || (object(value) &&
    Object.keys(value).every((key) => key.startsWith("_nats.") && typeof value[key] === "string"));
}

function validateRuntimeOptions(options: { maxMessages: number; expiresMillis: number }): void {
  if (!positive(options.maxMessages) || options.maxMessages > WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_BATCH_V1 ||
      !positive(options.expiresMillis) || options.expiresMillis < 1_000 ||
      options.expiresMillis > WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_EXPIRES_NANOS_V1 / 1_000_000) {
    fail("YKP-WORK-CONSUMER-001");
  }
}

export function workGovernanceProjectorConsumerConfigV1(options: { replicas: number }): ConsumerConfig {
  if (!options || !Number.isSafeInteger(options.replicas) || ![1, 3, 4, 5].includes(options.replicas)) {
    fail("YKP-WORK-CONSUMER-001");
  }
  return {
    name: WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_CONSUMER_DURABLE_V1,
    durable_name: WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_CONSUMER_DURABLE_V1,
    description: "Yukh Projects work-item projector durable consumer v1",
    deliver_policy: DeliverPolicy.All,
    ack_policy: AckPolicy.Explicit,
    ack_wait: WORK_GOVERNANCE_PROJECTOR_CONSUMER_ACK_WAIT_NANOS_V1,
    max_deliver: WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_DELIVER_V1,
    replay_policy: ReplayPolicy.Instant,
    max_ack_pending: WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_ACK_PENDING_V1,
    max_waiting: 1,
    max_batch: WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_BATCH_V1,
    max_expires: WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_EXPIRES_NANOS_V1,
    filter_subject: `${WORK_GOVERNANCE_SUBJECT_PREFIX_V1}.*`,
    num_replicas: options.replicas,
    mem_storage: false,
    headers_only: false
  };
}

export function verifyWorkGovernanceProjectorConsumerConfigV1(source: unknown, options: { replicas: number }): void {
  const expected = workGovernanceProjectorConsumerConfigV1(options);
  try {
    if (!object(source)) fail("YKP-WORK-CONSUMER-003");
    if (!exact(source, [
      "name", "durable_name", "description", "deliver_policy", "ack_policy", "ack_wait",
      "max_deliver", "replay_policy", "max_ack_pending", "max_waiting", "max_batch",
      "max_expires", "filter_subject", "num_replicas"
    ], ["mem_storage", "headers_only", "inactive_threshold", "metadata"])) fail("YKP-WORK-CONSUMER-003");
    if (source.name !== expected.name || source.durable_name !== expected.durable_name ||
        !TOKEN.test(String(source.name)) || source.description !== expected.description ||
        source.deliver_policy !== expected.deliver_policy || source.ack_policy !== expected.ack_policy ||
        source.ack_wait !== expected.ack_wait || source.max_deliver !== expected.max_deliver ||
        source.replay_policy !== expected.replay_policy || source.max_ack_pending !== expected.max_ack_pending ||
        source.max_waiting !== expected.max_waiting || source.max_batch !== expected.max_batch ||
        source.max_expires !== expected.max_expires || source.filter_subject !== expected.filter_subject ||
        source.num_replicas !== expected.num_replicas ||
        (source.mem_storage !== undefined && source.mem_storage !== false) ||
        (source.headers_only !== undefined && source.headers_only !== false) ||
        source.inactive_threshold !== undefined || !natsMetadata(source.metadata)) fail("YKP-WORK-CONSUMER-003");
  } catch (error) {
    if (error instanceof WorkGovernanceProjectorConsumerError) throw error;
    fail("YKP-WORK-CONSUMER-003");
  }
}

/** Bind a pre-created durable pull consumer. Runtime identities do not provision consumers. */
export async function openWorkGovernanceProjectorConsumerPortsV1(
  client: JetStreamClient,
  manager: JetStreamManager,
  options: { stream: { maxBytes: number; replicas: number }; consumer: { replicas: number } }
): Promise<WorkGovernanceProjectorConsumerPortsV1> {
  if (!client || !manager || typeof manager.streams?.info !== "function" ||
      typeof manager.consumers?.info !== "function" || typeof client.consumers?.get !== "function") {
    fail("YKP-WORK-CONSUMER-001");
  }
  try {
    verifyWorkGovernanceJetStreamConfigV1(
      (await manager.streams.info(WORK_GOVERNANCE_STREAM_V1)).config,
      options.stream
    );
    verifyWorkGovernanceProjectorConsumerConfigV1(
      (await manager.consumers.info(WORK_GOVERNANCE_STREAM_V1, WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_CONSUMER_DURABLE_V1)).config,
      options.consumer
    );
    const consumer = await client.consumers.get(
      WORK_GOVERNANCE_STREAM_V1,
      WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_CONSUMER_DURABLE_V1
    );
    return {
      async getStreamConfig(stream) {
        return (await manager.streams.info(stream)).config;
      },
      async getConsumerConfig(stream, durable) {
        return (await manager.consumers.info(stream, durable)).config;
      },
      async fetch(request) {
        const messages = await consumer.fetch({
          max_messages: request.maxMessages,
          expires: request.expiresMillis
        });
        const output: WorkGovernanceProjectorConsumerMessageV1[] = [];
        try {
          for await (const message of messages) {
            output.push({
              stream_sequence: message.info.streamSequence,
              data: message.data,
              async ack() {
                return await message.ackAck({ timeout: WORK_GOVERNANCE_PROJECTOR_CONSUMER_ACK_ACK_TIMEOUT_MILLIS_V1 })
                  ? { outcome: "acknowledged" as const }
                  : { outcome: "rejected" as const };
              }
            });
          }
        } finally {
          await messages.close();
        }
        return output;
      }
    };
  } catch (error) {
    if (error instanceof WorkGovernanceProjectorConsumerError) throw error;
    fail("YKP-WORK-CONSUMER-004");
  }
}

export function createWorkGovernanceWorkItemProjectorConsumerV1(options: {
  storageEpoch: number;
  stream: { maxBytes: number; replicas: number };
  consumer: { replicas: number };
  ports: WorkGovernanceProjectorConsumerPortsV1;
  projector: WorkGovernanceProjectorRuntimeV1;
}) {
  if (!object(options) || !exact(options, ["storageEpoch", "stream", "consumer", "ports", "projector"]) ||
      !positive(options.storageEpoch) || options.stream.replicas !== options.consumer.replicas ||
      !options.ports || typeof options.ports.getStreamConfig !== "function" ||
      typeof options.ports.getConsumerConfig !== "function" || typeof options.ports.fetch !== "function" ||
      !options.projector || typeof options.projector.apply !== "function") fail("YKP-WORK-CONSUMER-001");
  let ready: Promise<void> | undefined;
  const verifyRuntime = async () => {
    ready ??= Promise.all([
      options.ports.getStreamConfig(WORK_GOVERNANCE_STREAM_V1)
        .then((config) => verifyWorkGovernanceJetStreamConfigV1(config, options.stream)),
      options.ports.getConsumerConfig(WORK_GOVERNANCE_STREAM_V1, WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_CONSUMER_DURABLE_V1)
        .then((config) => verifyWorkGovernanceProjectorConsumerConfigV1(config, options.consumer))
    ]).then(() => undefined);
    try {
      await ready;
    } catch (error) {
      if (error instanceof WorkGovernanceProjectorConsumerError) throw error;
      fail("YKP-WORK-CONSUMER-004");
    }
  };
  return {
    async runOnce(input: {
      maxMessages?: number;
      expiresMillis?: number;
    } = {}): Promise<WorkGovernanceProjectorConsumerResultV1> {
      const request = {
        maxMessages: input.maxMessages ?? WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_BATCH_V1,
        expiresMillis: input.expiresMillis ?? WORK_GOVERNANCE_PROJECTOR_CONSUMER_FETCH_EXPIRES_MILLIS_V1
      };
      validateRuntimeOptions(request);
      await verifyRuntime();
      let messages: WorkGovernanceProjectorConsumerMessageV1[];
      try {
        messages = await options.ports.fetch({
          stream: WORK_GOVERNANCE_STREAM_V1,
          durable: WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_CONSUMER_DURABLE_V1,
          maxMessages: request.maxMessages,
          expiresMillis: request.expiresMillis
        });
      } catch {
        fail("YKP-WORK-CONSUMER-004");
      }
      if (!Array.isArray(messages)) fail("YKP-WORK-CONSUMER-004");
      let acknowledged = 0;
      let last: number | undefined;
      for (const message of messages) {
        if (!message || !positive(message.stream_sequence) || !(message.data instanceof Uint8Array) ||
            typeof message.ack !== "function") fail("YKP-WORK-CONSUMER-004");
        let event: WorkGovernanceEventV1;
        try {
          event = parseWorkGovernanceEventV1(message.data);
        } catch {
          fail("YKP-WORK-CONSUMER-002");
        }
        if (event.storage_epoch !== options.storageEpoch) fail("YKP-WORK-CONSUMER-002");
        try {
          await options.projector.apply({ stream_sequence: message.stream_sequence, event });
        } catch (error) {
          throw error;
        }
        let acked: Awaited<ReturnType<WorkGovernanceProjectorConsumerMessageV1["ack"]>>;
        try {
          acked = await message.ack();
        } catch {
          fail("YKP-WORK-CONSUMER-005");
        }
        if (!acked || acked.outcome !== "acknowledged") fail("YKP-WORK-CONSUMER-005");
        acknowledged++;
        last = message.stream_sequence;
      }
      return last === undefined
        ? { outcome: "idle", fetched: messages.length, acknowledged }
        : { outcome: "processed", fetched: messages.length, acknowledged, last_stream_sequence: last };
    }
  };
}
