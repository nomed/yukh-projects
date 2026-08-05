# Yukh Projects 1.4.0 <!-- x-release-please-version -->

This release adds owner-aware work type reconciliation. The release delta is
strictly the two commits after immutable release `v1.3.5`.

## Owner-aware provider routing

- Organization-owned repositories use native GitHub Issue Type.
- User-owned repositories use the Project single-select `Work Type` adapter.
- Repository ownership selects the provider independently from Project
  ownership, covering all four user/organization ownership combinations.
- Conflicting native and Project representations fail closed with stable,
  redacted diagnostics; no redundant dual write is performed.

## REST-first and rate safety

- Native Issue Type mutation uses GitHub REST API version `2026-03-10` and has
  no GraphQL fallback.
- Deterministic snapshots for 1, 10, and 100 issues reuse one Issue Type
  catalog and make zero GraphQL calls.
- Project `Work Type` operations retain the bounded REST transport contract.
- There is no hidden polling, sleep, or retry.

## Compatibility

- Project-owned `Status` remains preserved unless explicitly governed.
- Existing organization-owned repository configurations continue to target
  native Issue Type.
- Personal repositories gain an explicit Project `Work Type` fallback.
- This release does not remove or backfill any existing Project field.

## Integrity and qualification

Publication remains separately gated by deterministic tests, reproducible
bundles, startup smoke tests, checksums, SBOM, provenance attestations, and the
protected immutable-release workflow. These notes do not authorize merge,
publication, deployment, live apply, backfill, or consumer migration.

## Rollback

The exact rollback pin is `v1.3.5` at commit
`a11031b5301c4c3e0984443914cd420d9b771e2d`.

Rollback does not authorize deployment, live apply, consumer migration, or
movement of an existing immutable tag.
