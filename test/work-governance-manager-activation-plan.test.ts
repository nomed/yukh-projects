import assert from "node:assert/strict";
import test from "node:test";
import {
  WorkGovernanceManagerActivationPlanError,
  parseWorkGovernanceManagerActivationPlanV1,
  summarizeWorkGovernanceManagerActivationPlanV1,
  type WorkGovernanceManagerActivationPlanV1
} from "../src/index.js";

const digest = `sha-256:${"a".repeat(64)}`;

function plan(): WorkGovernanceManagerActivationPlanV1 {
  return {
    schema: "yukh-projects-manager-activation-plan-v1",
    plan_id: "01900000-0000-7000-8000-000000000001",
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
      objective: "Implement the synthetic backend slice using only invented data.",
      acceptance: [
        "Unit tests cover success and failure paths.",
        "No provider call is performed."
      ]
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

function isPlanError(code: string) {
  return (error: unknown) => error instanceof WorkGovernanceManagerActivationPlanError &&
    error.code === code &&
    error.message === "work-governance manager activation plan operation failed";
}

test("parses a synthetic manager activation plan and keeps the shape exact", () => {
  const parsed = parseWorkGovernanceManagerActivationPlanV1(plan());
  assert.deepEqual(parsed, plan());
  assert.deepEqual(parseWorkGovernanceManagerActivationPlanV1(JSON.stringify(plan())), plan());
});

test("summarizes activation without exposing the task body", () => {
  const summary = summarizeWorkGovernanceManagerActivationPlanV1(plan());
  assert.equal(summary.schema, "yukh-projects-manager-activation-summary-v1");
  assert.equal(summary.role, "backend_developer");
  assert.equal(summary.model_family, "codex");
  assert.equal(summary.skill_count, 2);
  assert.equal(summary.acceptance_count, 2);
  assert.match(summary.plan_digest, /^sha-256:[0-9a-f]{64}$/u);
  assert.match(summary.task_digest, /^sha-256:[0-9a-f]{64}$/u);
  assert.equal(JSON.stringify(summary).includes("Implement the synthetic backend slice"), false);
});

test("rejects unknown fields and unsupported roles or model families", () => {
  assert.throws(() => parseWorkGovernanceManagerActivationPlanV1({
    ...plan(),
    unexpected: true
  } as unknown as WorkGovernanceManagerActivationPlanV1), isPlanError("YKP-WORK-MANAGER-001"));
  assert.throws(() => parseWorkGovernanceManagerActivationPlanV1({
    ...plan(),
    role: "ops_wizard"
  } as unknown as WorkGovernanceManagerActivationPlanV1), isPlanError("YKP-WORK-MANAGER-001"));
  assert.throws(() => parseWorkGovernanceManagerActivationPlanV1({
    ...plan(),
    model: { family: "generic-llm", capability: "coding-agent" }
  } as unknown as WorkGovernanceManagerActivationPlanV1), isPlanError("YKP-WORK-MANAGER-001"));
});

test("rejects unsafe evidence and over-budget activation", () => {
  assert.throws(() => parseWorkGovernanceManagerActivationPlanV1({
    ...plan(),
    evidence_required: [{ kind: "test", uri: "https://example.com/private-log", digest }]
  }), isPlanError("YKP-WORK-MANAGER-002"));
  assert.throws(() => parseWorkGovernanceManagerActivationPlanV1({
    ...plan(),
    budgets: { ...plan().budgets, max_input_tokens: 250_001 }
  }), isPlanError("YKP-WORK-MANAGER-001"));
  assert.throws(() => parseWorkGovernanceManagerActivationPlanV1({
    ...plan(),
    activation: { ...plan().activation, max_idle_ticks: 9 }
  }), isPlanError("YKP-WORK-MANAGER-001"));
});

test("rejects malformed identifiers and free-form skills", () => {
  assert.throws(() => parseWorkGovernanceManagerActivationPlanV1({
    ...plan(),
    worker_subject_id: "agent-b"
  }), isPlanError("YKP-WORK-MANAGER-001"));
  assert.throws(() => parseWorkGovernanceManagerActivationPlanV1({
    ...plan(),
    skills: ["github", "unsafe skill"]
  }), isPlanError("YKP-WORK-MANAGER-001"));
});
