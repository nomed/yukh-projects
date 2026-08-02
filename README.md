# Yukh Projects

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

This repository currently contains the public project foundation. Functional code will enter through a clean-room migration: each file must be reviewed for neutrality, security, provenance, and continued relevance before it is proposed here.

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
