<p align="center">
  <a href="https://nomed.github.io/system/projects/"><img src="docs/assets/repository-mark.svg" width="96" alt="Yukh Projects"></a>
</p>

<h1 align="center">Yukh Projects</h1>

<p align="center"><a href="https://nomed.github.io/system/projects/">Role in the Yukh system</a></p>

Declarative, secure, and consumer-neutral reconciliation for GitHub Projects.

> [!IMPORTANT]
> Yukh Projects is in foundation bootstrap. It is not yet ready for production use.

Yukh Projects turns reviewed configuration into predictable GitHub Projects state. The project is designed for teams that need repeatable automation without coupling the public implementation to any adopter, company, or private repository.

## Design principles

- **Consumer-neutral:** public code, documentation, tests, and examples never contain adopter-specific data or identifiers.
- **Safe by default:** plans and dry-runs precede mutations; destructive behavior requires explicit intent.
- **Idempotent:** applying the same desired state repeatedly converges without unintended changes.
- **Least privilege:** every integration uses the smallest practical permission set and short-lived credentials where available.
- **Auditable:** decisions, plans, and outcomes are explainable and machine-readable.
- **Supply-chain aware:** automation dependencies are reviewed and pinned to immutable revisions.

## Repository status

This repository currently contains the public project foundation. Functional code enters through a clean-room migration: each capability must pass neutrality, security, provenance, and continued-relevance gates before implementation.

## Architecture and migration

- [Threat model](docs/security/threat-model.md)
- [Repository hardening baseline](docs/security/repository-hardening.md)
- [Clean-room migration plan](docs/migration/clean-room-plan.md)
- [Candidate capability inventory](docs/migration/module-inventory.md)
- [Accepted issue contract v1](docs/contracts/issue-contract-v1.md)
- [Accepted repository policy and effective schema v1](docs/contracts/repository-policy-v1.md)
- [Accepted reconciliation plan and report v1](docs/contracts/reconciliation-plan-v1.md)
- [Accepted GitHub read-only adapter v1](docs/contracts/github-read-only-adapter-v1.md)
- [Proposed REST-first Project snapshot v2](docs/contracts/rest-project-snapshot-v2.md)
- [Accepted GitHub issue-contract source v1](docs/contracts/github-issue-contract-source-v1.md)
- [Accepted controlled mutations v1](docs/contracts/controlled-mutations-v1.md)
- [Accepted GitHub mutation transport v1](docs/contracts/github-mutation-transport-v1.md)
- [Accepted Action, CLI, and protected release v1](docs/contracts/action-cli-release-v1.md)
- [Release operations](docs/release-operations.md)
- [Provenance ledger](docs/migration/provenance-ledger.yml)

## Project policies

- [Consumer neutrality](NEUTRALITY.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Governance](GOVERNANCE.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Roadmap](ROADMAP.md)

## Security

Do not report vulnerabilities in public issues. Follow [SECURITY.md](SECURITY.md) to use a private disclosure channel.

## License

Licensed under the [Apache License 2.0](LICENSE).
