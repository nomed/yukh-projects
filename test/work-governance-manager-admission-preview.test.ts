import assert from "node:assert/strict";
import test from "node:test";
import {
  WorkGovernanceManagerActivationPlanError,
  previewWorkGovernanceManagerAdmissionV1,
  type WorkGovernanceManagerActivationPlanV1
} from "../src/index.js";

const digest = `sha-256:${"a".repeat(64)}`;

function plan(): WorkGovernanceManagerActivationPlanV1 {
  return {
    schema: "yukh-projects-manager-activation-plan-v1",
    plan_id: "01900000-0000-7000-8000-000000000010",
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

test("admits a valid synthetic manager activation plan with deterministic candidate authority references", () => {
  const first = previewWorkGovernanceManagerAdmissionV1(plan());
  const second = previewWorkGovernanceManagerAdmissionV1(JSON.stringify(plan()));
  assert.deepEqual(first, second);
  assert.equal(first.decision, "admit");
  assert.equal(first.reason_code, "YKP-WORK-MANAGER-ADMISSION-000");
  assert.match(first.plan_digest, /^sha-256:[0-9a-f]{64}$/u);
  assert.match(first.candidate?.claim_id ?? "", /^claim:[0-9a-f]{32}$/u);
  assert.match(first.candidate?.lease_id ?? "", /^lease:[0-9a-f]{32}$/u);
  assert.deepEqual(first.candidate?.admitted_budgets, plan().budgets);
  assert.deepEqual(first.candidate?.admitted_activation, plan().activation);
});

test("rejects unsupported model capability without candidate claim or lease", () => {
  const preview = previewWorkGovernanceManagerAdmissionV1({
    ...plan(),
    model: { family: "codex", capability: "planning-agent" }
  });
  assert.equal(preview.decision, "reject");
  assert.equal(preview.reason_code, "YKP-WORK-MANAGER-ADMISSION-001");
  assert.equal(preview.candidate, undefined);
});

test("rejects missing evidence, empty acceptance, excessive token budget, and activation mismatch", () => {
  assert.equal(previewWorkGovernanceManagerAdmissionV1({
    ...plan(),
    evidence_required: []
  }).reason_code, "YKP-WORK-MANAGER-ADMISSION-002");
  assert.equal(previewWorkGovernanceManagerAdmissionV1({
    ...plan(),
    task: { ...plan().task, acceptance: [] }
  }).reason_code, "YKP-WORK-MANAGER-ADMISSION-003");
  assert.equal(previewWorkGovernanceManagerAdmissionV1({
    ...plan(),
    budgets: { ...plan().budgets, max_input_tokens: 120_000, max_output_tokens: 20_000 }
  }).reason_code, "YKP-WORK-MANAGER-ADMISSION-004");
  assert.equal(previewWorkGovernanceManagerAdmissionV1({
    ...plan(),
    activation: { ...plan().activation, max_ticks: 1, max_acknowledgements: 129 }
  }).reason_code, "YKP-WORK-MANAGER-ADMISSION-005");
});

test("preserves parser fail-closed behavior for unknown fields", () => {
  assert.throws(() => previewWorkGovernanceManagerAdmissionV1({
    ...plan(),
    private_prompt: "do not publish"
  } as unknown as WorkGovernanceManagerActivationPlanV1), (error: unknown) =>
    error instanceof WorkGovernanceManagerActivationPlanError &&
    error.code === "YKP-WORK-MANAGER-001");
});

test("does not expose the task body in the preview record", () => {
  const preview = previewWorkGovernanceManagerAdmissionV1(plan());
  const encoded = JSON.stringify(preview);
  assert.equal(encoded.includes("Build the synthetic service slice"), false);
  assert.equal(encoded.includes("Unit tests pass"), false);
  assert.equal(encoded.includes("No live provider"), false);
});
