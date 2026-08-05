# Yukh Projects 1.5.0 <!-- x-release-please-version -->

This release adds resumable, rate-aware deferral for controlled GitHub operations. The release delta is the accepted design, contract, and implementation after immutable release `v1.4.0`.

## Deferred receipt

- Action and CLI expose the versioned, redacted `deferred-receipt-v1` contract.
- Receipts bind scope, request, and plan by SHA-256 digest and contain no credentials, provider payloads, approval artifacts, nonces, claims, leases, or replayable mutations.
- The shared rate ledger records whether REST or GraphQL reached its reserve.
- Without a durable coordinator, the runtime emits a governed handoff and releases ownership.

## Durable resume

- `createResumableDeferralHost` supports durable scheduling, observable state, cancellation, bounded expiry, and repeated deferral.
- Ownership is retained only after the durable port supplies hashed wake-up and cancellation handles.
- Resume starts a fresh governed process with immutable bindings. It rechecks rate state, claims or leases, snapshots, convergence, approval, and nonce; it never replays a captured request.
- Action, CLI, transports, and the operator skill contain no sleep, polling, self-dispatch, credential switching, or automatic mutation retry.

## Compatibility

- Action consumers must pin the immutable `v1.5.0` commit SHA published by this release, not a floating tag or branch.
- The apply Action exposes `deferred-receipt`; the apply CLI adds `deferredReceipt` to its redacted JSON result and continues to exit with code `6` when deferred.
- A GitHub Actions job is not a durable coordinator. Consumers that retain ownership must provide a separately governed scheduler implementing durable storage, observable wake-up, cancellation, expiry, and fresh-process launch.
- Existing consumers may remain pinned to `v1.4.0`; no consumer is migrated by this release.

## Integrity and qualification

The implementation validates the operator skill, passes the complete test suite, rebuilds checked-in bundles byte-identically, and preserves consumer-neutrality and controlled-apply security gates. Publication adds checksums, an SPDX SBOM, provenance attestations, and immutable GitHub release assets.

## Rollback

The exact rollback pin is `v1.4.0` at commit `d1f787ca82c085b215146949d039aa217b399c27`.

Rollback means updating a consumer to that immutable commit in separately authorized work. It does not authorize moving or deleting a tag, deployment, live apply, or consumer migration.
