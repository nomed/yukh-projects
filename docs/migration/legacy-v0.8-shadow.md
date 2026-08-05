# Legacy yukh v0.8 shadow migration

This profile allows an existing version-1 `.yukh/project.yaml` and hidden
`<!-- yukh ... -->` issue contracts to be audited without rewriting the backlog.
It is a read-only migration aid, not an apply-compatible release.

## Compatibility matrix

| Legacy capability | State | Successor behavior |
| --- | --- | --- |
| Version-1 repository policy | Supported | Parsed as a bounded compatibility input |
| Hidden issue contract and extensions | Supported | Read without changing issue bodies |
| Issue type and managed labels | Supported | Read through versioned REST and compared locally |
| Milestone | Supported | Read through versioned REST and compared locally |
| Project fields | Supported | Schema is read once; values are compared locally |
| Project-owned `Status` | Supported | Preserved when the policy does not govern it |
| Native parent | Supported | Read from REST Project item content |
| Native dependencies and blocking | Changed | One fixed bounded GraphQL batch is allowlisted; with zero GraphQL budget an incomplete REST observation is deferred |
| One-issue shadow dry-run | Supported | Uses one immutable REST-first snapshot |
| Backlog shadow audit | Supported | Up to 100 issue numbers reuse one snapshot; larger backlogs use explicit batches |
| Full apply and mandatory zero-operation second apply | Missing | Remains unavailable until the controlled-apply roadmap is complete |

The machine-readable report repeats this matrix. It contains operation counts,
stable diagnostic codes and request counts, but excludes credentials, provider
bodies, opaque IDs, ETags, URLs and cache contents.

## Shadow command

Use a GitHub App installation token when the organization-owned Project grants
the installation access. OAuth and fine-grained or classic PAT profiles are also
supported when they can read the repository and organization Project. Supply the
credential only on standard input.

```sh
printf '%s\n' "$YUKH_PROJECTS_TOKEN" | \
  node dist/cli/index.js \
    --owner OWNER \
    --repository REPOSITORY \
    --project-number PROJECT_NUMBER \
    --legacy-shadow \
    --issue-numbers 1,2,3 \
    --policy-path .yukh/project.yaml \
    --report-file yukh-projects-shadow.json \
    --github-token-stdin
```

The issue list must contain 1–100 unique positive numbers. A complete backlog is
split deterministically into batches of at most 100. Each batch reads Project
metadata and schema once and Project item pages once. Exit `0` means the audit
completed (with either converged or declared drift results), `6` means relationship
state was safely deferred because the declared GraphQL-zero profile could not
prove completeness, and `5` means an invariant or provider failure.

## Rate and rollback rules

- The default legacy-shadow CLI profile declares GraphQL remaining as zero and
  therefore never issues a GraphQL request.
- A single-issue Action or CLI shadow uses the same owner-aware planner and
  emits the same plan ID and ordered operation count as controlled apply. Batch
  audit remains an aggregate compatibility report, not an approval artifact.
- A cold, single-page 1/10/100-issue fixture uses four REST requests. Pagination
  is bounded to 20 pages, 10,000 items and 64 MiB; the run limit is 64 REST
  requests and the reserve is fail-closed.
- There is no polling, sleep, automatic retry or per-issue fallback.
- Pin the Action or CLI to the exact qualified commit or immutable release
  published by the rate-safe qualification issue. Never use a moving branch.
- Roll back by restoring the previously recorded immutable legacy pin. Rollback
  does not authorize high-volume operation of the legacy GraphQL path.

The qualification issue supplies the candidate commit, checksums, SBOM,
attestations and exact release pin. Until that gate publishes an immutable
artifact, this document intentionally supplies no candidate release.
