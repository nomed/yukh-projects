# Yukh Projects 1.6.0 <!-- x-release-please-version -->

This release makes controlled apply budget-complete for accepted
multi-operation plans. The complete mutation budget is admitted before the
first mutation; an insufficient budget defers the plan with zero effects.

## Explicit legacy apply

- Action and CLI accept the exact mode `legacy-apply-v1`.
- A closed internal discriminator selects the version-1 compatibility planner;
  policy text cannot select or substitute the apply host.
- Native `apply` and structurally separate shadow entrypoints remain unchanged.
- Every apply pass still requires its own fresh, exact signed approval.

## Safety

- Synthetic qualification used an organization-owned repository fixture with
  GraphQL remaining zero and no provider access.
- The first synthetic runtime performed one native Issue Type REST mutation and
  converged; a separately constructed second runtime planned zero operations.
- Mode and policy substitution fail before provider reads.
- Signed plan approval, protected coordination, fresh preflight, bounded
  mutation, resumable deferral, verification and redacted diagnostics remain in
  force.

## Compatibility

- Existing v1.5.1 native, shadow and resumable-deferral behavior is preserved.
- Legacy controlled apply is an explicit changed capability, not an implicit
  interpretation of `.yukh/project.yaml`.
- This release does not itself enable live apply, backfill, legacy removal or
  consumer migration.

## Integrity and qualification

The integrated candidate passes 219 tests, byte-identical bundle verification,
consumer-neutrality checks, CodeQL and dependency audit. A separately
authorized publication would add checksums, an SPDX SBOM, provenance
attestations and immutable assets.

## Rollback

The exact rollback pin is `v1.5.1` at commit
`d58837397bc5856923e0e742458be34d8e5a27d6`.

Rollback requires a separately reviewed consumer pin change. It does not
authorize moving or deleting a tag, deployment, live apply or migration.
