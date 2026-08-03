# Controlled apply library candidate — 2026-08-03

This candidate is a review artifact for issue #57. It contains executable
Action and CLI bootstrap artifacts for synthetic qualification, but it is not a
deployment or release candidate and grants no live apply or publication authority.

`dist/apply/index.js` is a deterministic ESM library bundle containing the
controlled apply adapters, approval verifier, executor, fixed GitHub transports,
shared rate ledger, REST snapshot reader, and provider-neutral coordination
port. `dist/apply/action.js` and `dist/apply/cli.js` are separate automatic
bootstraps using the accepted protected host capsule. They have no NATS or
JetStream implementation, consumer configuration, session bootstrap, retry or
workflow-selected endpoint.

`dist/apply/manifest.json` binds all three exact bundle byte counts and SHA-256
digests, declares `entrypoint: action-cli`, and declares publication disabled.
The existing dry-run Action remains unchanged and structurally separate.

The read-only `Controlled apply candidate preflight` workflow rebuilds all
bundles, verifies the committed bytes, runs the complete deterministic suite and
dependency audit, emits a temporary SPDX SBOM and checksum set, and verifies
that GitHub OIDC publication authority is absent. It neither uploads nor
publishes an artifact and has only `contents: read` permission.

This candidate must not be used as an apply-compatible consumer pin before #58.

The executor preserves normalized authentication, authorization, deferred rate
budget, provider and invariant port failures as distinct static public codes.
Deferred budget produces a distinct `deferred` status and CLI exit code 6. Raw
transport failures are normalized before crossing the port boundary.

The mutation transport is constructed with the exact approved mutation-kind
set. Its write permission profile must equal the union required by that set:
Projects write only for Project mutations and Issues write only for native issue
relationship mutations. An undeclared kind, duplicate kind, missing permission,
unneeded write class, or unapproved permission delta stops before HTTP.
