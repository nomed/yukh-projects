# GitHub mutation transport v2 — REST-first field creation

- **Status:** Accepted for implementation
- **Accepted:** 2026-08-04 by `@nomed`
- **Governing issue:** [#102](https://github.com/nomed/yukh-projects/issues/102)
- **Supersedes:** v1 only for `create_project_field`

## Decision

`create_project_field` uses the GitHub REST API version `2026-03-10`. It never
uses or falls back to GraphQL. The fixed endpoints are:

- `POST /orgs/{owner}/projectsV2/{project_number}/fields`;
- `POST /users/{owner}/projectsV2/{project_number}/fields`.

This follows [ADR-0002](../adr/0002-rest-first-github-transport.md) and the
[GitHub Project fields REST contract](https://docs.github.com/en/rest/projects/fields?apiVersion=2026-03-10).
The v1 GraphQL contract remains unchanged for mutation kinds without a reviewed
REST replacement.

## Binding and request

The transport accepts only an internal `create_project_field` discriminator and
a validated binding obtained from the fresh REST snapshot:

- owner kind exactly `orgs` or `users`;
- owner login matching the bounded GitHub login grammar;
- positive Project number;
- field name and supported data type;
- the complete single-select option list when applicable.

Callers cannot supply a URL, method, header, API version, document, query,
credential, retry policy, or receipt shape. The request body uses the REST field
names `name`, `data_type`, and optional `single_select_options`. Presentation
metadata defaults remain `GRAY` and an empty description when policy does not
declare them.

Organization-owned Projects support GitHub App installation tokens with
Projects write permission and remain the recommended profile. GitHub documents
the user-owned endpoints as incompatible with GitHub App and fine-grained PAT
tokens; a classic OAuth/PAT profile with Project authority is therefore a
declared changed credential profile for a user-owned Project.

## Budget and failure behavior

The shared ledger reserves exactly one REST request before HTTP. Field creation
consumes zero GraphQL requests and zero GraphQL points. An unavailable REST
reserve denies before network access.

One invocation performs zero or one POST. It never retries, redirects, polls,
sleeps, falls back, or repairs a partial outcome. Authentication,
authorization, rate exhaustion, transport failure, provider rejection,
malformed response, response limit, and receipt mismatch retain stable redacted
codes. Invalid local input and binding are invariant failures; HTTP `422` or an
otherwise rejected provider response is a provider failure.

## Receipt and verification

Only HTTP `201` JSON of at most 2 MiB is accepted. The receipt must contain a
bounded field node ID and reproduce the exact requested name, data type, option
order, option names, colors, and descriptions. A transport receipt means only
`providerAccepted`; the executor must invalidate the schema snapshot and prove
fresh zero-operation convergence independently.

Provider bodies, messages, URLs, IDs, headers, request metadata, credentials,
ETags, cache state, and option values never enter public diagnostics or audit.

## Authority boundary

This contract authorizes implementation, deterministic fixtures, and a
reviewable pull request only. It does not authorize live provider validation,
mutation, release publication, deployment, apply, or consumer migration.
