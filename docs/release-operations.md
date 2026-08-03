# Release operations

Release Please owns version, changelog, and release-PR maintenance only. It has no tag or GitHub Release authority.

The protected publisher normally establishes the immutable tag that Release Please uses as its previous-release marker. If a release PR is merged while publication remains intentionally suspended, `last-release-sha` in `release-please-config.json` must point to that exact merge commit. This hold prevents already released commits from being proposed again.

The hold is advanced only through a reviewed pull request. It may be removed after the separately authorized protected publisher creates and verifies the corresponding immutable tag. Tags, Releases, attestations, and packages must never be created merely to repair Release Please state.

Repository immutable releases must be enabled before publication. The protected
workflow checks that policy once in its read-only preflight and checks it again
immediately before the first GitHub mutation. Either unavailable, malformed or
disabled policy state fails closed without retry.

The policy reads use the protected `IMMUTABLE_RELEASES_READ_TOKEN`, scoped to
repository Administration read and stored only in the `release` environment.
The automatic workflow token remains the publication and attestation identity;
the publisher never falls back to it for an administrative policy read.

The publisher creates a draft Release bound to the exact candidate commit,
uploads and verifies the complete allowlisted asset set, then publishes the
draft. It accepts success only when GitHub reports the Release immutable and the
resulting tag resolves to the exact candidate commit. A partial draft is left
for explicit operator review; automation must not delete, replace or rewrite it.
