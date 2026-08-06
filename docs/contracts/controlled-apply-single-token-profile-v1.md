# Controlled apply single-token profile v1 — reviewed amendment

- **Status:** Reviewed implementation amendment
- **Governing issue:** #140
- **Supersedes:** the credential-separation rule in controlled apply entrypoint
  v1 only for the exact mode below

## Narrow exception

`legacy-single-token-apply-v1` is an additional exact controlled-apply mode
for one reviewed, fixed legacy compatibility profile. It is the only mode in
which `github-read-token` and `github-write-token` may contain the same
credential. `apply` and `legacy-apply-v1` still reject a shared credential
before host creation or provider access.

Mode selection is independent of host enablement, protected environment,
approval, and policy content. The protected host capsule still binds the exact
owner, repository, Project, issue, permissions, rate policy, and coordination
authority; a caller cannot widen the reviewed profile by changing an Action or
CLI input.

## Preserved controlled-apply gates

The mode selects only the legacy compatibility planner and credential exception.
It retains an exact fresh plan and signed approval, whole-plan rate admission,
nonce consumption, fenced lease, precondition inspection, one mutation attempt
per operation, targeted invalidation and verification, and final zero-operation
convergence. It adds no retry, continuation, credential switching, mutation
kind, permission, or provider endpoint.

The CLI continues to require distinct credential file descriptors even when
their bounded contents are equal. Tokens remain masked or unreadable from
public reports and logs.

This amendment authorizes no consumer workflow change, live provider call,
release, or deployment.
