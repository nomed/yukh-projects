# Consumer neutrality policy

Consumer neutrality is a hard architectural and governance invariant of Yukh Projects.

The public project must remain useful to many adopters without revealing who uses it, where it runs, or how any private environment is organized. Prevention is essential: public Git history, forks, mirrors, caches, and third-party indexes can preserve material after it is published.

## Scope

This policy applies to every public artifact, including source code, tests, fixtures, examples, documentation, screenshots, logs, issue forms, generated files, release notes, commit messages, pull requests, and discussions.

## Allowed content

- Public Yukh components and their documented interfaces.
- Public platforms, protocols, standards, and dependencies needed to explain or build the software.
- Fully synthetic examples using reserved names, domains, and identifiers.
- Generalized requirements that cannot identify or be linked to a real adopter.

Use neutral identities such as `example-org`, `example-repo`, and domains under `example.com`, `example.net`, `example.org`, or `.invalid`. Synthetic fixtures must be invented, not transformed copies of production data.

## Prohibited content

- Names, brands, domains, usernames, or URLs belonging to adopters, customers, employers, partners, or private projects.
- Repository, organization, project, issue, ticket, field, installation, tenant, account, or environment identifiers from an adopter.
- Production-derived logs, screenshots, dumps, traces, payloads, configuration, secrets, metrics, or support bundles, even when partially redacted.
- Private network names, infrastructure topology, deployment fingerprints, or operational timelines.
- Public claims that identify an adopter without an explicit, independently reviewed publication decision.
- Telemetry that reports adopter identity or repository contents to the Yukh maintainers.

## Architecture boundary

Yukh Projects publishes generic domain logic and public integration contracts. Consumer-specific configuration, adapters, credentials, deployment manifests, support data, and policy remain outside this repository.

The software must operate without sending configuration, repository contents, or execution data to a maintainer-controlled service. Any future telemetry must be optional, documented, data-minimized, and approved through an architectural decision record.

## Contribution requirements

Every contribution must:

1. Use synthetic inputs and outputs.
2. Remove consumer-specific context before the first public commit.
3. Explain the generic capability instead of the originating deployment.
4. Pass automated policy checks and human review.
5. Treat uncertainty as a reason to stop and request a private maintainer review.

Adding a real identifier to an allowlist is not an acceptable workaround. Reference allowlists are reserved for public dependencies, standards, and official Yukh repositories.

## Response to accidental disclosure

Stop publication and notify a maintainer privately. If secrets may be involved, rotate them before repository cleanup. Maintainers will assess current-tree removal, history rewriting, release replacement, notification, and any legal or security obligations. Public deletion cannot guarantee removal from existing forks or caches.

A neutrality violation blocks merge and may require immediate repository containment.
