import assert from "node:assert/strict";
import test from "node:test";
import {
  WorkGovernanceProjectorActivationError,
  WorkGovernanceProjectorConsumerError,
  createWorkGovernanceWorkItemProjectorActivationRunnerV1,
  type WorkGovernanceProjectorActivationConsumerV1,
  type WorkGovernanceProjectorConsumerResultV1
} from "../src/index.js";

const times = [
  "2026-08-18T02:00:00.000Z",
  "2026-08-18T02:00:01.000Z",
  "2026-08-18T02:00:02.000Z",
  "2026-08-18T02:00:03.000Z"
];

function clock() {
  let index = 0;
  return () => times[Math.min(index++, times.length - 1)]!;
}

function consumer(results: WorkGovernanceProjectorConsumerResultV1[]): WorkGovernanceProjectorActivationConsumerV1 & {
  calls: { maxMessages?: number; expiresMillis?: number }[];
} {
  return {
    calls: [],
    async runOnce(input) {
      this.calls.push(input ?? {});
      return results.shift() ?? { outcome: "idle", fetched: 0, acknowledged: 0 };
    }
  };
}

function isActivation(code: string) {
  return (error: unknown) => error instanceof WorkGovernanceProjectorActivationError && error.code === code &&
    error.message === "work-governance projector activation operation failed";
}

test("returns a bounded idle status after the configured idle budget", async () => {
  const source = consumer([{ outcome: "idle", fetched: 0, acknowledged: 0 }]);
  const runner = createWorkGovernanceWorkItemProjectorActivationRunnerV1({ consumer: source, now: clock() });
  assert.deepEqual(await runner.run({ maxTicks: 4, maxAcknowledgements: 10, maxIdleTicks: 1 }), {
    schema: "yukh-projects-work-item-projector-activation-v1",
    runner_id: "work-item-projector-activation-v1",
    status: "idle",
    started_at: "2026-08-18T02:00:00.000Z",
    stopped_at: "2026-08-18T02:00:01.000Z",
    budget: { max_ticks: 4, max_acknowledgements: 10, max_idle_ticks: 1 },
    counters: { ticks: 1, idle_ticks: 1, fetched: 0, acknowledged: 0, failures: 0 }
  });
  assert.deepEqual(source.calls, [{ maxMessages: 10, expiresMillis: 1000 }]);
});

test("accumulates processed counters and last stream sequence", async () => {
  const source = consumer([
    { outcome: "processed", fetched: 1, acknowledged: 1, last_stream_sequence: 7 },
    { outcome: "processed", fetched: 1, acknowledged: 1, last_stream_sequence: 8 },
    { outcome: "idle", fetched: 0, acknowledged: 0 }
  ]);
  const runner = createWorkGovernanceWorkItemProjectorActivationRunnerV1({ consumer: source, now: clock() });
  const status = await runner.run({ maxTicks: 5, maxAcknowledgements: 4, maxIdleTicks: 1, maxMessagesPerTick: 1 });
  assert.equal(status.status, "processed");
  assert.deepEqual(status.counters, { ticks: 3, idle_ticks: 1, fetched: 2, acknowledged: 2, failures: 0 });
  assert.equal(status.last_stream_sequence, 8);
  assert.deepEqual(source.calls.map((call) => call.maxMessages), [1, 1, 1]);
});

test("stops with budget_exhausted when tick or acknowledgement budget is consumed", async () => {
  const tickBound = createWorkGovernanceWorkItemProjectorActivationRunnerV1({
    consumer: consumer([
      { outcome: "processed", fetched: 1, acknowledged: 1, last_stream_sequence: 1 },
      { outcome: "processed", fetched: 1, acknowledged: 1, last_stream_sequence: 2 }
    ]),
    now: clock()
  });
  assert.equal((await tickBound.run({ maxTicks: 1, maxAcknowledgements: 10 })).status, "budget_exhausted");

  const ackBound = createWorkGovernanceWorkItemProjectorActivationRunnerV1({
    consumer: consumer([{ outcome: "processed", fetched: 2, acknowledged: 2, last_stream_sequence: 2 }]),
    now: clock()
  });
  const status = await ackBound.run({ maxTicks: 5, maxAcknowledgements: 2, maxMessagesPerTick: 2 });
  assert.equal(status.status, "budget_exhausted");
  assert.equal(status.counters.acknowledged, 2);
});

test("fails closed and does not retry after consumer or ack ambiguity errors", async () => {
  const source: WorkGovernanceProjectorActivationConsumerV1 & { calls: number } = {
    calls: 0,
    async runOnce() {
      this.calls++;
      throw new WorkGovernanceProjectorConsumerError("YKP-WORK-CONSUMER-005");
    }
  };
  const runner = createWorkGovernanceWorkItemProjectorActivationRunnerV1({ consumer: source, now: clock() });
  const status = await runner.run({ maxTicks: 5, maxAcknowledgements: 5 });
  assert.equal(status.status, "failed");
  assert.equal(status.failure_code, "YKP-WORK-CONSUMER-005");
  assert.deepEqual(status.counters, { ticks: 0, idle_ticks: 0, fetched: 0, acknowledged: 0, failures: 1 });
  assert.equal(source.calls, 1);
});

test("rejects invalid activation budgets and timestamps", async () => {
  const runner = createWorkGovernanceWorkItemProjectorActivationRunnerV1({
    consumer: consumer([]),
    now: () => "not-time"
  });
  await assert.rejects(runner.run({ maxTicks: 0, maxAcknowledgements: 1 }), isActivation("YKP-WORK-ACTIVATION-001"));
  await assert.rejects(runner.run({ maxTicks: 1, maxAcknowledgements: 1 }), isActivation("YKP-WORK-ACTIVATION-001"));
});
