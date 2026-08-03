# Yukh Projects 1.3.4 <!-- x-release-please-version -->

This corrective release candidate is the first rate-safe apply-compatible
release whose GitHub Release must be verified immutable. It includes the
controlled-apply Action and CLI in addition to the existing dry-run surfaces.

## Compatibility

- Version-1 `.yukh/project.yaml` policies and hidden issue contracts remain
  supported.
- Managed issue type, labels, milestone, Project fields, native parent and
  dependency relationships are observed and reconciled through the accepted
  REST-first plan.
- Project-owned `Status` remains preserved unless explicitly governed by policy.
- One-issue reconciliation, backlog shadow audit, controlled apply and the
  mandatory zero-operation second apply are included.
- GraphQL is limited to the fixed allowlist when REST cannot provide a complete
  relationship observation or mutation. A depleted GraphQL budget fails closed
  or reports a stable deferred outcome without polling, sleeping or retrying.

## Operational requirements and limitations

- Controlled apply requires the protected host capsule v1, separate least-
  privilege read and write GitHub credentials, and the durable coordination
  service accepted by the controlled-apply contract.
- The recommended GitHub credential is a short-lived GitHub App installation
  token. OAuth and appropriately scoped PATs remain documented alternatives.
- Apply is never enabled by installing the release alone. The protected
  environment must explicitly authorize each bounded run.
- Backlog shadow batches are limited to 100 issues and reuse one immutable
  snapshot per run. Larger backlogs require deterministic batches.

## Integrity and pinning

The release assets include the dry-run and apply Action/CLI bundles, apply
metadata and manifest, lockfile, SHA-256 checksums and SPDX SBOM. GitHub build
provenance attestations bind the published assets to the protected release run.
Consumers must pin the full commit resolved and verified by the immutable
release; moving branches and floating major tags are unsupported.

Version `v1.3.0` remains available but its GitHub Release predates repository
immutable-release enforcement. It is intentionally unchanged and is not the
immutable apply-compatible migration pin. Use `v1.3.1` only after its protected
publication and independent qualification complete.

## Rollback

The exact rollback pin is the preceding qualified dry-run release commit:
`2fc81c48b678428937209326bececcf52354aaf1` (`v1.2.0`). Rollback means restoring
that full commit pin. It does not authorize high-volume use of a legacy GraphQL
path, deletion or movement of a tag, or rewriting an existing release.
