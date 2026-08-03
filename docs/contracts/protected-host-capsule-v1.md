# Protected host capsule v1 — accepted amendment

- **Status:** Accepted
- **Accepted:** 2026-08-03 by `@nomed`
- **Governing issues:** #56, #57 and #75

The executable controlled-apply Action receives exactly one additional input,
`host-capsule-file`, interpreted as a basename below `RUNNER_TEMP`. The CLI
receives exactly one additional option, `--host-capsule-fd`, naming a distinct
single-use descriptor. The capsule is a mode-0600, no-follow, bounded canonical
JSON file or a bounded descriptor value materialized by the protected host.

The closed capsule binds the target and protected environment, expiry, exact
coordination endpoint and epoch, independent host enablement, issuer allowlist,
permission and rate policy, approved mutation kinds, holder digest, short-lived
session credential and P-256 DPoP private JWK. Unknown, stale, mismatched or
over-permissive values fail before provider HTTP. A fresh RFC 9449 proof is
created for every coordination request; there is no bootstrap, refresh, retry,
polling or credential substitution.

Capsule content, credentials, private keys, proofs, endpoint and provider
identifiers never enter public output. Acceptance authorizes synthetic
implementation and executable-bundle qualification only. It does not authorize
live apply, deployment, merge, publication or consumer migration.
