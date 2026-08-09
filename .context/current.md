# Current context

**Status:** first usable preview Projects contract accepted; bridge/wrapper
implementation candidate is author-remediated after a security block and awaits
distinct normal review plus fresh security review
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
  is Accepted under #150 after independent review of PR #152 at exact head
  `0efc858522e20dd3afa20e75da7935cf49e3f47f` and its distinct Class B
  executor/merger record. The substantive record is authoritative on `main` at
  `56118de6760b5b582c9a2cf84640e22e3eaaac83`. It keeps the Projects v1
  approval envelope unchanged, defines a closed authenticated bridge v2, and
  specifies one immutable producer-owned Effect B wrapper with zero provider
  calls before complete compound admission.
- The RFC-0007 conflict rule resolves the cross-record mismatch in favor of the
  already-Accepted Projects `add_dependency` Effect B. Proposed MCP RFC-0011's
  `set_field_value(status)` operation is nonconforming and must be revised in
  its owning repository before acceptance or activation.
- [#154](https://github.com/nomed/yukh-projects/issues/154) governs the local
  RFC-0007 Class B-X implementation candidate. It adds the closed bridge v2
  verifier, the sole MCP-facing `runMcpEffectBControlledApplyV1` export,
  deterministic conformance vectors, and an unpublished reproducible bundle.
  Qualification uses injected synthetic transports only and performs zero live
  provider calls. Independent security review blocked the first candidate head
  because a packed deep module exported test handle-minting authority. The
  Author remediation removes production test helpers, closes package exports
  and files, and adds deterministic tarball, deep-import, declaration, bundle,
  and forged-handle negative tests; fresh review of the remediated head remains
  mandatory.

## Next

1. Obtain a distinct read-only normal review of the exact remediated #154
   implementation head.
2. Obtain a fresh security-focused review of the same exact remediated head.
3. Keep merge/execution in a third session and keep release, activation,
   credentials, and every live provider effect separately unauthorized.
4. Require Proposed MCP RFC-0011 to conform to the Accepted Projects
   `add_dependency` Effect B in its owning repository.

## Non-goals

- Running or authorizing either live preview effect, teardown, or provider state
  creation.
- Creating credentials, approval material, sandbox resources, release
  artifacts, tags, deployments, or consumer migrations.
- Publishing, releasing, registering, or activating the #154 bridge/wrapper
  candidate.

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
  implementation remains blocked. The accepted closed Projects approval bridge
  v2 specifies authentication of the producer-release and preview-envelope
  bindings but does not implement or authorize that path.
- The Accepted MCP-safe wrapper contract exposes one closed function, fixes
  native mode, target profile, policy, producer and wrapper releases, and exactly one
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
- Accepted Projects contracts still forbid destructive restore; the accepted
  preview uses a separately governed teardown boundary.
- No live apply is authorized.
- The RFC-0007 Class B-X author record for #154 grants no review, acceptance,
  merge, provider, credential, live-effect, deployment, activation, or release
  authority.
