import assert from "node:assert/strict";
import test from "node:test";
import {
  WorkGovernanceManagerAdmissionCommandCandidateError,
  createWorkGovernanceManagerAdmissionCommandCandidateV1,
  previewWorkGovernanceManagerAdmissionV1,
  type WorkGovernanceManagerActivationPlanV1
} from "../src/index.js";

const digest = `sha-256:${"a".repeat(64)}`;
const policy = { version: "policy-v1", digest };

function plan(): WorkGovernanceManagerActivationPlanV1 {
  return {
    schema: "yukh-projects-manager-activation-plan-v1",
    plan_id: "01900000-0000-7000-8000-000000000020",
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

function admittedInput() {
  return {
    preview: previewWorkGovernanceManagerAdmissionV1(plan()),
    command_id: "01900000-0000-7000-8000-000000000030",
    storage_epoch: 1,
    namespace_admission_id: "admission:example",
    expected_revision: 0,
    policy,
    correlation_id: "01900000-0000-7000-8000-000000000031",
    causation_id: "01900000-0000-7000-8000-000000000032"
  };
}

function isCandidateError(code: string) {
  return (error: unknown) => error instanceof WorkGovernanceManagerAdmissionCommandCandidateError &&
    error.code === code &&
    error.message === "work-governance manager admission command candidate operation failed";
}

test("creates a deterministic claim.admitted command candidate from an admitted preview", () => {
  const first = createWorkGovernanceManagerAdmissionCommandCandidateV1(admittedInput());
  const second = createWorkGovernanceManagerAdmissionCommandCandidateV1(admittedInput());
  assert.deepEqual(first, second);
  assert.equal(first.schema, "yukh-projects-manager-admission-command-candidate-v1");
  assert.equal(first.command.aggregate.kind, "namespace_admission");
  assert.equal(first.command.aggregate.id, "admission:example");
  assert.equal(first.command.aggregate.expected_revision, 0);
  assert.equal(first.command.actor.subject_id, "subject:manager");
  assert.equal(first.command.actor.claim_id, first.summary.claim_id);
  assert.equal(first.command.actor.lease_id, first.summary.lease_id);
  assert.equal(first.command.data.claim_id, first.summary.claim_id);
  assert.equal(first.command.data.lease_id, first.summary.lease_id);
  assert.equal(first.command.data.subject_id, "subject:worker");
  assert.equal(first.command.data.work_item_id, "work-item:example");
  assert.deepEqual(first.command.data.grants, { work: ["execute_assigned_work"], mutation: [] });
  assert.match(first.summary.command_digest, /^sha-256:[0-9a-f]{64}$/u);
});

test("rejects rejected previews without creating candidate authority", () => {
  const rejected = previewWorkGovernanceManagerAdmissionV1({
    ...plan(),
    model: { family: "codex", capability: "planning-agent" }
  });
  assert.throws(() => createWorkGovernanceManagerAdmissionCommandCandidateV1({
    ...admittedInput(),
    preview: rejected
  }), isCandidateError("YKP-WORK-MANAGER-COMMAND-002"));
});

test("rejects invalid policy, revisions, correlation ids, and unknown fields", () => {
  assert.throws(() => createWorkGovernanceManagerAdmissionCommandCandidateV1({
    ...admittedInput(),
    policy: { version: "bad policy", digest }
  }), isCandidateError("YKP-WORK-MANAGER-COMMAND-001"));
  assert.throws(() => createWorkGovernanceManagerAdmissionCommandCandidateV1({
    ...admittedInput(),
    expected_revision: -1
  }), isCandidateError("YKP-WORK-MANAGER-COMMAND-001"));
  assert.throws(() => createWorkGovernanceManagerAdmissionCommandCandidateV1({
    ...admittedInput(),
    correlation_id: "not-a-uuid"
  }), isCandidateError("YKP-WORK-MANAGER-COMMAND-001"));
  assert.throws(() => createWorkGovernanceManagerAdmissionCommandCandidateV1({
    ...admittedInput(),
    extra: true
  } as unknown as ReturnType<typeof admittedInput>), isCandidateError("YKP-WORK-MANAGER-COMMAND-001"));
});

test("summary is redacted and does not expose task body or acceptance text", () => {
  const candidate = createWorkGovernanceManagerAdmissionCommandCandidateV1(admittedInput());
  const summary = JSON.stringify(candidate.summary);
  assert.equal(summary.includes("Build the synthetic service slice"), false);
  assert.equal(summary.includes("Unit tests pass"), false);
  assert.equal(summary.includes("No live provider"), false);
  assert.equal(JSON.stringify(candidate.command).includes("Build the synthetic service slice"), false);
});
