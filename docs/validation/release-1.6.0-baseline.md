# v1.6.0 Release Please baseline

- Governing issue: [#129](https://github.com/nomed/yukh-projects/issues/129)
- Failed candidate: [#127](https://github.com/nomed/yukh-projects/pull/127)
- Publication authority: none

## Exact delta

The immutable baseline is `v1.5.1` at
`d58837397bc5856923e0e742458be34d8e5a27d6`. Before this corrective change,
`main` is exactly one commit ahead: [#122](https://github.com/nomed/yukh-projects/pull/122)
at `3df37e47050d3bf2bec9b31a5a189a4236e4cb03`.

The candidate must describe only the explicit `legacy-apply-v1` controlled
entrypoint and this release-process correction. It must not repeat changes
already published through `v1.5.1`.

## Required evidence

Synthetic qualification ran with GraphQL remaining zero and no provider access.
The integrated implementation passed 219 tests, bundle reproducibility,
consumer-neutrality, CodeQL and dependency audit. Native apply and resumable
deferral remain unchanged.

The exact rollback pin `v1.5.1` remains available. Publication, deployment,
live apply, backfill, legacy removal and consumer migration require separate
authorization.

## Race prevention

A Release Please metadata-only merge triggers the protected publisher but no
longer triggers Release Please itself. This prevents the next release PR from
being calculated before the publisher establishes the new immutable tag. The
next substantive merge or an explicit recovery dispatch runs Release Please
against that verified tag.
