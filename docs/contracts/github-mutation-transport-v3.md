# GitHub mutation transport v3 — REST Issue Type update

- **Status:** Implemented candidate; merge blocked pending review
- **Governing issue:** [#111](https://github.com/nomed/yukh-projects/issues/111)
- **Implements:** owner-aware work type provider routing v1
- **Supersedes:** mutation transport v1 only for `set_issue_type`

## Decision

`set_issue_type` uses GitHub REST API version `2026-03-10` and has no GraphQL
document or fallback. Its fixed request is:

~~~text
PATCH /repos/{owner}/{repository}/issues/{issue_number}
{"type":"<exact configured Issue Type name>"}
~~~

The binding contains the freshly observed repository owner, repository name,
positive issue number, and exact configured Issue Type name. The caller cannot
supply a URL, method, API version, header, credential, retry policy, provider
identifier, or response shape.

The shared ledger reserves one REST request before HTTP. GraphQL remaining zero
does not affect admission. One execution performs zero or one request, never
redirects, retries, polls, sleeps, switches credentials, or falls back.

Only an HTTP `200` bounded JSON issue receipt with the exact issue number and
exact resulting `type.name` is provider acceptance. The host invalidates the
affected item snapshot and independently replans from fresh state before
verification or success.

Authentication, authorization, rate exhaustion, transport failure, provider
rejection, malformed response, size violation, and receipt mismatch retain the
stable redacted mutation-transport classifications. Raw provider bodies,
messages, IDs, URLs, request metadata, credentials, catalog contents, and field
values never enter public diagnostics.

The previous GraphQL `updateIssueIssueType` document remains available only in
an immutable rollback release. It is absent from the current runtime document
allowlist and cannot be selected by policy or workflow input.

## Authority boundary

This candidate implements deterministic local behavior only. It does not
authorize merge, live provider access, Project schema mutation, apply, backfill,
field removal, release, deployment, repository transfer, or consumer migration.
