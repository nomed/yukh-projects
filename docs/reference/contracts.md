# Contracts

These accepted records define the public behavior. Use them for exact schemas,
limits, diagnostics, and compatibility rules.

| Concern | Contract |
| --- | --- |
| Hidden issue data | [Issue contract v1](../contracts/issue-contract-v1.md) |
| Repository field ownership | [Repository policy v1](../contracts/repository-policy-v1.md) |
| Plan and redacted report | [Reconciliation plan v1](../contracts/reconciliation-plan-v1.md) |
| Read-only GitHub boundary | [GitHub read-only adapter v1](../contracts/github-read-only-adapter-v1.md) |
| REST-first snapshot | [REST Project snapshot v2](../contracts/rest-project-snapshot-v2.md) |
| Dry-run Action and CLI | [Action and CLI release v1](../contracts/action-cli-release-v1.md) |
| Controlled mutation semantics | [Controlled mutations v1](../contracts/controlled-mutations-v1.md) |
| Apply entrypoint | [Controlled apply entrypoint v1](../contracts/controlled-apply-entrypoint-v1.md) |

Unknown versions and fields fail closed. A plan or credential alone never
authorizes apply.
