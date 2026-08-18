import assert from "node:assert/strict";
import test from "node:test";
import {
  WorkGovernanceEventError,
  WorkGovernanceManagerAdmissionInMemoryAppendError,
  appendWorkGovernanceManagerAdmissionInMemoryV1,
  createInMemoryWorkGovernanceEventStoreV1,
  createWorkGovernanceManagerAdmissionCommandCandidateV1,
  previewWorkGovernanceManagerAdmissionV1,
  type WorkGovernanceManagerActivationPlanV1
} from "../src/index.js";

const digest = `sha-256:${"a".repeat(64)}`;
const evidence = [{ kind: "decision", uri: "urn:example:evidence:admission", digest }];
const policy = { version: "policy-v1", digest };

function plan(): WorkGovernanceManagerActivationPlanV1 {
  return {
    schema: "yukh-projects-manager-activation-plan-v1",
    plan_id: "01900000-0000-7000-8000-000000000040",
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

function candidate(expectedRevision = 0) {
  return createWorkGovernanceManagerAdmissionCommandCandidateV1({
    preview: previewWorkGovernanceManagerAdmissionV1(plan()),
    command_id: "01900000-0000-7000-8000-000000000050",
    storage_epoch: 3,
    namespace_admission_id: "admission:example",
    expected_revision: expectedRevision,
    policy,
    correlation_id: "01900000-0000-7000-8000-000000000051",
    causation_id: "01900000-0000-7000-8000-000000000052"
  });
}

function store() {
  let index = 0;
  const ids = [
    "01900000-0000-7000-8000-000000000060",
    "01900000-0000-7000-8000-000000000061"
  ];
  return createInMemoryWorkGovernanceEventStoreV1({
    storageEpoch: 3,
    eventId: () => ids[index++]!,
    occurredAt: () => `2026-08-18T02:30:0${index}.000Z`
  });
}

function isAppendError(code: string) {
  return (error: unknown) => error instanceof WorkGovernanceManagerAdmissionInMemoryAppendError &&
    error.code === code &&
    error.message === "work-governance manager admission in-memory append operation failed";
}

test("appends claim.admitted.v1 in memory and returns a redacted summary", () => {
  const events = store();
  const output = appendWorkGovernanceManagerAdmissionInMemoryV1({
    candidate: candidate(),
    store: events,
    evidence
  });
  assert.equal(output.schema, "yukh-projects-manager-admission-inmemory-append-v1");
  assert.equal(output.outcome, "appended");
  assert.equal(output.event_id, "01900000-0000-7000-8000-000000000060");
  assert.match(output.event_digest, /^sha-256:[0-9a-f]{64}$/u);
  assert.equal(output.aggregate_revision, 1);
  assert.equal(output.candidate_summary.aggregate_id, "admission:example");

  const stored = events.events("namespace:example", "namespace_admission", "admission:example");
  assert.equal(stored.length, 1);
  assert.equal(stored[0]!.type, "claim.admitted.v1");
  assert.equal(stored[0]!.data.claim_id, output.candidate_summary.claim_id);
});

test("replays identical command candidates idempotently", () => {
  const events = store();
  const input = { candidate: candidate(), store: events, evidence };
  const first = appendWorkGovernanceManagerAdmissionInMemoryV1(input);
  const second = appendWorkGovernanceManagerAdmissionInMemoryV1(input);
  assert.equal(first.outcome, "appended");
  assert.equal(second.outcome, "replayed");
  assert.equal(second.event_id, first.event_id);
  assert.equal(second.event_digest, first.event_digest);
});

test("fails closed on stale expected revision and malformed candidates", () => {
  assert.throws(() => appendWorkGovernanceManagerAdmissionInMemoryV1({
    candidate: candidate(1),
    store: store(),
    evidence
  }), isAppendError("YKP-WORK-MANAGER-APPEND-002"));
  assert.throws(() => appendWorkGovernanceManagerAdmissionInMemoryV1({
    candidate: { ...candidate(), schema: "wrong" } as unknown as ReturnType<typeof candidate>,
    store: store(),
    evidence
  }), isAppendError("YKP-WORK-MANAGER-APPEND-001"));
});

test("rejects unsafe evidence before appending", () => {
  const events = store();
  assert.throws(() => appendWorkGovernanceManagerAdmissionInMemoryV1({
    candidate: candidate(),
    store: events,
    evidence: [{ kind: "decision", uri: "https://example.com/evidence", digest }]
  }), isAppendError("YKP-WORK-MANAGER-APPEND-001"));
  assert.equal(events.events("namespace:example", "namespace_admission", "admission:example").length, 0);
});

test("does not expose task body or acceptance text in result summary", () => {
  const output = appendWorkGovernanceManagerAdmissionInMemoryV1({
    candidate: candidate(),
    store: store(),
    evidence
  });
  const encoded = JSON.stringify(output);
  assert.equal(encoded.includes("Build the synthetic service slice"), false);
  assert.equal(encoded.includes("Unit tests pass"), false);
  assert.equal(encoded.includes("No live provider"), false);
});

test("keeps underlying event-store errors typed and redacted", () => {
  assert.throws(() => {
    const events = createInMemoryWorkGovernanceEventStoreV1({
      storageEpoch: 4,
      eventId: () => "01900000-0000-7000-8000-000000000070",
      occurredAt: () => "2026-08-18T02:30:00.000Z"
    });
    appendWorkGovernanceManagerAdmissionInMemoryV1({
      candidate: candidate(),
      store: events,
      evidence
    });
  }, (error: unknown) => error instanceof WorkGovernanceManagerAdmissionInMemoryAppendError &&
    error.code === "YKP-WORK-MANAGER-APPEND-002");
  assert.equal(new WorkGovernanceEventError("YKP-WORK-002").message, "work-governance event operation failed");
});
