import {
  canonicalWorkGovernanceJson,
  encodeWorkGovernanceEventV1,
  parseWorkGovernanceCommandV1,
  parseWorkGovernanceEventV1,
  type WorkGovernanceCommandV1,
  type WorkGovernanceEventV1
} from "./work-governance-events.js";
import {
  type WorkGovernanceCommandReceiptV1
} from "./work-governance-command-receipts.js";
import {
  WORK_GOVERNANCE_MANAGER_ADMISSION_COMMAND_CANDIDATE_SCHEMA_V1,
  type WorkGovernanceManagerAdmissionCommandCandidateV1
} from "./work-governance-manager-admission-command-candidate.js";

export const WORK_GOVERNANCE_MANAGER_ADMISSION_COORDINATED_APPEND_SCHEMA_V1 =
  "yukh-projects-manager-admission-coordinated-append-v1";

export type WorkGovernanceManagerAdmissionCoordinatedAppendErrorCode =
  | "YKP-WORK-MANAGER-COORDINATED-001"
  | "YKP-WORK-MANAGER-COORDINATED-002";

export class WorkGovernanceManagerAdmissionCoordinatedAppendError extends Error {
  constructor(readonly code: WorkGovernanceManagerAdmissionCoordinatedAppendErrorCode) {
    super("work-governance manager admission coordinated append operation failed");
    this.name = "WorkGovernanceManagerAdmissionCoordinatedAppendError";
  }
}

export interface WorkGovernanceManagerAdmissionAppendCoordinatorPortV1 {
  append(command: WorkGovernanceCommandV1, event: WorkGovernanceEventV1): Promise<{
    outcome: "appended" | "replayed";
    event: WorkGovernanceEventV1;
    receipt: WorkGovernanceCommandReceiptV1;
  }>;
}

export interface WorkGovernanceManagerAdmissionCoordinatedAppendResultV1 {
  schema: typeof WORK_GOVERNANCE_MANAGER_ADMISSION_COORDINATED_APPEND_SCHEMA_V1;
  outcome: "appended" | "replayed";
  event_id: string;
  event_digest: string;
  aggregate_revision: number;
  receipt_state: WorkGovernanceCommandReceiptV1["state"];
  stream_sequence?: number;
  command_digest: string;
  candidate_summary: WorkGovernanceManagerAdmissionCommandCandidateV1["summary"];
}

function fail(code: WorkGovernanceManagerAdmissionCoordinatedAppendErrorCode = "YKP-WORK-MANAGER-COORDINATED-001"): never {
  throw new WorkGovernanceManagerAdmissionCoordinatedAppendError(code);
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

function parseCandidate(value: unknown): WorkGovernanceManagerAdmissionCommandCandidateV1 {
  if (!record(value)) fail();
  exact(value, ["schema", "command", "summary"]);
  if (value.schema !== WORK_GOVERNANCE_MANAGER_ADMISSION_COMMAND_CANDIDATE_SCHEMA_V1) fail();
  const command = parseWorkGovernanceCommandV1(canonicalWorkGovernanceJson(value.command));
  if (command.aggregate.kind !== "namespace_admission") fail();
  return {
    schema: WORK_GOVERNANCE_MANAGER_ADMISSION_COMMAND_CANDIDATE_SCHEMA_V1,
    command,
    summary: JSON.parse(canonicalWorkGovernanceJson(value.summary)) as WorkGovernanceManagerAdmissionCommandCandidateV1["summary"]
  };
}

function verifyBinding(candidate: WorkGovernanceManagerAdmissionCommandCandidateV1, event: WorkGovernanceEventV1): void {
  if (event.type !== "claim.admitted.v1" ||
      event.command.id !== candidate.command.command_id ||
      event.command.expected_revision !== candidate.command.aggregate.expected_revision ||
      event.aggregate.kind !== "namespace_admission" ||
      event.aggregate.id !== candidate.command.aggregate.id ||
      event.namespace_id !== candidate.command.namespace_id ||
      event.project_id !== candidate.command.project_id ||
      event.run_id !== candidate.command.run_id ||
      event.actor.subject_id !== candidate.command.actor.subject_id ||
      event.actor.claim_id !== candidate.command.actor.claim_id ||
      event.actor.lease_id !== candidate.command.actor.lease_id ||
      canonicalWorkGovernanceJson(event.data) !== canonicalWorkGovernanceJson(candidate.command.data)) {
    fail("YKP-WORK-MANAGER-COORDINATED-002");
  }
}

export async function appendWorkGovernanceManagerAdmissionCoordinatedV1(input: {
  candidate: WorkGovernanceManagerAdmissionCommandCandidateV1;
  event: WorkGovernanceEventV1;
  coordinator: WorkGovernanceManagerAdmissionAppendCoordinatorPortV1;
}): Promise<WorkGovernanceManagerAdmissionCoordinatedAppendResultV1> {
  try {
    if (!record(input)) fail();
    exact(input as unknown as Record<string, unknown>, ["candidate", "event", "coordinator"]);
    if (!record(input.coordinator) || typeof input.coordinator.append !== "function") fail();
    const candidate = parseCandidate(input.candidate);
    const event = parseWorkGovernanceEventV1(encodeWorkGovernanceEventV1(input.event));
    verifyBinding(candidate, event);
    const result = await input.coordinator.append(candidate.command, event);
    verifyBinding(candidate, result.event);
    const output: WorkGovernanceManagerAdmissionCoordinatedAppendResultV1 = {
      schema: WORK_GOVERNANCE_MANAGER_ADMISSION_COORDINATED_APPEND_SCHEMA_V1,
      outcome: result.outcome,
      event_id: result.event.event_id,
      event_digest: result.event.event_digest,
      aggregate_revision: result.event.aggregate.revision,
      receipt_state: result.receipt.state,
      ...(result.receipt.stream_sequence === undefined ? {} : { stream_sequence: result.receipt.stream_sequence }),
      command_digest: candidate.summary.command_digest,
      candidate_summary: candidate.summary
    };
    canonicalWorkGovernanceJson(output);
    return JSON.parse(canonicalWorkGovernanceJson(output)) as WorkGovernanceManagerAdmissionCoordinatedAppendResultV1;
  } catch (error) {
    if (error instanceof WorkGovernanceManagerAdmissionCoordinatedAppendError) throw error;
    fail("YKP-WORK-MANAGER-COORDINATED-001");
  }
}
