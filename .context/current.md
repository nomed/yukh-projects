# Current context

**Status:** work-governance event log and command receipts are authoritative on
`main`; the first work-item projector foundation is under review
**Project:** Yukh Projects
**Visibility:** public

## Objective

Implement the accepted work-governance persistence contract incrementally,
without granting runtime authority or coupling canonical state to a provider.

## Now

- PR #171 is authoritative on `main` at `805c090`: commands have durable,
  fail-closed JetStream KV receipts with CAS reservation, replay, and
  completion-unknown recovery.
- [#172](https://github.com/nomed/yukh-projects/issues/172) governs the first
  projector foundation: strict work-item projections and projector checkpoints,
  bind-only KV ports, deterministic reducers, global stream ordering, CAS, and
  crash replay.
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

1. Obtain independent review of the #172 implementation candidate.
2. After merge, implement the durable pull-consumer runtime that feeds this
   projector and acknowledges only after its checkpoint is durable.
3. Keep admission, command handling, provider adapters, provisioning,
   activation, release, and deployment outside this increment.

## Invariants

- The append-only work-event stream remains authoritative; KV is rebuildable.
- Projection writes precede checkpoint writes. Replay repairs the crash window.
- Projector bucket binding is fail closed and never provisions infrastructure.
- Unknown event types, unsupported work-item reducers, sequence gaps, epoch
  mismatches, malformed values, and divergent CAS winners stop processing.
- Projection keys are opaque hashes and projection state is canonical and
  digest-bound.
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
