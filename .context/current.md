# Current context

**Status:** first usable preview Projects contract proposed; owner acceptance
pending
**Project:** Yukh Projects
**Visibility:** public

## Objective

Advance accepted suite RFC-0005 through the next Projects-owned review gate
without implementing or authorizing either preview effect.

## Now

- Suite RFC-0005 is authoritative on `nomed.github.io` `main` at
  `12d9215f10c4b7fb1762a5025367e3e81543800f` and requires two independent
  consequential effects for RFC-0003 steps 8 and 9.
- [#147](https://github.com/nomed/yukh-projects/issues/147) governs the
  Projects-owned proposal.
- [Projects effects v1](../docs/contracts/first-usable-preview-projects-v1.md)
  proposes exact invented targets, disjoint operation allowlists, two
  suite-level effect plans, a nested Effect B Projects plan, three independent
  approval assertions, separate authority chains, teardown, and redacted
  qualification evidence.
- The proposal adds no runtime, provider access, credential source, mutation
  authority, or release surface.

## Next

1. Obtain explicit owner acceptance or revision of the proposed component
   contract.
2. After acceptance only, govern deterministic synthetic implementation and
   adversarial tests through a separate issue and pull request.
3. Keep any later live synthetic sandbox mutation behind a fresh exact plan,
   approval, protected host, and separate operational authorization.

## Non-goals

- Implementing either preview effect.
- Running or authorizing live apply, teardown, or provider state creation.
- Creating credentials, approval material, sandbox resources, release
  artifacts, tags, deployments, or consumer migrations.
- Changing an accepted contract before the proposed record is explicitly
  accepted.

## Invariants

- Consumer neutrality and invented fixtures are mandatory.
- Effect A and Effect B use different targets and operation kinds.
- Plans, approvals, snapshots, credentials, nonces, leases, idempotency keys,
  verifiers, and audit chains remain distinct between effects.
- MCP admission cannot imply Projects approval, and Projects approval cannot
  bypass MCP admission.
- Effect A and nested Effect B Projects plans and approvals independently bind
  an exact immutable Projects producer commit, apply-artifact digest, and
  entrypoint version. Equal release values do not share authority; any change
  requires a fresh plan and every applicable fresh approval.
- Dry-run remains structurally separated from mutation.
- GitHub read permissions are the functional minimum for non-mutating
  qualification. A supplied credential with additional write permissions
  remains eligible and grants no apply authority because the path has no
  mutation transport, apply host, approval input, or controlled-apply
  authority.
- Accepted Projects contracts still forbid destructive restore; the proposed
  preview uses a separately governed teardown boundary.
- No live apply is authorized.
