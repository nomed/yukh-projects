# Contracts

Accepted records define public behavior. Use them for exact schemas, limits,
diagnostics, and compatibility rules. Proposed records are review material only
and authorize no implementation or provider access.

| Concern | Contract |
| --- | --- |
| Hidden issue data | [Issue contract v1](../contracts/issue-contract-v1.md) |
| Repository field ownership | [Repository policy v1](../contracts/repository-policy-v1.md) |
| Plan and redacted report | [Reconciliation plan v1](../contracts/reconciliation-plan-v1.md) |
| Read-only GitHub boundary | [GitHub read-only adapter v1](../contracts/github-read-only-adapter-v1.md) |
| REST-first snapshot | [REST Project snapshot v2](../contracts/rest-project-snapshot-v2.md) |
| Dry-run Action and CLI | [Action and CLI release v1](../contracts/action-cli-release-v1.md) |
| Dry-run and legacy-shadow credential eligibility | [Dry-run credential profile v1](../contracts/dry-run-credential-profile-v1.md) |
| Controlled mutation semantics | [Controlled mutations v1](../contracts/controlled-mutations-v1.md) |
| GitHub mutation transport | [REST-first field creation v2](../contracts/github-mutation-transport-v2.md) |
| Apply entrypoint | [Controlled apply entrypoint v1](../contracts/controlled-apply-entrypoint-v1.md) |
| Reviewed single-token exception | [Controlled apply single-token profile v1](../contracts/controlled-apply-single-token-profile-v1.md) |
| Resumable rate deferral | [Resumable rate-limit deferral v1](../contracts/resumable-rate-deferral-v1.md) |
| First usable suite preview | [Projects effects v1](../contracts/first-usable-preview-projects-v1.md) |
| MCP compound approval and bounded apply entrypoint | [MCP compound approval bridge and wrapper v1](../contracts/mcp-compound-approval-wrapper-v1.md) |

Unknown versions and fields fail closed. A plan or credential alone never
authorizes apply. For dry-run and legacy-shadow, read permissions are the
functional minimum and least privilege is recommended; excess write permissions
on an existing supplied credential are not an eligibility failure.

The accepted preview and approval-bridge records are specification-only. The
bridge and wrapper were substantively reviewed and merged through PR #152 as
`nomed/yukh-projects@56118de6760b5b582c9a2cf84640e22e3eaaac83`. They preserve
the Accepted Projects `add_dependency` Effect B and grant no implementation,
provider, credential, mutation, live-effect, deployment, or release authority.
