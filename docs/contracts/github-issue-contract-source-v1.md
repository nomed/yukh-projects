# GitHub issue-contract source v1 — proposed specification

- **Status:** Accepted
- **Accepted:** 2026-08-03 by `@nomed`
- **Proposed:** 2026-08-03
- **Governing issue:** [#35](https://github.com/nomed/yukh-projects/issues/35)
- **Extends:** [GitHub read-only adapter v1](github-read-only-adapter-v1.md)

## Objective

Supply the already scope-bound issue body to dry-run orchestration without creating a second GitHub client, accepting event payload content, or exposing an arbitrary read surface.

## Fixed-query extension

The immutable `YukhResolveScope` GraphQL query adds only the selected issue `body` field. The operation name, endpoint, method, headers, variables, repository and Project resolution, redirect policy, request count, and zero-retry behavior remain unchanged.

No caller can select fields, provide GraphQL, choose an endpoint, or substitute an issue body. The transport normalizes the body as `issueBody` only after the repository, owner, Project, issue number, and provider identifiers have been validated.

## Bounds and atomicity

The body must be a string whose UTF-8 representation is at most 256 KiB, matching the accepted issue-contract parser boundary. A null, non-string, invalidly encoded, or oversized body fails the complete observation with the stable provider-response or response-limit diagnostic.

`readGitHubObservation` returns `issueBody` inside the successful observation only. It returns neither body nor partial observation on any failure. The body does not participate in provider evidence, fingerprints, public reports, diagnostics, error messages, audit callbacks, logs, annotations, caches, or release artifacts.

The value remains untrusted data. Orchestration passes it directly to `parseIssueContract` with the bound issue number. It is never interpreted as a workflow expression, path, URL, command, configuration, or instruction.

## Compatibility

This is an additive TypeScript result property and a fixed provider selection change. Existing transport callers compile after updating synthetic `resolve_scope` fixtures to supply a body. The network request count and permission profile do not change. No GitHub write permission is introduced.

## Required implementation evidence

Synthetic tests prove:

- the fixed query selects `body` from the same bound issue;
- a valid body is returned unchanged to the parser boundary;
- missing, null, non-string, oversized, and cross-scope responses fail atomically;
- provider content cannot enter diagnostics, fingerprints, errors, logs, or reports;
- shell, Markdown, YAML, and workflow metacharacters remain inert;
- request count, fixed endpoint, zero retry, and read-only behavior are unchanged.

Acceptance and implementation do not authorize a mutation, tag, release, package publication, or real attestation.
