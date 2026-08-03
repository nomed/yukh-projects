# Controlled apply shared rate ledger — 2026-08-03

This draft implementation evidence belongs to issue #57 and does not authorize
live apply, deployment, merge, or publication.

The REST snapshot reader and the allowlisted GraphQL mutation transport accept
one injected run ledger. Reservations occur synchronously before HTTP. Provider
remaining values observed on normal responses may only reduce the known
remaining state. There is no probe, retry, polling, sleep, credential fallback,
or provider response content in public evidence.

The ledger enforces the accepted defaults of 32 REST requests, one GraphQL
request, 100 estimated GraphQL points, and a 500-unit reserve for both resource
classes. Explicit configuration may tighten run limits or increase them only to
the accepted hard maxima of 64 REST requests, two GraphQL requests, and 500
GraphQL points. Provider reserves cannot be lowered below 500.

The fixed relationship fallback and each allowlisted mutation declare a
conservative estimated cost of 100 points. Exhausted or reserved capacity stops
before transport invocation with a stable rate diagnostic.

Synthetic cold snapshots for 1, 10, and 100 issues with GraphQL remaining zero
each use exactly four REST requests and zero GraphQL requests. Separate ledger
assertions prove that the fifth REST reservation fails when it would cross the
provider reserve. These tests use invented resources and injected fetch only.

After an accepted mutation, the executor requires cache invalidation before its
verification port can read. Item/value/relationship effects invalidate only the
Project item resource group and require one fresh REST request. Schema effects
invalidate the fields and item resource groups and require two fresh REST
requests. Repository and Project metadata remain reusable. The subsequent final
complete snapshot reuses only observations populated after invalidation and
requires zero additional HTTP requests in the unchanged synthetic case.

Each cache resource carries an internal generation. Invalidation advances the
generation and detaches any older single-flight promise, so a response that was
already in flight before provider acceptance cannot repopulate the verification
cache. Invalidation failure stops before verification and final reconciliation.

Validation commands:

```text
npm test
npm run verify:bundles
npm audit --audit-level=moderate
git diff --check
```
