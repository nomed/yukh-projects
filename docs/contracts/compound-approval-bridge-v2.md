# Compound approval bridge v2 and MCP-safe controlled-apply wrapper v1 — proposed specification

- **Status:** Proposed
- **Proposed:** 2026-08-09
- **Governing issue:** [#150](https://github.com/nomed/yukh-projects/issues/150)
- **Projects baseline:** `8b123f4f5dd6796dc355c34e5a800753ee257a82`
- **Producer baseline:** `v1.7.0` at
  `71784218366805922e5a12903eef9073f715f59f`
- **MCP dependency:** Proposed RFC-0011 at
  `nomed/yukh-mcp@cef0d9c1088ae641e3a5892d616859458e429bb0`
- **Suite decision:** accepted RFC-0005 at
  `nomed/nomed.github.io@12d9215f10c4b7fb1762a5025367e3e81543800f`
- **Authority:** contract review only; no implementation, provider access,
  artifact publication, or mutation

## Decision requested

Accept one producer-owned, closed compound-approval bridge and one immutable
MCP-safe controlled-apply wrapper compatibility surface. Acceptance would:

1. leave the accepted `SignedApprovalEnvelope` and `ApprovalClaims` v1 schemas,
   signing domain, verifier, and current entrypoints byte-for-byte and
   semantically unchanged;
2. define a separately authenticated bridge v2 paired with one exact v1
   Projects assertion and one exact MCP assertion;
3. define `runMcpSafeControlledApplyV1` as the only compatible MCP-to-Projects
   apply function;
4. supersede only the incompatible Effect B target, capability, operation, and
   postcondition bindings in
   [Projects effects v1](first-usable-preview-projects-v1.md); and
5. retain Effect A and every authority-separation, fresh-plan, approval,
   teardown, redaction, and no-live-apply invariant from that accepted record.

The supersession in item 4 is necessary. The accepted Projects record names
Effect B as `projects.add-dependency.v1` with one `add_dependency`, while
authoritative MCP RFC-0011 names
`github.projects.item.status.set@1.0.0` with one
`set_field_value(status)`. Those operation sets cannot exact-match. Treating
them as equivalent, translating one into the other, or accepting either at
runtime would violate both closed plans.

If accepted, Effect B instead uses logical target `preview_effect_b_item`,
which is distinct from Effect A's issue `101` item, and exactly:

~~~text
set_field_value(status, mcp_pending -> mcp_verified)
~~~

This remains compatible with suite RFC-0005 because the suite requires
distinct targets **or** disjoint operation sets. Concrete repository, Project,
issue, item, field, and option identifiers remain protected deployment
bindings and cannot be capability or wrapper inputs. The invented logical
target does not name, discover, reserve, or authorize provider state.

Until an owner accepts this contract, the accepted Projects record remains
authoritative and RFC-0011 remains incompatible and blocked. Contract
acceptance alone still does not publish the wrapper artifact required by
RFC-0011.

## Authority model

Effect B admission consists of three independently authenticated artifacts:

- the unchanged closed MCP `ApprovalReceiptV1`, verified only by MCP under the
  MCP approval trust profile;
- the unchanged closed Projects `SignedApprovalEnvelope` v1, verified only by
  Projects under the Projects approval trust profile; and
- `SignedProjectsApprovalBridgeV2`, verified under a third bridge trust
  profile.

The bridge proves an exact relationship. It is not an approval, authorization
decision, bearer capability, credential, nonce-consumption result, lease,
provider request, or verification result. Possession or authentication of one
artifact never authenticates, approves, derives, transforms, or authorizes
another. Workflow admission, protected-environment review, OIDC,
materialization, credential possession, Coordination success, provider
acceptance, or test status cannot substitute for any artifact.

The three signature verifiers, issuer allowlists, public trust roots, nonce
stores, and verification receipts are distinct. Their trust-root fingerprints
must be pairwise different for this profile. A single signer, public key,
verifier instance, or receipt used in more than one role fails before provider
access.

## Unchanged Projects assertion v1

The accepted v1 envelope remains exactly:

~~~typescript
type SignedApprovalEnvelope = {
  schema: 1;
  algorithm: "Ed25519";
  keyFingerprint: string;
  claims: ApprovalClaims;
  signature: string;
};
~~~

No bridge, MCP, producer-release, wrapper, or postcondition field is added to
`ApprovalClaims`. Existing v1 entrypoints neither accept nor discover bridge
v2. The v1 assertion's `subjectRef` remains the opaque host-attested GitHub
installation or principal reference produced by the authenticated Projects
read boundary. It is not an MCP subject, capability, provider, verifier, plan,
policy, workflow, repository input, display login, or user-supplied value.

For Effect B, the read and write hosts must authenticate the same GitHub
installation or principal and reproduce the exact v1 `subjectRef`. The bridge
binds a digest of that opaque value; it never reinterprets or exposes it.

## Closed bridge envelope

~~~typescript
type SignedProjectsApprovalBridgeV2 = Readonly<{
  schema: "yukh-projects-approval-bridge-envelope-v2";
  algorithm: "Ed25519";
  keyFingerprint: LowerHexSha256;
  claims: ProjectsApprovalBridgeClaimsV2;
  signature: Base64UrlEd25519Signature;
}>;

type ProjectsApprovalBridgeClaimsV2 = Readonly<{
  schema: "yukh-projects-approval-bridge-v2";
  profile: "yukh-mcp/suite-preview-effect-b-status-v1";
  issuerRef: BoundedPrivateRef;
  bridgeNonce: BoundedPrivateRef;
  issuedAtMs: SafeInteger;
  expiresAtMs: SafeInteger;
  trustRoots: Readonly<{
    mcpApproval: LowerHexSha256;
    projectsApproval: LowerHexSha256;
    bridge: LowerHexSha256;
  }>;
  assertions: Readonly<{
    mcpApprovalReceiptV1Sha256: LowerHexSha256;
    projectsSignedApprovalV1Sha256: LowerHexSha256;
    mcpPlanId: LowerHexSha256;
    mcpOperationSetSha256: LowerHexSha256;
    projectsPlanId: LowerHexSha256;
    projectsOperationSetSha256: LowerHexSha256;
  }>;
  subject: Readonly<{
    mcpSubjectBindingSha256: LowerHexSha256;
    projectsSubjectRefSha256: LowerHexSha256;
    githubPrincipalBindingSha256: LowerHexSha256;
  }>;
  target: Readonly<{
    logicalResource: "preview_effect_b_item";
    protectedScopeSha256: LowerHexSha256;
  }>;
  capability: Readonly<{
    id: "github.projects.item.status.set";
    version: "1.0.0";
    definitionSha256: LowerHexSha256;
    providerImplementationSha256: LowerHexSha256;
  }>;
  operation: Readonly<{
    count: 1;
    kind: "set_field_value";
    logicalField: "status";
    expectedLogicalOption: "mcp_pending";
    desiredLogicalOption: "mcp_verified";
  }>;
  postconditionBindingSha256: LowerHexSha256;
  producer: Readonly<{
    sourceCommit: "71784218366805922e5a12903eef9073f715f59f";
    applyLibrarySha256:
      "e37a6d50f0cc862b4f8c68ec5b9be2386184a69c6800fcbb98cc132e46ffa9a2";
    entrypointVersion: "apply-entrypoint-v1";
  }>;
  wrapper: Readonly<{
    contractVersion: "mcp-safe-controlled-apply-wrapper-v1";
    exportName: "runMcpSafeControlledApplyV1";
    sourceCommit: LowerHexCommit;
    artifactSha256: LowerHexSha256;
  }>;
  policy: Readonly<{
    mcpPolicyCommit: LowerHexCommit;
    projectsPolicySha256: LowerHexSha256;
    mcpEnvironment: "suite_preview_sandbox";
    projectsPlanEnvironment: "dry-run";
    projectsApprovalEnvironment: "apply";
    protectedEnvironmentSha256: LowerHexSha256;
  }>;
  verification: Readonly<{
    mcpVerifierSha256: LowerHexSha256;
    projectsVerifierSha256: LowerHexSha256;
    independentMcpPostconditionVerifierSha256: LowerHexSha256;
  }>;
  coordination: Readonly<{
    mcpReservationScopeSha256: LowerHexSha256;
    projectsLeaseScopeSha256: LowerHexSha256;
    coordinationEpoch: SafePositiveInteger;
    projectsHolderSha256: LowerHexSha256;
  }>;
}>;
~~~

Every listed key is mandatory and no other key is allowed at any depth.
Aliases, duplicate keys, sidecars, detached supplemental claims, multiple
signatures, nullable fields, partial claims, and extension maps are forbidden.
`LowerHexSha256` is exactly 64 lowercase hexadecimal characters and
`LowerHexCommit` exactly 40. `BoundedPrivateRef` contains 1 through 256 Unicode
scalar values and no control character. Integers are non-negative safe
integers except where positive is stated.

The complete UTF-8 bridge is at most 32 KiB, nesting depth at most 8, and has no
array other than the fixed structures represented above. Each ordinary string
is at most 256 Unicode scalar values. The two fixed producer digest literals
and the future wrapper source and artifact digests are authority-bearing, not
display metadata. A wrapper bridge with placeholders, a tag, a branch, a
semantic version alone, or a missing digest is invalid.

### Canonicalization and authentication

Bridge canonical JSON uses the accepted Projects canonical form: recursively
sort object keys by Unicode code point, retain array order, encode UTF-8
without insignificant whitespace, reject non-finite numbers and non-safe
integers, and retain strings byte-for-byte without normalization. A parser
must reject duplicate keys before canonicalization. The received bytes must
equal the canonical bytes exactly.

The signature input is:

~~~text
UTF8("yukh-projects-approval-bridge-v2\0")
|| canonicalJson({
     schema,
     algorithm,
     keyFingerprint,
     claims
   })
~~~

`algorithm` is exactly `Ed25519`; `signature` is the unpadded base64url encoding
of exactly 64 signature bytes. `keyFingerprint` is lowercase SHA-256 of the
exact DER SubjectPublicKeyInfo bytes. It must equal `claims.trustRoots.bridge`
and the separately configured protected-host bridge trust root. Issuer
allowlisting and trust-root selection come only from protected host policy.
The bridge, assertions, repository content, workflow input, capsule, or
material package cannot add or select a root or issuer.

Assertion digests are lowercase SHA-256 of the exact bounded canonical
assertion envelope bytes, including signatures. Every other digest is
lowercase SHA-256 of its named accepted canonical value. Digest comparisons
are byte equality after strict syntax validation; human-readable summaries,
display versions, tags, aliases, and compatibility-matrix entries are never
comparison substitutes.

### Exact pair and common bindings

One bridge pairs exactly one MCP assertion with exactly one Projects v1
assertion. It must exact-match:

- the digest, plan ID, and ordered operation-set digest from each assertion;
- the fixed capability definition and provider implementation bound by the MCP
  plan;
- the Projects scope and plan bound by the v1 assertion;
- the GitHub principal binding derived from the Projects `subjectRef` and
  independently carried by the MCP operation binding;
- the one fixed target and one fixed status operation;
- the same canonical Effect B postcondition;
- the exact producer and wrapper identities;
- both policy bindings and all three environment domains;
- the MCP, Projects, bridge, and independent postcondition verifier identities;
- both component reservation or lease scopes, Coordination epoch, and Projects
  holder digest; and
- all three independently selected trust-root fingerprints.

The Projects v1 assertion cannot directly carry every value above. Its atomic
Effect B approval assertion is therefore the exact pair
`(projectsSignedApprovalV1, signedProjectsApprovalBridgeV2)`. Pairing adds
bindings but does not alter or broaden v1 claims. Either member alone grants no
Effect B authority. The MCP assertion remains a separate assertion, not a
member or extension of the Projects schema.

The canonical Effect B postcondition value is:

~~~json
{
  "field": "status",
  "logicalResource": "preview_effect_b_item",
  "projectsFreshZeroDrift": true,
  "schema": "yukh-projects-effect-b-postcondition-v1",
  "value": "mcp_verified"
}
~~~

Its canonical SHA-256 digest must be byte-identical in the MCP plan binding and
bridge:

~~~text
ead6dce3da3ebe3319531ffd1aea005efd9fbd678e3db9b62430d34d03226b95
~~~

Projects controlled apply still performs its own targeted verification
and final zero-operation reconciliation. MCP still performs a fresh,
independent read-only verification. Neither verifier result completes or
authorizes the other.

### Lifetime, replay, and atomic verification

The bridge lifetime is at most five minutes, is fully contained within both
assertion lifetimes and the protected material-package lifetime, and uses the
protected host clock. `issuedAtMs` cannot be in the future and `expiresAtMs`
is inclusive only at the exact comparison instant. Clock, expiry, or ordering
uncertainty denies.

`bridgeNonce` carries at least 128 bits of entropy and is distinct from both
assertion nonces, both component idempotency keys, and every Effect A value.
The bridge verifier consumes it atomically in a bridge-only replay store after
all parsing, signature, equality, policy, trust, package, and admission checks
pass and before host construction or provider access. Consumed, missing,
duplicate, unavailable, or ambiguous nonce state denies without retry. The MCP
assertion nonce remains MCP-owned; the Projects assertion nonce remains
Projects-owned and is consumed only by controlled apply.

Compound verification is a two-component atomic admission:

1. bounded-read all artifacts and protected roots without network access;
2. parse every closed shape and reproduce canonical bytes and digests;
3. MCP independently authenticates and validates only the MCP assertion;
4. the bridge verifier authenticates only the bridge and MCP compares every
   bridge binding it owns;
5. require a fresh, durable MCP apply decision, MCP nonce consumption, audit
   admission, and exact one-attempt reservation bound to both assertion
   digests and the bridge digest;
6. mint a non-serializable, single-use **provisional** compound-admission
   handle bound to that reservation, the exact Projects assertion bytes, and
   bridge bytes;
7. enter the wrapper without provider access, where Projects independently
   authenticates and validates only the v1 Projects assertion, reauthenticates
   the bridge, and compares every Projects-owned and common binding; and
8. atomically commit the provisional handle and consume the bridge nonce only
   after all checks pass and immediately before host construction.

No provisional handle is externally serializable, reusable, or
success-shaped. Failure at any step aborts or consumes the provisional
reservation, exposes no private claim, and performs zero GitHub or Projects
provider calls. Only the wrapper's atomic commit turns it into one-run runtime
authority after both independently verified assertions and the
non-authorizing bridge agree. It is not derivable from or replaceable by any
one of them.

## Immutable MCP-safe wrapper

The only compatible export is:

~~~typescript
declare function runMcpSafeControlledApplyV1(
  input: McpSafeControlledApplyInputV1,
): Promise<McpSafeControlledApplyResultV1>;

type McpSafeControlledApplyInputV1 = Readonly<{
  schema: "yukh-projects-mcp-safe-controlled-apply-input-v1";
  profile: "yukh-mcp/suite-preview-effect-b-status-v1";
  compoundAdmission: PrivateCompoundAdmissionHandle;
  material: Readonly<{
    deploymentProfile: PrivateBoundedHandle;
    projectsApprovalV1: PrivateBoundedHandle;
    projectsApprovalTrustRoot: PrivateBoundedHandle;
    bridgeV2: PrivateBoundedHandle;
    bridgeTrustRoot: PrivateBoundedHandle;
    protectedHostCapsuleV1: PrivateBoundedHandle;
    githubReadCredential: PrivateSingleUseHandle;
    githubWriteCredential: PrivateSingleUseHandle;
  }>;
}>;

type McpSafeControlledApplyResultV1 = Readonly<{
  schema: "yukh-projects-mcp-safe-controlled-apply-result-v1";
  status:
    | "projects_verified"
    | "rejected_before_effect"
    | "provider_failed_no_effect"
    | "completion_unknown"
    | "projects_verification_failed";
  mutationAttempts: 0 | 1;
  remaining: 0 | 1;
  code: McpSafeControlledApplyCode;
}>;

type McpSafeControlledApplyCode =
  | "YKP-MCP-BRIDGE-001"
  | "YKP-MCP-BRIDGE-002"
  | "YKP-MCP-BRIDGE-003"
  | "YKP-MCP-BRIDGE-004"
  | "YKP-MCP-BRIDGE-005"
  | "YKP-MCP-BRIDGE-006"
  | "YKP-MCP-BRIDGE-007"
  | "YKP-MCP-BRIDGE-008"
  | "YKP-MCP-BRIDGE-009"
  | "YKP-MCP-BRIDGE-010"
  | "YKP-MCP-BRIDGE-011"
  | "YKP-MCP-BRIDGE-012";
~~~

All input keys are mandatory and closed. The private handle types are
non-serializable, host-origin authenticated, size-bounded, one-run values from
the atomically validated material package. They expose neither bytes nor a
path, URL, descriptor number, token, public key, provider ID, or endpoint to
the MCP adapter. The read and write credential handles are distinct in object
identity and credential value.

The wrapper has no second function, overload, callback, plugin, transport,
query, URL, method, header, document, provider identifier, credential value,
scope, field, option, policy path, environment, mode, operation, retry,
timeout, verifier, trust root, or output selector supplied by its caller.
An abort signal may be owned by the lifecycle host, but abort after wrapper
entry follows unknown-completion rules and cannot authorize retry.

The immutable wrapper profile fixes:

- native controlled-apply mode `apply` / internal `native-v1`;
- MCP environment `suite_preview_sandbox`;
- Projects plan operation environment `dry-run`;
- Projects approval environment `apply`;
- one protected environment digest selected by the later accepted private
  deployment profile handle;
- one exact protected scope from that profile handle;
- one exact Projects policy byte sequence and SHA-256 digest from that profile
  handle;
- one operation, `set_field_value` for logical field `status`;
- old option `mcp_pending` and desired option `mcp_verified`;
- approved mutation kind `update_project_item_field_value`;
- Projects producer `v1.7.0` source and apply-library digest above; and
- wrapper contract and export names above plus the exact future wrapper source
  commit and artifact digest.

The private deployment profile is closed, canonical, host-origin
authenticated, and digest-bound by the bridge and compound-admission handle.
It may contain provider-native scope values and the fixed policy bytes, but
the caller cannot select them. The wrapper validates them against the bridge,
capsule, policy, and compound-admission handle before any provider call. No
identifier or secret enters public output.

### Exact primitive composition

The wrapper must compose the reviewed v1.7.0 exports in this order:

1. bounded-read and verify the compound-admission handle, private deployment
   profile, Projects assertion, both Projects and bridge trust roots, and
   bridge;
2. call the reviewed `verifySignedApproval` export before host construction so
   an invalid Projects assertion cannot trigger the factory's initial read;
3. call `parseProtectedHostCapsule` once with only the fixed protected scope and
   environment;
4. require capsule enablement `apply-explicitly-enabled`, exactly one approved
   kind `update_project_item_field_value`, distinct read/write permissions and
   credentials, exact Coordination epoch and holder, and rate bounds compatible
   with one status operation;
5. call `createControlledApplyHostFactory` once with only the parsed capsule
   options;
6. call the returned factory `create` once with internal mode `native-v1`, the
   fixed scope, fixed policy bytes, and the two distinct credential values;
7. require the factory's bound scope and fresh plan to exact-match the Projects
   assertion, bridge, one-operation allowlist, producer, and postcondition;
8. call `runApplyEntrypoint` once with that returned host and scope, the exact
   approved Projects plan ID, protected environment, unchanged Projects
   assertion, and Projects public key; and
9. map only the closed producer result to the closed wrapper result.

The early `verifySignedApproval` call is justified because the current
`createControlledApplyHostFactory(...).create(...)` performs an initial
provider read, while `runApplyEntrypoint` otherwise verifies approval only
after host creation. The wrapper must still pass the unchanged assertion to
`runApplyEntrypoint`, which independently re-verifies it. A future producer
successor may replace the duplicate verification only if it exposes one
reviewed no-I/O admission primitive and receives separate compatibility and
threat-model acceptance.

No CLI, Action runner, workflow dispatch, shell, subprocess, dynamic import,
runtime installation, package registry, generic HTTP client, GitHub SDK,
generic REST or GraphQL client, arbitrary query, alternate provider, legacy
mode, single-token mode, deferred resume, fallback, or consumer-assembled
internal port is reachable.

### Attempts, completion, and verification

Complete compound admission, including both assertion verifications, bridge
verification, current MCP apply authorization, reservation, audit admission,
and bridge nonce consumption, precedes the first GitHub read. Every admission
failure proves zero provider calls.

One MCP provider attempt is exactly one wrapper invocation. After admission,
the producer may perform its accepted bounded fresh reads, exactly zero or one
fixed mutation request, targeted verification, and final reconciliation. There
is no hidden retry, redirect, polling, sleep, credential switching,
continuation, partial selector, second mutation, resume, automatic restore, or
automatic teardown.

The effect boundary begins immediately before the one fixed mutation request.
If execution stops before that boundary and the wrapper can prove no mutation
request was sent, it returns `provider_failed_no_effect`. After the boundary,
a timeout, abort, crash, lost response, malformed acknowledgement, lease loss,
verification ambiguity, cleanup ambiguity, or inability to prove effect or
no effect returns `completion_unknown`. That result is terminal for the
reservation. It consumes all one-shot authority and can never trigger or
permit replay.

`projects_verified` requires the accepted Projects targeted verification and
Projects final executable zero-operation plan with zero diagnostics. MCP may
release Effect B success only after its separate verifier obtains a fresh
status observation and zero-drift plan. The wrapper result alone is an
observation and cannot complete MCP verification.
`already_converged` before the consequential Effect B mutation is not
`projects_verified`; it returns `rejected_before_effect`.

## Stable errors and redaction

| Code | Closed meaning | Mutation attempts |
| --- | --- | --- |
| `YKP-MCP-BRIDGE-001` | closed input, size, or canonical form invalid | 0 |
| `YKP-MCP-BRIDGE-002` | MCP assertion authentication or admission absent | 0 |
| `YKP-MCP-BRIDGE-003` | Projects v1 assertion authentication invalid | 0 |
| `YKP-MCP-BRIDGE-004` | bridge authentication or trust profile invalid | 0 |
| `YKP-MCP-BRIDGE-005` | assertion, plan, subject, scope, or operation pairing mismatched | 0 |
| `YKP-MCP-BRIDGE-006` | producer, wrapper, policy, environment, or verifier mismatched | 0 |
| `YKP-MCP-BRIDGE-007` | artifact expired, replayed, stale, or reservation unavailable | 0 |
| `YKP-MCP-BRIDGE-008` | protected material, capsule, credential, permission, or rate gate invalid | 0 |
| `YKP-MCP-BRIDGE-009` | producer failed and proved no mutation request was sent | 0 |
| `YKP-MCP-BRIDGE-010` | mutation completion is unknown and retry is forbidden | 1 |
| `YKP-MCP-BRIDGE-011` | Projects targeted or final verification failed | 0 or 1 |
| `YKP-MCP-BRIDGE-012` | redaction, invariant, or closed-result validation failed | 0 or 1 |

Messages are static. Public output contains only the result schema, status,
attempt count, remaining count, and one code. It excludes plans, assertions,
bridge bytes, signatures, claims, trust roots, subjects, issuers, scope,
policy, postconditions, producer or wrapper digests, credentials, capsule,
nonces, leases, reservations, audit references, provider identifiers, URLs,
headers, queries, documents, responses, errors, observations, timestamps,
paths, stack traces, and cleanup details. Redaction occurs before error
construction, callback, logging, audit, or serialization. An unsafe error
collapses to `YKP-MCP-BRIDGE-012` and cannot be treated as proven no effect
after the mutation boundary.

## Distribution and conformance

The future implementation must publish exactly one reproducible
`yukh-projects-mcp-safe-controlled-apply-wrapper-<version>.js` artifact from a
reviewed full source commit. The protected publisher must emit and verify:

- a SHA-256 checksum manifest naming the wrapper and every runtime input
  artifact;
- an SPDX SBOM;
- source and build provenance attestations bound to the exact source commit,
  lockfile, build command, runtime, wrapper bytes, and contract version;
- a byte-identical clean rebuild;
- an export and dependency-graph manifest proving the single function and
  reviewed primitive composition;
- positive canonical vectors for the bridge, signature domain, all paired
  digests, fixed postcondition, and closed result mapping; and
- negative vectors for every unknown field, bound, signature, trust,
  substitution, expiry, replay, operation, credential, zero-call, one-attempt,
  completion-unknown, redaction, and independent-verification case.

Conformance fixtures use only invented data and injected network-free fakes.
No fixture may contain a credential, live endpoint, provider request,
adopter-derived identifier, or production observation. The exact wrapper
source commit and artifact digest do not exist at contract-review time.
RFC-0011 remains blocked until a separate reviewed implementation and protected
immutable publication bind those non-placeholder values and pass all vectors.

## Compatibility, migration, and rollback

There is no automatic v1-to-v2 upgrade, inference, wrapping, fallback, dual
acceptance, or assertion translation. Existing v1 approvals and entrypoints
continue unchanged. Outstanding v1 assertions cannot be paired unless they
were issued for the exact v2-bound plan and all bridge lifetime and freshness
requirements still hold; issuance of a bridge never retroactively broadens a
v1 assertion.

If accepted, this contract supersedes only these accepted Projects effects v1
Effect B statements:

- capability `projects.add-dependency.v1`;
- nested `add_dependency(201 blocks 202)` Projects plan;
- relationship target and postcondition; and
- claims that Effect A and Effect B must use different operation kinds.

They become the fixed RFC-0011 status capability, distinct logical target,
status operation, and postcondition in this contract. The accepted record is
not edited. Effect A, two suite plans, nested `B-Projects` plan, exactly three
approval assertions, distinct authority-bearing values, producer-release
binding, teardown, and all no-authority and no-live-apply statements remain.

Pre-acceptance rollback is closing or revising this proposal. After acceptance
but before implementation, rollback withdraws this compatibility surface and
leaves v1 behavior unchanged. After publication, rollback disables bridge v2
trust and wrapper loading and returns consumers to the last immutable
read-only or v1 pin. Source rollback cannot reverse a possible provider
effect. Provider state requires a separately planned and approved restore or
suite teardown; no old assertion, bridge, nonce, lease, credential, or
reservation is reusable.

Adding a field, value, operation, target, capability, provider, mode,
credential path, trust model, retry, assertion schema, wrapper export,
transport, or result state requires a new accepted contract and threat-model
review.

## Owner acceptance gate

The owner must explicitly accept or reject all of the following as one
decision:

1. the narrow supersession of accepted Projects effects v1 Effect B from
   `add_dependency` to RFC-0011's fixed status operation on a distinct target;
2. unchanged Projects approval envelope v1 plus the exact independently signed
   bridge v2 schema, canonicalization, trust, bounds, lifetime, replay, and
   atomic pairing rules;
3. preservation of Projects `subjectRef` as the authenticated GitHub
   installation or principal and the prohibition on MCP reinterpretation;
4. the exact producer identity and mandatory non-placeholder future wrapper
   source and artifact identity;
5. `runMcpSafeControlledApplyV1`, its closed private-handle input, closed
   output, fixed native composition, zero-call admission boundary, and one
   mutation-attempt maximum;
6. independent Projects and MCP verification, durable
   `completion_unknown`, no retry, redaction, and stable failures;
7. reproducibility, checksums, SPDX SBOM, provenance, dependency-graph, and
   conformance requirements; and
8. the rule that acceptance authorizes only a later synthetic implementation
   proposal and does not satisfy RFC-0011's immutable-publication dependency.

No implementation, fixture that calls a provider, credential, OIDC setup,
GitHub request, mutation, deployment, release, tag, wrapper artifact,
activation, restore, teardown, consumer migration, or production-readiness
claim is authorized by this proposal or its acceptance.
