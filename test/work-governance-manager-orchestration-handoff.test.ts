import assert from "node:assert/strict";
import test from "node:test";
import {
  WorkGovernanceManagerOrchestrationHandoffError,
  createWorkGovernanceManagerOrchestrationHandoffV1,
  runWorkGovernanceManagerAdmissionRuntimeV1,
  type WorkGovernanceCommandReceiptV1,
  type WorkGovernanceEventV1,
  type WorkGovernanceManagerActivationPlanV1
} from "../src/index.js";

const digest = `sha-256:${"b".repeat(64)}`;
const policy = { version: "policy-v1", digest };
const evidence = [{ kind: "decision", uri: "urn:example:evidence:handoff", digest }];

function plan(): WorkGovernanceManagerActivationPlanV1 {
  return {
    schema: "yukh-projects-manager-activation-plan-v1",
    plan_id: "01900000-0000-7000-8000-000000000200",
    namespace_id: "namespace:example",
    project_id: "project:example",
    run_id: "run:example",
    work_item_id: "work-item:example",
    manager_subject_id: "subject:manager",
    worker_subject_id: "subject:worker",
    role: "frontend_developer",
    model: { family: "copilot", capability: "coding-agent" },
    skills: ["github", "yukh-projects"],
    task: {
      objective: "Implement the visible task board UI without provider leakage.",
      acceptance: ["The board renders.", "The API proxy is respected."]
    },
    evidence_required: [{ kind: "test", uri: "urn:example:evidence:test", digest }],
    budgets: {
      max_turns: 3,
      max_input_tokens: 18_000,
      max_output_tokens: 6_000,
      max_wall_clock_seconds: 1_200
    },
    activation: {
      max_ticks: 6,
      max_acknowledgements: 24,
      max_idle_ticks: 1
    }
  };
}

function receipt(event: WorkGovernanceEventV1): WorkGovernanceCommandReceiptV1 {
  return {
    schema: "yukh-projects-command-receipt-v1",
    storage_epoch: 12,
    command_id: event.command.id,
    command_digest: digest,
    event_id: event.event_id,
    event_digest: event.event_digest,
    aggregate_revision: event.aggregate.revision,
    state: "appended",
    stream_sequence: 81
  };
}

async function admission() {
  return runWorkGovernanceManagerAdmissionRuntimeV1({
    plan: plan(),
    command_id: "01900000-0000-7000-8000-000000000201",
    event_id: "01900000-0000-7000-8000-000000000202",
    occurred_at: "2026-08-18T04:10:00.000Z",
    storage_epoch: 12,
    namespace_admission_id: "admission:example",
    expected_revision: 0,
    policy,
    correlation_id: "01900000-0000-7000-8000-000000000203",
    causation_id: "01900000-0000-7000-8000-000000000204",
    evidence,
    coordinator: {
      async append(_command: unknown, event: WorkGovernanceEventV1) {
        return { outcome: "appended" as const, event, receipt: receipt(event) };
      }
    }
  });
}

function isHandoffError(code: string) {
  return (error: unknown) => error instanceof WorkGovernanceManagerOrchestrationHandoffError &&
    error.code === code &&
    error.message === "work-governance manager orchestration handoff operation failed";
}

test("creates a provider-neutral MCP handoff from an admitted manager runtime result", async () => {
  const result = createWorkGovernanceManagerOrchestrationHandoffV1({
    plan: plan(),
    admission: await admission(),
    handoff_id: "01900000-0000-7000-8000-000000000205",
    issued_at: "2026-08-18T04:11:00.000Z",
    route: {
      transport: "mcp",
      adapter_id: "yukh_mcp",
      capability: "agent_session_start"
    }
  });
  assert.equal(result.schema, "yukh-projects-manager-orchestration-handoff-v1");
  assert.equal(result.phase, "ready_for_external_orchestrator");
  assert.equal(result.boundary, "external_orchestrator");
  assert.equal(result.transport, "mcp");
  assert.equal(result.adapter_id, "yukh_mcp");
  assert.equal(result.capability, "agent_session_start");
  assert.equal(result.worker_subject_id, "subject:worker");
  assert.equal(result.role, "frontend_developer");
  assert.equal(result.model_family, "copilot");
  assert.equal(result.model_capability, "coding-agent");
  assert.equal(result.budgets.max_input_tokens, 18_000);
  assert.match(result.orchestration_request_digest, /^sha-256:[0-9a-f]{64}$/u);
  assert.deepEqual(result.instruction, {
    kind: "start_admitted_agent_session",
    policy: "external_orchestrator_must_enforce_budget_and_skill_limits",
    private_task_body_included: false,
    provider_call_authorized_here: false
  });
});

test("keeps task body and acceptance text out of the orchestration handoff", async () => {
  const result = createWorkGovernanceManagerOrchestrationHandoffV1({
    plan: plan(),
    admission: await admission(),
    handoff_id: "01900000-0000-7000-8000-000000000206",
    issued_at: "2026-08-18T04:12:00.000Z",
    route: { transport: "sdk", adapter_id: "codex_sdk", capability: "agent_session_start" }
  });
  const encoded = JSON.stringify(result);
  assert.equal(encoded.includes("Implement the visible task board UI"), false);
  assert.equal(encoded.includes("The board renders"), false);
  assert.equal(encoded.includes("The API proxy is respected"), false);
});

test("rejects invalid routes, plan/admission mismatch, and admission summary mismatch", async () => {
  const admitted = await admission();
  assert.throws(() => createWorkGovernanceManagerOrchestrationHandoffV1({
    plan: plan(),
    admission: admitted,
    handoff_id: "01900000-0000-7000-8000-000000000207",
    issued_at: "2026-08-18T04:13:00.000Z",
    route: { transport: "mcp", adapter_id: "Yukh MCP", capability: "agent_session_start" }
  }), isHandoffError("YKP-WORK-MANAGER-HANDOFF-001"));
  assert.throws(() => createWorkGovernanceManagerOrchestrationHandoffV1({
    plan: { ...plan(), plan_id: "01900000-0000-7000-8000-000000000208" },
    admission: admitted,
    handoff_id: "01900000-0000-7000-8000-000000000209",
    issued_at: "2026-08-18T04:14:00.000Z",
    route: { transport: "mcp", adapter_id: "yukh_mcp", capability: "agent_session_start" }
  }), isHandoffError("YKP-WORK-MANAGER-HANDOFF-002"));
  assert.throws(() => createWorkGovernanceManagerOrchestrationHandoffV1({
    plan: plan(),
    admission: {
      ...admitted,
      candidate_summary: { ...admitted.candidate_summary, worker_subject_id: "subject:other" }
    },
    handoff_id: "01900000-0000-7000-8000-000000000210",
    issued_at: "2026-08-18T04:15:00.000Z",
    route: { transport: "mcp", adapter_id: "yukh_mcp", capability: "agent_session_start" }
  }), isHandoffError("YKP-WORK-MANAGER-HANDOFF-003"));
});
