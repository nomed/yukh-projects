# Apply-compatible release 1.3.0 qualification

## Candidate scope

Version `1.3.0` is the first release candidate whose immutable asset set contains
both the dry-run surfaces and the accepted controlled-apply surfaces. The
qualification starts from protected `main` commit
`8e8c7db31ef5d26fe2642ce2f1360bf3ed4674f9`; the final candidate commit is fixed
only after this qualification change and the Release Please PR have both merged.

The closed release manifest allowlists exactly:

- dry-run Action metadata and bundle;
- dry-run CLI bundle;
- controlled-apply Action metadata and bundle;
- controlled-apply CLI and library bundles;
- controlled-apply internal manifest;
- release notes, lockfile and generated SPDX SBOM.

The protected preflight produces SHA-256 checksums for every named release asset.
The protected publisher verifies every byte against the would-publish manifest,
uses the reviewed release notes as the immutable GitHub Release body, and asks
GitHub to attest every released asset. Unknown, missing, duplicate, empty or
version-mismatched artifacts fail closed before publication.

## Completed evidence

- 168 deterministic tests pass, including controlled apply, durable restart and
  concurrency, 1/10/100 issue REST ceilings, zero-GraphQL behavior and a
  zero-operation second apply.
- Dry-run and apply bundles rebuild byte-identically.
- Dependency audit reports zero vulnerabilities.
- Consumer-neutrality policy checks pass.
- Release `v1.3.0` and tag `v1.3.0` do not exist at qualification start.
- Exact rollback pin: `2fc81c48b678428937209326bececcf52354aaf1`
  (`v1.2.0`).

## Gates intentionally still open

- merge this qualification PR;
- refresh, review and merge the Release Please `1.3.0` PR;
- bind the resulting exact protected-main commit;
- run the read-only protected preflight from a clean checkout;
- review its manifest, checksums and SPDX SBOM;
- obtain a separate explicit approval before entering the protected publication
  environment.

No step in this document authorizes tag creation, GitHub Release creation,
attestation publication, deployment, live apply or consumer migration.
