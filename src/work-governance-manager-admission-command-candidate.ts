import { createHash } from "node:crypto";
import {
  canonicalWorkGovernanceJson,
  parseWorkGovernanceCommandV1,
  type WorkGovernanceCommandV1,
  type WorkGovernancePolicyV1
} from "./work-governance-events.js";
import {
  WORK_GOVERNANCE_MANAGER_ADMISSION_PREVIEW_SCHEMA_V1,
  type WorkGovernanceManagerAdmissionPreviewV1
} from "./work-governance-manager-admission-preview.js";

export const WORK_GOVERNANCE_MANAGER_ADMISSION_COMMAND_CANDIDATE_SCHEMA_V1 =
  "yukh-projects-manager-admission-command-candidate-v1";

export type WorkGovernanceManagerAdmissionCommandCandidateErrorCode =
  | "YKP-WORK-MANAGER-COMMAND-001"
  | "YKP-WORK-MANAGER-COMMAND-002";

export class WorkGovernanceManagerAdmissionCommandCandidateError extends Error {
  constructor(readonly code: WorkGovernanceManagerAdmissionCommandCandidateErrorCode) {
    super("work-governance manager admission command candidate operation failed");
    this.name = "WorkGovernanceManagerAdmissionCommandCandidateError";
  }
}

export interface WorkGovernanceManagerAdmissionCommandCandidateInputV1 {
  preview: WorkGovernanceManagerAdmissionPreviewV1;
  command_id: string;
  storage_epoch: number;
  namespace_admission_id: string;
  expected_revision: number;
  policy: WorkGovernancePolicyV1;
  correlation_id: string;
  causation_id: string;
}

export interface WorkGovernanceManagerAdmissionCommandCandidateV1 {
  schema: typeof WORK_GOVERNANCE_MANAGER_ADMISSION_COMMAND_CANDIDATE_SCHEMA_V1;
  command: WorkGovernanceCommandV1;
  summary: {
    schema: "yukh-projects-manager-admission-command-summary-v1";
    command_id: string;
    command_digest: string;
    preview_digest: string;
    namespace_id: string;
    project_id: string;
    run_id: string;
    work_item_id: string;
    aggregate_id: string;
    expected_revision: number;
    claim_id: string;
    lease_id: string;
    worker_subject_id: string;
    role: string;
    model_family: string;
    model_capability: string;
    skill_count: number;
    acceptance_count: number;
    evidence_count: number;
    budget_digest: string;
    activation_digest: string;
  };
}

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const OPAQUE_ID = /^[a-z][a-z0-9_-]{0,31}:[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
const DIGEST = /^sha-256:[0-9a-f]{64}$/u;
const TOKEN = /^[a-z][a-z0-9_-]{0,63}$/u;

function fail(code: WorkGovernanceManagerAdmissionCommandCandidateErrorCode = "YKP-WORK-MANAGER-COMMAND-001"): never {
  throw new WorkGovernanceManagerAdmissionCommandCandidateError(code);
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

function exact(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): void {
  const allowed = new Set([...required, ...optional]);
  if (required.some((key) => !Object.hasOwn(value, key)) ||
      Object.keys(value).some((key) => !allowed.has(key))) fail();
}

function digest(value: unknown): string {
  return `sha-256:${createHash("sha256").update(canonicalWorkGovernanceJson(value), "utf8").digest("hex")}`;
}

function validPolicy(policy: unknown): policy is WorkGovernancePolicyV1 {
  return record(policy) && Object.keys(policy).length === 2 &&
    typeof policy.version === "string" && TOKEN.test(policy.version) &&
    typeof policy.digest === "string" && DIGEST.test(policy.digest);
}

function parsePreview(value: unknown): WorkGovernanceManagerAdmissionPreviewV1 {
  if (!record(value)) fail();
  exact(value, [
    "schema", "decision", "reason_code", "plan_id", "plan_digest", "namespace_id",
    "project_id", "run_id", "work_item_id", "manager_subject_id", "worker_subject_id",
    "role", "model_family", "model_capability", "skill_count", "acceptance_count",
    "evidence_count", "requested_budgets", "requested_activation"
  ], ["candidate"]);
  if (value.schema !== WORK_GOVERNANCE_MANAGER_ADMISSION_PREVIEW_SCHEMA_V1 ||
      value.decision !== "admit" ||
      value.reason_code !== "YKP-WORK-MANAGER-ADMISSION-000" ||
      typeof value.plan_id !== "string" || !UUID_V7.test(value.plan_id) ||
      typeof value.plan_digest !== "string" || !DIGEST.test(value.plan_digest) ||
      typeof value.namespace_id !== "string" || !OPAQUE_ID.test(value.namespace_id) ||
      typeof value.project_id !== "string" || !OPAQUE_ID.test(value.project_id) ||
      typeof value.run_id !== "string" || !OPAQUE_ID.test(value.run_id) ||
      typeof value.work_item_id !== "string" || !OPAQUE_ID.test(value.work_item_id) ||
      typeof value.manager_subject_id !== "string" || !OPAQUE_ID.test(value.manager_subject_id) ||
      typeof value.worker_subject_id !== "string" || !OPAQUE_ID.test(value.worker_subject_id) ||
      typeof value.role !== "string" || typeof value.model_family !== "string" ||
      typeof value.model_capability !== "string" || !record(value.candidate)) {
    fail("YKP-WORK-MANAGER-COMMAND-002");
  }
  exact(value.candidate, ["claim_id", "lease_id", "admitted_budgets", "admitted_activation"]);
  if (typeof value.candidate.claim_id !== "string" || !OPAQUE_ID.test(value.candidate.claim_id) ||
      typeof value.candidate.lease_id !== "string" || !OPAQUE_ID.test(value.candidate.lease_id)) {
    fail("YKP-WORK-MANAGER-COMMAND-002");
  }
  canonicalWorkGovernanceJson(value);
  return JSON.parse(canonicalWorkGovernanceJson(value)) as WorkGovernanceManagerAdmissionPreviewV1;
}

export function createWorkGovernanceManagerAdmissionCommandCandidateV1(
  input: WorkGovernanceManagerAdmissionCommandCandidateInputV1
): WorkGovernanceManagerAdmissionCommandCandidateV1 {
  try {
    if (!record(input)) fail();
    exact(input as unknown as Record<string, unknown>, [
      "preview", "command_id", "storage_epoch", "namespace_admission_id",
      "expected_revision", "policy", "correlation_id", "causation_id"
    ]);
    const preview = parsePreview(input.preview);
    if (!UUID_V7.test(input.command_id) || !Number.isSafeInteger(input.storage_epoch) ||
        input.storage_epoch < 1 || !OPAQUE_ID.test(input.namespace_admission_id) ||
        !Number.isSafeInteger(input.expected_revision) || input.expected_revision < 0 ||
        !validPolicy(input.policy) || !UUID_V7.test(input.correlation_id) ||
        !UUID_V7.test(input.causation_id)) fail();
    const previewDigest = digest(preview);
    const command: WorkGovernanceCommandV1 = {
      schema: "yukh-projects-command-v1",
      command_id: input.command_id,
      storage_epoch: input.storage_epoch,
      namespace_id: preview.namespace_id,
      project_id: preview.project_id,
      run_id: preview.run_id,
      aggregate: {
        kind: "namespace_admission",
        id: input.namespace_admission_id,
        expected_revision: input.expected_revision
      },
      actor: {
        subject_id: preview.manager_subject_id,
        claim_id: preview.candidate!.claim_id,
        lease_id: preview.candidate!.lease_id
      },
      policy: input.policy,
      correlation_id: input.correlation_id,
      causation_id: input.causation_id,
      data: {
        admission_preview_digest: previewDigest,
        plan_id: preview.plan_id,
        plan_digest: preview.plan_digest,
        claim_id: preview.candidate!.claim_id,
        lease_id: preview.candidate!.lease_id,
        subject_id: preview.worker_subject_id,
        work_item_id: preview.work_item_id,
        role: preview.role,
        model: {
          family: preview.model_family,
          capability: preview.model_capability
        },
        skill_count: preview.skill_count,
        acceptance_count: preview.acceptance_count,
        evidence_count: preview.evidence_count,
        budget: preview.candidate!.admitted_budgets,
        activation: preview.candidate!.admitted_activation,
        grants: {
          work: ["execute_assigned_work"],
          mutation: []
        }
      }
    };
    const parsed = parseWorkGovernanceCommandV1(canonicalWorkGovernanceJson(command));
    const commandDigest = digest(parsed);
    const candidate: WorkGovernanceManagerAdmissionCommandCandidateV1 = {
      schema: WORK_GOVERNANCE_MANAGER_ADMISSION_COMMAND_CANDIDATE_SCHEMA_V1,
      command: parsed,
      summary: {
        schema: "yukh-projects-manager-admission-command-summary-v1",
        command_id: parsed.command_id,
        command_digest: commandDigest,
        preview_digest: previewDigest,
        namespace_id: parsed.namespace_id,
        project_id: parsed.project_id!,
        run_id: parsed.run_id!,
        work_item_id: preview.work_item_id,
        aggregate_id: input.namespace_admission_id,
        expected_revision: input.expected_revision,
        claim_id: preview.candidate!.claim_id,
        lease_id: preview.candidate!.lease_id,
        worker_subject_id: preview.worker_subject_id,
        role: preview.role,
        model_family: preview.model_family,
        model_capability: preview.model_capability,
        skill_count: preview.skill_count,
        acceptance_count: preview.acceptance_count,
        evidence_count: preview.evidence_count,
        budget_digest: digest(preview.candidate!.admitted_budgets),
        activation_digest: digest(preview.candidate!.admitted_activation)
      }
    };
    canonicalWorkGovernanceJson(candidate);
    return JSON.parse(canonicalWorkGovernanceJson(candidate)) as WorkGovernanceManagerAdmissionCommandCandidateV1;
  } catch (error) {
    if (error instanceof WorkGovernanceManagerAdmissionCommandCandidateError) throw error;
    fail();
  }
}
