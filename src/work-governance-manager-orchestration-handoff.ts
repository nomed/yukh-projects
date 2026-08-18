import { createHash } from "node:crypto";
import {
  canonicalWorkGovernanceJson
} from "./work-governance-events.js";
import {
  summarizeWorkGovernanceManagerActivationPlanV1,
  type WorkGovernanceManagerActivationPlanV1,
  type WorkGovernanceManagerModelFamilyV1,
  type WorkGovernanceManagerRoleV1
} from "./work-governance-manager-activation-plan.js";
import {
  WORK_GOVERNANCE_MANAGER_ADMISSION_RUNTIME_SCHEMA_V1,
  type WorkGovernanceManagerAdmissionRuntimeResultV1
} from "./work-governance-manager-admission-runtime.js";

export const WORK_GOVERNANCE_MANAGER_ORCHESTRATION_HANDOFF_SCHEMA_V1 =
  "yukh-projects-manager-orchestration-handoff-v1";

export type WorkGovernanceManagerOrchestrationTransportV1 =
  | "mcp"
  | "sdk"
  | "cli"
  | "control_plane";

export type WorkGovernanceManagerOrchestrationHandoffErrorCode =
  | "YKP-WORK-MANAGER-HANDOFF-001"
  | "YKP-WORK-MANAGER-HANDOFF-002"
  | "YKP-WORK-MANAGER-HANDOFF-003";

export class WorkGovernanceManagerOrchestrationHandoffError extends Error {
  constructor(readonly code: WorkGovernanceManagerOrchestrationHandoffErrorCode) {
    super("work-governance manager orchestration handoff operation failed");
    this.name = "WorkGovernanceManagerOrchestrationHandoffError";
  }
}

export interface WorkGovernanceManagerOrchestrationHandoffInputV1 {
  plan: WorkGovernanceManagerActivationPlanV1;
  admission: WorkGovernanceManagerAdmissionRuntimeResultV1;
  handoff_id: string;
  issued_at: string;
  route: {
    transport: WorkGovernanceManagerOrchestrationTransportV1;
    adapter_id: string;
    capability: string;
  };
}

export interface WorkGovernanceManagerOrchestrationHandoffV1 {
  schema: typeof WORK_GOVERNANCE_MANAGER_ORCHESTRATION_HANDOFF_SCHEMA_V1;
  handoff_id: string;
  issued_at: string;
  phase: "ready_for_external_orchestrator";
  boundary: "external_orchestrator";
  transport: WorkGovernanceManagerOrchestrationTransportV1;
  adapter_id: string;
  capability: string;
  plan_id: string;
  plan_digest: string;
  admission_event_id: string;
  admission_event_digest: string;
  admission_command_digest: string;
  admission_outcome: "appended" | "replayed";
  namespace_id: string;
  project_id: string;
  run_id: string;
  work_item_id: string;
  manager_subject_id: string;
  worker_subject_id: string;
  role: WorkGovernanceManagerRoleV1;
  model_family: WorkGovernanceManagerModelFamilyV1;
  model_capability: string;
  skill_count: number;
  acceptance_count: number;
  evidence_count: number;
  task_digest: string;
  budgets: WorkGovernanceManagerActivationPlanV1["budgets"];
  activation: WorkGovernanceManagerActivationPlanV1["activation"];
  orchestration_request_digest: string;
  instruction: {
    kind: "start_admitted_agent_session";
    policy: "external_orchestrator_must_enforce_budget_and_skill_limits";
    private_task_body_included: false;
    provider_call_authorized_here: false;
  };
}

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const TOKEN = /^[a-z][a-z0-9_-]{0,63}$/u;
const TRANSPORTS = new Set<WorkGovernanceManagerOrchestrationTransportV1>([
  "mcp", "sdk", "cli", "control_plane"
]);

function fail(code: WorkGovernanceManagerOrchestrationHandoffErrorCode = "YKP-WORK-MANAGER-HANDOFF-001"): never {
  throw new WorkGovernanceManagerOrchestrationHandoffError(code);
}

function record(value: unknown): value is Record<string, unknown> {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function exact(value: Record<string, unknown>, required: readonly string[]): void {
  const keys = Object.keys(value);
  if (required.some((key) => !Object.hasOwn(value, key)) ||
      keys.some((key) => !required.includes(key))) fail();
}

function timestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function token(value: unknown): value is string {
  return typeof value === "string" && TOKEN.test(value);
}

function digest(value: unknown): string {
  return `sha-256:${createHash("sha256").update(canonicalWorkGovernanceJson(value), "utf8").digest("hex")}`;
}

export function createWorkGovernanceManagerOrchestrationHandoffV1(
  input: WorkGovernanceManagerOrchestrationHandoffInputV1
): WorkGovernanceManagerOrchestrationHandoffV1 {
  try {
    if (!record(input)) fail();
    exact(input as unknown as Record<string, unknown>, ["plan", "admission", "handoff_id", "issued_at", "route"]);
    if (typeof input.handoff_id !== "string" || !UUID_V7.test(input.handoff_id) ||
        !timestamp(input.issued_at)) fail();
    if (!record(input.route)) fail();
    exact(input.route, ["transport", "adapter_id", "capability"]);
    if (!TRANSPORTS.has(input.route.transport as WorkGovernanceManagerOrchestrationTransportV1) ||
        !token(input.route.adapter_id) || !token(input.route.capability)) fail();
    if (!record(input.admission) ||
        input.admission.schema !== WORK_GOVERNANCE_MANAGER_ADMISSION_RUNTIME_SCHEMA_V1 ||
        input.admission.phase !== "admitted") fail();

    const summary = summarizeWorkGovernanceManagerActivationPlanV1(input.plan);
    if (summary.plan_id !== input.admission.plan_id) fail("YKP-WORK-MANAGER-HANDOFF-002");
    if (summary.worker_subject_id !== input.admission.candidate_summary.worker_subject_id ||
        summary.role !== input.admission.candidate_summary.role ||
        summary.model_family !== input.admission.candidate_summary.model_family ||
        summary.model_capability !== input.admission.candidate_summary.model_capability ||
        summary.skill_count !== input.admission.candidate_summary.skill_count ||
        summary.acceptance_count !== input.admission.candidate_summary.acceptance_count ||
        summary.evidence_count !== input.admission.candidate_summary.evidence_count) {
      fail("YKP-WORK-MANAGER-HANDOFF-003");
    }

    const request = {
      route: input.route,
      plan_id: summary.plan_id,
      plan_digest: summary.plan_digest,
      admission_event_id: input.admission.event_id,
      admission_event_digest: input.admission.event_digest,
      worker_subject_id: summary.worker_subject_id,
      role: summary.role,
      model_family: summary.model_family,
      model_capability: summary.model_capability,
      skills: input.plan.skills,
      budgets: summary.budgets,
      activation: summary.activation
    };
    const handoff: WorkGovernanceManagerOrchestrationHandoffV1 = {
      schema: WORK_GOVERNANCE_MANAGER_ORCHESTRATION_HANDOFF_SCHEMA_V1,
      handoff_id: input.handoff_id,
      issued_at: input.issued_at,
      phase: "ready_for_external_orchestrator",
      boundary: "external_orchestrator",
      transport: input.route.transport,
      adapter_id: input.route.adapter_id,
      capability: input.route.capability,
      plan_id: summary.plan_id,
      plan_digest: summary.plan_digest,
      admission_event_id: input.admission.event_id,
      admission_event_digest: input.admission.event_digest,
      admission_command_digest: input.admission.command_digest,
      admission_outcome: input.admission.outcome,
      namespace_id: summary.namespace_id,
      project_id: summary.project_id,
      run_id: summary.run_id,
      work_item_id: summary.work_item_id,
      manager_subject_id: summary.manager_subject_id,
      worker_subject_id: summary.worker_subject_id,
      role: summary.role,
      model_family: summary.model_family,
      model_capability: summary.model_capability,
      skill_count: summary.skill_count,
      acceptance_count: summary.acceptance_count,
      evidence_count: summary.evidence_count,
      task_digest: summary.task_digest,
      budgets: summary.budgets,
      activation: summary.activation,
      orchestration_request_digest: digest(request),
      instruction: {
        kind: "start_admitted_agent_session",
        policy: "external_orchestrator_must_enforce_budget_and_skill_limits",
        private_task_body_included: false,
        provider_call_authorized_here: false
      }
    };
    canonicalWorkGovernanceJson(handoff);
    return JSON.parse(canonicalWorkGovernanceJson(handoff)) as WorkGovernanceManagerOrchestrationHandoffV1;
  } catch (error) {
    if (error instanceof WorkGovernanceManagerOrchestrationHandoffError) throw error;
    fail();
  }
}
