# REST-first Project field creation qualification

- Governing issue: [#102](https://github.com/nomed/yukh-projects/issues/102)
- Contract: [GitHub mutation transport v2](../contracts/github-mutation-transport-v2.md)
- Provider access: none

## Root cause

The controlled consumer path routed `create_project_field` through GraphQL even
though GitHub API version `2026-03-10` supports Project field creation through
REST. This violated the accepted REST-first routing decision and exposed an
ordinary schema operation to the shared GraphQL budget. The redacted live
failure intentionally retained no provider body, so no narrower provider-error
claim is made.

## Deterministic evidence

Injected-fetch tests prove that single-select creation:

- sends one fixed REST POST and no GraphQL document;
- works with GraphQL remaining zero;
- binds user or organization owner, login, and Project number from fresh state;
- maps the nine-option `Area` vocabulary exactly with neutral presentation
  metadata;
- reserves and observes only the REST rate ledger;
- accepts only HTTP `201` with an exact bounded receipt;
- rejects invalid bindings before HTTP;
- rejects `422`, malformed, mismatched, redirected, oversized, authentication,
  authorization, and exhausted-budget responses without retry or disclosure;
- has no REST-to-GraphQL fallback.

The full repository build and test suite are required before review. No test,
validation step, or implementation command sends a provider request.

## Remaining gate

The correction requires review, merge, and an immutable producer release before
a consumer can prepare a new Phase B plan. Those steps do not authorize live
validation or mutation.
