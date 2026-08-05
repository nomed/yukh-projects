# Resumable rate-limit deferral v1 — accepted specification

- **Status:** Accepted
- **Accepted:** 2026-08-05 by `@nomed`
- **Governing issues:** [#117](https://github.com/nomed/yukh-projects/issues/117), [#115](https://github.com/nomed/yukh-projects/issues/115)
- **Decision:** [ADR 0003](../adr/0003-resumable-rate-deferral.md)

## Boundary

When a REST or GraphQL reserve prevents safe progress, Action, CLI, skill transport, and mutation transport stop. They do not sleep, poll, dispatch themselves, switch credentials, or retry a mutation. They may emit a `deferred-receipt-v1`; only a durable host may schedule a fresh process after the stated reset.

The receipt is coordination evidence, not mutation authority. It contains no token, login, repository name, issue content, provider identifier, URL, request payload, approval, nonce, claim, lease, or replayable operation.

## Receipt schema

The receipt is a JSON object with exactly these fields. Unknown fields and unknown versions fail closed.

| Field | Contract |
| --- | --- |
| `schema` / `version` / `status` | `1`, `deferred-receipt-v1`, `deferred` |
| `reason` | `rest-reserve`, `graphql-reserve`, or `provider-secondary-limit` |
| `issued_at_ms` | Non-negative integer host time |
| `resume_after_ms` | Earliest fresh attempt; not before issuance |
| `resume_by_ms` | Deferral expiry; not before `resume_after_ms` and no later than 24 hours after issuance |
| `bindings` | SHA-256 lowercase hex digests of scope and request, plus a plan digest or `null` when no plan exists |
| `ownership` | Either durable retained ownership with hashed wake-up and cancellation handles, or governed handoff with both handles `null` |
| `fresh_approval_required` | Whether the next process must obtain new approval before any mutation |

Valid retained ownership is exactly:

```json
{"disposition":"retained","mode":"durable-host","wakeup_digest":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","cancellation_digest":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"}
```

Without a durable, observable, cancellable wake-up, ownership is not retained:

```json
{"disposition":"handoff","mode":"governed-handoff","wakeup_digest":null,"cancellation_digest":null}
```

## Host lifecycle

The host owns the state machine `ready -> deferred -> resumable -> complete|deferred|blocked`. `ready`, `deferred`, and `resumable` may transition to `cancelled`. A durable deferral records the receipt and wake-up atomically, exposes status and cancellation to the operator, and cancels the wake-up when `resume_by_ms` expires.

The host must not retain ownership when it cannot prove durable storage, a bounded wake-up, cancellation, immutable receipt bindings, and observable status. It emits governed handoff instead. Process memory, a shell sleep, an Action job, and an agent conversation alone are not durable hosts.

## Fresh resume preflight

At or after `resume_after_ms`, the coordinator starts a new process. It does not replay a request, response, command, or mutation captured before deferral. Before planning or applying it must:

1. validate the receipt version, time window, bindings, and ownership mode;
2. reacquire and verify the execution claim or lease;
3. fetch fresh GitHub rate state and a fresh repository/project snapshot;
4. recompute policy, request, and plan digests and converge against current state;
5. reacquire any expired approval or nonce and honor `fresh_approval_required`;
6. stop as `blocked` on mismatched bindings, cancellation, expiry, missing authority, or unsafe convergence;
7. emit a new receipt if reserves still prevent progress.

Completion and cancellation invalidate the wake-up. Receipts are append-only evidence and are never edited into a new authorization.

## Compatibility and migration

Existing Action and CLI releases keep their current stop/fail behavior; v1 does not reinterpret old outputs. The implementation release adds explicit, versioned deferred outputs. Consumers opt in by pinning the new immutable release and providing an external durable coordinator. A workflow step cannot treat the Actions runner itself as that coordinator.

The operator skill uses the same reasons and lifecycle but is not loaded by GitHub Actions. Skill distribution and Action/CLI release therefore remain distinct delivery mechanisms with one shared contract. GitHub App installation tokens are the preferred independent quota boundary; replacing a PAT with another token for the same user is not a resume strategy.

## Implementation gate

This specification adds validation only. It does not schedule work, retain claims, enable apply, retry network calls, or change production consumers. Implementation remains governed by #118; qualification and immutable release remain governed by #119.
