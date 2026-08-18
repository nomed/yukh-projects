# Current context

**Status:** work-governance event log, command receipts, projector foundation,
durable projector consumer, and bounded activation runner are authoritative on
`main`
**Project:** Yukh Projects
**Visibility:** public

## Objective

Implement the accepted work-governance persistence contract incrementally,
without granting runtime authority or coupling canonical state to a provider.

## Now

- PR #171 is authoritative on `main` at `805c090`: commands have durable,
  fail-closed JetStream KV receipts with CAS reservation, replay, and
  completion-unknown recovery.
- PR #173 is authoritative on `main` at `674249b`: strict work-item
  projections and projector checkpoints, bind-only KV ports, digest-bound
  deterministic reducer sets, global stream ordering, CAS, and crash replay.
- PR #175 is authoritative on `main` at `f38ad8f`: the first durable
  pull-consumer runtime feeds the work-item projector and acknowledges only
  after projector application completes.
- PR #177 is authoritative on `main` at `916aaa7`: the first bounded activation
  runner drives the durable projector consumer and returns a redacted runtime
  status record.
- PR #179 is authoritative on `main` at `9e70b73`: the first synthetic manager
  activation plan declares roles, model capabilities, budgets, and evidence
  before execution.
- PR #181 is authoritative on `main` at `0c302fe`: the first synthetic manager
  admission preview returns deterministic admit or reject decisions without
  appending events.
- [#182](https://github.com/nomed/yukh-projects/issues/182) governs the first
  manager admission command candidate.
- The projector explicitly observes catalogued events for other aggregate
  views, projects only supported work-item events, and stops on unknown or
  unsupported work-item event types.
- Unit qualification covers malformed state, sequence gaps, broken aggregate
  chains, stale epochs, unsafe reducers, conflicts, deterministic rebuild, and
  the projection-before-checkpoint crash boundary.
- Local NATS 2.12 JetStream qualification covers real file-backed buckets,
  interleaved aggregate appends, injected checkpoint failure, recovery, and
  replay.

## Next

1. Implement a deterministic command candidate for an admitted manager preview.
2. Keep event append, receipt reservation, model invocation, live claims,
   provider adapters, provisioning, release, deployment, and control-plane UI
   outside this increment.
3. Use the command candidate as the next review boundary before appending a
   real `claim.admitted.v1` event.

## Invariants

- The append-only work-event stream remains authoritative; KV is rebuildable.
- Projection writes precede checkpoint writes. Replay repairs the crash window.
- Projector bucket binding is fail closed and never provisions infrastructure.
- Unknown event types, unsupported work-item reducers, sequence gaps, epoch
  mismatches, malformed values, and divergent CAS winners stop processing.
- Projection keys are opaque hashes and projection state is canonical and
  digest-bound.
- Durable consumer acknowledgement occurs only after projector application
  returns, and activation budget exhaustion stops processing without widening
  authority.
- Manager activation plans are declarations only: role, model capability,
  skills, evidence, and budgets do not launch an agent, admit a claim, or call
  a provider.
- Manager admission preview may derive candidate claim and lease identifiers,
  but it does not append events or grant authority.
- Manager admission command candidates are inspectable command envelopes only:
  they do not reserve receipts, append events, launch agents, or create live
  claims.
- The v1 reducer registry is internal and fixed; projection and checkpoint
  records bind its computed implementation digest. Callers cannot inject
  closure state or alternate helpers, and a code change requires rebuild.
- No provider identifier, credential, private context, mutation authority, or
  live external effect enters the persistence record.

## Still-authoritative reviewed boundaries

- Dry-run requires read permissions or read access. A credential with write permissions
  remains eligible, but it MUST NOT gain effect authority: there
  is no mutation transport, apply host, approval, or controlled-apply authority
  on that path.
- No live apply is authorized. The bridge/wrapper implementation candidate is author-remediated after a security block and awaits
  distinct normal review plus fresh security review.
- The MCP compound approval bridge and wrapper v1 is Accepted under #150 after independent review of PR #152.
  The conflict rule resolves the cross-record mismatch in favor of the
  already-Accepted Projects `add_dependency` Effect B.
- #154 provides `runMcpEffectBControlledApplyV1`. The Class B-X author record for #154 grants no review, acceptance,
  merge, provider, credential, live-effect, deployment, activation, or release
  authority.
