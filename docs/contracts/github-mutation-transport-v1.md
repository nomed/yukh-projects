# GitHub mutation transport v1 — accepted specification

- **Status:** Accepted
- **Accepted:** 2026-08-02 by `@nomed`
- **Issue Type extension accepted:** 2026-08-04 by `@nomed` in [#101](https://github.com/nomed/yukh-projects/issues/101)
- **Issue Type route superseded:** REST mutation transport v3 removes `set_issue_type` from this GraphQL surface
- **Governing issue:** [#28](https://github.com/nomed/yukh-projects/issues/28)
- **Security boundary:** approved internal mutation discriminator to one bounded GitHub GraphQL mutation request

## Objective

The transport is the only component permitted to hold a GitHub write credential or mutation documents. It translates one executor-approved internal operation into exactly one fixed request to `https://api.github.com/graphql`. It does not approve, order, retry, inspect preconditions, or verify convergence.

Accepting or implementing this contract does not authorize a live mutation. A live request requires the separately approved exact plan ID and all executor gates.

## Structural interface

~~~typescript
type GitHubMutationKind =
  | "create_project_field"
  | "update_project_field_options"
  | "update_project_item_field_value"
  | "set_issue_type"
  | "add_sub_issue"
  | "add_blocked_by";

type GitHubMutationTransport = {
  execute(
    kind: GitHubMutationKind,
    variables: ValidatedMutationVariables,
    clientMutationId: string,
  ): Promise<MutationReceipt>;
};
~~~

The caller supplies no GraphQL, endpoint, HTTP method, header, credential, alias, directive, fragment, selection set, or provider error policy. Credential and fetch are injected once at construction and are never readable afterward. The constructor does not consult environment variables, files, workflow context, global configuration, clocks, or randomness.

Each `execute` call makes zero or one HTTP request. Unsupported or invalid input fails before HTTP. There is no retry, sleep, redirect, fallback, batching, persisted-query negotiation, REST path, alternate endpoint, or GitHub Enterprise mode.

## Fixed documents

Each immutable document has one named `mutation`, one top-level allowlisted field, one `$input` variable of the exact provider input type, and a minimal receipt selection. `clientMutationId` is always the executor-derived value and cannot be overridden inside variables.

| Kind | Operation name | GitHub field | Input type | Receipt |
| --- | --- | --- | --- | --- |
| `create_project_field` | `YukhCreateProjectField` | `createProjectV2Field` | `CreateProjectV2FieldInput!` | `clientMutationId`, created field `id` |
| `update_project_field_options` | `YukhUpdateProjectFieldOptions` | `updateProjectV2Field` | `UpdateProjectV2FieldInput!` | `clientMutationId`, updated field `id` |
| `update_project_item_field_value` | `YukhUpdateProjectItemFieldValue` | `updateProjectV2ItemFieldValue` | `UpdateProjectV2ItemFieldValueInput!` | `clientMutationId`, item `id` |
| `set_issue_type` | `YukhSetIssueType` | `updateIssueIssueType` | `UpdateIssueIssueTypeInput!` | `clientMutationId`, issue and Issue Type `id` |
| `add_sub_issue` | `YukhAddSubIssue` | `addSubIssue` | `AddSubIssueInput!` | `clientMutationId`, parent and sub-issue `id` |
| `add_blocked_by` | `YukhAddBlockedBy` | `addBlockedBy` | `AddBlockedByInput!` | `clientMutationId`, blocked and blocking issue `id` |

Documents contain no second operation, variable default, alias, directive, caller-selected fragment, or introspection field. The build validates their AST and exact operation/field/input/selection allowlist. A pinned build-time parser may be used only as a development dependency; consumer runtime installation remains forbidden.

## Variable mapping

All provider IDs are opaque, non-empty, control-free strings of at most 256 Unicode scalar values obtained from the fresh preflight binding. `clientMutationId` is exactly 64 lowercase hexadecimal characters. Unknown keys and `undefined` values fail closed.

### Create field

Input is exactly `projectId`, `dataType`, `name`, optional `singleSelectOptions`, optional reviewed `iterationConfiguration`, and `clientMutationId`. Supported provider types are `TEXT`, `SINGLE_SELECT`, `NUMBER`, `DATE`, and a completely reviewed `ITERATION`. `MULTI_SELECT` is unsupported in v1.

Field name is the accepted policy display name, 1–128 safe scalar values. Single-select creation submits the complete accepted option vocabulary. Each option contains name, one of the eight provider colors, and a bounded description. Iteration creation fails unless every required configuration value is present in accepted policy and fresh schema planning.

### Add option

Input is exactly `fieldId`, `singleSelectOptions`, and `clientMutationId`. The submitted list is the exact freshly observed ordered option list plus one new option. Existing option ID, name, color, description, and order are preserved exactly. Missing, duplicated, reordered, changed, or unrecognized existing metadata denies before HTTP.

Until policy explicitly supports presentation metadata, the new option color is `GRAY` and description is the empty string. This default is public product behavior, not inferred from a consumer.

### Set item field value

Input is exactly `projectId`, `itemId`, `fieldId`, `value`, and `clientMutationId`. `value` contains exactly one of `text`, `number`, `date`, `singleSelectOptionId`, or `iterationId`. `multiSelectOptionIds` and null/clear values are forbidden. Strings and numbers retain accepted core bounds; provider IDs come only from fresh bindings.

### Set Issue Type

Input is exactly `issueId`, `issueTypeId`, and `clientMutationId`. Both IDs come from the fresh bound snapshot. The receipt must return the same issue and Issue Type IDs. Clearing, creating, renaming, disabling, or deleting an Issue Type is forbidden.

### Set parent

Input is exactly parent `issueId`, child `subIssueId`, `replaceParent: false`, and `clientMutationId`. `subIssueUrl` is forbidden. Both issue IDs must resolve from fresh state in the approved repository.

### Add dependency

Input is exactly blocked `issueId`, `blockingIssueId`, and `clientMutationId`. Both IDs must resolve from fresh state in the approved repository.

## HTTP and response boundary

The request uses POST, redirect mode `manual`, API version `2022-11-28`, JSON content type, GitHub JSON accept header, and injected bearer credential. Request JSON contains only `query` and `{input}` variables. Authorization is never accepted as a per-call value.

Response requirements are HTTP 2xx, JSON content type, valid UTF-8 JSON, at most 2 MiB, no GraphQL errors, one expected payload, matching `clientMutationId`, and all expected receipt IDs matching the supplied fresh binding. Null payload, partial data, extra top-level mutation payload, mismatched ID, or schema drift is failure. A valid receipt means only `provider_accepted`; the executor must still reread and verify state.

Redirects; 401; 403; 429; 502, 503, or 504; other non-2xx statuses; malformed JSON; and GraphQL errors map to stable redacted classes. None is automatically retried.

## Permissions and credential separation

The credential is short-lived where supported and is created outside the transport. Required permissions are computed from the approved operation set before construction:

- Project field or item value operations: organization Projects write and minimum metadata read;
- parent or dependency operations: repository Issues write and minimum metadata read.

If both classes are absent, no write transport is created. Contents, administration, workflow, packages, deployments, secrets, and unrelated repository access are forbidden. Read and write credentials and transport instances remain separate. An attestable excess-permission delta denies live apply unless the exact delta is independently approved.

## Schema compatibility

Build and startup compatibility checks compare an allowlisted metadata manifest containing operation names, input field names/types, enum values, and payload field names. Remote compatibility discovery uses GraphQL introspection queries only and never sends a mutation document. Missing or changed required metadata disables the affected kind before approval consumption.

The manifest contains provider schema metadata only—no endpoint response samples, consumer IDs, node IDs, repository state, or credentials. Runtime compatibility checks are bounded, read-only, redacted, and cached only within the apply process.

## Diagnostics, audit, and redaction

Stable failures distinguish invalid input, unsupported kind, schema incompatibility, authentication, authorization, rate limit, transport failure, redirect, response limit, malformed response, GraphQL rejection, and receipt mismatch. Public messages are static.

Raw request/response bodies, documents, variables, headers, tokens, provider messages/extensions, IDs, URLs, option values, field values, stack traces, and request IDs never enter errors, audit callbacks, or public reports. Redaction occurs before error construction. Unclassifiable failure collapses to a static deny.

Private audit receives only mutation kind, plan ID, operation key, client-mutation digest, outcome class, and host-supplied timestamp. It never receives the credential or transport payload.

## Implementation and live-apply gates

Implementation requires explicit acceptance and synthetic tests proving exact AST allowlists, variable rejection, fixed HTTP behavior, one-request maximum, response/receipt validation, error classification, zero retry, credential non-disclosure, permission denial, and schema-drift denial. Tests use invented IDs and injected fetch only.

No test or implementation PR may send a mutation to GitHub. A live apply requires all of the following later:

1. a concrete public or privately governed target;
2. a fresh complete dry-run with exact plan ID and operation list;
3. reviewed permission delta and short-lived credential source;
4. explicit human approval naming that plan ID;
5. post-apply and repeated idempotency evidence.
