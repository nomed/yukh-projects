# Controlled apply entrypoint v1 — accepted specification

- **Status:** Accepted
- **Proposed:** 2026-08-03
- **Accepted:** 2026-08-03 by `@nomed`
- **Governing issue:** [#56](https://github.com/nomed/yukh-projects/issues/56)
- **Read-only baseline:** `v1.2.0` at `2fc81c48b678428937209326bececcf52354aaf1`
- **Security boundary:** explicit operator request and authenticated approval to one bounded, freshly verified mutation run

## Scope and invariant

This contract exposes the accepted controlled executor through separate apply
Action and CLI entrypoints. It does not add mutation kinds or relax the accepted
controlled-mutations contract. Dry-run remains a structurally separate bundle and
dependency graph with no mutation imports.

A plan is evidence, not authorization. A credential is capability, not
authorization. Apply proceeds only when explicit mode, host enablement,
authenticated approval, fresh state, scope binding, nonce and lease gates all
agree exactly. Any uncertainty fails before mutation.

## Fixed inputs

The apply Action accepts only these named inputs:

| Input | Required | Contract |
| --- | --- | --- |
| `mode` | yes | exact literal `apply`; no default or alias |
| `github-read-token` | yes | masked, short-lived read profile |
| `github-write-token` | yes | separately masked least-privilege write profile |
| `owner` | yes | validated canonical owner login |
| `repository` | yes | validated canonical repository name |
| `project-number` | yes | bounded positive decimal |
| `issue-number` | yes | bounded positive decimal |
| `policy-path` | no | bounded workspace-relative regular file |
| `approved-plan-id` | yes | exact 64-character lowercase digest |
| `approval-file` | yes | workspace-relative, non-symlink, exclusively read bounded artifact |
| `environment` | yes | exact configured protected environment name |

The CLI uses the same long options, with both credentials read from distinct
single-use file descriptors. Tokens, approvals and signatures are forbidden in
arguments, environment discovery, reports and logs. There is no interactive
prompt, inference from git remotes or event payloads, alternate endpoint, shell
hook, arbitrary GraphQL, resume flag, force flag or partial-apply selector.

The host separately injects the exact literal enablement
`apply-explicitly-enabled`. `mode=apply` and enablement are independent gates.
Neither may be derived from the other or from approval contents.

## Approval envelope

The verifier accepts one versioned, bounded, authenticated envelope and returns
claims containing issuer and subject references; repository, Project and issue
bindings; plan ID and ordered operation-set digest; exact environment; issued-at,
expiry of at most 15 minutes and a nonce with at least 128 bits of entropy; and
contract, planner, snapshot and entrypoint versions.

All fields are mandatory and exact. Unknown fields, algorithms, issuers or
versions fail closed. Trust roots are host configuration, never repository policy.
Approval cannot authorize a subset, superset, reordered graph, changed
precondition, different subject/scope/environment/version, or a second run. The
nonce is atomically consumed after complete preflight and before the first write.

## Preflight and execution

Under a repository–Project–issue lease, the entrypoint validates inputs,
environment and credential profiles; verifies approval; obtains one fresh
rate-safe snapshot; recalculates and exactly matches the plan; proves every
operation and permission is allowlisted; consumes the nonce; revalidates each
precondition; sends exactly one fixed mutation request; freshly verifies each
effect; and stops on first failure or lease loss with no retry or compensation.

After invalidating affected observations it performs a final complete snapshot.
Success requires zero planned operations and zero diagnostics. An already
converged operation sends no mutation. A second apply needs a new dry-run,
approval and nonce and must send zero mutations; this is the idempotency proof.

The run reuses the one immutable REST-first Project snapshot for schema and
unaffected state. It never rereads Project schema once per issue or once per
operation. After a successful mutation it invalidates only the affected resource
group, performs the minimum targeted verification read, and performs one bounded
final convergence snapshot. Before every request the shared ledger proves the
declared REST or GraphQL reserve will remain intact. Budget exhaustion returns a
stable deferred result before network access. No polling, sleep, hidden retry,
per-issue full-Project fallback, or credential switching is permitted.

## Permissions, failure and redaction

GitHub App installation tokens are recommended. Read and write tokens remain
separate; the write token receives only issues write and organization Projects
write required by the approved operation set. Contents, administration, Actions,
workflows, packages, deployments and unrelated access are forbidden. OAuth or PAT
profiles require the same explicit permission-delta report. Credentials are never
substituted or broadened silently.

Stable failure classes distinguish input, authentication, authorization,
deferred rate budget, approval, replay, concurrency, provider, verification and
invariant failures. Public output contains only schema, plan digest, aggregate
outcomes, remaining count and static codes. Tokens, approvals, policy or issue
content, provider bodies/messages, IDs, URLs, ETags, cache data, nonces, lease keys
and timestamps are excluded.

There is no polling, sleep, hidden retry or continuation. Recovery always starts
with a fresh snapshot, plan, approval and nonce. Emergency disablement removes
host enablement; it can neither activate apply nor authorize cleanup.

## Distribution, rollback and gates

Apply uses a distinct reproducible bundle and immutable full commit/release pin.
The protected publisher produces checksums, SPDX SBOM and provenance attestations.
Read-only `v1.2.0` remains the rollback and shadow-audit pin. Executable rollback
does not reverse additive provider state.

No implementation, live mutation or apply-compatible release is authorized until
this contract is explicitly accepted. #57 implements only the accepted surface;
#58 separately qualifies gating, the zero-operation second apply, artifacts and
rollback.

Synthetic acceptance tests must cover every bound and gate, approval substitution
and expiry, replay, lease exclusion/loss, permission denial, stale-plan/TOCTOU,
mutation allowlisting, no retry, partial failures, invalidation, verification,
final zero convergence, the zero-mutation second apply, redaction and structural
separation from dry-run.
