# Current context

**Status:** first usable preview Projects contract accepted; approval bridge
and wrapper contract proposed for owner review
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
- [MCP compound approval bridge and wrapper v1](../docs/contracts/mcp-compound-approval-wrapper-v1.md)
  is Proposed under #150. It keeps the Projects v1 approval envelope unchanged,
  defines a closed authenticated bridge v2, and specifies one immutable
  producer-owned Effect B wrapper with zero provider calls before complete
  compound admission.
- Owner review must resolve a cross-record conflict before suite compatibility:
  accepted Projects effects v1 names `add_dependency` for Effect B, while
  Proposed MCP RFC-0011 names `set_field_value(status)`. Neither record may be
  silently reinterpreted.

## Next

1. Obtain explicit owner review and acceptance or revision of the Proposed
   approval-bridge v2 and immutable MCP-safe controlled-apply wrapper contract
   under [#150](https://github.com/nomed/yukh-projects/issues/150).
2. Select the separately reviewed supersession or upstream-RFC revision path
   that makes the Effect B operation exact across components.
3. Stop before any implementation.
4. Keep any later synthetic implementation or live sandbox mutation behind
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
- Bridge possession is not approval. Effect B admits only after independent MCP
  and Projects v1 verification plus exact authenticated bridge verification;
  every failure before complete admission performs zero provider calls.
- Effect A and nested Effect B Projects plans and approvals independently bind
  an exact immutable Projects producer commit, apply-artifact digest, and
  entrypoint version. Equal release values do not share authority; any change
  requires a fresh plan and every applicable fresh approval.
- The accepted Projects approval envelope v1 remains unchanged. Preview
  implementation is blocked on separate acceptance of the proposed closed
  Projects approval bridge v2 that authenticates the producer-release and
  preview-envelope bindings.
- The Proposed MCP-safe wrapper exposes one closed function, fixes native mode,
  target profile, policy, producer and wrapper releases, and exactly one
  `set_field_value(status)` operation. It accepts no caller-selected transport,
  URL, query, document, credential, provider identifier, target, policy, or
  operation.
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
- Proposal review grants no implementation or release authority.
