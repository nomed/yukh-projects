# Yukh Projects 1.5.1 <!-- x-release-please-version -->

This patch restores exact parity between single-issue legacy shadow and
controlled apply planning.

## Planning parity

- Single-issue Action and CLI shadow runs now use the same owner-aware legacy
  planner as controlled apply.
- Shadow emits the exact deterministic plan ID and ordered operation count that
  an approval would bind.
- User-owned repositories select the Project `Work Type` fallback;
  organization-owned repositories select native Issue Type.
- Multi-issue legacy audit remains available as an aggregate compatibility
  report and is explicitly not an approval artifact.

## Safety

- Dry-run remains structurally unable to mutate.
- Provider selection remains REST-only with zero GraphQL budget.
- Missing or conflicting provider state continues to fail closed.
- The release does not migrate a consumer or authorize Project mutation.

## Compatibility

- Existing v1.5.0 native and controlled-apply inputs remain unchanged.
- Single-issue legacy shadow reports now use the executable-plan report shape
  already exposed by controlled planning.
- Consumers that require the former aggregate report can continue to use the
  bounded multi-issue CLI audit until they migrate.

## Integrity and qualification

The correction passes the complete test suite, byte-identical bundle
verification, consumer-neutrality checks and dependency audit. Publication
adds checksums, an SPDX SBOM, provenance attestations and immutable assets.

## Rollback

The exact rollback pin is `v1.5.0` at commit
`495920282c41f68bb61f9b34140a53d24e38e3d0`.

Rollback requires a separately reviewed consumer pin change. It does not
authorize moving or deleting a tag, deployment, live apply or migration.
