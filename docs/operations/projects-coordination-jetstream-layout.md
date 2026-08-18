# Projects, Coordination, and JetStream layout

## Short answer

Yes: Yukh Projects uses NATS JetStream in the first work-governance
persistence profile.

It does not use the Coordination transcript as its database. Projects and
Coordination may share one physical NATS JetStream runtime in an environment,
but they must keep separate streams, buckets, subjects, credentials,
permissions, schemas, APIs, and ownership.

## Runtime responsibilities

| Runtime | Owns | JetStream usage | Public boundary |
| --- | --- | --- | --- |
| `yukh-projects` | work items, epics, dependency graph, workflow state, claims, leases, budgets, results, provider mappings | append-only work-governance event stream plus rebuildable KV projections | Projects application API, SDK, CLI, and MCP-facing adapters |
| `yukh-coordination` | agent session messages, questions, answers, presence, replay receipts | Coordination-owned transcript stream and runtime stores | Coordination client/API/MCP tools |
| `yukh-mcp` / Control Plane | manager and worker orchestration, tool admission, model runtime accounting, UI status | should not own Projects or Coordination storage directly | MCP tools, SDK adapters, team supervisor, and UI |

## Local development layout

For local development, one Docker Compose stack may run a single NATS server
with JetStream enabled.

Keep the logical planes separate:

1. `yukh-coordination` starts the local coordinator and writes only its own
   transcript/runtime subjects.
2. `yukh-projects` connects to the same NATS URL only through its
   work-governance storage adapter. Its v1 event stream is
   `YKP_WORK_EVENTS_V1`, with subjects under `ykp.v1.events.*`.
3. `yukh-mcp` consumes a Projects handoff and starts the admitted manager or
   worker. The worker then talks through Coordination. It must not write
   directly to Projects streams or Coordination internal subjects.

This gives one easy local dependency to start, while preserving two separate
product contracts.

## Cloud or shared environment layout

Use one JetStream cluster per environment only if isolation is explicit:

- separate NATS accounts or credentials for Projects and Coordination;
- separate subject prefixes and stream/bucket names;
- no wildcard credential that lets a Projects writer publish Coordination
  transcript records, or the reverse;
- separate backup, retention, and restore checks per domain;
- separate readiness checks, because Coordination being healthy does not prove
  Projects governance is usable;
- separate API-level authorization. A valid Coordination participant is not a
  Projects claimant.

If those isolation controls are not ready, deploy separate NATS runtimes rather
than sharing one.

## End-to-end control flow

1. A user or manager asks Projects for governed work.
2. Projects validates roadmap, dependencies, workflow policy, claim scope,
   model capability, and budget.
3. Projects appends the authoritative governance event and emits a
   provider-neutral orchestration handoff.
4. `yukh-mcp` or the Control Plane consumes the handoff and starts the admitted
   manager or worker.
5. Managers and workers communicate through Coordination.
6. Results, artifacts, usage, and acceptance evidence are reported back to
   Projects through its API. Coordination messages can be evidence references,
   but they are not themselves work authority.

## Hard rules

- Do not treat a Coordination question as a Projects claim.
- Do not treat a Projects handoff as permission to publish arbitrary
  Coordination messages.
- Do not let model workers receive raw JetStream credentials.
- Do not couple stream names, retention, replay, or recovery rules across
  Projects and Coordination.
- Do not make GitHub, Jira, or another tracker the canonical owner of
  workflow, dependency, claim, lease, budget, or roadmap policy.

## Current implementation state

Projects already contains the v1 JetStream work-governance event stream and
qualification path. Coordination already contains a local preview Compose stack
with NATS JetStream and a coordinator. The suite integration point is the
manager orchestration handoff consumed by `yukh-mcp`.

Production provisioning, shared-cluster credentials, backup/restore, and remote
Control Plane deployment are not authorized by this note; they require reviewed
deployment records.
