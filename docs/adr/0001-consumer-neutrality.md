# ADR 0001: Consumer neutrality as a hard invariant

- **Status:** Accepted
- **Date:** 2026-08-02

## Context

Yukh Projects is public infrastructure intended for use across personal, private, and enterprise environments. Public artifacts must not reveal or become coupled to the identity, topology, data, or priorities of any adopter.

Redaction after publication is insufficient because Git history, forks, caches, and indexes can retain disclosed material.

## Decision

1. The public repository contains only reusable domain logic, public integration contracts, and deliberately synthetic examples.
2. Consumer-specific configuration, adapters, deployments, credentials, support artifacts, and policy remain outside the repository.
3. Requirements originating in private work are generalized before entering public issues or commits.
4. The project does not collect adopter identity, repository contents, configuration, or execution data.
5. Automated checks and human review enforce the policy; uncertainty blocks publication.
6. A clean-room migration is required for any pre-existing implementation proposed for inclusion.

## Consequences

- Some deployment-specific conveniences belong in private downstream layers.
- Public examples may be less representative of a particular installation but remain reproducible by everyone.
- Migration takes longer because provenance, secrets, identifiers, fixtures, and documentation must be reviewed file by file.
- The public roadmap reflects reusable capabilities rather than adopter commitments.
- Accidental disclosure is treated as a security and governance incident.
