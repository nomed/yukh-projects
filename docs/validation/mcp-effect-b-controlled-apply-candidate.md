# MCP Effect B controlled-apply candidate

- **Status:** local, unpublished, author-remediated candidate; fresh review
  required
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
npm pack --dry-run --json
npm audit --audit-level=moderate
npm sbom --sbom-format spdx
~~~

`verify:bundles` rebuilds the candidate, verifies both manifest checksums,
asserts the one-function candidate and production-runtime export surfaces,
rejects test minting helpers and authority-bearing environment surfaces from
JavaScript, declarations, manifests, and bundles, and requires byte-for-byte
equality with the committed files.

## Package and test boundary

The package manifest exports only `.` and includes only `dist/src/` in its
explicit file allowlist. No source, test, test output, build script, candidate
bundle, or source map enters the tarball. Package qualification creates and
extracts the real tarball in a bounded temporary directory, scans every
JavaScript, declaration, JSON, and source-map candidate for test authority, and
requires every MCP Effect B package subpath to fail with
`ERR_PACKAGE_PATH_NOT_EXPORTED`.

The MCP Effect B test host lives only in
`test/support/mcp-effect-b-private-test-host.inject.ts`. Production TypeScript
compilation excludes it and the MCP test that consumes it. `npm test` injects
that source into one project-local ephemeral esbuild test bundle, runs the
complete suite, and deletes the bundle directory unconditionally. Neither production
`dist/src`, the committed candidate bundle, declarations, manifests, nor the
package contains a handle constructor or test helper.

The separately documented
[hermetic conformance runner](mcp-effect-b-hermetic-conformance-runner.md)
uses the same injection builder with a closed `core-v1` selector. It emits only
bounded pass/fail JSON for fixed synthetic cases. It is a repository-only
test seam, not runtime authority, and adds no package export, deep import,
credential, endpoint, network path, provider call, or release artifact.

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
  target, postcondition, lease, trust, and paired v1/bridge trust-profile
  mismatch failures;
- zero provider and Coordination calls for complete admission failures;
- the unchanged Projects v1 verifier runs before factory construction;
- one exact mutation request, no hidden retry, fresh convergence, and
  `effect_observed` only after final zero drift;
- durable `completion_unknown` for ambiguous request or verification outcomes;
- invocation replay denial, static redacted results, and cleanup that cannot
  rewrite the outcome; and
- a root-only package export map, closed package file allowlist, blocked deep
  imports, one-function runtime and bundle surfaces, absence of test authority
  from packed files, and rejection of forged handle substitutions; and
- complete local teardown with no provider state to restore.

The first candidate head was security-blocked because a packed deep module
retained a runtime test minter. This remediation evidence is an Author input,
not acceptance, security review, release, or activation. Distinct normal and
fresh security review sessions must evaluate the same remediated exact head
before a separate executor may merge it.
