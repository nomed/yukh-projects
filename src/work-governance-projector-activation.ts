import {
  WorkGovernanceProjectorConsumerError,
  WORK_GOVERNANCE_PROJECTOR_CONSUMER_FETCH_EXPIRES_MILLIS_V1,
  WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_BATCH_V1,
  type WorkGovernanceProjectorConsumerErrorCode,
  type WorkGovernanceProjectorConsumerResultV1
} from "./work-governance-projector-consumer.js";

export const WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_ACTIVATION_ID_V1 = "work-item-projector-activation-v1";
export const WORK_GOVERNANCE_PROJECTOR_ACTIVATION_MAX_TICKS_V1 = 1_024;
export const WORK_GOVERNANCE_PROJECTOR_ACTIVATION_MAX_ACKNOWLEDGEMENTS_V1 = 16_384;

export type WorkGovernanceProjectorActivationErrorCode =
  | "YKP-WORK-ACTIVATION-001"
  | "YKP-WORK-ACTIVATION-002";

export class WorkGovernanceProjectorActivationError extends Error {
  constructor(readonly code: WorkGovernanceProjectorActivationErrorCode) {
    super("work-governance projector activation operation failed");
    this.name = "WorkGovernanceProjectorActivationError";
  }
}

export interface WorkGovernanceProjectorActivationConsumerV1 {
  runOnce(input?: {
    maxMessages?: number;
    expiresMillis?: number;
  }): Promise<WorkGovernanceProjectorConsumerResultV1>;
}

export type WorkGovernanceProjectorActivationStatusV1 =
  | "idle"
  | "processed"
  | "budget_exhausted"
  | "failed";

export interface WorkGovernanceProjectorActivationRecordV1 {
  schema: "yukh-projects-work-item-projector-activation-v1";
  runner_id: typeof WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_ACTIVATION_ID_V1;
  status: WorkGovernanceProjectorActivationStatusV1;
  started_at: string;
  stopped_at: string;
  budget: {
    max_ticks: number;
    max_acknowledgements: number;
    max_idle_ticks: number;
  };
  counters: {
    ticks: number;
    idle_ticks: number;
    fetched: number;
    acknowledged: number;
    failures: number;
  };
  last_stream_sequence?: number;
  failure_code?: WorkGovernanceProjectorConsumerErrorCode | "YKP-WORK-ACTIVATION-002";
}

function fail(code: WorkGovernanceProjectorActivationErrorCode): never {
  throw new WorkGovernanceProjectorActivationError(code);
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

function timestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function validateOptions(options: {
  maxTicks: number;
  maxAcknowledgements: number;
  maxIdleTicks: number;
  maxMessagesPerTick: number;
  expiresMillis: number;
}): void {
  if (!positive(options.maxTicks) || options.maxTicks > WORK_GOVERNANCE_PROJECTOR_ACTIVATION_MAX_TICKS_V1 ||
      !positive(options.maxAcknowledgements) ||
      options.maxAcknowledgements > WORK_GOVERNANCE_PROJECTOR_ACTIVATION_MAX_ACKNOWLEDGEMENTS_V1 ||
      !positive(options.maxIdleTicks) || options.maxIdleTicks > options.maxTicks ||
      !positive(options.maxMessagesPerTick) ||
      options.maxMessagesPerTick > WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_BATCH_V1 ||
      !positive(options.expiresMillis) || options.expiresMillis < 1_000) {
    fail("YKP-WORK-ACTIVATION-001");
  }
}

function validateRecord(record: WorkGovernanceProjectorActivationRecordV1): void {
  try {
    if (!object(record) || !exact(record, [
      "schema", "runner_id", "status", "started_at", "stopped_at", "budget", "counters"
    ], ["last_stream_sequence", "failure_code"]) ||
        record.schema !== "yukh-projects-work-item-projector-activation-v1" ||
        record.runner_id !== WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_ACTIVATION_ID_V1 ||
        !["idle", "processed", "budget_exhausted", "failed"].includes(record.status) ||
        !timestamp(record.started_at) || !timestamp(record.stopped_at) ||
        !object(record.budget) || !exact(record.budget, ["max_ticks", "max_acknowledgements", "max_idle_ticks"]) ||
        !positive(record.budget.max_ticks) || !positive(record.budget.max_acknowledgements) ||
        !positive(record.budget.max_idle_ticks) ||
        !object(record.counters) || !exact(record.counters, ["ticks", "idle_ticks", "fetched", "acknowledged", "failures"]) ||
        !Number.isSafeInteger(record.counters.ticks) || record.counters.ticks < 0 ||
        !Number.isSafeInteger(record.counters.idle_ticks) || record.counters.idle_ticks < 0 ||
        !Number.isSafeInteger(record.counters.fetched) || record.counters.fetched < 0 ||
        !Number.isSafeInteger(record.counters.acknowledged) || record.counters.acknowledged < 0 ||
        !Number.isSafeInteger(record.counters.failures) || record.counters.failures < 0 ||
        (record.last_stream_sequence !== undefined && !positive(record.last_stream_sequence)) ||
        (record.failure_code !== undefined && !/^YKP-WORK-(?:CONSUMER|ACTIVATION)-[0-9]{3}$/u.test(record.failure_code))) {
      fail("YKP-WORK-ACTIVATION-001");
    }
  } catch (error) {
    if (error instanceof WorkGovernanceProjectorActivationError) throw error;
    fail("YKP-WORK-ACTIVATION-001");
  }
}

function redactedFailure(error: unknown): WorkGovernanceProjectorActivationRecordV1["failure_code"] {
  return error instanceof WorkGovernanceProjectorConsumerError ? error.code : "YKP-WORK-ACTIVATION-002";
}

export function createWorkGovernanceWorkItemProjectorActivationRunnerV1(options: {
  consumer: WorkGovernanceProjectorActivationConsumerV1;
  now: () => string;
}) {
  if (!object(options) || !exact(options, ["consumer", "now"]) ||
      !options.consumer || typeof options.consumer.runOnce !== "function" ||
      typeof options.now !== "function") fail("YKP-WORK-ACTIVATION-001");
  const now = () => {
    const value = options.now();
    if (!timestamp(value)) fail("YKP-WORK-ACTIVATION-001");
    return value;
  };
  return {
    async run(input: {
      maxTicks: number;
      maxAcknowledgements: number;
      maxIdleTicks?: number;
      maxMessagesPerTick?: number;
      expiresMillis?: number;
    }): Promise<WorkGovernanceProjectorActivationRecordV1> {
      const request = {
        maxTicks: input?.maxTicks,
        maxAcknowledgements: input?.maxAcknowledgements,
        maxIdleTicks: input?.maxIdleTicks ?? 1,
        maxMessagesPerTick: input?.maxMessagesPerTick ?? WORK_GOVERNANCE_PROJECTOR_CONSUMER_MAX_BATCH_V1,
        expiresMillis: input?.expiresMillis ?? WORK_GOVERNANCE_PROJECTOR_CONSUMER_FETCH_EXPIRES_MILLIS_V1
      };
      validateOptions(request);
      const started = now();
      let ticks = 0;
      let idleTicks = 0;
      let fetched = 0;
      let acknowledged = 0;
      let failures = 0;
      let last: number | undefined;
      let status: WorkGovernanceProjectorActivationStatusV1 = "idle";
      let failureCode: WorkGovernanceProjectorActivationRecordV1["failure_code"];
      while (ticks < request.maxTicks && acknowledged < request.maxAcknowledgements && idleTicks < request.maxIdleTicks) {
        const remainingAcknowledgements = request.maxAcknowledgements - acknowledged;
        let result: WorkGovernanceProjectorConsumerResultV1;
        try {
          result = await options.consumer.runOnce({
            maxMessages: Math.min(request.maxMessagesPerTick, remainingAcknowledgements),
            expiresMillis: request.expiresMillis
          });
        } catch (error) {
          failures++;
          status = "failed";
          failureCode = redactedFailure(error);
          break;
        }
        ticks++;
        fetched += result.fetched;
        acknowledged += result.acknowledged;
        if (result.last_stream_sequence !== undefined) last = result.last_stream_sequence;
        if (result.outcome === "idle") {
          idleTicks++;
        } else {
          idleTicks = 0;
          status = "processed";
        }
      }
      const stoppedForIdle = idleTicks >= request.maxIdleTicks;
      if (status !== "failed" && !stoppedForIdle &&
          (ticks >= request.maxTicks || acknowledged >= request.maxAcknowledgements)) {
        status = "budget_exhausted";
      }
      const record: WorkGovernanceProjectorActivationRecordV1 = {
        schema: "yukh-projects-work-item-projector-activation-v1",
        runner_id: WORK_GOVERNANCE_WORK_ITEM_PROJECTOR_ACTIVATION_ID_V1,
        status,
        started_at: started,
        stopped_at: now(),
        budget: {
          max_ticks: request.maxTicks,
          max_acknowledgements: request.maxAcknowledgements,
          max_idle_ticks: request.maxIdleTicks
        },
        counters: { ticks, idle_ticks: idleTicks, fetched, acknowledged, failures },
        ...(last === undefined ? {} : { last_stream_sequence: last }),
        ...(failureCode === undefined ? {} : { failure_code: failureCode })
      };
      validateRecord(record);
      return record;
    }
  };
}
