import {
  canonicalWorkGovernanceJson,
  parseWorkGovernanceCommandV1,
  type WorkGovernanceAppendResultV1,
  type WorkGovernanceEvidenceV1
} from "./work-governance-events.js";
import {
  WORK_GOVERNANCE_MANAGER_ADMISSION_COMMAND_CANDIDATE_SCHEMA_V1,
  type WorkGovernanceManagerAdmissionCommandCandidateV1
} from "./work-governance-manager-admission-command-candidate.js";

export const WORK_GOVERNANCE_MANAGER_ADMISSION_INMEMORY_APPEND_SCHEMA_V1 =
  "yukh-projects-manager-admission-inmemory-append-v1";

export type WorkGovernanceManagerAdmissionInMemoryAppendErrorCode =
  | "YKP-WORK-MANAGER-APPEND-001"
  | "YKP-WORK-MANAGER-APPEND-002";

export class WorkGovernanceManagerAdmissionInMemoryAppendError extends Error {
  constructor(readonly code: WorkGovernanceManagerAdmissionInMemoryAppendErrorCode) {
    super("work-governance manager admission in-memory append operation failed");
    this.name = "WorkGovernanceManagerAdmissionInMemoryAppendError";
  }
}

export interface WorkGovernanceManagerAdmissionInMemoryAppendStoreV1 {
  append(input: {
    command: ReturnType<typeof parseWorkGovernanceCommandV1>;
    event_type: "claim.admitted.v1";
    evidence?: readonly WorkGovernanceEvidenceV1[];
    data: ReturnType<typeof parseWorkGovernanceCommandV1>["data"];
  }): WorkGovernanceAppendResultV1;
}

export interface WorkGovernanceManagerAdmissionInMemoryAppendResultV1 {
  schema: typeof WORK_GOVERNANCE_MANAGER_ADMISSION_INMEMORY_APPEND_SCHEMA_V1;
  outcome: "appended" | "replayed";
  event_id: string;
  event_digest: string;
  aggregate_revision: number;
  command_digest: string;
  candidate_summary: WorkGovernanceManagerAdmissionCommandCandidateV1["summary"];
}

const DIGEST = /^sha-256:[0-9a-f]{64}$/u;
const TOKEN = /^[a-z][a-z0-9_-]{0,63}$/u;

function fail(code: WorkGovernanceManagerAdmissionInMemoryAppendErrorCode = "YKP-WORK-MANAGER-APPEND-001"): never {
  throw new WorkGovernanceManagerAdmissionInMemoryAppendError(code);
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

function text(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 &&
    Buffer.byteLength(value, "utf8") <= maximum && !/[\u0000-\u001f\u007f]/u.test(value);
}

function parseEvidence(value: unknown): WorkGovernanceEvidenceV1[] {
  if (!Array.isArray(value) || value.length > 8) fail();
  return value.map((item) => {
    if (!record(item)) fail();
    exact(item, ["kind", "uri", "digest"]);
    if (!text(item.kind, 64) || !TOKEN.test(item.kind) ||
        !text(item.uri, 512) || !String(item.uri).startsWith("urn:") ||
        typeof item.digest !== "string" || !DIGEST.test(item.digest)) fail();
    return { kind: item.kind, uri: item.uri, digest: item.digest };
  });
}

function parseCandidate(value: unknown): WorkGovernanceManagerAdmissionCommandCandidateV1 {
  if (!record(value)) fail();
  exact(value, ["schema", "command", "summary"]);
  if (value.schema !== WORK_GOVERNANCE_MANAGER_ADMISSION_COMMAND_CANDIDATE_SCHEMA_V1 || !record(value.summary)) fail();
  const command = parseWorkGovernanceCommandV1(canonicalWorkGovernanceJson(value.command));
  if (command.aggregate.kind !== "namespace_admission" ||
      command.actor.claim_id === undefined ||
      command.actor.lease_id === undefined ||
      command.data.claim_id !== command.actor.claim_id ||
      command.data.lease_id !== command.actor.lease_id) fail();
  return {
    schema: WORK_GOVERNANCE_MANAGER_ADMISSION_COMMAND_CANDIDATE_SCHEMA_V1,
    command,
    summary: JSON.parse(canonicalWorkGovernanceJson(value.summary)) as WorkGovernanceManagerAdmissionCommandCandidateV1["summary"]
  };
}

export function appendWorkGovernanceManagerAdmissionInMemoryV1(input: {
  candidate: WorkGovernanceManagerAdmissionCommandCandidateV1;
  store: WorkGovernanceManagerAdmissionInMemoryAppendStoreV1;
  evidence: readonly WorkGovernanceEvidenceV1[];
}): WorkGovernanceManagerAdmissionInMemoryAppendResultV1 {
  try {
    if (!record(input)) fail();
    exact(input as unknown as Record<string, unknown>, ["candidate", "store", "evidence"]);
    if (!record(input.store) || typeof input.store.append !== "function") fail();
    const candidate = parseCandidate(input.candidate);
    const evidence = parseEvidence(input.evidence);
    const result = input.store.append({
      command: candidate.command,
      event_type: "claim.admitted.v1",
      evidence,
      data: candidate.command.data
    });
    const summary: WorkGovernanceManagerAdmissionInMemoryAppendResultV1 = {
      schema: WORK_GOVERNANCE_MANAGER_ADMISSION_INMEMORY_APPEND_SCHEMA_V1,
      outcome: result.outcome,
      event_id: result.event.event_id,
      event_digest: result.event.event_digest,
      aggregate_revision: result.event.aggregate.revision,
      command_digest: candidate.summary.command_digest,
      candidate_summary: candidate.summary
    };
    canonicalWorkGovernanceJson(summary);
    return JSON.parse(canonicalWorkGovernanceJson(summary)) as WorkGovernanceManagerAdmissionInMemoryAppendResultV1;
  } catch (error) {
    if (error instanceof WorkGovernanceManagerAdmissionInMemoryAppendError) throw error;
    fail("YKP-WORK-MANAGER-APPEND-002");
  }
}
