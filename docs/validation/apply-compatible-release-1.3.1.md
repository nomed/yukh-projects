# Apply-compatible release 1.3.1 corrective qualification

## Authoritative state

Repository immutable releases were enabled on 2026-08-03. GitHub applies that
policy only to releases published after enablement. Release `v1.3.0` therefore
remains unchanged and mutable; it is not an immutable apply-compatible consumer
pin.

Version `1.3.1` is the corrective candidate. Its protected publisher:

- performs one bounded REST policy read during read-only preflight;
- repeats the bounded REST policy read immediately before its first mutation;
- makes no retry, polling or sleep attempt when policy evidence is unavailable;
- creates a draft bound to the exact reviewed commit;
- uploads the complete checksummed asset set before publishing the draft;
- requires GitHub to report `immutable: true` and the tag to resolve exactly.

## Safety boundary

This qualification change does not create a tag or GitHub Release. It does not
modify or delete `v1.3.0`, deploy controlled apply, execute live apply, or
migrate a consumer. A failed publication leaves any partial draft untouched for
explicit review.

## Remaining gates

1. Review and merge the corrective implementation.
2. Review and merge the generated Release Please patch PR for `1.3.1`.
3. Complete read-only qualification on the exact merged release commit.
4. Obtain a new explicit authorization for protected publication.

Only a protected run that passes all gates and verifies `immutable: true` may
establish the exact `v1.3.1` consumer pin.
