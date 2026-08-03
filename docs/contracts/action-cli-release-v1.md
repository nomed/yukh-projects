# Action, CLI, and protected release v1 — proposed specification

- **Status:** Proposed
- **Proposed:** 2026-08-02
- **Governing issues:** [#32](https://github.com/nomed/yukh-projects/issues/32), [#5](https://github.com/nomed/yukh-projects/issues/5)
- **Security boundaries:** untrusted workflow/CLI input to dry-run orchestration; reviewed source commit to public release artifacts

## Objective

The preview release exposes the accepted parser, policy, read, and planning capabilities through a bundled GitHub Action and a local command-line interface. Both entrypoints are dry-run only. They produce a deterministic, redacted reconciliation report and have no reachable mutation path.

Release Please maintains versions, the changelog, and a release pull request. A distinct protected publisher validates the merged release commit and produces immutable, verifiable artifacts. Acceptance or implementation of this contract does not authorize a real GitHub mutation or a production publication.

## Entry-point separation

The orchestration package has three one-way layers: a small Action adapter reads fixed Action inputs and writes fixed outputs; a small CLI adapter reads explicit arguments and writes a report; and a shared dry-run application service loads bounded policy, performs scope-bound reads, and invokes pure planning.

The Action and CLI dependency graphs must not import the executor or GitHub mutation transport. The build verifies this prohibition from the emitted dependency graph. There is no `apply` input, flag, environment switch, hidden mode, dynamic import, or exported callback in the preview entrypoints.

The existing executor and mutation transport remain internal, test-only building blocks until a separately accepted apply-entrypoint contract exists. A write credential supplied accidentally to a preview process confers no additional behavior.

## GitHub Action contract

The repository publishes one root `action.yml` and one committed JavaScript bundle. The metadata selects a GitHub-hosted JavaScript runtime supported at implementation time; the implementation PR records the reviewed runtime and compatibility evidence. Consumers install no package at runtime.

Inputs are fixed and have no aliases:

| Input | Required | Meaning and validation |
| --- | --- | --- |
| `github-token` | yes | Read-only credential, passed only to the read transport and masked before use |
| `owner` | yes | Scope-bound GitHub owner; canonical login syntax, maximum 39 characters |
| `repository` | yes | Scope-bound repository name; canonical name syntax, maximum 100 characters |
| `project-number` | yes | Decimal integer from 1 through 2,147,483,647 |
| `issue-number` | yes | Decimal integer from 1 through 2,147,483,647 |
| `policy-path` | no | Workspace-relative regular file; defaults to `.yukh/project.yaml` |

Unknown inputs are ignored by the Actions runtime but never read. Empty, Unicode-confusable, control-containing, or malformed scope values fail before network access. The policy path must remain beneath the canonical workspace root after resolution. Absolute paths, `..` traversal, symbolic links, non-regular files, and files larger than the policy parser limit fail closed.

The adapter does not infer scope from issue text, repository policy, git remotes, branch names, arbitrary event payload properties, or URLs. A workflow may map trusted GitHub context into the fixed inputs, but the adapter validates the resulting values independently.

The Action emits only `status`, `executable`, `plan-id`, `operation-count`, and `report-path`. The report is written with exclusive creation beneath a fixed runner temporary directory, never beneath a caller-selected path. It is bounded, schema-versioned, deterministic, and redacted by construction. Action annotations contain stable diagnostic codes and static messages only. Raw policy, issue bodies, field values, provider IDs, URLs, tokens, response bodies, and stack traces never enter outputs, annotations, logs, job summaries, caches, or artifacts.

The Action does not upload artifacts, modify checkout contents, write `$GITHUB_ENV`, persist credentials, invoke a shell, or call the GitHub API except through the fixed read transport. It performs no retry or sleep.

## CLI contract

The CLI accepts the same six values as explicit long options. `--github-token-stdin` is the only token input mechanism in v1; token arguments and environment-variable discovery are forbidden. Standard input is read once with a strict byte limit, the trailing line ending is removed, and the value is never echoed or retained in errors.

The CLI writes the redacted report to standard output by default. An optional `--report-file` accepts a workspace-relative, non-symlink destination beneath the canonical current workspace and uses exclusive creation. Human-readable progress and stable diagnostics go to standard error. The CLI never mixes provider content into either stream.

Exit status is stable: `0` for a complete valid dry-run; `2` for invalid caller input or policy; `3` for authentication or authorization failure; `4` for a bounded provider or transport failure; and `5` for an internal invariant or redaction failure.

There is no interactive prompt. `--help` and `--version` perform no file, credential, or network access. Unknown options, repeated singleton options, positional arguments, and an `--apply` option fail before credential consumption or network access.

## Permissions and workflow use

The example preview workflow declares only the permissions proven necessary for the fixed reads, beginning with `contents: read`, `issues: read`, and the narrowest available Projects read permission. If GitHub cannot express a required Projects scope for the default token, documentation requires a separately supplied short-lived read credential and records the unavoidable permission delta. It never recommends a classic broad personal access token.

The example runs on `workflow_dispatch` only in v1, checks out the bound commit without persisted credentials, and pins every action to a reviewed full commit SHA. Pull-request and issue-trigger examples are excluded until event trust and fork behavior receive a separate review. Workflow expressions are never embedded into shell source.

## Bundle and build contract

The Action bundle and CLI executable are produced from the same reviewed source and lockfile. Runtime dependencies are exact-versioned and included in the committed Action bundle. Build-only tooling is exact-versioned development state. Dynamic runtime installation, remote code loading, post-install downloads, and uncommitted generated dependencies are forbidden.

The implementation adds deterministic commands to compile and bundle from a clean checkout; reject mutation imports, non-allowlisted endpoints, and incompatible licenses; require a byte-identical rebuild; and verify that metadata, lockfile, and bundle agree. Source maps, if published, must not embed source contents, filesystem paths, credentials, or build-host metadata. The bundle includes or links all required third-party notices.

## Release Please boundary

Release Please is configured in manifest mode for the repository root. Its workflow may calculate a semantic version, update the changelog and version metadata, and open or refresh a release pull request. It is configured not to create a GitHub Release or tag, and not to publish packages or artifacts.

The Release Please workflow runs only for reviewed changes merged to `main`; uses the default repository token with only minimum contents and pull-request permissions; pins Release Please to a reviewed full commit SHA; contains no package, provenance, attestation, or publication permission; changes no `private: true` package setting during preview; and excludes consumer identities and private migration state from generated notes.

Release Please is not a deployment gate and its release pull request is subject to the same branch protection and CI as any other change.

## Protected publication boundary

Publication is a separate manually dispatched workflow bound to a protected `release` environment with required human approval. No pull-request-target, issue, repository-dispatch, workflow-run, or untrusted branch event may enter this boundary.

The dispatch names an exact semantic version and full commit SHA. Before acquiring write permissions, the workflow proves that the commit is the protected `main` commit; package metadata and changelog contain exactly the requested version; the tree, lockfile, bundle, and action metadata are clean and consistent; all required gates pass from a clean checkout; and the version tag and GitHub Release do not exist.

Only the final publication job receives narrowly scoped `contents: write`, `id-token: write`, and `attestations: write`. It creates an immutable `vMAJOR.MINOR.PATCH` tag at the approved commit, a GitHub Release, SHA-256 checksums, a machine-readable SBOM, and artifact attestations for the bundle and SBOM. It publishes no npm package in preview.

Preview documentation tells consumers to pin the Action by the full released commit SHA. Floating `v1`, `v0`, or branch references are neither created nor recommended. Tags and release assets are never overwritten, moved, or deleted as rollback. Correction requires a new patch release and an advisory naming affected immutable versions.

## Failure and concurrency semantics

Action and CLI runs fail closed and emit no partial plan. A process interruption requires a fresh complete run. Concurrent dry-runs are safe because they cannot mutate state.

Release Please uses a repository-wide concurrency group that does not cancel an in-progress update. Publication uses a version-specific concurrency group, never retries a failed publishing command automatically, and checks for pre-existing state again immediately before each irreversible step. Any partial publication stops and requires maintainer review; automation never deletes or rewrites published state.

## Required implementation evidence

Synthetic tests must prove:

- identical Action and CLI inputs yield the same redacted plan and plan ID;
- malformed, repeated, confusable, oversized, traversal, and symlink inputs fail before network access;
- `--apply`, mutation imports, write credentials, alternate endpoints, and arbitrary GraphQL are unreachable;
- untrusted shell and workflow metacharacters remain inert data;
- all logs, outputs, reports, annotations, and exit paths redact credentials and provider content;
- help and version are offline and credential-free;
- the bundle rebuild is byte-identical and contains no runtime installer or prohibited module;
- Release Please cannot tag, publish, attest, or access a release environment;
- the publisher rejects commit, version, tag, bundle, lockfile, check, SBOM, and attestation mismatches;
- a synthetic publisher harness performs no network write and records the exact would-publish manifest.

The implementation PR must record the exact action runtime, all immutable workflow SHAs, dependency and license deltas, permissions, generated-file review, tests, audit result, and rollback impact. No implementation test may publish a tag, release, package, attestation, or real GitHub mutation.

## Subsequent gates

After this specification is accepted, implementation requires a separate narrow PR. A first preview publication then requires an exact artifact manifest, commit SHA, semantic version, workflow permission review, protected-environment evidence, and explicit human approval. An apply entrypoint requires a separate accepted security contract and is outside v1.
