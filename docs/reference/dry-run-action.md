# Dry-run Action

Pin the Action to a verified release commit. The current documented pin is
`e086e89395808377845567325b3a0fa73ef6e926` (`v1.3.3`).

## Inputs

| Input | Required | Meaning |
| --- | --- | --- |
| `github-token` | yes | Credential with access to the required GitHub reads |
| `owner` | yes | Bound GitHub owner |
| `repository` | yes | Bound repository name |
| `project-number` | yes | Positive Project number |
| `issue-number` | yes | Positive issue number |
| `policy-path` | no | Workspace-relative policy; default `.yukh/project.yaml` |

## Outputs

| Output | Meaning |
| --- | --- |
| `status` | `success` or `error` |
| `executable` | Whether the complete plan passed every gate |
| `plan-id` | Deterministic plan digest |
| `operation-count` | Number of proposed operations |
| `report-path` | Runner-temporary redacted report |

The Action performs fixed reads only. It has no apply input, mutation import,
dynamic installation, retry, or credential fallback.

## Credential profile

GitHub read access to the bound organization Project, repository metadata, and
issue is the functional minimum. Prefer a short-lived credential restricted to
those reads. An existing supplied credential that also has write permissions is
accepted and MUST NOT invalidate dry-run or legacy-shadow qualification.

Excess permissions grant no additional behavior: these entrypoints have no
mutation transport, apply host, approval input, or controlled-apply authority.
They never request or broaden write permissions. See the
[dry-run credential profile amendment](../contracts/dry-run-credential-profile-v1.md).
