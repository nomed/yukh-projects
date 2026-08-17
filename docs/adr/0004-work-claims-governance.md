# ADR 0004: Work claims as the governance core

- **Status:** Proposed
- **Date:** 2026-08-17
- **Governing issue:** [#162](https://github.com/nomed/yukh-projects/issues/162)

## Context

Yukh needs to organize work performed by people and agents across projects,
runs, repositories, runtime nodes, and external trackers. A work item alone
records intent but does not establish who may act, which resources they may
affect, how long that authority lasts, or what budget they may consume.

Without an explicit ownership protocol, two workers may act on the same scope,
an abandoned worker may retain implicit ownership, and a manager may confuse a
message or assignment with authorization to mutate provider state.

Yukh Projects currently reconciles reviewed policy with GitHub Projects. Its
future provider-neutral role requires a domain model that can govern work
independently of GitHub, Jira, or any other tracker while preserving the
existing separation between observation, planning, approval, and controlled
mutation.

## Decision

### 1. Govern work through `WorkItem -> Claim -> Lease -> Result`

- A **WorkItem** describes a desired outcome, constraints, acceptance criteria,
  estimated cost, workflow, and relationships. Its policy-defined kind may be
  an epic, story, task, bug, milestone, or another consumer-neutral type. It
  grants no authority.
- A **Claim** is a policy-evaluated request assigning a work item and an exact
  work scope to a subject. A claim records requested capabilities and budget
  but is not active until admitted.
- A **Lease** is the time-bounded, revocable authority created by admitting a
  claim. It binds the subject, work item, scope, capabilities, budget
  reservation, policy version, and expiry.
- A **Result** closes or hands off leased work with redacted evidence such as
  status, artifact references, verification outcomes, budget usage, and
  remaining work.

Assignment, a Coordination message, possession of a work-item identifier, or
model invocation never substitutes for an admitted lease.

### 2. Model hierarchy and dependencies as a work graph

Each work item may have at most one structural parent within a run and any
number of children. Parent-child edges express decomposition: a task may be
part of a story, and a story may be part of an epic. The structural hierarchy
must be acyclic.

Dependencies are separate, typed, many-to-many edges. The initial semantic
types are `depends_on`, `blocks`, `relates_to`, and `duplicates`; adapters may
map provider-specific relationships only when their semantics are compatible.
The dependency graph used for admission must be acyclic for blocking edge
types. A parent does not imply a dependency, and a dependency does not imply
containment.

Work-item kinds are policy-defined rather than hard-coded to one tracker.
Kinds declare whether an item is executable, aggregating, or both. Execution
claims normally target executable items. A manager may hold a planning claim
on an epic or other aggregate, but that lease grants no implicit authority over
its children.

Progress, cost, and completion may roll up from children according to a
versioned policy. A roll-up is a derived view and cannot silently transition an
aggregate to done, consume a child budget, or grant a claim.

### 3. Govern workflow, Definition of Ready, and Definition of Done

Every work item follows a versioned workflow selected by project policy and
work-item kind. The initial canonical semantic states are `proposed`,
`backlog`, `ready`, `in_progress`, `blocked`, `review`, `done`, and `cancelled`.
Projects may define additional presentation states, but every state maps to one
canonical semantic state so scheduling and adapters remain predictable.

Entering `ready` requires the workflow's Definition of Ready (DoR). A DoR may
require bounded scope, acceptance criteria, dependency satisfaction or an
explicit waiver, required role and capability declarations, a cost estimate,
available budget, and identified verification. The transition records the
policy version and evidence; a label or provider status alone cannot satisfy
the gate.

Entering `done` requires the workflow's Definition of Done (DoD). A DoD may
require accepted results, immutable artifact references, required tests,
review, reconciled budget usage, released leases, and completion or governed
handover of children. An agent answer or commit alone never marks an item done.

Transitions are commands evaluated against an allowlist, role and capability
policy, expected work-item revision, DoR or DoD guards, and dependency state.
Rejected transitions produce a bounded reason without changing state. A
durable workflow event is the only authoritative transition.

Workflow state and execution authority remain separate. Admission may move a
`ready` item to `in_progress` only when its workflow explicitly binds that
transition to `ClaimAdmitted`. Lease expiry or revocation never produces
`done`; policy may move the item to `blocked` or back to `ready` through a new
event. Removing a blocker likewise does not bypass the DoR gate.

### 4. Separate work, resource, budget, and mutation authority

One admitted claim may bind several independently inspectable grants:

- a **work grant** permits progress on the work item;
- a **resource grant** reserves an exact repository, branch, component, file
  set, environment, or other logical scope;
- a **budget grant** reserves bounded tokens, elapsed time, provider requests,
  and monetary cost where available;
- a **mutation grant** permits an explicit effect such as writing files,
  committing, pushing, opening a pull request, changing a tracker, deploying,
  or modifying provider state.

Read-only analysis does not imply mutation authority. A provider mutation that
already requires a separate approved plan continues to require it; a work lease
cannot weaken or replace controlled-apply approval.

### 5. Make compatibility explicit

Claims declare a compatibility mode:

- `shared-read` may coexist with other readers;
- `partitioned-write` may coexist only with disjoint, policy-verifiable scopes;
- `exclusive-write` excludes overlapping write leases;
- `observer` receives events and evidence but no work or mutation authority.

Admission fails closed when scope overlap is ambiguous. Repository, branch, and
path matching must use canonical provider-neutral identifiers supplied by a
trusted adapter; untrusted free-form labels cannot establish disjointness.

### 6. Derive scheduling priority from policy

A work item may carry an owner-provided priority, but effective admission order
is a deterministic policy result that can consider:

- urgency and deadline;
- value, severity, and risk;
- dependency-unblocking impact;
- expected token, time, provider, and monetary cost;
- available budget and runtime capacity;
- required role, model, skill, tool, and permission fit;
- starvation age and an explicit owner override.

The decision records the policy version and a bounded, redacted reason set.
Agents may recommend priority changes but cannot raise their own effective
priority or budget. Priority does not bypass approval, compatibility, or safety
checks.

### 7. Use bounded leases and governed handover

Every active lease has a maximum lifetime, renewal policy, heartbeat deadline,
and cancellation path. Renewal requires fresh liveness, unchanged bindings,
remaining budget, and continued policy admission.

Loss of heartbeat expires the lease without declaring the work item complete.
Preemption is allowed only by explicit policy and produces a result or handover
record preserving useful artifacts and remaining work. Authority transfers by
admitting a new claim; lease identifiers and mutation authority are never
reused by the successor.

Rate deferral follows ADR 0003. A lease may survive deferral only when a durable
wakeup and the accepted ownership conditions exist; otherwise Yukh records a
governed handover.

### 8. Treat results and artifacts as evidence, not success claims

A result distinguishes `completed`, `partial`, `blocked`, `cancelled`,
`preempted`, and `failed`. Completion requires work-item acceptance evidence,
not only an agent answer. Artifact references bind immutable identifiers or
digests where available. Raw repository contents, prompts, transcripts,
credentials, provider responses, and private operational traces are not copied
into the public governance record.

The agent that produces an artifact should normally create its commit and
identify that authorship. Review, merge, release, and deployment remain
separate capabilities and may require different subjects or approvals.

### 9. Use a JetStream-native persistence profile first

Yukh Projects owns the authoritative state of projects, runs, work items,
relationships, workflows, claims, leases, budgets, results, and external
mappings. Its initial persistence profile uses a dedicated JetStream stream as
an append-only domain event log. An admitted domain event is the authoritative
state transition.

Dedicated JetStream KV buckets hold rebuildable materialized views for current
projects, runs, work items, relationships, workflows, claims, leases, budgets,
results, external mappings, and query indexes. KV revisions and compare-and-set
protect single-key updates. Watchers drive application-level notifications for
the Control Plane and other read consumers; those consumers do not receive
direct storage authority. KV history is not the audit log, and loss of a
projection must be recoverable by replaying the authoritative stream.

JetStream does not provide a general transaction across multiple keys. A claim
and its budget reservation therefore become authoritative through one admitted
event, not a sequence of independent KV writes. Commands for the same governed
aggregate are serialized and use expected sequence checks. Only the durable
`ClaimAdmitted` event grants authority; incomplete or stale projections never
do. Projection updates are idempotent and record the event sequence they have
applied.

Every command and event uses stable identifiers, idempotency keys, aggregate
revisions, canonical payloads, and bounded redacted metadata. Duplicate command
delivery or event replay must not duplicate claims, leases, budget
reservations, results, or mutations. A failure after event persistence but
before projection update is repaired by replay. A failure before event
persistence grants no authority.

Lease values carry an explicit policy-bound expiry. KV TTL may remove expired
materialized entries, but deletion is cleanup rather than the authority clock;
every admission, renewal, and mutation checks the authoritative expiry and
revision. Heartbeats cannot silently extend a lease.

Yukh Coordination carries agent messages, notifications, heartbeats,
handovers, and result announcements. Yukh Projects uses the same NATS
JetStream infrastructure through its own storage adapter, isolated streams,
buckets, subjects, and permissions. It does not read or write Coordination's
internal subjects or storage layouts. Managers, agents, Coordination adapters,
and the Control Plane access Projects through its versioned application API or
SDK.

SQLite and PostgreSQL remain optional future storage or reporting profiles.
Adding either requires a separate compatibility, migration, consistency,
backup, and recovery contract; neither is required by the first implementation.

### 10. Keep trackers behind adapters

GitHub Issues, GitHub Projects, Jira, Linear, and similar systems are external
views and integration targets. Adapters may import, link, and reconcile their
records with Yukh work items and artifacts, but provider identifiers do not
define the core model. Parent, child, dependency, workflow, and work-item-kind
mappings must preserve their canonical semantics or fail closed.

Interactive governance must not depend on GitHub Actions. Actions remain valid
for CI, deployment, policy verification, scheduled reconciliation, and
external-event ingestion. Managers, agents, the CLI, and the Control Plane use
the same Yukh Projects application API; MCP tools expose that API rather than
reimplementing governance.

### 11. Keep skills separate from enforcement

Skills explain how managers and workers should request claims, report progress,
preserve evidence, and hand work over. They improve agent behavior but are not
an authorization boundary. Every rule affecting authority, priority,
compatibility, budget, or mutation is enforced by Yukh Projects even when a
caller does not load a skill.

## Minimum state model

The first implementation contract must define at least:

- `Project`, `Run`, `WorkItem`, policy-defined kind, parent, and typed
  dependency edges;
- versioned workflow, canonical state, transition rules, DoR, DoD, and roll-up
  policy;
- `Subject`, `Role`, and runtime placement;
- `Claim`, requested scope, capabilities, and budget;
- `Lease`, heartbeat, renewal, expiry, revocation, and handover;
- `BudgetReservation` and immutable usage entries;
- `Result`, `ArtifactReference`, and verification evidence;
- `ExternalMapping` for provider adapters;
- `PolicyDecision` with policy version and redacted reasons;
- a versioned domain event envelope and aggregate revision;
- projection checkpoints and deterministic rebuild metadata.

Every transition is validated server-side. Invalid, stale, conflicting,
over-budget, or unauthorized transitions fail closed.

## Consequences

- Yukh Projects becomes the work-governance domain rather than a GitHub
  Projects-specific automation surface.
- Managers can create teams dynamically while workers receive bounded,
  inspectable authority instead of implicit permission from prompts.
- The Control Plane can explain who is working, on what scope, under which
  policy, with what budget, and what evidence has been produced.
- JetStream provides the initial durable event log and current-state
  projections, avoiding an additional database in the first deployment.
- Coordination and Projects share infrastructure but retain separate APIs,
  streams, permissions, schemas, and ownership boundaries.
- Query views are explicitly materialized and rebuildable; arbitrary relational
  queries may require a later reporting projection or SQL profile.
- Existing GitHub reconciliation remains useful as the first adapter but must
  gradually move behind provider-neutral application ports.
- Storage schemas, scheduling policy, MCP operations, adapter contracts, and
  migration from the current Action/CLI surfaces require separate reviewed
  increments.

## Rejected alternatives

- **Work-item status alone:** cannot express authority, overlap, expiry, budget,
  or handover.
- **Coordination messages as claims:** delivery proves communication, not policy
  admission or durable authority.
- **KV as the authoritative store:** KV lacks multi-key transactions and its
  bounded per-key history is not a complete domain audit log.
- **SQL required in the initial profile:** adds another operational dependency
  before Yukh has demonstrated queries that JetStream projections cannot serve.
- **Coordination subjects reused for Projects persistence:** couples separate
  contracts, permissions, retention, and recovery boundaries.
- **Tracker records as the source of truth:** couples Yukh semantics and
  availability to one provider.
- **Skills as enforcement:** callers and GitHub Actions may not load them, and
  instructions cannot provide an authorization boundary.
- **Permanent ownership:** abandoned or unavailable agents would block work and
  retain stale authority.

## Follow-up work

1. Review and accept or revise this domain boundary under a governing issue.
2. Define versioned work-item graph, workflow, DoR, DoD, roll-up, priority,
   compatibility, and budget contracts using synthetic fixtures.
3. Specify the JetStream event envelope, aggregate partitioning, expected
   sequence admission, KV buckets, projection rebuild, backup, and recovery.
4. Expose a minimal application API through CLI and Yukh MCP.
5. Move current GitHub reconciliation behind the first external adapter without
   changing its existing safety guarantees.
6. Add a SQL profile only after measured query or deployment requirements
   justify it.
