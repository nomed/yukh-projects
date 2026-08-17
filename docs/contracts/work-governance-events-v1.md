# Work-governance events and JetStream persistence v1 — proposed specification

- **Status:** Accepted
- **Accepted:** 2026-08-17 by `@nomed`
- **Proposed:** 2026-08-17
- **Governing issue:** [#164](https://github.com/nomed/yukh-projects/issues/164)
- **Implements:** [ADR 0004](../adr/0004-work-claims-governance.md)

## Objective

Define the durable, provider-neutral boundary for projects, runs, work graphs,
roadmaps, claims, leases, budgets, and results. The event stream is the source
of truth. JetStream KV contains disposable projections only.

This contract adds no runtime, live NATS resources, credentials, provider
mutation, MCP tool, CLI command, release, or migration authority.

## Domain boundary

The initial namespace contains these aggregates:

| Aggregate kind | Scope | Purpose |
| --- | --- | --- |
| `project` | one project | policy binding and project lifecycle |
| `run` | one run | bounded execution context |
| `work_item` | one item | content, workflow, priority, and result references |
| `namespace_graph` | one governed namespace | hierarchy and dependency edges |
| `project_roadmap` | one project | epic placement, commitment, confidence, and outcomes |
| `namespace_admission` | one governed namespace | claims, leases, grants, reservations, and usage |
| `external_mapping` | one mapping | opaque adapter handle and reconciliation state |

One graph aggregate per namespace serializes relationship changes, including
cross-project edges. One admission aggregate per namespace serializes
overlapping claims and budget reservations. This is deliberately conservative:
sharding requires a later contract proving equivalent cycle, overlap, and
budget correctness.

Coordination transports questions, answers, presence, and evidence references.
It does not own these aggregates and a Coordination message grants no work or
mutation authority.

## Identifiers and subjects

Namespace, project, run, work-item, claim, lease, and mapping identifiers are
opaque, stable strings. They must not embed a consumer, provider, repository,
user, hostname, URL, or other private context.

The authoritative stream is `YKP_WORK_EVENTS_V1`. Events use subjects of the
form:

```text
ykp.v1.events.<partition-token>
```

`partition-token` is lower-case, unpadded base32 of the first 160 bits of
SHA-256 over the UTF-8 string
`<namespace-id>\n<aggregate-kind>\n<aggregate-id>`. A trusted server derives the
subject. Callers cannot provide a subject or JetStream concurrency header.

## Command envelope

Every accepted mutation starts with this bounded envelope:

```json
{
  "schema": "yukh-projects-command-v1",
  "command_id": "019...",
  "storage_epoch": 1,
  "namespace_id": "namespace:example",
  "project_id": "project:example",
  "run_id": "run:example",
  "aggregate": { "kind": "work_item", "id": "work-item:example", "expected_revision": 4 },
  "actor": { "subject_id": "subject:example", "claim_id": "claim:example", "lease_id": "lease:example" },
  "policy": { "version": "policy-v1", "digest": "sha-256:..." },
  "correlation_id": "019...",
  "causation_id": "019...",
  "data": {}
}
```

- IDs use UUIDv7 where Yukh creates them; imported stable IDs remain opaque.
- `command_id` is the idempotency key. A retry preserves the complete command,
  including its expected revision.
- A new aggregate requires `expected_revision: 0`.
- `project_id`, `run_id`, claim, and lease are omitted only when the command's
  semantics do not require them.
- `storage_epoch` binds the command to the current recovered stream epoch.
- `data` is command-specific, schema-validated, and size-bounded before policy
  evaluation.
- A stale revision, epoch, policy, claim, lease, observation, or ambiguous scope
  fails closed without an event.

The command receipt store records the terminal result for a `command_id`.
Reusing an ID with different canonical command bytes is rejected.

## Event envelope and integrity

An admitted command appends an immutable event:

```json
{
  "schema": "yukh-projects-event-v1",
  "specversion": "1.0",
  "event_id": "019...",
  "type": "work_item.workflow_transitioned.v1",
  "occurred_at": "2026-08-17T12:00:00.000Z",
  "storage_epoch": 1,
  "namespace_id": "namespace:example",
  "project_id": "project:example",
  "run_id": "run:example",
  "aggregate": { "kind": "work_item", "id": "work-item:example", "revision": 5 },
  "previous": { "event_id": "019...", "digest": "sha-256:..." },
  "command": { "id": "019...", "expected_revision": 4 },
  "actor": { "subject_id": "subject:example", "claim_id": "claim:example", "lease_id": "lease:example" },
  "policy": { "version": "policy-v1", "digest": "sha-256:..." },
  "correlation_id": "019...",
  "causation_id": "019...",
  "evidence": [{ "kind": "verification", "uri": "urn:example:evidence:1", "digest": "sha-256:..." }],
  "data": {},
  "event_digest": "sha-256:..."
}
```

The first event omits `previous`. `revision` increases by exactly one. The
event digest is SHA-256 over RFC 8785 canonical JSON with `event_digest`
omitted. Events are at most 64 KiB after UTF-8 encoding.

Evidence contains immutable references and digests, never raw prompts,
transcripts, provider payloads, credentials, approval material, or private
observations. Event types and payloads use synthetic, consumer-neutral terms.
An external mapping stores an adapter-issued opaque handle. Resolution to a raw
provider identifier remains inside the consumer-owned adapter boundary.

## Optimistic concurrency and idempotency

The trusted append path translates the expected aggregate revision into the
exact expected last subject sequence. It appends only if both still match.
`Nats-Msg-Id` equals `event_id`, but correctness does not depend on the broker's
finite duplicate window.

On timeout or ambiguous acknowledgement, the handler resolves `command_id`
against command receipts and the authoritative stream before retrying. It must
not mint another event ID or advance the expected revision until the previous
outcome is known.

Cross-aggregate operations are explicit sagas, not hidden transactions. Each
step references the exact revisions it observed. Failure does not imply an
automatic compensating mutation; policy must admit a separate command.

## Atomic admission

`claim.admitted.v1` is the only event that activates a claim. Its single
payload binds:

- the claim and subject;
- work-item and exact work scope;
- lease issue time, expiry, and renewal boundary;
- work, resource, budget, and mutation grants;
- reserved token, time, provider-request, and monetary limits;
- compatibility and overlap decision;
- policy version, digest, decision, and bounded reason.

The event is appended to `namespace_admission`. There is no intermediate
durable state in which a lease exists without its budget reservation, or a
budget is reserved without its grants. A KV write, manager instruction,
assignment, model invocation, or external tracker change never grants
authority.

Lease renewal, revocation, expiry, and budget usage are later events on the
same admission aggregate. Effective authority is derived from the latest
verified admission state and current server time. TTL expiry in KV is not an
authority decision.

## Initial event catalog

| Event | Aggregate | Meaning |
| --- | --- | --- |
| `project.created.v1` | `project` | establish a project |
| `project.policy_bound.v1` | `project` | bind a reviewed policy |
| `run.created.v1`, `run.closed.v1` | `run` | open or close an execution context |
| `work_item.created.v1` | `work_item` | create canonical work |
| `work_item.content_updated.v1` | `work_item` | change bounded intent or acceptance data |
| `work_item.workflow_transitioned.v1` | `work_item` | pass an allowed DoR/DoD transition |
| `work_item.priority_evaluated.v1` | `work_item` | record deterministic effective priority |
| `graph.relationship_added.v1` | `namespace_graph` | add hierarchy or dependency edge |
| `graph.relationship_removed.v1` | `namespace_graph` | remove an edge |
| `graph.waiver_recorded.v1` | `namespace_graph` | record bounded blocking waiver |
| `roadmap.epic_placed.v1`, `roadmap.epic_moved.v1` | `project_roadmap` | place an epic in Now, Next, or Later |
| `roadmap.commitment_changed.v1` | `project_roadmap` | change commitment or target window |
| `roadmap.confidence_changed.v1` | `project_roadmap` | change confidence with evidence |
| `roadmap.health_override_recorded.v1` | `project_roadmap` | add a reasoned, expiring override |
| `roadmap.outcome_observed.v1` | `project_roadmap` | record measured outcome evidence |
| `claim.requested.v1` | `namespace_admission` | record a bounded request without authority |
| `claim.admitted.v1`, `claim.rejected.v1` | `namespace_admission` | admit atomically or reject without authority |
| `lease.renewed.v1`, `lease.revoked.v1`, `lease.expired.v1` | `namespace_admission` | change lease validity |
| `budget.usage_recorded.v1` | `namespace_admission` | reconcile measured usage |
| `result.recorded.v1` | `work_item` | attach a governed result or handoff |
| `external_mapping.created.v1` | `external_mapping` | bind a canonical item to an adapter identity |
| `external_mapping.observation_recorded.v1` | `external_mapping` | retain a redacted provider observation digest |
| `external_mapping.reconciled.v1` | `external_mapping` | record synchronized fields and revisions |
| `external_mapping.conflict_detected.v1` | `external_mapping` | record an authority or value conflict |

Event names are semantic and versioned. A semantic change requires a new event
version; consumers must not reinterpret stored events.

## Graph, workflow, and roadmap rules

All relationship changes use the expected `namespace_graph` revision. The
handler validates both endpoints, same-namespace policy, mutation grant,
hierarchy uniqueness, and bounded cycle detection before append. An unavailable
endpoint remains unresolved and blocking; absence is not satisfaction.

Workflow transitions reference the exact work-item, graph, policy, and
admission revisions used by their guards. Entering `ready` or `done` records
the satisfied DoR or DoD evidence. Claim admission changes workflow only when
the workflow policy explicitly couples the two operations.

Roadmap events reference canonical epic IDs. Roadmap priority remains separate
from effective execution priority. Critical-path output includes its policy,
input graph revision, estimates, and an `incomplete` marker whenever required
evidence is missing.

## JetStream policy

`YKP_WORK_EVENTS_V1` uses file storage. A local single-node profile uses one
replica; a distributed profile uses at least three. The stream must not evict
authoritative history by age, message count, byte limit, roll-up, or consumer
acknowledgement. Capacity exhaustion rejects new appends rather than discarding
old events.

Purge, delete, subject rewrite, and stream replacement are unavailable to the
application identity. They require a separately governed recovery procedure.

Projectors use durable pull consumers, explicit acknowledgement, and
at-least-once delivery. A schema, digest, sequence, or projection conflict
stops the projector. Unknown event types are not skipped.

## KV projections

The initial file-backed buckets are:

- `YKP_PROJECTS_V1`
- `YKP_RUNS_V1`
- `YKP_WORK_ITEMS_V1`
- `YKP_WORK_GRAPHS_V1`
- `YKP_ROADMAPS_V1`
- `YKP_ADMISSIONS_V1`
- `YKP_RESULTS_V1`
- `YKP_EXTERNAL_MAPPINGS_V1`
- `YKP_INDEXES_V1`
- `YKP_PROJECTOR_CHECKPOINTS_V1`
- `YKP_COMMAND_RECEIPTS_V1`

Buckets use the stream's replication profile, one retained value per key, no
authority-bearing TTL, and compare-and-set updates. A projection value has this
common shape:

```json
{
  "schema": "yukh-projects-projection-v1",
  "aggregate": { "kind": "work_item", "id": "work-item:example", "revision": 5 },
  "last_event_id": "019...",
  "last_event_digest": "sha-256:...",
  "stream_sequence": 42,
  "state_digest": "sha-256:...",
  "updated_at": "2026-08-17T12:00:01.000Z",
  "state": {}
}
```

The projector advances its checkpoint only after every projection for an event
is durable. Reprocessing the same event is idempotent. A crash between writes
is repaired by replay. Readers receive the projection sequence and observed
stream high-water mark; admission refuses a stale projection and catches up
from the stream before deciding.

KV is never backed up as the sole record and may be deleted and rebuilt from
the event stream.

## Recovery and verification

Backup protects the authoritative stream configuration, messages, and storage
metadata. Restore freezes commands, restores into a new `storage_epoch`, and
replays all aggregates while verifying revision continuity, previous-event
links, event digests, and projection state digests.

Command admission resumes only after projectors reach the verified stream
high-water mark. Commands from an earlier epoch are stale and cannot be
silently retried. A missing event, broken chain, unknown schema, or mismatched
digest keeps the namespace unavailable.

An append receipt exposes only event ID, event digest, aggregate revision,
accepted time, storage epoch, and a bounded projection-lag indicator. It does
not expose credentials, private subjects, raw broker metadata, or consumer
configuration.

## Compatibility and implementation gate

Readers may ignore unknown optional fields only when the event version defines
them as additive. They must stop on an unknown schema, event type, required
field, enum value, or incompatible semantic version.

Implementation requires a separate governing issue and reviewed increment
covering event codecs, append concurrency, idempotency, projection replay,
atomic claim admission, capacity failure, poison events, recovery, redaction,
and synthetic cross-project graph cases. Acceptance of this specification does
not authorize that implementation or any live resource.
