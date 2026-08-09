# Yukh Projects 1.8.0 <!-- x-release-please-version -->

This release packages the accepted compound approval bridge v2 and the fixed
MCP Effect B controlled-apply wrapper from
`a4f05f673bb0a03f66fc9864372cee7839ed78d1` (tree
`16969542925e35ebf669cc9e9e27ce758dfe5585`).

## Closed MCP Effect B surface

- The standalone MCP bundle and production wrapper module each expose exactly
  `runMcpEffectBControlledApplyV1`.
- The fixed profile admits only `projects.add-dependency.v1` and exactly
  `add_dependency(201 blocks 202)`.
- Complete MCP, Projects v1, and bridge admission occurs before provider-backed
  factory construction. Every pre-admission denial performs zero provider calls.
- One mutation request may be attempted after admission; ambiguous outcomes are
  terminal `completion_unknown` and are never retried or resumed.

## Package and release assets

- The package retains its root-only export map and explicit `dist/src/` file
  allowlist. Package-name deep imports remain blocked.
- The root package exposes no MCP Effect B handle constructor or test helper and
  adds only `runMcpEffectBControlledApplyV1` to its MCP-facing surface.
- The immutable release candidate includes the MCP bundle, closed manifest,
  conformance vector, private root package tarball, SPDX SBOM, provenance
  descriptor, lockfile, existing Action/CLI/apply artifacts, and exact SHA-256
  checksums.
- `package.json` remains `private: true`; no npm registry publication is
  performed or authorized.

## Integrity and qualification

Clean builds must reproduce the committed bundles and the package tarball
byte-for-byte. The protected preflight verifies the exact version, main commit,
tree-derived provenance, complete asset allowlist, byte sizes, SHA-256 digests,
root-only package exports, dependency audit, and deterministic synthetic test
suite before any publication permission is available.

The bridge conformance corpus uses invented identities and injected transports.
Qualification performs zero live provider calls and has expected cloud cost
EUR 0.

## Publication and activation boundary

The local candidate, package manifest, MCP artifact manifest, provenance
descriptor, and would-publish manifest all retain `publication: disabled`.
Separately authorized publication may transition only repository state from no
tag or Release, through one draft with the complete verified assets, to immutable
`v1.8.0`. It does not activate a provider, create credentials, grant apply
approval, publish to npm, or authorize a live effect.

## Compatibility

Existing Action, CLI, dry-run, Projects v1 approval, native apply, and legacy
apply behavior is unchanged. Package subpaths were not exported APIs and remain
unavailable. Any wrapper, producer, policy, target-profile, verifier, plan, or
approval binding change requires fresh artifacts and fresh governance.

## Rollback

Before publication, rollback is closing the release PR and deleting local
candidate assets. After publication, consumers may separately pin immutable
`v1.7.0` at `71784218366805922e5a12903eef9073f715f59f` or a later corrective
release. Tags and immutable Releases are never moved, deleted, or overwritten.
Rollback grants no provider restore, live mutation, credential, deployment, or
activation authority.
