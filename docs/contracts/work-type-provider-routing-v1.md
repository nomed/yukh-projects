# Work type provider routing v1 — proposed specification

- **Status:** Proposed; implementation blocked pending explicit acceptance
- **Governing issue:** [#109](https://github.com/nomed/yukh-projects/issues/109)
- **Extends:** issue contract v1 and repository policy v1
- **Compatibility:** preserves the logical `work_type` vocabulary

## Decision

`work_type` is one logical governance value with an owner-aware physical
provider. Provider selection is made independently for every issue from fresh,
scope-bound repository ownership. Project ownership never selects or overrides
the provider.

| Project owner | Issue repository owner | Provider | Canonical representation |
| --- | --- | --- | --- |
| User | Organization | `NativeIssueTypeProvider` | GitHub Issue Type |
| Organization | Organization | `NativeIssueTypeProvider` | GitHub Issue Type |
| User | User | `ProjectWorkTypeProvider` | Project field `Work Type` |
| Organization | User | `ProjectWorkTypeProvider` | Project field `Work Type` |

GitHub does not expose native Issue Types for personal repositories. The custom
Project field is therefore a capability adapter for those issues, not a second
steady-state representation. A mixed Project may use both providers, but every
item has exactly one canonical provider.

## Structural interface

~~~typescript
type RepositoryOwnerKind = "user" | "organization";
type ProjectOwnerKind = "user" | "organization";

type WorkTypeProviderKind = "native_issue_type" | "project_work_type";

type WorkTypeBinding = {
  projectOwnerKind: ProjectOwnerKind;
  repositoryOwnerKind: RepositoryOwnerKind;
  provider: WorkTypeProviderKind;
  logicalValue: "epic" | "gate" | "feature" | "task" | "bug" | "technical-debt";
};
~~~

The provider selector accepts validated observations, never caller assertions.
It returns exactly one provider or a stable diagnostic. Issue content, policy,
workflow input, Project owner, field presence, credential reachability, and a
previous run cannot override the freshly observed repository owner kind.

## Native Issue Type provider

For organization-owned repositories the provider uses only GitHub REST API
version `2026-03-10`:

- `GET /repos/{owner}/{repo}/issue-types` discovers the effective catalog;
- the bounded issue REST snapshot observes the current type;
- `PATCH /repos/{owner}/{repo}/issues/{issue_number}` sets `type`;
- a fresh bounded issue read verifies the exact resulting type.

The caller supplies no URL, HTTP method, API version, header, credential,
provider identifier, retry policy, or response shape. Catalog entries are
resolved by exact normalized configured name. Missing, duplicate, disabled, or
ambiguous entries fail before mutation.

The provider performs no GraphQL request, even when the GraphQL budget is zero.
The `set_issue_type` GraphQL surface accepted before REST API version
`2026-03-10` remains rollback compatibility only and is unreachable from this
provider after implementation qualification.

## Project Work Type provider

For user-owned repositories the provider resolves the configured custom
single-select field `Work Type` from the one immutable Project schema snapshot.
It uses the existing controlled Project field planning and mutation boundary.
It never attempts native Issue Type discovery or mutation.

The field and exact configured option must exist or be created only through a
separately accepted schema plan. Absence, incompatible type, ambiguous name, or
missing option returns `YKP-WORKTYPE-002` before item mutation. Status and every
other Project-owned field remain outside this provider.

## Mixed-owner Projects and caching

One run may contain issues from personal repositories and from one or more
organizations. Each repository owner is observed once per immutable snapshot.
Native catalogs use a subject-, owner-, repository-, credential-profile-, and
API-version-bound single-flight key. The Project schema is read once and reused
by all Project-field providers.

The implementation contract must publish exact request ceilings for 1, 10, and
100 issues. It may not reread a catalog per issue, reuse a catalog across
incompatible subjects or scopes, or switch credentials after authorization or
budget failure. Truncated or stale catalogs are not planning evidence.

## Duplicate representation and migration

Steady state never writes both representations for one issue. During an
explicit migration observation only, both values may be read:

- equal values produce a migration observation and no dual write;
- conflicting values return `YKP-WORKTYPE-003` and zero mutation;
- organization-owned repository migration may copy `Work Type` to native Type;
- user-owned repository migration retains `Work Type` and never attempts native
  Type;
- removal of a custom field requires a separate reviewed plan after complete
  convergence and a zero-operation second apply.

There is no bidirectional synchronization, implicit precedence repair, label
fallback, or field deletion in this contract.

## Credentials and permissions

Project and repository authority are independent:

- repository catalog discovery requires repository metadata read;
- assigning native Type requires repository issue-write authority and provider-
  documented push access;
- Project field observation uses the Project read profile;
- Project field mutation uses the separately controlled Project write profile;
- creating or changing an organization's Issue Type catalog is administration,
  requires organization `Issue Types: write`, and is outside reconciliation.

Separate adapters may hold separate credentials. A credential is injected once
and cannot be substituted, broadened, or reused across an unapproved owner.

## Diagnostics

| Code | Meaning |
| --- | --- |
| `YKP-WORKTYPE-001` | repository owner or provider selection is unavailable or inconsistent |
| `YKP-WORKTYPE-002` | the selected provider lacks an exact usable type or field option |
| `YKP-WORKTYPE-003` | native Type and custom Work Type conflict during migration observation |
| `YKP-WORKTYPE-004` | required authentication is unavailable |
| `YKP-WORKTYPE-005` | authenticated subject lacks the required authority |
| `YKP-WORKTYPE-006` | provider or transport rejected the bounded operation |
| `YKP-WORKTYPE-007` | response, scope, cache, receipt, or verification invariant failed |
| `YKP-WORKTYPE-008` | REST budget reserve cannot admit the operation |

Messages are static. Public reports contain only the code, provider kind,
logical operation count, and redacted outcome. They never contain credentials,
provider bodies or messages, IDs, URLs, ETags, cache contents, catalog contents,
field values, or private consumer identity.

## Acceptance and implementation gates

Implementation remains blocked until this exact contract is explicitly
accepted. The implementation PR must use synthetic owner/repository fixtures
and prove:

1. all four ownership combinations and mixed Projects;
2. one provider per issue and zero dual writes;
3. REST-only native Issue Type discovery, update, and verification;
4. no native Issue Type request for a personal repository;
5. deterministic conflict denial with zero mutation;
6. catalog/schema reuse and exact ceilings for 1, 10, and 100 issues;
7. success for both providers with GraphQL remaining zero;
8. credential separation, budget denial, redaction, and zero hidden retry;
9. fresh verification and an independently authorized zero-operation second apply.

Acceptance authorizes implementation and a reviewable PR only. It does not
authorize merge, live provider access, Project schema change, apply, backfill,
field removal, release, deployment, repository transfer, or consumer migration.
