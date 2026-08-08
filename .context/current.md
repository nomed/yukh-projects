# Current context

**Status:** v1.7.0 producer qualification complete; consumer read-only
qualification pending
**Project:** Yukh Projects
**Visibility:** public

## Objective

Qualify the immutable `v1.7.0` release against one exact consumer-owned,
read-only scope without granting apply authority.

## Now

- Immutable `v1.7.0` is pinned to
  `71784218366805922e5a12903eef9073f715f59f`.
- Merged [#144](https://github.com/nomed/yukh-projects/pull/144) records that
  the producer-side [#121](https://github.com/nomed/yukh-projects/issues/121)
  provider-parity gate is resolved.
- The next scope is read-only and exact: repository `nomed/yukh-mcp`, Project
  `5`, issue `27`, policy `.yukh/project.yaml`.
- No live apply is authorized.

## Next

1. Review and commit a fresh policy revision for that exact scope.
2. Produce a fresh plan from one bounded, read-only snapshot, following the
   [v1.7.0 provider-parity qualification](../docs/validation/release-1.7.0-provider-parity.md).
3. Review the redacted qualification evidence.
4. Require a separate explicit approval for the fresh plan before any later
   apply proposal. The policy commit and read-only qualification grant no apply
   authority.

## Non-goals

- Running or authorizing live apply.
- Recording consumer observations, provider responses, credentials, plan
  contents, approval material, or other private operational data here.
- Reusing a stale plan, policy revision, snapshot, or approval.
- Changing accepted contracts as part of this context alignment.

## Invariants

- Consumer neutrality is mandatory.
- Dry-run is structurally separated from mutation.
- GitHub read permissions are the functional minimum for qualification. A
  supplied credential with additional write permissions remains eligible and
  grants no apply authority; safety comes from having no mutation transport,
  apply host, approval input, or controlled-apply authority.
- Scope, policy revision, release commit, snapshot, plan, and approval must
  match exactly and remain fresh.
- Any later apply requires a separate, exact approval and all accepted
  controlled-apply gates.
