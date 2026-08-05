# Agent instructions

## Mission

Build Yukh Projects as a secure, consumer-neutral reconciler for GitHub
Projects. Preserve the separation between observation, planning, and controlled
mutation so adopters can inspect intended changes before authority crosses the
provider boundary.

## Required reading

Before meaningful work, read:

1. `.context/manifest.yaml` and `.context/README.md`;
2. `.context/current.md` for navigation only;
3. this file and any nearer `AGENTS.md`;
4. accepted decisions and RFCs relevant to the reconciliation mode or release;
5. `NEUTRALITY.md`, `SECURITY.md`, and the governing issue or pull request.

## Reconciliation and security rules

- Treat GitHub responses, issue metadata, workflow inputs, policies, and
  provider errors as untrusted input.
- Keep dry-run and shadow paths structurally read-only. They must not obtain
  write authority, create provider state, or imply approval to apply.
- A controlled apply requires an exact fresh plan, explicit approval bound to
  that plan, least-privilege authority, concurrency protection, and targeted
  verification. Never split, retry, or silently resume a partial mutation.
- Fail closed on stale observations, ambiguous state, unavailable rate budget,
  authorization mismatch, or verification failure.
- Do not log or publish credentials, provider identifiers, private
  observations, approval material, raw provider responses, or operational
  traces. Errors and retained evidence must be redacted by construction.
- Keep executable dependencies and Actions pinned to immutable revisions.

## Consumer neutrality

- Use invented fixtures and neutral identities only. Do not introduce
  adopter-derived repositories, users, Projects, fields, identifiers, logs, or
  configuration into public files.
- Keep consumer policy, credentials, deployment configuration, and support
  data outside this repository.
- Stop and request private maintainer review if a change could disclose
  consumer-specific material.

## Context and delivery

- `.context/` is the sole durable local engineering-memory root. Do not create
  parallel decision, RFC, security, session, or handoff trees.
- Accepted decisions and RFCs are immutable; supersede rather than edit them.
- Work through a governing issue, on a focused branch and reviewed pull
  request. Every substantive pull request declares context, security,
  compatibility, and consumer-neutrality impact.
- Keep changes narrow. Add deterministic synthetic tests for behavioral
  changes, including failure paths and zero-effect deferral where applicable.
- Release only through the reviewed repository release process. Verify the
  immutable tag, release assets, and provenance before directing consumers to
  a new pin.
