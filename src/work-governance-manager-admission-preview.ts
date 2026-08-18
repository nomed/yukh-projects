import { createHash } from "node:crypto";
import { canonicalWorkGovernanceJson } from "./work-governance-events.js";
import {
  parseWorkGovernanceManagerActivationPlanV1,
  summarizeWorkGovernanceManagerActivationPlanV1,
  type WorkGovernanceManagerActivationPlanV1,
  type WorkGovernanceManagerModelFamilyV1,
  type WorkGovernanceManagerRoleV1
} from "./work-governance-manager-activation-plan.js";

export const WORK_GOVERNANCE_MANAGER_ADMISSION_PREVIEW_SCHEMA_V1 =
  "yukh-projects-manager-admission-preview-v1";
export const WORK_GOVERNANCE_MANAGER_ADMISSION_MAX_TOTAL_TOKENS_V1 = 128_000;
export const WORK_GOVERNANCE_MANAGER_ADMISSION_MAX_ACKNOWLEDGEMENTS_PER_TICK_V1 = 128;

export type WorkGovernanceManagerAdmissionPreviewReasonCodeV1 =
  | "YKP-WORK-MANAGER-ADMISSION-000"
  | "YKP-WORK-MANAGER-ADMISSION-001"
  | "YKP-WORK-MANAGER-ADMISSION-002"
  | "YKP-WORK-MANAGER-ADMISSION-003"
  | "YKP-WORK-MANAGER-ADMISSION-004"
  | "YKP-WORK-MANAGER-ADMISSION-005";

export type WorkGovernanceManagerAdmissionPreviewDecisionV1 = "admit" | "reject";

export interface WorkGovernanceManagerAdmissionPreviewV1 {
  schema: typeof WORK_GOVERNANCE_MANAGER_ADMISSION_PREVIEW_SCHEMA_V1;
  decision: WorkGovernanceManagerAdmissionPreviewDecisionV1;
  reason_code: WorkGovernanceManagerAdmissionPreviewReasonCodeV1;
  plan_id: string;
  plan_digest: string;
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
  requested_budgets: {
    max_turns: number;
    max_input_tokens: number;
    max_output_tokens: number;
    max_wall_clock_seconds: number;
  };
  requested_activation: {
    max_ticks: number;
    max_acknowledgements: number;
    max_idle_ticks: number;
  };
  candidate?: {
    claim_id: string;
    lease_id: string;
    admitted_budgets: WorkGovernanceManagerAdmissionPreviewV1["requested_budgets"];
    admitted_activation: WorkGovernanceManagerAdmissionPreviewV1["requested_activation"];
  };
}

const DEFAULT_CAPABILITIES: Readonly<Record<WorkGovernanceManagerRoleV1, Readonly<Record<WorkGovernanceManagerModelFamilyV1, readonly string[]>>>> = {
  product_manager: { codex: ["planning-agent"], copilot: ["planning-agent"] },
  backend_developer: { codex: ["coding-agent"], copilot: ["coding-agent"] },
  frontend_developer: { codex: ["coding-agent"], copilot: ["coding-agent"] },
  qa_engineer: { codex: ["qa-agent"], copilot: ["qa-agent"] },
  documentation_writer: { codex: ["documentation-agent"], copilot: ["documentation-agent"] },
  release_engineer: { codex: ["release-agent"], copilot: ["release-agent"] }
};

function digest(value: unknown): string {
  return `sha-256:${createHash("sha256").update(canonicalWorkGovernanceJson(value), "utf8").digest("hex")}`;
}

function token(prefix: string, planDigest: string, salt: string): string {
  return `${prefix}:${createHash("sha256").update(`${planDigest}\n${salt}`, "utf8").digest("hex").slice(0, 32)}`;
}

function reason(plan: WorkGovernanceManagerActivationPlanV1): WorkGovernanceManagerAdmissionPreviewReasonCodeV1 {
  const allowed = DEFAULT_CAPABILITIES[plan.role][plan.model.family];
  if (!allowed.includes(plan.model.capability)) return "YKP-WORK-MANAGER-ADMISSION-001";
  if (plan.evidence_required.length === 0) return "YKP-WORK-MANAGER-ADMISSION-002";
  if (plan.task.acceptance.length === 0) return "YKP-WORK-MANAGER-ADMISSION-003";
  if (plan.budgets.max_input_tokens + plan.budgets.max_output_tokens >
      WORK_GOVERNANCE_MANAGER_ADMISSION_MAX_TOTAL_TOKENS_V1) {
    return "YKP-WORK-MANAGER-ADMISSION-004";
  }
  if (plan.activation.max_acknowledgements >
      plan.activation.max_ticks * WORK_GOVERNANCE_MANAGER_ADMISSION_MAX_ACKNOWLEDGEMENTS_PER_TICK_V1) {
    return "YKP-WORK-MANAGER-ADMISSION-005";
  }
  return "YKP-WORK-MANAGER-ADMISSION-000";
}

export function previewWorkGovernanceManagerAdmissionV1(
  source: string | Uint8Array | WorkGovernanceManagerActivationPlanV1
): WorkGovernanceManagerAdmissionPreviewV1 {
  const plan = parseWorkGovernanceManagerActivationPlanV1(source);
  const summary = summarizeWorkGovernanceManagerActivationPlanV1(plan);
  const reasonCode = reason(plan);
  const decision: WorkGovernanceManagerAdmissionPreviewDecisionV1 =
    reasonCode === "YKP-WORK-MANAGER-ADMISSION-000" ? "admit" : "reject";
  const base = {
    schema: WORK_GOVERNANCE_MANAGER_ADMISSION_PREVIEW_SCHEMA_V1,
    decision,
    reason_code: reasonCode,
    plan_id: summary.plan_id,
    plan_digest: summary.plan_digest,
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
    requested_budgets: summary.budgets,
    requested_activation: summary.activation
  } satisfies Omit<WorkGovernanceManagerAdmissionPreviewV1, "candidate">;
  const preview: WorkGovernanceManagerAdmissionPreviewV1 = decision === "admit" ? {
    ...base,
    candidate: {
      claim_id: token("claim", digest({ plan: summary.plan_digest, kind: "claim" }), "claim"),
      lease_id: token("lease", digest({ plan: summary.plan_digest, kind: "lease" }), "lease"),
      admitted_budgets: summary.budgets,
      admitted_activation: summary.activation
    }
  } : base;
  canonicalWorkGovernanceJson(preview);
  return JSON.parse(canonicalWorkGovernanceJson(preview)) as WorkGovernanceManagerAdmissionPreviewV1;
}
