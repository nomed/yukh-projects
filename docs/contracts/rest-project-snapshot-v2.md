# REST-first Project snapshot v2 — accepted specification

- **Status:** Accepted
- **Proposed:** 2026-08-03
- **Accepted:** 2026-08-03 by `@nomed`
- **Governing issue:** [#63](https://github.com/nomed/yukh-projects/issues/63)
- **Decision:** [ADR 0002](../adr/0002-rest-first-github-transport.md)
- **Security boundary:** authenticated provider state to one immutable, scope-bound planning observation

## Objective

Replace issue-at-a-time GraphQL discovery with a bounded REST-first snapshot. A run reads shared Project state once, reads only the issue and item state required by its declared scope, and performs all comparison and planning locally. Cost scales with provider pages and affected items rather than multiplying complete Project reads by issue count.

This contract authorizes no mutation. Existing v1 GraphQL transports remain rollback-only until a separately reviewed implementation and immutable release qualify v2.

## Legacy consumer compatibility profile

The rate-safe preview must be able to shadow an existing version-1 consumer
without first rewriting its governed backlog. Compatibility is behavior-led and
uses only synthetic fixtures; no legacy source or adopter content is imported.

The accepted read and planning surface includes:

- version-1 repository policy documents with `contract.marker: yukh`;
- the hidden `<!-- yukh ... -->` issue envelope and its declared extensions;
- managed issue type and managed labels;
- native milestone;
- Project fields and single-select, number and date values;
- native parent/sub-issue and dependency/blocking relationships;
- policies that deliberately omit `Status`, preserving the observed human-owned
  Project value without proposing a write;
- one-issue automatic reconciliation planning and complete-backlog audit planning;
- a compatibility report that classifies every legacy capability as `supported`,
  `changed` or `missing` without containing adopter identity.

The preview remains dry-run only. `full apply`, mutation verification and the
mandatory second zero-operation apply are contract requirements for the later
controlled-apply release, not capabilities of this snapshot release. Until those
gates are complete the project must describe itself as shadow-dry-run compatible,
never apply compatible.

## Runtime model

A reconciliation run has one `RunScope`:

- authenticated subject class, never a credential value;
- owner kind and canonical login;
- repository identity;
- Project number;
- sorted unique issue numbers, maximum 100;
- fixed API version and capability profile;
- REST and GraphQL request budgets.

The runtime creates at most one `ProjectSnapshot` for a scope. It contains:

- canonical scope and provider node bindings;
- complete Project metadata, field definitions and option vocabularies;
- one complete item observation for each requested issue, including explicit absence;
- complete requested parent and dependency relationships;
- per-resource validators and observation times retained only inside the adapter;
- page, request and byte counts;
- a canonical SHA-256 fingerprint over normalized non-secret planning inputs;
- a completeness declaration covering every requested capability.

The snapshot is immutable after publication to the planner. Provider bodies, URLs, credentials, headers, cursors, validators and opaque identifiers are excluded from public reports.

## REST-first capability matrix

The adapter pins GitHub API version `2026-03-10` and uses fixed operation discriminators. The accepted implementation records exact paths for user-owned and organization-owned Projects.

| Capability | Default transport | GraphQL fallback |
| --- | --- | --- |
| Project metadata, fields and options | REST | forbidden |
| Project items and item field values | REST | forbidden |
| Issue and pull-request content | REST | forbidden |
| Check runs and Actions state | REST | forbidden |
| Parent and dependency relationships | REST only when a bounded batch representation exists | one fixed batched query when the pinned REST API has no batch equivalent |
| Project field mutation | REST when supported and separately authorized | never selected implicitly |

Callers cannot supply URLs, methods, headers, GraphQL text, aliases, fragments, cache keys or fallback decisions. Unsupported owner/token combinations return a stable capability diagnostic; they never silently change transport or broaden credentials.

## Snapshot acquisition

Acquisition is atomic:

1. validate `RunScope` before network access;
2. resolve and bind repository and Project identity;
3. read Project metadata and schema once;
4. read Project item pages once and retain only requested issue bindings;
5. obtain requested issue bodies from Project item content and collect relationship
   state through one bounded batch operation rather than one request per issue;
6. validate anchors, uniqueness, completeness and bounds;
7. canonicalize and publish one snapshot.

Any missing page, changing anchor, duplicate binding, ambiguous absence, mixed validator state, malformed response, pagination regression or exhausted bound discards the complete candidate snapshot. Partial observations never reach planning.

## Conditional cache and single flight

GET responses may be cached only under an internal key derived from authenticated subject class, owner kind/login, repository, Project number, operation discriminator, fixed selectors, API version and representation version. Credentials, raw URLs and caller strings are not cache keys.

- cache entries have a maximum ten-minute freshness window and a maximum one-hour retention window;
- an entry stores normalized data, response validator, acquisition time, scope digest and completeness state;
- only complete entries are reusable;
- stale entries require conditional revalidation with `If-None-Match` or `If-Modified-Since` where GitHub supplies a validator;
- `304 Not Modified` refreshes only the matching complete entry;
- a `200` replaces it atomically after full validation;
- authentication, authorization, API version, representation or scope changes invalidate reuse;
- any successful mutation invalidates the affected item and relationship entries before verification;
- schema-changing operations invalidate the complete Project snapshot.

Within one process, identical concurrent GETs share one in-flight promise. The single-flight key includes the complete internal cache key and credential identity digest; results never cross authenticated subjects or scopes. A failed or cancelled request is not cached.

Cross-process caches are optional and non-authoritative. If implemented later they require their own locking, integrity and credential-isolation review.

## Budgets and rate conservation

Default per-run limits are:

| Limit | Default | Hard maximum |
| --- | ---: | ---: |
| Requested issues | 100 | 100 |
| REST requests | 32 | 64 |
| GraphQL requests | 1 | 2 |
| GraphQL estimated points | 100 | 500 |
| Pages per connection | 20 | 20 |
| Aggregate response bytes | 32 MiB | 64 MiB |
| REST reserve after planned request | 500 | configurable upward only |
| GraphQL reserve after estimated query | 500 points | configurable upward only |

Provider rate headers from normal responses update the run ledger. A separate rate probe is permitted only before a multi-request run and never inside a poll loop. GraphQL fallback includes `rateLimit { cost remaining resetAt }` in the same fixed query.

If the next request would exceed a run limit or reserve, acquisition stops before the request and returns `YKP-RATE-001` (`deferred_rate_budget`). It contains only resource class and reset epoch rounded to the minute. There is no automatic retry, sleep, partial continuation or fallback to a different credential.

## Request ceilings

Tests use synthetic pagination with one Project schema page, at most two Project
item pages, and one fixed relationship batch whose connections paginate together.
A complete unchanged cold run must not exceed:

| Requested issues | REST requests | GraphQL requests |
| ---: | ---: | ---: |
| 1 | 5 | 1 only if required relationships lack a REST batch |
| 10 | 5 | 1 only under the same condition |
| 100 | 7 | 2 only when the fixed relationship batch requires a second page |

Warm unchanged runs must issue no unconditional request for a fresh entry and at
most one conditional request per cached REST resource group. Project metadata,
schema, issue bodies and relationship state are never fetched once per issue. If
the provider cannot return a complete bounded relationship batch, that capability
is unavailable for the run; the runtime does not fall back to N per-issue calls.
Implementations may improve these ceilings but may not raise them without a new
reviewed contract.

## Verification after future mutation

This read contract does not authorize writes. A future apply runtime must:

- invalidate affected cache entries immediately after provider acceptance;
- read and verify the affected resource before the next dependent operation;
- never treat a cached pre-mutation value as verification;
- perform one final bounded snapshot for the complete run scope;
- require a deterministic zero-operation replan before success.

## Authentication profiles

User access tokens and GitHub App installation tokens are separate profiles. The implementation must verify support per fixed REST endpoint. An installation token is never replaced silently with a user token. If a user-owned Project endpoint does not accept installation tokens, the adapter returns `YKP-CAPABILITY-001`; moving Project ownership is an explicit governance migration outside this contract.

## Stable diagnostics

The v2 adapter adds:

- `YKP-RATE-001`: deferred because a declared reserve or run budget would be crossed;
- `YKP-CACHE-001`: cached state is incomplete, invalid or scope-incompatible;
- `YKP-CAPABILITY-001`: the authenticated profile cannot perform the required fixed operation;
- `YKP-REST-001`: a fixed REST response violates the accepted representation;
- `YKP-SNAPSHOT-001`: atomic snapshot completeness or binding failed.

Diagnostics are static and never include provider content, selectors, identifiers, validators, credentials, request bodies or cache contents.

## Compatibility and rollback

v2 changes transport and observation aggregation, not the accepted issue, policy or planning contracts. The implementation must compare canonical plans produced by v1 and v2 over the same synthetic observations. Any semantic difference requires separate review.

Rollback pins the last immutable v1 release and disables v2; tags are never moved. Rollback does not authorize continued high-volume GraphQL operation: v1 consumers must use bounded single-issue runs until a corrected v2 release is available.

## Required implementation evidence

- synthetic 1, 10 and 100 issue request-count tests;
- GraphQL-zero and REST-reserve exhaustion tests;
- conditional `304`, validator mismatch and invalidation tests;
- single-flight success, failure, cancellation and cross-scope isolation tests;
- pagination, duplicate, truncation and mixed-anchor rejection;
- user-token and installation-token capability matrix;
- v1/v2 plan-equivalence fixtures;
- synthetic legacy policy and issue-envelope compatibility fixtures covering
  issue type, labels, milestone, fields, parent and dependencies;
- preservation evidence for an observed Project-owned status field;
- one-issue and complete-backlog shadow planning with comparable legacy/v2 output;
- redaction, neutrality, permission, dependency and bundle-rebuild evidence.
