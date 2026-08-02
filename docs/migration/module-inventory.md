# Candidate capability inventory

## Audit boundary

The reviewed candidate snapshot contains 17 TypeScript source modules and 17 test modules, with 3,789 source lines and 2,502 test lines. Counts are descriptive only; no history or artifact is imported.

Every capability is classified below. The inventory intentionally contains no deployment evidence, adopter identity, repository URL, Project identifier, issue reference, or production-derived fixture.

## Re-author from public specifications

| Candidate module | Capability | Required changes |
| --- | --- | --- |
| contract.ts | Hidden contract parsing and diagnostics | Add parser bounds, alias controls, duplicate-block rejection, stable ordering, and diagnostic deduplication. |
| policy.ts | Policy loading and desired-state construction | Publish a versioned schema, reject ambiguity, and bound maps and collections. |
| effective-schema.ts | Managed-field ownership calculation | Preserve pure deterministic behavior and specify ownership conflicts. |
| relationships.ts | Relationship normalization and graph planning | Bound graph size and complexity; specify cycle, reciprocity, and ambiguity errors. |
| report.ts | Observed-state comparison and rendering | Separate internal details from redacted public output and define deterministic serialization. |
| reconcile.ts | Reconciliation planning | Split pure plan construction from every mutation path and make time an explicit input. |

These capabilities enter first because they can be implemented without network, credentials, environment access, or writes.

## Redesign behind security boundaries

| Candidate module | Capability | Required changes |
| --- | --- | --- |
| project.ts | Read-only Project discovery | Bind scope, bound pagination, normalize API errors, and validate node ownership. |
| runtime.ts | Mode and runtime-input validation | Separate dry-run capability from credential availability and centralize redaction. |
| connected-runtime.ts | Event resolution and GitHub transport | Fix API endpoints, prevent redirects, isolate token handling, and reject cross-scope input. |
| mutation.ts | Project item and field mutations | Add preconditions, retry classes, idempotency evidence, and fail-closed value resolution. |
| native-governance.ts | Native label and milestone governance | Reassess product scope; require explicit ownership policy and least-privilege REST access. |
| native-issue.ts | Native issue type, field, and label mutations | Reassess product scope; isolate adapters and prevent overwriting human-owned state. |
| relationship-application.ts | Parent, child, and dependency writes | Add capability detection, partial-failure semantics, convergence verification, and operation bounds. |
| bootstrap.ts | Project schema discovery and mutation | Split read-only planning from apply; explicitly handle immutable, derived, and ambiguous fields. |

No module in this group may enter before the relevant threat-model controls have executable tests.

## Rebuild

| Candidate artifact | Required direction |
| --- | --- |
| action-cli.ts | Minimal adapter over reviewed libraries; bounded event and path handling; redacted outputs. |
| cli.ts | Optional local dry-run interface with no implicit network or write behavior. |
| index.ts | Explicit supported public API after package boundaries are approved. |
| action.yml | Bundled Action runtime, immutable dependencies, explicit permissions, no runtime package installation. |
| package.json and lockfile | New package identity, current reviewed dependencies, reproducible scripts, and license metadata. |
| CI and release workflows | Minimal permissions, immutable pins, build verification, provenance, checksums, and SBOM. |

## Rewrite with synthetic data

All tests are rewritten around invented repositories, Projects, issues, field values, identities, and API responses. Existing test files are behavior references only and are never copied wholesale.

Required suites:

- schema and parser limits;
- stable diagnostics and serialization;
- deterministic planning and property tests;
- relationship graph bounds;
- scope binding and cross-scope rejection;
- token and error redaction;
- dry-run zero-mutation proof;
- apply gating, retry, concurrency, partial failure, and convergence;
- bundle and immutable-pin verification.

## Exclude

The following artifact classes do not migrate:

- historical session context;
- adopter or compatibility workspaces;
- deployment and dogfooding evidence;
- consumer policies and issue fixtures;
- legacy roadmap commitments;
- old release metadata and generated release notes;
- workflow run URLs, Project numbers, node identifiers, and token names tied to an environment;
- screenshots, logs, dumps, payloads, and support artifacts.

## Recommended implementation order

1. Contract schema, bounded parser, and diagnostics.
2. Policy schema and desired-state model.
3. Relationship and reconciliation planners.
4. Redacted report model.
5. Read-only Project discovery and dry-run.
6. Controlled mutation ports.
7. Bundled Action and reproducible release.

Each line is a separate reviewable migration slice.
