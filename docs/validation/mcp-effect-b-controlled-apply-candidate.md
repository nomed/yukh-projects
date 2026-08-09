# MCP Effect B controlled-apply candidate

- **Status:** local, unpublished, unreviewed candidate
- **Governing issue:** [#154](https://github.com/nomed/yukh-projects/issues/154)
- **Source baseline:**
  `nomed/yukh-projects@521be0d0ef1297579e84a6322dea29f80c2549dc`
- **Profile:** `yukh-mcp/suite-preview-effect-b-add-dependency-v1`
- **Capability:** `projects.add-dependency.v1`
- **Operation:** exactly `add_dependency(201 blocks 202)`
- **Cloud spend:** EUR 0
- **Provider calls:** 0; all transports are injected synthetic adapters

## Candidate identities

`dist/mcp-effect-b/manifest.json` is the closed local candidate index. It binds:

- `dist/mcp-effect-b/index.js`, whose sole export is
  `runMcpEffectBControlledApplyV1`;
- the canonical bridge schema and fixed wrapper profile;
- the exact capability and operation string;
- lowercase SHA-256 and byte length for the executable bundle; and
- lowercase SHA-256 and byte length for
  `test/fixtures/mcp-effect-b-bridge-v2-vector.json`.

Publication is fixed to `disabled`. The candidate has no tag, Release, package,
attestation upload, workflow activation, OIDC configuration, credential, or
network endpoint.

## Reproduction

From the exact candidate checkout with the lockfile:

~~~text
npm ci
npm run build
npm test
npm run verify:bundles
npm audit --audit-level=moderate
npm sbom --sbom-format spdx
~~~

`verify:bundles` rebuilds the candidate, verifies both manifest checksums,
asserts the one-function export surface, rejects test minting helpers and
authority-bearing environment surfaces, and requires byte-for-byte equality
with the committed files.

The author session also produces local-only checksum, provenance, and SPDX
candidate files after the final implementation commit. Those files bind the
exact Git commit, lockfile, toolchain, bundle manifest, bundle, conformance
vector, accepted bridge contract, and governing issue. They are retained as
review evidence only and are not publication artifacts.

## Covered evidence

The deterministic corpus proves:

- valid canonical Ed25519 bridge authentication and byte-stable vector digest;
- deletion of every required bridge field and rejection of open nested release
  objects;
- malformed, oversized, noncanonical, stale, replayed, substituted, future,
  incomparable, cross-profile, nonce-equal, subject-mismatched, producer, plan,
  target, postcondition, lease, and trust failures;
- zero provider and Coordination calls for complete admission failures;
- the unchanged Projects v1 verifier runs before factory construction;
- one exact mutation request, no hidden retry, fresh convergence, and
  `effect_observed` only after final zero drift;
- durable `completion_unknown` for ambiguous request or verification outcomes;
- invocation replay denial, static redacted results, and cleanup that cannot
  rewrite the outcome; and
- complete local teardown with no provider state to restore.

This evidence is a review input, not an acceptance, security review, release, or
activation decision. Distinct normal and security review sessions must evaluate
the same exact candidate head before a separate executor may merge it.
