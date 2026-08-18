import {
  canonicalWorkGovernanceJson,
  createInMemoryWorkGovernanceEventStoreV1,
  type WorkGovernanceEvidenceV1,
  type WorkGovernancePolicyV1
} from "./work-governance-events.js";
import {
  createWorkGovernanceManagerAdmissionCommandCandidateV1
} from "./work-governance-manager-admission-command-candidate.js";
import {
  appendWorkGovernanceManagerAdmissionCoordinatedV1,
  type WorkGovernanceManagerAdmissionAppendCoordinatorPortV1
} from "./work-governance-manager-admission-coordinated-append.js";
import {
  previewWorkGovernanceManagerAdmissionV1
} from "./work-governance-manager-admission-preview.js";
import {
  type WorkGovernanceManagerActivationPlanV1
} from "./work-governance-manager-activation-plan.js";

export const WORK_GOVERNANCE_MANAGER_ADMISSION_RUNTIME_SCHEMA_V1 =
  "yukh-projects-manager-admission-runtime-v1";

export type WorkGovernanceManagerAdmissionRuntimeErrorCode =
  | "YKP-WORK-MANAGER-RUNTIME-001"
  | "YKP-WORK-MANAGER-RUNTIME-002"
  | "YKP-WORK-MANAGER-RUNTIME-003";

export class WorkGovernanceManagerAdmissionRuntimeError extends Error {
  constructor(readonly code: WorkGovernanceManagerAdmissionRuntimeErrorCode) {
    super("work-governance manager admission runtime operation failed");
    this.name = "WorkGovernanceManagerAdmissionRuntimeError";
  }
}

export interface WorkGovernanceManagerAdmissionRuntimeInputV1 {
  plan: WorkGovernanceManagerActivationPlanV1;
  command_id: string;
  event_id: string;
  occurred_at: string;
  storage_epoch: number;
  namespace_admission_id: string;
  expected_revision: number;
  policy: WorkGovernancePolicyV1;
  correlation_id: string;
  causation_id: string;
  evidence: readonly WorkGovernanceEvidenceV1[];
  coordinator: WorkGovernanceManagerAdmissionAppendCoordinatorPortV1;
}

export interface WorkGovernanceManagerAdmissionRuntimeResultV1 {
  schema: typeof WORK_GOVERNANCE_MANAGER_ADMISSION_RUNTIME_SCHEMA_V1;
  phase: "admitted";
  outcome: "appended" | "replayed";
  plan_id: string;
  preview_digest: string;
  command_digest: string;
  event_id: string;
  event_digest: string;
  aggregate_revision: number;
  receipt_state: "reserved" | "completion_unknown" | "appended";
  stream_sequence?: number;
  candidate_summary: ReturnType<typeof createWorkGovernanceManagerAdmissionCommandCandidateV1>["summary"];
}

function fail(code: WorkGovernanceManagerAdmissionRuntimeErrorCode = "YKP-WORK-MANAGER-RUNTIME-001"): never {
  throw new WorkGovernanceManagerAdmissionRuntimeError(code);
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
  if (required.some((key) => !Object.hasOwn(value, key)) ||
      Object.keys(value).some((key) => !required.includes(key))) fail();
}

function timestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export async function runWorkGovernanceManagerAdmissionRuntimeV1(
  input: WorkGovernanceManagerAdmissionRuntimeInputV1
): Promise<WorkGovernanceManagerAdmissionRuntimeResultV1> {
  try {
    if (!record(input)) fail();
    exact(input as unknown as Record<string, unknown>, [
      "plan", "command_id", "event_id", "occurred_at", "storage_epoch",
      "namespace_admission_id", "expected_revision", "policy", "correlation_id",
      "causation_id", "evidence", "coordinator"
    ]);
    if (!timestamp(input.occurred_at)) fail();
    const preview = previewWorkGovernanceManagerAdmissionV1(input.plan);
    if (preview.decision !== "admit") fail("YKP-WORK-MANAGER-RUNTIME-002");
    const candidate = createWorkGovernanceManagerAdmissionCommandCandidateV1({
      preview,
      command_id: input.command_id,
      storage_epoch: input.storage_epoch,
      namespace_admission_id: input.namespace_admission_id,
      expected_revision: input.expected_revision,
      policy: input.policy,
      correlation_id: input.correlation_id,
      causation_id: input.causation_id
    });
    const eventStore = createInMemoryWorkGovernanceEventStoreV1({
      storageEpoch: input.storage_epoch,
      eventId: () => input.event_id,
      occurredAt: () => input.occurred_at
    });
    const event = eventStore.append({
      command: candidate.command,
      event_type: "claim.admitted.v1",
      evidence: input.evidence,
      data: candidate.command.data
    }).event;
    const appended = await appendWorkGovernanceManagerAdmissionCoordinatedV1({
      candidate,
      event,
      coordinator: input.coordinator
    });
    const result: WorkGovernanceManagerAdmissionRuntimeResultV1 = {
      schema: WORK_GOVERNANCE_MANAGER_ADMISSION_RUNTIME_SCHEMA_V1,
      phase: "admitted",
      outcome: appended.outcome,
      plan_id: preview.plan_id,
      preview_digest: candidate.summary.preview_digest,
      command_digest: appended.command_digest,
      event_id: appended.event_id,
      event_digest: appended.event_digest,
      aggregate_revision: appended.aggregate_revision,
      receipt_state: appended.receipt_state,
      ...(appended.stream_sequence === undefined ? {} : { stream_sequence: appended.stream_sequence }),
      candidate_summary: appended.candidate_summary
    };
    canonicalWorkGovernanceJson(result);
    return JSON.parse(canonicalWorkGovernanceJson(result)) as WorkGovernanceManagerAdmissionRuntimeResultV1;
  } catch (error) {
    if (error instanceof WorkGovernanceManagerAdmissionRuntimeError) throw error;
    fail("YKP-WORK-MANAGER-RUNTIME-003");
  }
}
