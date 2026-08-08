# GitHub read-only adapter v1 — accepted specification

- **Status:** Accepted
- **Accepted:** 2026-08-02 by `@nomed`
- **Governing issue:** [#18](https://github.com/nomed/yukh-projects/issues/18)
- **Security boundary:** authenticated GitHub responses to validated, scope-bound planner observations

## Objective

The adapter discovers the minimum GitHub repository, issue, Project schema, Project item, and relationship state needed by the accepted pure core. It cannot execute mutations. Network access, authentication, pagination, provider identifiers, and raw provider responses terminate at this boundary.

The adapter does not authorize a plan, decide policy, or render a public report. Authentication never implies authorization: every successful read is bound independently to the requested subject and resources.

## Structural separation

~~~typescript
type AllowedReadOperation =
  | "resolve_scope"
  | "read_project_fields"
  | "read_project_item"
  | "read_issue_relationships";

type ReadOnlyTransport = {
  execute(
    operation: AllowedReadOperation,
    variables: Readonly<Record<string, unknown>>,
  ): Promise<unknown>;
};
~~~

The transport accepts an operation discriminator and variables, never a query string, URL, HTTP method, header, or credential. The adapter owns immutable GraphQL query documents for the four allowlisted operations. Each document MUST have a named `query` operation, MUST NOT contain a `mutation` or subscription operation, and MUST target the fixed public GitHub GraphQL endpoint selected by the host integration.

The adapter accepts a transport through dependency injection. It does not read environment variables, credential files, workflow context, the filesystem, clocks, randomness, or process-global network clients. A host creates the authenticated transport. Credentials never enter adapter inputs or outputs.

Redirects, arbitrary GraphQL, configurable endpoints, GitHub Enterprise Server, REST fallback, batching, and automatic persisted-query negotiation are outside v1.

## Requested scope

~~~typescript
type RequestedGitHubScope = {
  subjectRef: string;
  ownerLogin: string;
  repositoryName: string;
  projectNumber: number;
  issueNumber: number;
};
~~~

Every string is trimmed, non-empty, contains no control character, and is at most 256 Unicode scalar values. `projectNumber` and `issueNumber` are positive safe integers. Owner and repository names use GitHub's documented login/name character set and are compared using the exact normalized form returned by GitHub; no fuzzy matching is allowed. `subjectRef` is an opaque host-attested installation or principal reference and is never sent as a resource selector.

`resolve_scope` MUST resolve and bind the authenticated subject, repository owner and name, issue number and membership, Project owner and number, and optional Project item membership. The adapter rejects missing resources, scope mismatch, cross-repository nodes, a Project owned by another requested owner, and multiple Project items for the same issue. Returned node IDs are opaque internal bindings and never become configuration.

## Allowlisted reads

- `resolve_scope` resolves and cross-checks the bound repository, issue, Project, and optional Project item.
- `read_project_fields` reads definitions and supported option or iteration metadata only for the bound Project.
- `read_project_item` reads values only for the single Project item bound to the requested issue.
- `read_issue_relationships` reads parent, sub-issue, and dependency relationships supported by GitHub for the bound issue. Cross-repository endpoints fail closed; absent provider support is not an empty graph.

An implementation MAY split a logical read into fixed internal query documents for GraphQL connection boundaries. The public operation set and limits remain unchanged, and no caller-controlled document is introduced.

## Pagination and resource limits

Every connection uses forward cursor pagination with `first: 50`. The adapter permits at most:

| Resource | Limit |
| --- | ---: |
| pages per connection | 20 |
| fields | 256 |
| options or iterations per field | 256 |
| Project items examined | 1,000 |
| field values on the bound item | 256 |
| relationship nodes | 512 |
| dependency edges | 4,096 |
| response bytes per page | 2 MiB |
| cumulative response bytes per adapter call | 16 MiB |
| GraphQL errors per response | 32 |

The transport MUST expose the raw response byte count without exposing the raw body. Absence of a byte count fails closed.

`hasNextPage: true` requires a non-empty `endCursor`. A cursor must advance and never repeat. Node IDs within and across pages must be unique unless explicitly defined as the repeated scope anchor. Limit exhaustion, duplicate nodes, cursor regression, inconsistent `totalCount`, or scope-anchor change fails the complete read. Truncation is never complete state.

## Validated output

~~~typescript
type GitHubObservation = {
  scope: BoundGitHubScope;
  projectSchema: ObservedProjectSchema;
  item: ObservedItem | null;
  relationships: ObservedRelationshipGraph;
  evidence: {
    schema: 1;
    operationCounts: Readonly<Record<AllowedReadOperation, number>>;
    pageCount: number;
    fingerprint: string;
  };
};
~~~

The fingerprint is lowercase hexadecimal SHA-256 over a canonical internal representation of validated bindings and observations, excluding raw responses and credentials. Provider order never affects it. It is a precondition token, not proof of authorization or freshness.

Logical keys resolve only through accepted repository policy. Provider IDs remain adapter-private. Unknown, malformed, duplicated, unsupported, or ambiguously mapped values fail closed when they affect managed state. Any failed operation, page, binding, or limit returns no partial observation.

## Failure and retry semantics

V1 performs no automatic retries. A host may start a new complete read after explicit classification, using new scope resolution.

| Code | Meaning | Retry classification |
| --- | --- | --- |
| `YKP-GH-READ-001` | requested scope invalid | never |
| `YKP-GH-READ-002` | authentication absent or invalid | after credential repair |
| `YKP-GH-READ-003` | permission or access denied | after authorization repair |
| `YKP-GH-READ-004` | transport or provider unavailable | explicit full-read retry permitted |
| `YKP-GH-READ-005` | response or collection limit exceeded | never without review |
| `YKP-GH-READ-006` | subject or resource binding mismatch | never |
| `YKP-GH-READ-007` | pagination invariant violated | never |
| `YKP-GH-READ-008` | response shape unsupported or malformed | after compatibility review |
| `YKP-GH-READ-009` | primary or secondary rate limit | after provider-declared reset |
| `YKP-GH-READ-010` | safe diagnostic could not be constructed | never |
| `YKP-GH-READ-011` | required provider capability unavailable | after capability review |

HTTP `429`, `502`, `503`, and `504` may be classified retryable, but the adapter never sleeps or retries. Other statuses are not retryable by default. A bounded reset hint may be returned privately to the host and is excluded from reports and fingerprints.

## Redaction

Public diagnostics contain only schema version, stable code, severity, safe static message, logical operation, and retry classification. They exclude credentials; raw bodies; GraphQL messages or extensions; URLs; paths; documents; variables; headers; all provider and consumer identifiers; cursors; request IDs; stack traces; and transport-library messages.

Unsafe failures collapse to `YKP-GH-READ-010`. Redaction occurs before logging, serialization, callbacks, or error construction, not as post-processing.

## Permission profile

The host credential MUST provide organization Projects, repository metadata,
and issue read permissions sufficient for the fixed operations. A short-lived
credential restricted to those reads remains the recommended least-privilege
profile. An existing supplied credential that also has write permissions MUST
NOT be rejected or fail dry-run or legacy-shadow qualification solely because
of that excess scope. The adapter has no mutation transport, apply host,
approval input, or controlled-apply authority, so excess permissions confer no
additional behavior.

If the transport can attest that a credential is overprivileged, the adapter emits a non-public permission-delta warning. Excess privilege never becomes authorization.

## Compatibility and rollback

Adding an operation, endpoint, provider, resource class, exposed identifier, retry, or fallback; widening a limit; weakening scope comparison; accepting partial state; or changing fingerprint inputs requires public-contract and security review. Any mutation requires a separate accepted contract and threat-model update.

Rollback removes the host integration and discards observations. The pure core retains no network dependency.

## Implementation gate

Implementation follows only after explicit acceptance. Tests use an injected synthetic transport and invented fixtures only. They MUST prove query-only allowlisting, arbitrary-document and URL impossibility, exact scope binding, pagination progression, every resource limit, duplicate rejection, atomic failure, stable fingerprints, zero retry, credential absence, provider-error redaction, permission-delta reporting, and structural absence of mutation capability.

A live GitHub read-only probe is a later, separately reviewed validation step using a dedicated least-privilege credential with no consumer identity in public evidence.
