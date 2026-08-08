# Dry-run credential profile v1 — reviewed amendment

- **Status:** Reviewed implementation amendment
- **Governing issue:** [#54](https://github.com/nomed/yukh-projects/issues/54)
- **Clarifies:** credential eligibility in GitHub read-only adapter v1 and
  Action, CLI, and protected release v1 for `native` dry-run and
  `legacy-shadow` only

## Credential eligibility

GitHub read permissions sufficient for the fixed, scope-bound reads are the
functional minimum. A short-lived credential limited to those permissions
remains the recommended least-privilege profile.

An existing caller-supplied credential that also has GitHub write permissions
MUST NOT be rejected, fail qualification, or be treated as authorizing apply
solely because of those additional permissions. Dry-run and legacy-shadow hosts
MUST NOT request, add, or broaden write permissions on the caller's behalf.
Authentication capability never becomes approval or apply authority.

## Structural safety boundary

The safety boundary is the dry-run and legacy-shadow implementation structure,
not the supplied credential's maximum permissions. These entrypoints:

- have no mutation transport or mutation operation;
- have no apply host or controlled-apply entrypoint;
- accept no approval, nonce, lease, or apply-authority input; and
- cannot convert a plan or credential into provider mutation authority.

Their dependency graphs and emitted bundles MUST keep mutation transports,
apply hosts, approval verification, and controlled mutation execution
unreachable. A credential with excess permissions therefore confers no
additional behavior.

## Qualification and diagnostics

Qualification proves that the bound credential can complete the required reads
and that the structural safety boundary above remains intact. It MUST NOT fail
because the credential has unrelated or write permissions. When a host can
attest excess permissions without exposing credential material, it MAY emit a
non-public least-privilege recommendation; that recommendation is not an
eligibility gate.

This amendment does not relax scope binding, freshness, rate admission,
redaction, or provider-response validation. It authorizes no mutation,
controlled apply, workflow execution, provider state creation, or consumer
deployment.
