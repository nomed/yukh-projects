import assert from "node:assert/strict";
import test from "node:test";
import {
  WorkGovernanceManagerAdmissionCoordinatedAppendError,
  appendWorkGovernanceManagerAdmissionCoordinatedV1,
  createInMemoryWorkGovernanceEventStoreV1,
  createWorkGovernanceManagerAdmissionCommandCandidateV1,
  previewWorkGovernanceManagerAdmissionV1,
  type WorkGovernanceCommandReceiptV1,
  type WorkGovernanceEventV1,
  type WorkGovernanceManagerActivationPlanV1
} from "../src/index.js";

const digest = `sha-256:${"a".repeat(64)}`;
const policy = { version: "policy-v1", digest };

function plan(): WorkGovernanceManagerActivationPlanV1 {
  return {
    schema: "yukh-projects-manager-activation-plan-v1",
    plan_id: "01900000-0000-7000-8000-000000000080",
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

function candidate() {
  return createWorkGovernanceManagerAdmissionCommandCandidateV1({
    preview: previewWorkGovernanceManagerAdmissionV1(plan()),
    command_id: "01900000-0000-7000-8000-000000000090",
    storage_epoch: 7,
    namespace_admission_id: "admission:example",
    expected_revision: 0,
    policy,
    correlation_id: "01900000-0000-7000-8000-000000000091",
    causation_id: "01900000-0000-7000-8000-000000000092"
  });
}

function event(type: "claim.admitted.v1" | "claim.rejected.v1" = "claim.admitted.v1") {
  const value = candidate();
  const store = createInMemoryWorkGovernanceEventStoreV1({
    storageEpoch: 7,
    eventId: () => "01900000-0000-7000-8000-000000000093",
    occurredAt: () => "2026-08-18T03:00:00.000Z"
  });
  return {
    candidate: value,
    event: store.append({
      command: value.command,
      event_type: type,
      evidence: [{ kind: "decision", uri: "urn:example:evidence:admission", digest }],
      data: value.command.data
    }).event
  };
}

function receipt(event: WorkGovernanceEventV1, state: "appended" | "completion_unknown" = "appended"): WorkGovernanceCommandReceiptV1 {
  return {
    schema: "yukh-projects-command-receipt-v1",
    storage_epoch: 7,
    command_id: event.command.id,
    command_digest: digest,
    event_id: event.event_id,
    event_digest: event.event_digest,
    aggregate_revision: event.aggregate.revision,
    state,
    ...(state === "appended" ? { stream_sequence: 41 } : {})
  };
}

function isCoordinatedError(code: string) {
  return (error: unknown) => error instanceof WorkGovernanceManagerAdmissionCoordinatedAppendError &&
    error.code === code &&
    error.message === "work-governance manager admission coordinated append operation failed";
}

test("publishes a matching admission event through an injected coordinator", async () => {
  const { candidate: value, event: admission } = event();
  const output = await appendWorkGovernanceManagerAdmissionCoordinatedV1({
    candidate: value,
    event: admission,
    coordinator: {
      async append(command, received) {
        assert.deepEqual(command, value.command);
        assert.deepEqual(received, admission);
        return { outcome: "appended", event: received, receipt: receipt(received) };
      }
    }
  });
  assert.equal(output.schema, "yukh-projects-manager-admission-coordinated-append-v1");
  assert.equal(output.outcome, "appended");
  assert.equal(output.event_id, admission.event_id);
  assert.equal(output.event_digest, admission.event_digest);
  assert.equal(output.aggregate_revision, 1);
  assert.equal(output.receipt_state, "appended");
  assert.equal(output.stream_sequence, 41);
  assert.equal(output.command_digest, value.summary.command_digest);
});

test("reports replay from the existing command append coordinator", async () => {
  const { candidate: value, event: admission } = event();
  const output = await appendWorkGovernanceManagerAdmissionCoordinatedV1({
    candidate: value,
    event: admission,
    coordinator: {
      async append(_command, received) {
        return { outcome: "replayed", event: received, receipt: receipt(received) };
      }
    }
  });
  assert.equal(output.outcome, "replayed");
  assert.equal(output.event_id, admission.event_id);
});

test("fails closed before coordinator call when event binding does not match", async () => {
  const { candidate: value, event: rejected } = event("claim.rejected.v1");
  let calls = 0;
  await assert.rejects(appendWorkGovernanceManagerAdmissionCoordinatedV1({
    candidate: value,
    event: rejected,
    coordinator: {
      async append() {
        calls++;
        return { outcome: "appended", event: rejected, receipt: receipt(rejected) };
      }
    }
  }), isCoordinatedError("YKP-WORK-MANAGER-COORDINATED-002"));
  assert.equal(calls, 0);
});

test("fails closed on malformed candidate and coordinator failures", async () => {
  const { candidate: value, event: admission } = event();
  await assert.rejects(appendWorkGovernanceManagerAdmissionCoordinatedV1({
    candidate: { ...value, schema: "wrong" } as unknown as typeof value,
    event: admission,
    coordinator: { async append() { return { outcome: "appended", event: admission, receipt: receipt(admission) }; } }
  }), isCoordinatedError("YKP-WORK-MANAGER-COORDINATED-001"));
  await assert.rejects(appendWorkGovernanceManagerAdmissionCoordinatedV1({
    candidate: value,
    event: admission,
    coordinator: { async append() { throw new Error("simulated unavailable coordinator"); } }
  }), isCoordinatedError("YKP-WORK-MANAGER-COORDINATED-001"));
});

test("does not expose task body or acceptance text in the coordinated result", async () => {
  const { candidate: value, event: admission } = event();
  const output = await appendWorkGovernanceManagerAdmissionCoordinatedV1({
    candidate: value,
    event: admission,
    coordinator: { async append(_command, received) { return { outcome: "appended", event: received, receipt: receipt(received) }; } }
  });
  const encoded = JSON.stringify(output);
  assert.equal(encoded.includes("Build the synthetic service slice"), false);
  assert.equal(encoded.includes("Unit tests pass"), false);
  assert.equal(encoded.includes("No live provider"), false);
});
