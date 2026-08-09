# Current context

**Status:** first usable preview Projects contract and bridge/wrapper
implementation accepted; `v1.8.0` release/package candidate is in Author
preparation and remains unpublished
**Project:** Yukh Projects
**Visibility:** public

## Objective

Prepare the separately governed immutable package/release proposal for the
accepted MCP Effect B bridge/wrapper without authorizing publication,
activation, credentials, or either preview effect.

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
- [#154](https://github.com/nomed/yukh-projects/issues/154) and PR #155 record
  the reviewed RFC-0007 Class B-X implementation. It is authoritative on `main`
  at `a4f05f673bb0a03f66fc9864372cee7839ed78d1` (tree
  `16969542925e35ebf669cc9e9e27ce758dfe5585`) and adds the closed bridge v2
  verifier, sole MCP-facing `runMcpEffectBControlledApplyV1` export,
  deterministic conformance vector, root-only package exports, and unpublished
  reproducible bundle. Qualification uses injected synthetic transports only
  and performs zero live provider calls.
- [#156](https://github.com/nomed/yukh-projects/issues/156) governs the
  `1.8.0` / `v1.8.0` release/package proposal. Author preparation may produce
  local assets, checksums, SPDX SBOM, provenance, and reproducibility evidence.
  Release publication, tag creation or movement, asset upload, package
  publication, and permission changes remain RFC-0007 Class C owner-only.

## Next

1. Complete the exact `v1.8.0` dry-run asset manifest and RFC-0007 Author record
   under #156.
2. Obtain distinct read-only normal and security-focused reviews of the exact
   release PR head, tree, workflow, and asset manifest.
3. Require the owner to state exact Class C publication authorization before a
   distinct executor may merge the release PR; merge is the protected
   publication trigger and is not implied by review or authentication.
4. Keep wrapper activation, credentials, provider access, consumer migration,
   and every live effect separately unauthorized.
5. Require Proposed MCP RFC-0011 to conform to the Accepted Projects
   `add_dependency` Effect B in its owning repository.

## Non-goals

- Running or authorizing either live preview effect, teardown, or provider state
  creation.
- Creating credentials, approval material, sandbox resources, deployments, or
  consumer migrations.
- Publishing, tagging, registering, or activating the bridge/wrapper candidate;
  local release-candidate assembly is evidence only.

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
- The `v1.8.0` package remains `private: true`, exports package subpaths only
  through `.`, and exposes no MCP Effect B handle-construction authority.
- Candidate and release manifests retain `publication: disabled`; publishing an
  immutable GitHub Release does not authorize npm publication or activation.
