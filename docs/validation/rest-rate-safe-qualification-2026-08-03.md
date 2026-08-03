# REST rate-safe preview qualification — 2026-08-03

- Governing issue: #65
- Implementation: #64 / PR #69
- Candidate source commit: selected only after this evidence merges to `main`
- Publication state: not yet published

## Deterministic evidence

The Node 24 suite contains synthetic cold snapshots for 1, 10 and 100 requested
issues with GraphQL remaining set to zero. Each case completes with exactly four
REST requests and zero GraphQL requests. Shared operation reads coalesce onto the
same snapshot promise. Stale cached resources use conditional ETags and accept
only an exact `304`; pagination is origin-bound and bounded.

The rate guards stop before a request when either the REST run ceiling or the
GraphQL reserve would be crossed. Relationship fallback is one fixed named batch,
is selected only when the REST dependency summary proves relationships exist,
and has no polling, sleep, retry or N-per-issue path.

Qualification commands:

```sh
npm ci
npm test
npm run verify:bundles
npm audit --audit-level=moderate
npm sbom --sbom-format spdx > release.spdx.json
```

Expected evidence at this revision: 111 tests passing, reproducible Action and
CLI bundles, zero dependency vulnerabilities at `moderate` or higher, and a
valid SPDX SBOM. The protected workflow repeats these checks at the exact main
commit and produces SHA-256 assets before it can enter the release environment.

## Authentication and rollback

The recommended profile is a short-lived GitHub App installation token for an
organization-owned Project to which the installation has access. OAuth and PAT
profiles remain documented alternatives. A user-owned Project may reject an
installation token; the runtime returns a capability or authorization diagnostic
and never silently substitutes another credential.

Rollback is an exact immutable tag or commit pin. The rate-safe candidate pin is
recorded after the qualification commit lands; publication must not move an
existing tag. This preview is shadow-dry-run compatible only. Apply compatibility
remains unavailable until #56–#58 are complete.
