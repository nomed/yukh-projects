# Whole-plan rate admission v1

This validation records the implementation contract for issue #131. It is
synthetic evidence only: no provider access, live apply, deployment, consumer
migration, tag, or release is performed.

After the fresh plan has been validated against its approval, the executor
derives the complete ordered mutation-kind sequence and asks the write
transport to admit that sequence before consuming the nonce, inspecting an
operation, or attempting the first mutation. Admission is atomic and does not
consume the ledger. Each subsequent request still reserves its declared cost.

The currently qualified consumer plan contains one REST request and three
GraphQL requests: one field creation, two item-field updates, and one native
parent relationship. GraphQL mutation kinds remain explicitly allowlisted and
cost 100 points each. The consumer profile uses REST and GraphQL reserves of
at least 1000, a three-request/300-point GraphQL plan allowance, and one REST
request. The library hard ceiling is four GraphQL requests and 500 points, so
larger plans cannot silently expand the write surface.

If any request count, point ceiling, or provider reserve is insufficient, the
entire plan returns the stable redacted `YKP-APPLY-015` deferred diagnostic.
No nonce is consumed and all operations remain `not_attempted`. There is no
polling, sleep, retry, plan splitting, partial approval, or hidden fallback.

Deterministic tests cover successful non-consuming admission for the current
one-REST/three-GraphQL shape, whole-plan denial with zero consumed requests,
executor deferral before nonce and mutation, and a separately approved second
pass whose converged plan contains zero operations.
