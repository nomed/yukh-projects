# Run the first dry-run

This tutorial produces a reconciliation plan without changing GitHub.

## 1. Add repository policy

Create `.yukh/project.yaml`:

```yaml
schema: 1
fields:
  area:
    name: Area
    kind: single_select
    mode: managed
    options:
      architecture: Architecture
      runtime: Runtime
  priority:
    name: Priority
    kind: single_select
    mode: managed
    options:
      p1: P1
      p2: P2
```

Names must match the target Project exactly. Provider IDs, repository names,
Project numbers, and credentials do not belong in policy.

## 2. Add an issue contract

Put this block anywhere in one test issue:

```markdown
<!-- yukh:issue:v1
schema: 1
work_type: task
area: runtime
priority: p1
-->
```

Text outside the block remains ordinary issue content.

## 3. Configure the repository

Add:

- repository variable `YUKH_PROJECT_NUMBER` with the target Project number;
- repository secret `YUKH_PROJECTS_READ_TOKEN` with read-only access to the
  bound repository issues and Project.

Prefer a short-lived GitHub App installation token. Do not use a broad classic
personal access token.

## 4. Add the workflow

Create `.github/workflows/yukh-projects-dry-run.yml`:

```yaml
name: Yukh Projects dry-run

on:
  workflow_dispatch:
    inputs:
      issue-number:
        description: Issue to plan
        required: true
        type: number

permissions:
  contents: read
  issues: read

jobs:
  plan:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - id: yukh
        uses: nomed/yukh-projects@e086e89395808377845567325b3a0fa73ef6e926 # v1.3.3
        with:
          github-token: ${{ secrets.YUKH_PROJECTS_READ_TOKEN }}
          owner: ${{ github.repository_owner }}
          repository: ${{ github.event.repository.name }}
          project-number: ${{ vars.YUKH_PROJECT_NUMBER }}
          issue-number: ${{ inputs.issue-number }}
```

Both Actions are pinned to reviewed commits.

## 5. Run and read the plan

Open **Actions → Yukh Projects dry-run → Run workflow** and enter the test issue
number.

The Action succeeds only after a complete bounded read and plan. Inspect its
`executable`, `plan-id`, `operation-count`, and diagnostics. A proposed
operation is intent for review, not authorization to apply it.

If access is unsupported or incomplete, the run fails closed with a stable
diagnostic. It never switches credentials, retries silently, or mutates GitHub.
