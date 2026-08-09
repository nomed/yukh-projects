# Current context

**Status:** first usable preview Projects contract accepted; approval bridge
and wrapper contract proposed for independent review
**Project:** Yukh Projects
**Visibility:** public

## Objective

Advance accepted suite RFC-0005 through the next Projects-owned review gate
without implementing or authorizing either preview effect.

## Now

- Suite RFC-0005 is authoritative on `nomed.github.io` `main` at
  `12d9215f10c4b7fb1762a5025367e3e81543800f` and requires two independent
  consequential effects for RFC-0003 steps 8 and 9.
- Autonomous-maintainer RFC-0007 is suite-wide authoritative at
  `nomed/nomed.github.io@bb8628edf7a07c2af56f07e4f9140f58c851ef47`.
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
- The RFC-0007 conflict rule resolves the cross-record mismatch in favor of the
  already-Accepted Projects `add_dependency` Effect B. Proposed MCP RFC-0011's
  `set_field_value(status)` operation is nonconforming and must be revised in
  its owning repository before acceptance or activation.

## Next

1. Obtain RFC-0007 independent read-only review of the Proposed approval-bridge
   v2 and immutable MCP-safe controlled-apply wrapper contract under
   [#150](https://github.com/nomed/yukh-projects/issues/150).
2. Require Proposed MCP RFC-0011 to conform to the Accepted Projects
   `add_dependency` Effect B in its owning repository.
3. Keep author, reviewer, and any later executor/merger sessions distinct.
4. Stop before any implementation.
5. Keep any later synthetic implementation or live sandbox mutation behind
   separately accepted contracts, a fresh exact plan,
   approval, protected host, and separate operational authorization.

## Non-goals

- Implementing either preview effect.
- Running or authorizing live apply, teardown, or provider state creation.
- Creating credentials, approval material, sandbox resources, release
  artifacts, tags, deployments, or consumer migrations.
- Implementing the #150 bridge or wrapper under this governance-only record.

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
  implementation remains blocked. Acceptance of the proposed closed Projects
  approval bridge v2 would authenticate the producer-release and
  preview-envelope bindings but would not authorize implementation.
- The Proposed MCP-safe wrapper exposes one closed function, fixes native mode,
  target profile, policy, producer and wrapper releases, and exactly one
  `add_dependency(201 blocks 202)` operation. It accepts no caller-selected
  transport, URL, query, document, credential, provider identifier, target,
  policy, or operation.
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
- The RFC-0007 Class B author decision and proposal review grant no
  implementation, acceptance, merge, or release authority.
