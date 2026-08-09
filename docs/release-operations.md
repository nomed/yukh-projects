# Release operations

Release Please owns version, changelog, and release-PR maintenance only. It has
no tag, GitHub Release, environment, or package-publication authority. Merging a
release PR does not authorize publication and does not trigger the publisher.

The protected publisher normally establishes the immutable tag that Release
Please uses as its previous-release marker. If a release PR is merged while
publication remains intentionally suspended, `last-release-sha` in
`release-please-config.json` must point to that exact merge commit. This hold is
advanced only through a reviewed pull request and may be removed only after the
separately authorized publisher verifies the corresponding immutable tag.
Tags, Releases, or packages must never be created merely to repair Release
Please state.

## Candidate qualification

The canonical release manifest under `release/<version>/release-manifest.json`
allowlists every asset source, published name, byte size, and SHA-256 digest.
The checksum index, package tarball, SPDX SBOM, and provenance descriptor are
committed review material. `scripts/assemble-release-assets.mjs` recreates the
17-file publication directory without a network or secret and rejects missing,
extra, symbolic-linked, or substituted files.

The manual `release-preflight.yml` workflow is read-only. It has no
publication environment, OIDC identity, registry credential, or release-capable
token in a shell step. It installs the reviewed lockfile with lifecycle scripts
disabled, runs the complete checks, and assembles the committed candidate.
Uploading short-lived qualification evidence grants no publication authority.

For the MCP Effect B bridge/wrapper release, the allowlist carries the
one-function bundle, disabled manifest, canonical conformance vector, root-only
private package tarball, and deterministic provenance and SPDX descriptors.
`package.json` remains `private: true`; no workflow has an npm or registry
credential or runs `npm publish`.

## Authenticated Class C authorization

Publication requires three canonical minified JSON comments on the governing
issue. Distinct normal and security reviewers first post
`yukh-projects-release-review-v1` records. Each binds the issue, release PR,
reviewed head and tree, version and tag, release-manifest and checksum-index
digests, and the Git blob SHA of
`.github/workflows/publish-release.yml`. The records use `role: "normal"` and
`role: "security"` respectively and `conclusion: "approved"`.

After a distinct executor merges the exact reviewed tree to `main`, the
repository owner posts one `yukh-projects-release-authorization-v1` record. It
binds those review comment identifiers and exact body digests plus the reviewed
head/tree, merged release commit/tree, version/tag, workflow blob, manifest,
checksum index, and these exact effects:

```json
["attest-17-assets","create-immutable-tag","create-github-release","upload-17-assets"]
```

The record's `statement` value must be exactly:

> I authorize the Class C publication effects in this record exactly once for
> this reviewed release candidate; I do not authorize npm publication, tag
> movement, asset overwrite, retries, or partial-state continuation.

All record keys use the order enforced by
`scripts/verify-release-authorization.mjs`; no whitespace, code fence, or
additional prose is allowed in a canonical comment body. Authentication alone
is not authorization: the verifier requires that the authorization comment was
created by the current repository owner, was not edited, is on the governing
issue, postdates both immutable review records, and matches fresh GitHub state.

An executor manually dispatches `publish-release.yml` from the exact authorized
`main` commit with only the numeric authorization comment identifier. Dispatch
text cannot supply a commit, tree, version, tag, digest, effect, or repository.

## Privileged publication

The workflow has three jobs:

1. `authorize` has read-only repository permissions. It fetches the
   authenticated records and fresh PR, commit, tree, branch, manifest, and
   workflow identities and emits a canonical authorization receipt.
2. `preflight` checks out the exact authorized commit with no persisted
   credential and no release-capable token, installs with scripts disabled,
   runs all checks, and passes only the verified immutable assets, manifest,
   and receipt forward.
3. `publish` has no checkout, dependency installation, build, test, repository
   script, npm token, or long-lived secret. It starts only after the
   protected `release` environment's required owner review. Only this job has
   the short-lived job-scoped `contents: write`, `id-token: write`, and
   `attestations: write` permissions required by the accepted release contract.

Immediately before its first mutation, the inline reviewed publisher rechecks
the authorization body digest and immutability, `main` commit/tree, workflow
blob, repository immutable-release policy, local manifest and all 17 assets.
Any pre-existing tag, draft, or Release is a rerun or partial-state signal and
fails closed.

The publisher creates one draft bound to the exact commit, uploads each asset
once, verifies the provider-reported name, size, and SHA-256 digest and the
complete allowlist, then publishes the draft. Success requires GitHub to report
the Release immutable and its tag to resolve directly to the exact authorized
commit. A pinned GitHub action then attests the exact verified 17-file asset
directory. There is no retry, resume, tag movement, overwrite, deletion, or
automatic cleanup. A failure after the first mutation, including attestation
failure after an otherwise immutable Release, leaves observable partial state
and blocks every rerun for private owner investigation and a corrective release.

Repository immutable releases must be enabled before publication. Unavailable,
malformed, stale, ambiguous, or disabled policy or authorization state fails
closed. The workflow uses fixed GitHub API endpoints, rejects redirects, and
does not call a live provider other than the separately authorized GitHub
release boundary.

## Publication state and rollback

Candidate files retain `publication: "disabled"` before and after upload. The
authorized state transition affects repository state only:

`absent -> one complete verified draft -> one immutable Release`.

Publication does not activate the wrapper, bind a provider profile, create
credentials, grant controlled-apply approval, or authorize a live Project
effect. Before publication, revocation is an owner comment withdrawing the
authorization plus cancellation of any waiting environment deployment; a new
authorization record is required after any binding changes. After publication,
rollback is a new corrective release and consumer pin change. Tags and immutable
Releases are never moved, deleted, or overwritten. Partial state is not
rollback: it is a fail-closed incident that cannot be resumed.
