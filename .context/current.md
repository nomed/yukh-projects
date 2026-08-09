# Current context

**Status:** first usable preview Projects contract accepted; approval bridge
and wrapper contract pending owner acceptance (proposed)
**Project:** Yukh Projects
**Visibility:** public

## Objective

Advance accepted suite RFC-0005 through the next Projects-owned review gate
without implementing or authorizing either preview effect.

## Now

- Suite RFC-0005 is authoritative on `nomed.github.io` `main` at
  `12d9215f10c4b7fb1762a5025367e3e81543800f` and requires two independent
  consequential effects for RFC-0003 steps 8 and 9.
- [#147](https://github.com/nomed/yukh-projects/issues/147) records owner
  acceptance of the Projects-owned specification.
- [Projects effects v1](../docs/contracts/first-usable-preview-projects-v1.md)
  accepts exact invented targets, disjoint operation allowlists, two
  suite-level effect plans, a nested Effect B Projects plan, three independent
  approval assertions, separate authority chains, teardown, and redacted
  qualification evidence.
- The specification adds no runtime, provider access, credential source, mutation
  authority, or release surface.

## Next

1. Review the [proposed compound approval bridge v2 and MCP-safe wrapper
   contract](../docs/contracts/compound-approval-bridge-v2.md) under
   [#150](https://github.com/nomed/yukh-projects/issues/150), including its
   narrow supersession of the incompatible accepted Effect B operation.
2. Stop for an explicit all-items owner decision before any implementation.
3. Keep any later synthetic implementation or live sandbox mutation behind
   separately accepted contracts, a fresh exact plan,
   approval, protected host, and separate operational authorization.

## Non-goals

- Implementing either preview effect.
- Running or authorizing live apply, teardown, or provider state creation.
- Creating credentials, approval material, sandbox resources, release
  artifacts, tags, deployments, or consumer migrations.
- Implementing the #150 bridge or wrapper before its contract is explicitly
  accepted.

## Invariants

- Consumer neutrality and invented fixtures are mandatory.
- Effect A and Effect B use different targets and operation kinds.
- Plans, approvals, snapshots, credentials, nonces, leases, idempotency keys,
  verifiers, and audit chains remain distinct between effects.
- MCP admission cannot imply Projects approval, and Projects approval cannot
  bypass MCP admission.
- Effect A and nested Effect B Projects plans and approvals independently bind
  an exact immutable Projects producer commit, apply-artifact digest, and
  entrypoint version. Equal release values do not share authority; any change
  requires a fresh plan and every applicable fresh approval.
- The accepted Projects approval envelope v1 remains unchanged. Preview
  implementation is blocked on separate acceptance of the proposed closed
  Projects approval bridge v2 and MCP-safe wrapper contract.
- Accepted Projects effects v1 names Effect B as `add_dependency`, while
  authoritative MCP RFC-0011 names one `set_field_value(status)`. The proposed
  contract fails closed on that mismatch and asks the owner to supersede only
  the incompatible Effect B target, operation, capability, and postcondition.
- MCP Approval `B-MCP` and Projects Approval `B-Projects` bind the same
  canonical Effect B postcondition. Their verifier identities, evidence, and
  authority scopes remain distinct.
- Dry-run remains structurally separated from mutation.
- GitHub read permissions are the functional minimum for non-mutating
  qualification. A supplied credential with additional write permissions
  remains eligible and grants no apply authority because the path has no
  mutation transport, apply host, approval input, or controlled-apply
  authority.
- Accepted Projects contracts still forbid destructive restore; the proposed
  preview uses a separately governed teardown boundary.
- No live apply is authorized.
