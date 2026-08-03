---
name: github-projects-rest-first
description: Route GitHub issue, pull request, Actions, check-run, and Projects v2 work through rate-aware REST APIs while reserving GraphQL for unsupported operations. Use when Codex inspects or updates GitHub Projects, checks delivery state, monitors CI, encounters GraphQL rate limits, or designs GitHub automation that must avoid exhausting a shared user quota.
---

# GitHub Projects REST First

Use REST for every supported operation. Treat GraphQL as a reviewed fallback, not the default.

## Workflow

1. Run `scripts/github-rest-first.sh rate` before a multi-request workflow.
2. Use the helper's allowlisted read commands for Projects, issues, pull requests, checks, and Actions.
3. Read `references/operations.md` before a Project mutation or GraphQL fallback.
4. Cache repeated GETs. Do not use `gh project`, `gh pr checks --watch`, `statusCheckRollup`, or an unbounded polling loop.
5. Stop when the relevant reserve is reached. Resume only after GitHub's declared reset.
6. Never print, copy, or infer credentials. Authentication does not grant mutation authorization.

## Read commands

Run from this skill directory or use an absolute script path:

```sh
scripts/github-rest-first.sh rate
scripts/github-rest-first.sh project example-org 7
scripts/github-rest-first.sh fields example-org 7
scripts/github-rest-first.sh items example-org 7
scripts/github-rest-first.sh item example-org 7 42 101,102
scripts/github-rest-first.sh user-project example-user 7
scripts/github-rest-first.sh user-fields example-user 7
scripts/github-rest-first.sh user-items example-user 7
scripts/github-rest-first.sh issue example-org example-repo 11
scripts/github-rest-first.sh pull example-org example-repo 12
scripts/github-rest-first.sh checks example-org example-repo 0123456789abcdef0123456789abcdef01234567
scripts/github-rest-first.sh run example-org example-repo 123456
```

The helper pins GitHub API version `2026-03-10`, validates selectors, checks the REST reserve, and uses `gh api --cache` for GETs. Override only the documented numeric reserves or cache duration:

```sh
YKP_REST_RESERVE=500 YKP_REST_CACHE_TTL=10m scripts/github-rest-first.sh fields example-org 7
```

## Mutation boundary

Before any write:

1. Verify the governing issue, readiness, authorization, and execution ownership.
2. Read fresh state with REST and record the exact item, field, option, and desired value.
3. Restate the exact target and mutation to the user.
4. Use only the fixed REST endpoint and schema documented in `references/operations.md`.
5. Read the target again and verify convergence.

Never accept a caller-supplied URL, GraphQL document, HTTP header, or token. Never retry a mutation automatically.

## GraphQL fallback

Use GraphQL only when the operation has no REST equivalent. Before sending it:

- confirm the missing REST capability against current official GitHub documentation;
- require at least `YKP_GRAPHQL_RESERVE` points after the estimated query cost;
- request `rateLimit { cost remaining resetAt }` in the same query instead of a second probe;
- paginate narrowly and stop on any incomplete page;
- never poll GraphQL.

Default reserve: 500 points. A second PAT or OAuth token for the same user is not a separate user budget. Prefer a GitHub App installation token when independent automation quota is required.
