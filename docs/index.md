---
title: Yukh Projects
description: Declarative, safe reconciliation for GitHub Projects.
---

# Plan GitHub Projects changes safely

Yukh Projects reads reviewed repository policy and issue contracts, observes
GitHub state, and produces a deterministic reconciliation plan.

!!! warning "Foundation bootstrap"

    Yukh Projects is not production-ready. Start with the read-only Action.
    Installing the dry-run does not enable apply.

## First useful result

Add one policy, one issue contract, and a manual workflow. The Action returns:

- whether the plan is executable;
- a deterministic plan ID;
- the number of proposed operations;
- stable, redacted diagnostics.

[Run the first dry-run](tutorials/first-dry-run.md){ .md-button .md-button--primary }
[Review the Action inputs](reference/dry-run-action.md){ .md-button }

## Current boundary

The public dry-run can inspect one bound repository, Project, and issue. It
cannot mutate state, even if given a write-capable credential.

Controlled apply exists as a separate, protected surface. It requires an exact
plan, authenticated approval, fresh preflight, separate credentials, replay
protection, and a qualified host. This site does not present apply as a quick
installation path.
