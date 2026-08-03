# ADR 0002: REST-first GitHub transport and GraphQL conservation

- **Status:** Proposed
- **Date:** 2026-08-03
- **Governing issue:** [#59](https://github.com/nomed/yukh-projects/issues/59)

## Context

GitHub applies independent REST and GraphQL primary budgets. Projects automation historically depended on GraphQL, so ordinary reads and polling could exhaust the shared user GraphQL budget and block unrelated work while REST capacity remained available. GitHub API version `2026-03-10` provides REST endpoints for Projects v2 projects, fields, items, and item-field mutations.

## Decision

1. Use versioned REST endpoints for every supported Projects v2, issue, pull request, check-run, and Actions operation.
2. Reserve GraphQL for capabilities without a REST equivalent and require a cost-aware reserve before use.
3. Prohibit unbounded polling and GraphQL polling. Prefer webhooks; otherwise use bounded cached REST reads.
4. Check provider-declared rate state and stop at configured reserves without automatic retry.
5. Keep operation and endpoint allowlists fixed. Callers never supply URLs, documents, headers, or credentials.
6. Prefer short-lived GitHub App installation tokens for independent automation quota and least privilege. A second user token is not quota isolation.
7. Publish the reusable operator workflow as a repository skill with a deterministic read helper and synthetic tests.

## Consequences

- Existing GraphQL-only read and mutation contracts require a separately reviewed v2 before their runtime implementations change.
- REST response shapes and API-version compatibility become explicit adapter concerns.
- Normal operator workflows remain available when GraphQL is depleted.
- GitHub App installation and webhook delivery remain follow-up capabilities, not prerequisites for adopting REST-first routing.
