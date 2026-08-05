# ADR 0003: Resumable rate deferral is a host responsibility

- **Status:** Accepted
- **Date:** 2026-08-05
- **Accepted:** 2026-08-05 by `@nomed`
- **Governing issue:** [#115](https://github.com/nomed/yukh-projects/issues/115)
- **Related:** ADR 0002, controlled apply entrypoint v1

## Context

Yukh Projects already uses REST for supported operations, protects independent REST and GraphQL
reserves, and returns a deterministic deferred result before a request would cross a reserve. The
published Action and CLI deliberately do not sleep, poll, recursively dispatch, or retry a
mutation.

That boundary prevents duplicate or ambiguous writes, but it does not define what the caller must
do with a reset-bound deferred result. An interactive agent can mistake temporary provider
backpressure for a terminal blocker, release its execution ownership, and leave required Project
state incomplete. GitHub Actions consumers do not load Codex skills, so an operator-skill rule
alone cannot define their runtime behavior.

## Decision

### 1. Return a portable deferred receipt

Rate-aware entrypoints return a schema-versioned, redacted receipt with:

- status `deferred`;
- stable reason code for REST or GraphQL reserve;
- provider-declared `resumeAfter` in canonical UTC form;
- target, snapshot, plan, and policy digests when those bindings exist;
- whether fresh approval is required before resume;
- a bounded `resumeBy` deadline derived from accepted host policy.

The receipt contains no credential, provider body, provider identifier, URL, field value, issue
content, lease key, nonce, or caller-selected timestamp. Invalid, missing, past, or implausibly
distant reset information fails closed without synthesizing a retry time.

### 2. Keep waiting outside Action, CLI, and mutation transport

The JavaScript Action, CLI process, REST transport, and mutation transport never sleep, poll,
recursively dispatch, or automatically retry. They emit the deferred receipt and terminate without
claiming success.

A durable host may schedule one wakeup at `resumeAfter`. Supported hosts include an agent
coordinator, a queue-backed service, or a reusable workflow backed by an external scheduler. A
normal GitHub Actions job is not kept alive with `sleep`, and the published Action does not acquire
`actions:write` merely to dispatch itself.

### 3. Retain ownership only with a durable wakeup

A host may retain its execution claim or lease across rate deferral only when all of these hold:

- the reset is within the host's accepted maximum deferral window;
- a durable, observable wakeup has been recorded;
- cancellation remains possible;
- the target and desired-state bindings are immutable for the wait;
- the ownership mechanism explicitly supports the deferred state;
- retention cannot outlive its own lease or governance policy.

If the host cannot prove a durable wakeup, it records a governed handoff instead of silently
releasing ownership or reporting completion. Temporary, reset-bound backpressure alone is not a
terminal blocker.

### 4. Resume as a new run, never as request replay

At wakeup the host starts a fresh process. It rereads rate state, authentication, authorization,
target state, desired state, policy, ownership, lease, and convergence. It recalculates the plan
before any write.

No uncertain mutation request is replayed. If a previous request may have reached GitHub, fresh
convergence evidence determines whether another operation remains. Controlled apply still requires
every approval, nonce, lease, and precondition required by its accepted contract. An expired or
consumed approval requires a new approval; a deferred receipt never extends authorization.

### 5. Ship the same semantics through separate integration surfaces

The operator skill instructs agents to classify valid reset-bound deferral as resumable, retain
governed ownership only with a durable wakeup, and complete fresh verification before release.

Action and CLI users receive the same deferred receipt as explicit outputs. A separately reviewed
reusable-workflow or coordinator example demonstrates how to persist the receipt and request a
fresh run without granting the Action hidden scheduling or mutation authority. Consumers adopt the
behavior only by pinning an immutable release that declares this contract version.

### 6. Preserve independent quota isolation guidance

REST-first routing remains mandatory. A second PAT, OAuth token, or user access token for the same
GitHub user is not treated as independent quota. Shared automation should prefer short-lived
GitHub App installation tokens and webhook or queue-driven wakeups.

## State machine

```text
ready
  | rate reserve reached before request
  v
deferred --cancel/expiry/changed binding--> cancelled
  | durable wakeup + ownership still valid
  v
resumable
  | fresh preflight and convergence
  +--> complete
  +--> deferred
  +--> blocked
```

`blocked` is reserved for a non-reset-bound condition that cannot make progress under accepted
host policy. Repeated `deferred` transitions remain bounded by `resumeBy`; they never form an
unbounded loop.

## Consequences

- Agent hosts can finish required governance mutations after a short GitHub reset without pushing
  temporary backpressure back to the user.
- Action consumers do not gain the behavior from the skill alone; they must adopt the corresponding
  Action/CLI release and a durable host or scheduler integration.
- Existing dry-run and controlled-apply releases remain behaviorally unchanged.
- Apply authorization is never lengthened by waiting, so some resumes require a new human approval.
- A follow-up contract and implementation must define exact receipt fields, bounds, Action outputs,
  CLI exit behavior, coordinator interface, tests, and compatibility evidence before production
  implementation becomes ready.

## Rejected alternatives

- **Sleep inside the Action or CLI:** consumes runners, hides liveness, and couples process lifetime
  to provider reset timing.
- **Automatically retry mutations:** risks duplicate or ambiguous writes and violates the accepted
  mutation boundary.
- **Release ownership on every deferral:** creates incomplete governed state and races another
  executor after reset.
- **Retain ownership without durable wakeup:** can deadlock work indefinitely.
- **Switch user tokens:** does not isolate GitHub's per-user GraphQL budget.
- **Skill-only solution:** GitHub Actions and other non-agent consumers do not load Codex skills.

## Follow-up work

1. Specify the deferred receipt and bounded host interface.
2. Update and validate `github-projects-rest-first`.
3. Add synthetic Action/CLI/coordinator tests with no live mutations.
4. Build and verify committed Action bundles.
5. Qualify an immutable release and document consumer pin migration and rollback.
