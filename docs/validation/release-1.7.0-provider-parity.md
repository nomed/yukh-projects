# v1.7.0 legacy provider-parity qualification

- **Date:** 2026-08-06
- **Governing issue:** [#54](https://github.com/nomed/yukh-projects/issues/54)
- **Defect gate:** [#121](https://github.com/nomed/yukh-projects/issues/121)
- **Scope:** repository-owned, synthetic, read-only evidence
- **Provider access:** none
- **Apply authority:** none

## Decision

Immutable release `v1.7.0` contains the accepted owner-aware Work Type routing
fix and satisfies the producer-side shadow/controlled provider-parity gate.
This is a prerequisite for RFC-0003 minimum-vertical-slice step 8; it neither
completes that step nor authorizes a consumer dry-run or mutation.

The tag resolves directly to signed commit
`71784218366805922e5a12903eef9073f715f59f`. GitHub reports release `v1.7.0`
as immutable and publishes checksummed Action, CLI, apply, lock, SBOM, and
release-note assets.

## Repository evidence

The #121 correction merged as
`38d8c1435e932d3e0600829123e496a79621123c` and is an ancestor of `v1.7.0`.
The provider selector, legacy planner, and their parity tests are byte-unchanged
between `v1.5.1` and `v1.7.0`.

Fresh local execution at the release tag passed 14 focused synthetic tests.
The evidence covers:

- all four Project/repository owner combinations;
- repository-owner-only provider selection;
- Project `Work Type` fallback for user-owned repositories;
- native Issue Type selection for organization-owned repositories;
- identical single-issue shadow and controlled plan IDs and operation counts;
- GraphQL remaining zero on the shadow path;
- conflict, ambiguous-provider, and redacted failure paths.

The single-issue shadow and controlled path call the same
`planLegacyReconciliation` implementation. Plan IDs digest the complete
canonical internal plan, including its ordered operations. The public report
does not expose a separate operation-set digest; it does expose the deterministic
redacted `operations` array in planner order. Equal plan IDs plus exact equality
of those arrays proves parity of the publicly reviewable ordered effects, not
only equal totals. The aggregate backlog audit remains non-authoritative and
cannot be used as approval evidence.

## Exact next dry-run gate

The consumer-owned qualification must:

1. pin `v1.7.0` at
   `71784218366805922e5a12903eef9073f715f59f`;
2. use a credential with the GitHub read permissions required by the fixed
   reads; additional write permissions on an existing supplied credential MUST
   NOT invalidate qualification or grant apply authority, because the path has
   no mutation transport, apply host, approval input, or controlled-apply
   authority;
3. bind one repository, Project, issue, and the current reviewed policy revision;
4. acquire one fresh bounded REST snapshot containing repository and Project
   ownership plus the selected Work Type provider observations;
5. calculate single-issue shadow and controlled planning from that same snapshot;
6. require identical plan IDs and exactly equal redacted `operations` arrays in
   their emitted order, comparing each public operation's `type`, `logicalKey`,
   optional `desired`, `reason`, and ordered `dependsOn`, with zero diagnostics,
   zero GraphQL requests, and zero mutations;
7. publish only redacted plan bindings and aggregate request evidence in the
   consumer-owned review; and
8. discard the result on any state, policy, release, scope, credential identity
   or required-read-access, observation, or rate-budget change; excess
   permissions alone do not invalidate the result.

No fresh `v1.7.0` consumer plan ID is recorded here. Producing one requires
separately authorized access to current consumer policy and provider state,
which is outside this repository-owned qualification.

## Human approval boundary

The next approval is limited to the exact non-mutating qualification above. It
must name the release commit and bound consumer scope and must explicitly grant
no apply authority.

Only after that run may a separate human approval bind the fresh plan ID,
internal ordered operation-set digest, exact scope, environment, planner and
snapshot versions, expiry, and nonce in the accepted signed envelope. The
redacted-effect comparison above is qualification evidence only: it is not that
digest, cannot substitute for any approval claim, and grants no apply authority.
The protected host capsule, rate admission, lease, credential profile, and final
zero-operation second pass remain independent gates. This record supplies none
of them.
