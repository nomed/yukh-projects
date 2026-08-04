# v1.3.5 Release Please baseline

This document is the reviewable correction contract for
[issue #105](https://github.com/nomed/yukh-projects/issues/105). It does not
authorize a merge, tag, release, publication, deployment, live apply, or
consumer migration.

## Authoritative baseline

Release Please must derive the next release from the existing immutable tag
`v1.3.4`, commit `21731941c96525802ee1e31c6df9e888ceab07e7`. The repository
uses unprefixed `v<version>` tags; component-prefixed tags are not valid
baselines.

The complete post-v1.3.4 delta is exactly:

- `04a6019e40633fa60cb218548579f02f2e26e880` — #100 documentation header;
- `e9b564c767e89e406047f6c99ad4739d01e61ca5` — #104 REST-first field creation;
- `de964d9bf1294d32a2d0f2e0714736efd2d33310` — #103 Issue Type mutations.

The regenerated v1.3.5 changelog must contain this delta once and must not
repeat entries already released in v1.3.4 or earlier.

## Required v1.3.5 release notes

The regenerated release PR must state:

- REST-first field creation uses GitHub API version `2026-03-10`, with zero GraphQL calls and no GraphQL fallback;
- organization-owned Projects should use a GitHub App installation token;
- user-owned Project endpoints require a different credential profile because
  GitHub App installation tokens and fine-grained PATs are not supported for
  those endpoints; use the documented OAuth or classic PAT profile;
- Issue Type mutation support is included, without authorizing live apply;
- the rollback pin is immutable tag `v1.3.4` at
  `21731941c96525802ee1e31c6df9e888ceab07e7`;
- publication, deployment, live apply, and consumer migration remain separate
  authorization gates.

## Review and regeneration gates

After this correction is merged under separate authorization, Release Please
may regenerate PR #98. That PR must be requalified against the baseline and
notes above before any publication authority is requested. The generated
manifest, package version, changelog, and release notes must all agree on
v1.3.5.

No provider access is required by this correction PR. Its checks are local and
deterministic.
