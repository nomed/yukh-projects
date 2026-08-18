import assert from "node:assert/strict";
import test from "node:test";
import {
  WorkGovernanceManagerAdmissionRuntimeError,
  runWorkGovernanceManagerAdmissionRuntimeV1,
  type WorkGovernanceCommandReceiptV1,
  type WorkGovernanceEventV1,
  type WorkGovernanceManagerActivationPlanV1
} from "../src/index.js";

const digest = `sha-256:${"a".repeat(64)}`;
const policy = { version: "policy-v1", digest };
const evidence = [{ kind: "decision", uri: "urn:example:evidence:admission", digest }];

function plan(): WorkGovernanceManagerActivationPlanV1 {
  return {
    schema: "yukh-projects-manager-activation-plan-v1",
    plan_id: "01900000-0000-7000-8000-000000000100",
    namespace_id: "namespace:example",
    project_id: "project:example",
    run_id: "run:example",
    work_item_id: "work-item:example",
    manager_subject_id: "subject:manager",
    worker_subject_id: "subject:worker",
    role: "backend_developer",
    model: { family: "codex", capability: "coding-agent" },
    skills: ["github", "yukh-projects"],
    task: {
      objective: "Build the synthetic service slice without provider calls.",
      acceptance: ["Unit tests pass.", "No live provider is contacted."]
    },
    evidence_required: [{ kind: "test", uri: "urn:example:evidence:test", digest }],
    budgets: {
      max_turns: 4,
      max_input_tokens: 24_000,
      max_output_tokens: 8_000,
      max_wall_clock_seconds: 1_800
    },
    activation: {
      max_ticks: 8,
      max_acknowledgements: 32,
      max_idle_ticks: 1
    }
  };
}

function receipt(event: WorkGovernanceEventV1): WorkGovernanceCommandReceiptV1 {
  return {
    schema: "yukh-projects-command-receipt-v1",
    storage_epoch: 11,
    command_id: event.command.id,
    command_digest: digest,
    event_id: event.event_id,
    event_digest: event.event_digest,
    aggregate_revision: event.aggregate.revision,
    state: "appended",
    stream_sequence: 73
  };
}

function input(overrides = {}) {
  return {
    plan: plan(),
    command_id: "01900000-0000-7000-8000-000000000101",
    event_id: "01900000-0000-7000-8000-000000000102",
    occurred_at: "2026-08-18T03:30:00.000Z",
    storage_epoch: 11,
    namespace_admission_id: "admission:example",
    expected_revision: 0,
    policy,
    correlation_id: "01900000-0000-7000-8000-000000000103",
    causation_id: "01900000-0000-7000-8000-000000000104",
    evidence,
    coordinator: {
      async append(_command: unknown, event: WorkGovernanceEventV1) {
        return { outcome: "appended" as const, event, receipt: receipt(event) };
      }
    },
    ...overrides
  };
}

function isRuntimeError(code: string) {
  return (error: unknown) => error instanceof WorkGovernanceManagerAdmissionRuntimeError &&
    error.code === code &&
    error.message === "work-governance manager admission runtime operation failed";
}

test("orchestrates plan through coordinated append with a single redacted result", async () => {
  const result = await runWorkGovernanceManagerAdmissionRuntimeV1(input());
  assert.equal(result.schema, "yukh-projects-manager-admission-runtime-v1");
  assert.equal(result.phase, "admitted");
  assert.equal(result.outcome, "appended");
  assert.equal(result.plan_id, plan().plan_id);
  assert.equal(result.event_id, "01900000-0000-7000-8000-000000000102");
  assert.equal(result.aggregate_revision, 1);
  assert.equal(result.receipt_state, "appended");
  assert.equal(result.stream_sequence, 73);
  assert.match(result.preview_digest, /^sha-256:[0-9a-f]{64}$/u);
  assert.match(result.command_digest, /^sha-256:[0-9a-f]{64}$/u);
  assert.equal(result.candidate_summary.aggregate_id, "admission:example");
});

test("reports replay from coordinator without changing the runtime shape", async () => {
  const result = await runWorkGovernanceManagerAdmissionRuntimeV1(input({
    coordinator: {
      async append(_command: unknown, event: WorkGovernanceEventV1) {
        return { outcome: "replayed" as const, event, receipt: receipt(event) };
      }
    }
  }));
  assert.equal(result.outcome, "replayed");
  assert.equal(result.receipt_state, "appended");
});

test("rejects non-admitted preview path and invalid runtime inputs", async () => {
  await assert.rejects(runWorkGovernanceManagerAdmissionRuntimeV1(input({
    plan: { ...plan(), model: { family: "codex", capability: "planning-agent" } }
  })), isRuntimeError("YKP-WORK-MANAGER-RUNTIME-002"));
  await assert.rejects(runWorkGovernanceManagerAdmissionRuntimeV1(input({
    occurred_at: "not-time"
  })), isRuntimeError("YKP-WORK-MANAGER-RUNTIME-001"));
  await assert.rejects(runWorkGovernanceManagerAdmissionRuntimeV1({
    ...input(),
    extra: true
  } as unknown as ReturnType<typeof input>), isRuntimeError("YKP-WORK-MANAGER-RUNTIME-001"));
});

test("fails closed when event construction or coordinator fails", async () => {
  await assert.rejects(runWorkGovernanceManagerAdmissionRuntimeV1(input({
    evidence: [{ kind: "decision", uri: "https://example.com/evidence", digest }]
  })), isRuntimeError("YKP-WORK-MANAGER-RUNTIME-003"));
  await assert.rejects(runWorkGovernanceManagerAdmissionRuntimeV1(input({
    coordinator: { async append() { throw new Error("coordinator unavailable"); } }
  })), isRuntimeError("YKP-WORK-MANAGER-RUNTIME-003"));
});

test("does not expose task body or acceptance text", async () => {
  const result = await runWorkGovernanceManagerAdmissionRuntimeV1(input());
  const encoded = JSON.stringify(result);
  assert.equal(encoded.includes("Build the synthetic service slice"), false);
  assert.equal(encoded.includes("Unit tests pass"), false);
  assert.equal(encoded.includes("No live provider"), false);
});
