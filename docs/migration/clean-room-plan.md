# Clean-room migration plan

## Purpose

This plan introduces functional capability into Yukh Projects without importing public history, consumer context, production-derived evidence, or unsafe implementation assumptions.

The migration is behavior-led. Specifications and security requirements are approved before implementation. Every contribution receives a fresh commit, synthetic tests, and independent neutrality review.

## Non-negotiable rules

- Do not import, merge, cherry-pick, or graft another Git history.
- Do not copy issues, pull requests, release notes, session context, adoption material, screenshots, logs, or support evidence.
- Do not transform production fixtures into public fixtures; invent new data under reserved namespaces.
- Do not preserve a behavior merely because it existed previously.
- Do not migrate a write path before its trust boundary, permission model, retry semantics, and rollback behavior are specified.
- Do not install runtime dependencies in the consumer's Action execution.
- Do not add real identifiers to an allowlist to bypass neutrality checks.

## Dispositions

| Disposition | Meaning |
| --- | --- |
| Re-author | Describe the behavior in a public specification, then implement and test it afresh. |
| Redesign | Define a new security and architecture contract before implementation. |
| Rebuild | Create new packaging, build, CI, and release machinery from current requirements. |
| Exclude | Do not bring the artifact or behavior into the public repository. |

No candidate file is approved for direct copying.

## Migration phases

### Phase 0: repository baseline

- Apply the repository-hardening settings.
- Keep policy checks required on the default branch.
- Approve the threat model.
- Establish the provenance ledger.

Exit gate: tracking issue #2 contains evidence for every applicable repository control.

### Phase 1: public contracts

- Specify the issue contract and repository policy schemas.
- Define stable diagnostic codes and ordering.
- Set explicit input size, depth, alias, collection, and relationship limits.
- Define versioning and compatibility rules.

Exit gate: contract examples are synthetic, invalid cases are specified, and each missing required field produces exactly one diagnostic.

### Phase 2: pure core

- Re-author contract parsing and policy validation.
- Re-author effective-schema calculation.
- Re-author deterministic relationship and reconciliation planning.
- Re-author report models and serialization with redaction boundaries.

No network, filesystem mutation, environment access, or token handling is allowed in this phase.

Exit gate: deterministic unit and property tests pass with invented fixtures; mutation count is structurally zero.

### Phase 3: read-only GitHub adapter

- Bind installation, owner, repository, Project, and issue identity.
- Discover Project schema and state with bounded pagination.
- Produce dry-run output only.
- Normalize API failures without exposing raw sensitive bodies.

Exit gate: integration tests prove cross-scope rejection, pagination bounds, retry classification, redaction, and zero mutations.

### Phase 4: controlled mutation

- Add narrowly scoped mutation ports one capability at a time.
- Require apply mode plus a separate enablement gate.
- Add concurrency, precondition revalidation, idempotency, retry, partial-failure, and convergence semantics.
- Keep destructive behavior unsupported until separately approved.

Exit gate: a repeated identical apply performs zero additional operations and reports no remaining drift.

### Phase 5: Action and release

- Build a bundled JavaScript Action with no consumer-time package installation.
- Pin every executable dependency and commit the lockfile.
- Verify the bundle matches reviewed source.
- Publish through a protected environment with provenance, checksums, and a software bill of materials.

Exit gate: a fresh repository can run pinned dry-run and apply workflows using documented least-privilege permissions.

## Slice lifecycle

Every migration slice follows this order:

1. Open a consumer-neutral issue with kind and area.
2. Define behavior, failure modes, and exclusions.
3. Update the threat model and provenance ledger where needed.
4. Implement from the approved specification.
5. Add invented unit, property, contract, and integration fixtures as appropriate.
6. Run type, test, package, policy, dependency, and security checks.
7. Review permissions, logging, network behavior, and supply-chain changes.
8. Merge through the protected default branch.

## Required evidence

Each slice records:

- contributor rights confirmation;
- disposition and public specification;
- neutrality review;
- security review;
- synthetic-fixture confirmation;
- test commands and results;
- permission and network delta;
- dependency and immutable-pin delta;
- compatibility and rollback impact.

Missing evidence blocks merge.

## First implementation slice

The first slice is contract parsing and diagnostics only. It has no GitHub API, filesystem mutation, Action runtime, or credential handling. Its acceptance criteria include bounded parsing, duplicate-block rejection, stable diagnostic ordering, unknown-field behavior, and exactly one diagnostic for each missing required field.
