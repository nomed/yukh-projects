# Controlled mutations v1 — accepted specification

- **Status:** Accepted
- **Accepted:** 2026-08-02 by `@nomed`
- **Issue Type extension accepted:** 2026-08-04 by `@nomed` in [#101](https://github.com/nomed/yukh-projects/issues/101)
- **Governing issue:** [#24](https://github.com/nomed/yukh-projects/issues/24)
- **Security boundary:** accepted complete plan and explicit approval to bounded GitHub mutations and verified convergence

## Objective

V1 may execute only the non-destructive operations emitted by the accepted planner, against the exact subject and resources used to create that plan. A valid plan is not authorization. Authentication is not authorization. Apply requires an independently enabled host, a verified approval artifact, fresh matching state, and a least-privilege write credential.

No public API in the pure parser, policy, planner, report, or read adapter acquires mutation capability.

## Apply request and gates

~~~typescript
type ApplyRequest = {
  plan: ReconciliationPlan;
  approval: unknown;
  enablement: "apply-explicitly-enabled";
};
~~~

The executor accepts only a complete plan whose `executable` value is true, diagnostics are empty, operation dependency graph is valid, and canonical digest reproduces `planId`. It rejects empty or partial plan serialization, unknown fields, unknown operations, and any operation whose environment is not exactly `dry-run`.

The host supplies an approval verifier, a nonce store, a monotonic concurrency lease, a read adapter, and a mutation transport. The executor does not read environment variables, files, workflow context, clocks, randomness, credentials, or process-global network clients.

All of these independent gates are mandatory:

1. host apply enablement equals the exact literal above;
2. the approval verifier authenticates the approval artifact;
3. approval claims exactly match the plan and requested scope;
4. the approval is unexpired and its nonce is unused;
5. a repository–Project–issue lease is acquired;
6. fresh read and replanning reproduce the same `planId` and operation set;
7. every operation and required provider capability is supported before the first mutation.

Any uncertainty denies the complete apply.

## Approval claims

The verified claims contain schema version, issuer, subject reference, repository reference, Project reference, issue reference and number, plan ID, canonical operation-set digest, environment `apply`, issued-at, expiry, and a 128-bit-or-stronger nonce. String references are bounded as in the planning contract and remain private.

Approval lifetime is at most 15 minutes. Time comparison is supplied by the trusted host. The nonce is atomically consumed immediately after all preflight checks and before the first mutation. A consumed nonce can never authorize a retry, continuation, or second apply, including after partial failure. A new run requires a new plan and approval.

An approval cannot authorize a subset, superset, reordered operation graph, different precondition, different scope, or updated plan with the same human-readable intent.

## Fixed mutation allowlist

The mutation transport accepts an internal operation discriminator and bounded variables, never a GraphQL document, URL, HTTP method, header, or credential.

| Planner operation | Fixed GitHub mutation | Additional requirements |
| --- | --- | --- |
| `create_field` | `createProjectV2Field` | reviewed kind and exact initial options/configuration; Project binding unchanged |
| `add_option` | `updateProjectV2Field` | submit exact observed options plus the one reviewed option; no rename, removal, reorder, color or description change |
| `set_field_value` | `updateProjectV2ItemFieldValue` | existing bound item, field and option/iteration IDs resolved from fresh state |
| `set_issue_type` | REST `PATCH /repos/{owner}/{repo}/issues/{number}` | organization-owned repository, exact enabled Issue Type name resolved from fresh state; clearing is forbidden |
| `set_parent` | `addSubIssue` | parent is currently absent; `replaceParent` is exactly false |
| `add_dependency` | `addBlockedBy` | normalized blocker and blocked issues are both in the bound repository |

`addProjectV2ItemById` is not supported in v1. A missing Project item makes the whole apply unsupported before mutation. Clear, delete, remove, archive, close, rename, conversion, replacement, draft-item, position, view, workflow, repository-link, bulk, and arbitrary mutations are forbidden.

Iteration-field creation or modification is unsupported unless the accepted policy and observed provider capability produce a complete reviewed configuration. Unsupported kinds or values deny the whole apply.

All mutation documents are immutable, named, and contain exactly one allowlisted mutation field. Caller-provided aliases, fragments, directives, extra selection sets, and `clientMutationId` values are forbidden. The executor derives `clientMutationId` as a bounded digest of plan ID and operation key; it is correlation evidence, not provider-enforced idempotency.

## Preflight and operation execution

The executor obtains a new complete GitHub observation under the lease and reruns effective-schema calculation and reconciliation planning from the original validated contract and policy. The new canonical plan ID and ordered operation set must equal the approved values byte-for-byte.

Immediately before each operation, the executor rereads the minimum affected resource and validates every exact precondition. An operation already converged is recorded as `already_converged` and no mutation is sent. A precondition mismatch that is not exact convergence stops execution.

Operations execute in the accepted deterministic order. Dependencies must have outcome `applied`, `verified`, or `already_converged`. Exactly one HTTP request is permitted per mutation attempt. V1 performs no automatic retry, including for rate limits or transient errors.

After every successful provider response, the executor rereads the affected resource. Only matching intended state changes the outcome to `verified`. A successful HTTP or GraphQL response alone is insufficient.

## Failure and partial progress

Execution stops on the first unknown result, provider error, verification mismatch, lease loss, approval invalidation, or dependency failure. Later operations are marked `not_attempted`. Completed additive mutations are not automatically rolled back because compensating removal could be destructive or erase concurrent work.

The private result distinguishes:

- `already_converged` — no mutation sent;
- `applied` — provider accepted, verification pending;
- `verified` — fresh read matches intent;
- `failed` — mutation or verification failed;
- `not_attempted` — stopped before execution.

An interrupted or partial run can never resume from its old approval. The next run starts with a fresh full read, new plan, new approval, and a new nonce. Idempotency is proven through state convergence and exact preconditions, not blind replay.

## Final verification

After all operations verify, the executor performs a new complete read and reconciliation. Success requires:

~~~json
{
  "executable": true,
  "operations": [],
  "diagnostics": []
}
~~~

The result also records the approved plan ID, final observation fingerprint, operation outcome counts, and `remaining: 0`. A non-empty final plan is a verification failure even when every mutation response reported success.

## Audit and redaction

Private audit events record stable event type, plan ID, operation key, logical resource/action, approval issuer reference, nonce digest, gate outcome, retry classification, and timestamps supplied by the host. They never contain approval artifacts, signatures, credentials, raw GraphQL, variables, URLs, provider errors, consumer content, or provider identifiers.

Public output contains only schema version, plan ID, aggregate outcome counts, remaining count, and static redacted diagnostics. Provider and consumer identifiers, values, preconditions, item content, approval claims, nonce, lease key, and timestamps are excluded.

Redaction occurs before error construction, callbacks, logging, or serialization. An unsafe failure collapses to a static diagnostic and stops execution.

## Concurrency and permissions

The host lease key binds repository, Project, and issue. Lease acquisition and renewal are fail-closed; loss stops before the next mutation. The lease does not replace fresh preconditions.

The write credential is injected only into the fixed mutation transport, is short-lived where supported, and has repository issues write plus organization Projects write only when required by the approved operations. Contents, administration, workflow, packages, and unrelated repository permissions are forbidden. Read and write transports remain separate objects.

## Compatibility, rollback, and implementation gate

Adding a mutation, retry, destructive behavior, implicit item creation, approval mode, credential source, provider, endpoint, fallback, or partial authorization requires a new accepted contract and threat-model review.

Rollback of this specification is removal of the executor. Applied additive state remains and must be changed only through a newly planned and approved operation.

Implementation follows only after explicit human acceptance. Tests use invented fixtures and injected transports/verifiers only and must prove every gate, approval mismatch and replay, stale plan rejection, no-mutation convergence, operation ordering, dependency blocking, stop-on-first-failure, zero retry, partial-result accuracy, lease loss, post-operation verification, final zero-plan convergence, redaction, and structural absence of arbitrary or destructive mutations.

No live mutation is authorized by accepting this specification or its implementation. A live apply requires a separately reviewed exact dry-run plan and explicit approval naming that plan ID.
