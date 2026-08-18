import { createHash } from "node:crypto";
import {
  canonicalWorkGovernanceJson,
  type WorkGovernanceEvidenceV1
} from "./work-governance-events.js";
import {
  WORK_GOVERNANCE_PROJECTOR_ACTIVATION_MAX_ACKNOWLEDGEMENTS_V1,
  WORK_GOVERNANCE_PROJECTOR_ACTIVATION_MAX_TICKS_V1
} from "./work-governance-projector-activation.js";

export const WORK_GOVERNANCE_MANAGER_ACTIVATION_PLAN_SCHEMA_V1 =
  "yukh-projects-manager-activation-plan-v1";
export const WORK_GOVERNANCE_MANAGER_ACTIVATION_PLAN_MAX_TURNS_V1 = 32;
export const WORK_GOVERNANCE_MANAGER_ACTIVATION_PLAN_MAX_TOKENS_V1 = 250_000;
export const WORK_GOVERNANCE_MANAGER_ACTIVATION_PLAN_MAX_SECONDS_V1 = 14_400;

export type WorkGovernanceManagerActivationPlanErrorCode =
  | "YKP-WORK-MANAGER-001"
  | "YKP-WORK-MANAGER-002";

export class WorkGovernanceManagerActivationPlanError extends Error {
  constructor(readonly code: WorkGovernanceManagerActivationPlanErrorCode) {
    super("work-governance manager activation plan operation failed");
    this.name = "WorkGovernanceManagerActivationPlanError";
  }
}

export type WorkGovernanceManagerRoleV1 =
  | "product_manager"
  | "backend_developer"
  | "frontend_developer"
  | "qa_engineer"
  | "documentation_writer"
  | "release_engineer";

export type WorkGovernanceManagerModelFamilyV1 = "codex" | "copilot";

export interface WorkGovernanceManagerActivationPlanV1 {
  schema: typeof WORK_GOVERNANCE_MANAGER_ACTIVATION_PLAN_SCHEMA_V1;
  plan_id: string;
  namespace_id: string;
  project_id: string;
  run_id: string;
  work_item_id: string;
  manager_subject_id: string;
  worker_subject_id: string;
  role: WorkGovernanceManagerRoleV1;
  model: {
    family: WorkGovernanceManagerModelFamilyV1;
    capability: string;
  };
  skills: string[];
  task: {
    objective: string;
    acceptance: string[];
  };
  evidence_required: WorkGovernanceEvidenceV1[];
  budgets: {
    max_turns: number;
    max_input_tokens: number;
    max_output_tokens: number;
    max_wall_clock_seconds: number;
  };
  activation: {
    max_ticks: number;
    max_acknowledgements: number;
    max_idle_ticks: number;
  };
}

export interface WorkGovernanceManagerActivationPlanSummaryV1 {
  schema: "yukh-projects-manager-activation-summary-v1";
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
  task_digest: string;
  budgets: WorkGovernanceManagerActivationPlanV1["budgets"];
  activation: WorkGovernanceManagerActivationPlanV1["activation"];
}

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const OPAQUE_ID = /^[a-z][a-z0-9_-]{0,31}:[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
const DIGEST = /^sha-256:[0-9a-f]{64}$/u;
const TOKEN = /^[a-z][a-z0-9_-]{0,63}$/u;
const ROLES = new Set<WorkGovernanceManagerRoleV1>([
  "product_manager", "backend_developer", "frontend_developer", "qa_engineer",
  "documentation_writer", "release_engineer"
]);
const MODEL_FAMILIES = new Set<WorkGovernanceManagerModelFamilyV1>(["codex", "copilot"]);

function fail(code: WorkGovernanceManagerActivationPlanErrorCode = "YKP-WORK-MANAGER-001"): never {
  throw new WorkGovernanceManagerActivationPlanError(code);
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

function unicode(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function text(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 &&
    Buffer.byteLength(value, "utf8") <= maximum && unicode(value) &&
    !/[\u0000-\u001f\u007f]/u.test(value);
}

function opaque(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_ID.test(value);
}

function positive(value: unknown, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= maximum;
}

function digest(value: unknown): value is string {
  return typeof value === "string" && DIGEST.test(value);
}

function sha256(value: unknown): string {
  return `sha-256:${createHash("sha256").update(canonicalWorkGovernanceJson(value), "utf8").digest("hex")}`;
}

function parseEvidence(value: unknown): WorkGovernanceEvidenceV1[] {
  if (!Array.isArray(value) || value.length > 16) fail();
  return value.map((item) => {
    if (!record(item)) fail();
    exact(item, ["kind", "uri", "digest"]);
    if (!text(item.kind, 64) || !TOKEN.test(item.kind) ||
        !text(item.uri, 512) || !String(item.uri).startsWith("urn:") ||
        !digest(item.digest)) fail("YKP-WORK-MANAGER-002");
    return {
      kind: item.kind,
      uri: item.uri,
      digest: item.digest
    };
  });
}

function parseStringList(value: unknown, maximumItems: number, maximumBytes: number, tokenOnly = false): string[] {
  if (!Array.isArray(value) || value.length > maximumItems) fail();
  return value.map((item) => {
    if (!text(item, maximumBytes) || (tokenOnly && !TOKEN.test(item))) fail();
    return item;
  });
}

function parseBudgets(value: unknown): WorkGovernanceManagerActivationPlanV1["budgets"] {
  if (!record(value)) fail();
  exact(value, ["max_turns", "max_input_tokens", "max_output_tokens", "max_wall_clock_seconds"]);
  if (!positive(value.max_turns, WORK_GOVERNANCE_MANAGER_ACTIVATION_PLAN_MAX_TURNS_V1) ||
      !positive(value.max_input_tokens, WORK_GOVERNANCE_MANAGER_ACTIVATION_PLAN_MAX_TOKENS_V1) ||
      !positive(value.max_output_tokens, WORK_GOVERNANCE_MANAGER_ACTIVATION_PLAN_MAX_TOKENS_V1) ||
      !positive(value.max_wall_clock_seconds, WORK_GOVERNANCE_MANAGER_ACTIVATION_PLAN_MAX_SECONDS_V1)) fail();
  return {
    max_turns: value.max_turns,
    max_input_tokens: value.max_input_tokens,
    max_output_tokens: value.max_output_tokens,
    max_wall_clock_seconds: value.max_wall_clock_seconds
  };
}

function parseActivation(value: unknown): WorkGovernanceManagerActivationPlanV1["activation"] {
  if (!record(value)) fail();
  exact(value, ["max_ticks", "max_acknowledgements", "max_idle_ticks"]);
  if (!positive(value.max_ticks, WORK_GOVERNANCE_PROJECTOR_ACTIVATION_MAX_TICKS_V1) ||
      !positive(value.max_acknowledgements, WORK_GOVERNANCE_PROJECTOR_ACTIVATION_MAX_ACKNOWLEDGEMENTS_V1) ||
      !positive(value.max_idle_ticks, Number(value.max_ticks))) fail();
  return {
    max_ticks: value.max_ticks,
    max_acknowledgements: value.max_acknowledgements,
    max_idle_ticks: value.max_idle_ticks
  };
}

function parsePlanObject(value: unknown): WorkGovernanceManagerActivationPlanV1 {
  if (!record(value)) fail();
  exact(value, [
    "schema", "plan_id", "namespace_id", "project_id", "run_id", "work_item_id",
    "manager_subject_id", "worker_subject_id", "role", "model", "skills", "task",
    "evidence_required", "budgets", "activation"
  ]);
  if (value.schema !== WORK_GOVERNANCE_MANAGER_ACTIVATION_PLAN_SCHEMA_V1 ||
      typeof value.plan_id !== "string" || !UUID_V7.test(value.plan_id) ||
      !opaque(value.namespace_id) || !opaque(value.project_id) || !opaque(value.run_id) ||
      !opaque(value.work_item_id) || !opaque(value.manager_subject_id) ||
      !opaque(value.worker_subject_id) || !ROLES.has(value.role as WorkGovernanceManagerRoleV1)) fail();
  if (!record(value.model)) fail();
  exact(value.model, ["family", "capability"]);
  if (!MODEL_FAMILIES.has(value.model.family as WorkGovernanceManagerModelFamilyV1) ||
      !text(value.model.capability, 128) || !TOKEN.test(value.model.capability)) fail();
  if (!record(value.task)) fail();
  exact(value.task, ["objective", "acceptance"]);
  if (!text(value.task.objective, 4_096)) fail();
  const plan: WorkGovernanceManagerActivationPlanV1 = {
    schema: WORK_GOVERNANCE_MANAGER_ACTIVATION_PLAN_SCHEMA_V1,
    plan_id: value.plan_id,
    namespace_id: value.namespace_id,
    project_id: value.project_id,
    run_id: value.run_id,
    work_item_id: value.work_item_id,
    manager_subject_id: value.manager_subject_id,
    worker_subject_id: value.worker_subject_id,
    role: value.role as WorkGovernanceManagerRoleV1,
    model: {
      family: value.model.family as WorkGovernanceManagerModelFamilyV1,
      capability: value.model.capability
    },
    skills: parseStringList(value.skills, 16, 64, true),
    task: {
      objective: value.task.objective,
      acceptance: parseStringList(value.task.acceptance, 16, 512)
    },
    evidence_required: parseEvidence(value.evidence_required),
    budgets: parseBudgets(value.budgets),
    activation: parseActivation(value.activation)
  };
  canonicalWorkGovernanceJson(plan);
  return JSON.parse(canonicalWorkGovernanceJson(plan)) as WorkGovernanceManagerActivationPlanV1;
}

export function parseWorkGovernanceManagerActivationPlanV1(
  source: string | Uint8Array | WorkGovernanceManagerActivationPlanV1
): WorkGovernanceManagerActivationPlanV1 {
  try {
    if (typeof source !== "string" && !(source instanceof Uint8Array)) return parsePlanObject(source);
    const textSource = typeof source === "string" ? source : new TextDecoder("utf-8", { fatal: true }).decode(source);
    if (Buffer.byteLength(textSource, "utf8") > 64 * 1024) fail();
    return parsePlanObject(JSON.parse(textSource));
  } catch (error) {
    if (error instanceof WorkGovernanceManagerActivationPlanError) throw error;
    fail();
  }
}

export function summarizeWorkGovernanceManagerActivationPlanV1(
  source: string | Uint8Array | WorkGovernanceManagerActivationPlanV1
): WorkGovernanceManagerActivationPlanSummaryV1 {
  const plan = parseWorkGovernanceManagerActivationPlanV1(source);
  return {
    schema: "yukh-projects-manager-activation-summary-v1",
    plan_id: plan.plan_id,
    plan_digest: sha256(plan),
    namespace_id: plan.namespace_id,
    project_id: plan.project_id,
    run_id: plan.run_id,
    work_item_id: plan.work_item_id,
    manager_subject_id: plan.manager_subject_id,
    worker_subject_id: plan.worker_subject_id,
    role: plan.role,
    model_family: plan.model.family,
    model_capability: plan.model.capability,
    skill_count: plan.skills.length,
    acceptance_count: plan.task.acceptance.length,
    evidence_count: plan.evidence_required.length,
    task_digest: sha256(plan.task),
    budgets: plan.budgets,
    activation: plan.activation
  };
}
