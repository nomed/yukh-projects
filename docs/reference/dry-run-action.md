# Dry-run Action

Pin the Action to a verified release commit. The current documented pin is
`e086e89395808377845567325b3a0fa73ef6e926` (`v1.3.3`).

## Inputs

| Input | Required | Meaning |
| --- | --- | --- |
| `github-token` | yes | Read-only credential |
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

Use a short-lived credential restricted to read-only organization Projects,
minimum repository metadata, and issue read access. Projects write, issues
write, contents write, administration, workflows, packages, and deployments
are unnecessary for dry-run.
