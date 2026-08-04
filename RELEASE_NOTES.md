# Yukh Projects 1.4.0 <!-- x-release-please-version -->

This release adds the post-v1.3.4 changes without repeating content already
published in v1.3.4.

## REST-first field creation

- Project field creation uses GitHub API version `2026-03-10`.
- The supported path makes zero GraphQL calls and has no GraphQL fallback.
- The implementation preserves the bounded, fail-closed request contract and
  does not poll, sleep, or retry implicitly.

## Credentials and Project ownership

- For organization-owned Projects, the recommended profile is a short-lived
  GitHub App installation token with the required organization Project access.
- GitHub's user-owned Project field endpoint does not support GitHub App
  installation tokens or fine-grained PATs. Use the documented OAuth or classic
  PAT profile when that endpoint is required.
- Authentication, authorization, provider, budget, and invariant failures
  remain distinguishable without exposing credentials or provider bodies.

## Compatibility

- Issue Type mutation support is included in the post-v1.3.4 delta.
- Project-owned `Status` remains preserved unless explicitly governed.
- These release notes do not authorize deployment, live apply, or consumer
  migration.

## Integrity and qualification

Publication remains separately gated by deterministic qualification of the
generated bundle, checksums, SBOM, provenance attestations, and the immutable
release workflow.

## Rollback

The exact rollback pin is `v1.3.4` at commit
`21731941c96525802ee1e31c6df9e888ceab07e7`.

Rollback does not authorize deployment, live apply, consumer migration, or
movement of an existing immutable tag.
