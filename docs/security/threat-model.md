# Threat model

## Scope

Yukh Projects reads untrusted issue content and repository policy, discovers GitHub Projects state, builds a deterministic plan, and may apply authorized mutations. This threat model covers the public Action, command-line entry points, parsing and planning core, GitHub API adapters, release artifacts, and workflow examples.

## Security objectives

1. A run can mutate only the explicitly bound repository and Project.
2. Dry-run cannot acquire or exercise mutation permissions.
3. Apply requires an explicit gate and a least-privilege credential.
4. Untrusted content is parsed as data and is never executed.
5. Repeated execution is deterministic, bounded, and idempotent.
6. Logs and outputs disclose neither credentials nor private repository content.
7. Published artifacts are reproducible and do not install dependencies at consumer runtime.
8. The public project never receives consumer-specific telemetry or support data.

## Trust boundaries

~~~mermaid
flowchart TB
    U["Untrusted issue and policy"] --> V["Bounded validation"]
    V --> P["Deterministic plan"]
    H["GitHub API responses"] --> B["Read-only scope binding"]
    B --> P
    P --> G{"Explicit mode gate"}
    G -->|dry-run| R["Redacted report"]
    G -->|apply| A["Least-privilege API adapter"]
~~~

The issue body, labels, event payload, repository policy, API responses, and workflow inputs are untrusted. The planner is trusted only after validation. The credential and GitHub API boundary are privileged.

The read-only GitHub adapter is the first network boundary. Its injected transport owns authentication and HTTP. The adapter owns fixed named queries, resource limits, scope verification, response validation, and redaction. Provider success is not evidence that the requested subject or resources were authorized or correctly bound.

## Assets

- repository and Project integrity;
- issues, fields, relationships, labels, milestones, and workflow state;
- GitHub tokens and installation identity;
- policy and contract schemas;
- release tags, bundles, lockfiles, and provenance;
- diagnostic output and audit evidence;
- consumer anonymity.

## Principal threats and controls

### Confused deputy and cross-scope writes

An attacker attempts to make a valid credential mutate a different repository, owner, Project, or issue.

Controls:

- bind owner, repository, Project, issue, and installation identity before planning;
- reject redirects and configurable API hosts unless an explicit enterprise mode validates them;
- verify that discovered nodes belong to the bound scope;
- never accept arbitrary GraphQL documents or mutation names from configuration.

These controls also apply before any read is admitted as planning evidence. Every page remains anchored to the resolved repository, Project, issue, item, and authenticated subject. Cross-repository relationships and duplicate Project items fail closed.

### Malicious or compromised API responses

A proxy, provider defect, compromised transport, or schema change returns malformed, duplicated, cross-scope, reordered, or adversarial data that becomes trusted observed state.

Controls:

- use fixed named query documents and a transport that cannot accept caller-provided GraphQL or endpoints;
- reject redirects, response-shape drift, unknown required variants, duplicate nodes, inconsistent anchors, and ambiguous mappings;
- validate every page before canonicalization and return observations atomically;
- retain provider IDs only inside the adapter boundary and derive a canonical observation fingerprint;
- treat unsupported relationship capability as unavailable, not as an empty graph.

### Pagination and rate exhaustion

Unbounded or non-advancing connections consume memory, API quota, or runtime, while truncation masquerades as complete state.

Controls:

- use forward pagination with fixed page size and explicit page, byte, node, edge, and error limits;
- require advancing cursors and unique nodes;
- fail the complete read on truncation or limit exhaustion;
- perform no silent retry, sleep, or partial-page continuation after failure;
- expose only a bounded retry classification and require a fresh complete read.

### Provider-error disclosure

Raw GraphQL errors, headers, variables, URLs, IDs, stack traces, or transport messages reveal credentials or consumer identity.

Controls:

- construct stable diagnostics from allowlisted classifications before logging or serialization;
- never retain or return raw bodies, headers, provider messages, query variables, cursors, or correlation IDs;
- collapse unclassifiable errors to a static redaction failure;
- keep public evidence synthetic and consumer-neutral.

### Workflow and expression injection

Untrusted titles, bodies, labels, branch names, or configuration reach a shell command or workflow expression.

Controls:

- pass untrusted values through environment variables or structured files, never command interpolation;
- avoid dynamic run, uses, shell, and path construction;
- never execute pull request code with privileged event credentials;
- validate paths against the workspace and reject traversal and symbolic-link escapes.

### Parser denial of service and ambiguity

Oversized input, duplicate hidden blocks, recursive YAML, aliases, unexpected types, or Unicode ambiguity causes excess resource use or divergent interpretation.

Controls:

- enforce input byte, collection, depth, and relationship-count limits;
- disable or bound YAML aliases;
- reject duplicate contract blocks and unknown required-field shapes;
- normalize diagnostics and emit exactly one stable error per failed rule;
- use deterministic ordering and complexity limits for graph operations.

### Unauthorized or unsafe mutation

Validation gaps, stale discovery, replay, concurrent runs, or partial failure produce incorrect writes.

Controls:

- separate pure planning from mutation adapters;
- make dry-run the default;
- require apply plus an independent enablement gate;
- use repository-and-issue concurrency keys;
- revalidate critical preconditions immediately before mutation;
- define idempotency keys, retry classes, partial-failure output, and convergence checks;
- reject destructive operations until separately specified and approved.

### Credential disclosure or misuse

Tokens leak through errors, summaries, process arguments, artifacts, caches, or malicious input.

Controls:

- use short-lived installation tokens and minimum scopes;
- never print authorization headers, raw API errors, environment dumps, or credential-shaped values;
- redact reports before serialization;
- keep write credentials out of pull request workflows;
- rotate first and investigate second when disclosure is plausible.

### Supply-chain compromise

Mutable action tags, runtime package installation, compromised dependencies, or unreviewed generated bundles execute malicious code.

Controls:

- pin actions and toolchains to immutable revisions;
- commit and review lockfiles;
- publish a bundled Action with no consumer-time dependency installation;
- build releases in a protected workflow with provenance, checksums, and a software bill of materials;
- review dependency changes and minimize production dependencies.

### Privacy and neutrality failure

Fixtures, logs, documentation, telemetry, issue content, or release notes identify an adopter or private environment.

Controls:

- enforce NEUTRALITY.md in code review and CI;
- use invented fixtures under reserved namespaces;
- collect no maintainer-controlled usage telemetry;
- sanitize by construction rather than post-processing production data;
- treat accidental disclosure as a security incident.

## Required security tests

- contract size, depth, alias, duplicate-block, and malformed-type limits;
- path traversal and symbolic-link escape rejection;
- shell and workflow metacharacters preserved as inert data;
- repository, owner, Project, and installation binding failures;
- fixed-query allowlisting and structural rejection of arbitrary documents, endpoints, redirects, and mutations;
- cursor progression, duplicate-node, page, byte, collection, and GraphQL-error limits;
- malicious and cross-scope API response rejection with atomic zero-output failure;
- zero automatic retry and full-read restart after retryable classification;
- dry-run with a write-capable token still performs zero mutations;
- apply without both gates fails closed;
- retry and concurrent-run convergence;
- redaction of tokens, URLs, identifiers, and API error bodies;
- tampered bundle, lockfile, and action-pin detection.

## Release gate

No preview release is permitted until the scope-binding, parser-boundary, dry-run separation, credential-redaction, immutable-bundle, and mutation-idempotency controls have passing tests and reviewer evidence.
