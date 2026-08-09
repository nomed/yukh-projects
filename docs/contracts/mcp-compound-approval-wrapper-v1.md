# MCP compound approval bridge and wrapper v1 — proposed specification

- **Status:** Proposed
- **Proposed:** 2026-08-09
- **Governing issue:** [#150](https://github.com/nomed/yukh-projects/issues/150)
- **Projects preview dependency:** [Projects effects v1](first-usable-preview-projects-v1.md)
- **Autonomous-maintainer mandate:** RFC-0007 in
  `nomed/nomed.github.io@bb8628edf7a07c2af56f07e4f9140f58c851ef47`
- **Suite authority:** RFC-0005 in
  `nomed/nomed.github.io@12d9215f10c4b7fb1762a5025367e3e81543800f`
- **Accepted Projects authority:**
  `nomed/yukh-projects@8b123f4f5dd6796dc355c34e5a800753ee257a82`
- **Nonconforming Proposed MCP input:** RFC-0011 in
  `nomed/yukh-mcp@cef0d9c1088ae641e3a5892d616859458e429bb0`
- **Producer baseline:**
  `nomed/yukh-projects@71784218366805922e5a12903eef9073f715f59f`
- **Authority:** review material only; no implementation, provider access, or
  mutation

## Objective

Define the Projects-owned compatibility boundary needed for first-preview
Effect B without making MCP approval authoritative for Projects or Projects
approval authoritative for MCP. The boundary has two inseparable deliverables:

1. a closed authenticated `yukh-projects-approval-bridge-v2` artifact that
   cross-binds one independently authenticated MCP approval to one unchanged
   Projects approval envelope v1; and
2. one immutable producer-owned
   `runMcpEffectBControlledApplyV1` wrapper that performs complete compound
   admission and owns the reviewed v1.7.0 primitive composition.

The bridge is evidence, not authorization. The wrapper is an entrypoint, not
approval. A credential is capability, not authorization. No one of those
objects, no workflow admission, and no provider response substitutes for
either independently signed approval.

This proposal adds no executable export, dependency, transport, credential
source, provider target, deployment profile, or release artifact. Neither this
proposal nor its acceptance authorizes implementation. Any later synthetic
implementation would require a separately reviewed record. Live apply would
remain separately gated.

## Autonomous conflict decision

The two governing proposals currently name different Effect B operations:

- accepted Projects effects v1 fixes Effect B as capability
  `projects.add-dependency.v1` with exactly one `add_dependency(201 blocks 202)`
  operation; and
- Proposed MCP RFC-0011 fixes
  `github.projects.item.status.set@1.0.0` with exactly one
  `set_field_value(status)` operation.

Those plans, targets, operations, and postconditions cannot exact-match and
cannot be treated as two names for one effect.

Accepted RFC-0007 at
`nomed/nomed.github.io@bb8628edf7a07c2af56f07e4f9140f58c851ef47`
requires Proposed records inside an Accepted mission to resolve conflicts by:
least authority expansion, already-Accepted semantics, compatibility,
reversibility, and smallest diff, in that order. It also makes superseding or
reinterpreting an Accepted operation semantic Class C unless the Accepted
mission explicitly leaves that choice open. RFC-0005 does not leave the
Projects Effect B operation open.

The autonomous author decision is:

~~~text
Decision ID: projects-150-effect-b-conflict-v1
Class: B governance-only/inert; pending independent review
Decision: preserve Projects effects v1 capability projects.add-dependency.v1
Operation: exactly one add_dependency(201 blocks 202)
Rejected input: Proposed MCP RFC-0011 set_field_value(status)
Implementation authority: none
~~~

The tie-break evidence is:

1. **Least authority expansion:** retaining the Accepted Projects operation
   claims no new capability; adopting the Proposed status operation would add
   and substitute authority.
2. **Already-Accepted semantics:** the Accepted RFC-0005 mission at
   `12d9215f10c4b7fb1762a5025367e3e81543800f` and Accepted Projects record on
   `main` at `8b123f4f5dd6796dc355c34e5a800753ee257a82` already fix Effect B as
   `add_dependency`. This tie-break discriminates and is decisive.
3. **Compatibility:** preserving `add_dependency` keeps the Projects plan,
   approval, producer, postcondition, teardown, and evidence contracts
   compatible. Proposed MCP RFC-0011 must conform in its owning repository
   before it can be accepted or activated.
4. **Reversibility:** revising an unaccepted MCP proposal is reversible;
   superseding an Accepted Projects semantic is not an ordinary Class B change.
5. **Smallest diff:** narrowing the wrapper to its already-Accepted operation
   and later revising the Proposed MCP record is the smallest contained change.

This decision does not modify the immutable Accepted Projects record. It
removes the unresolved choice: the status operation is nonconforming and
ineligible for bridge admission. MCP RFC-0011 must later adopt the accepted
dependency target, capability, operation, and postcondition. Until then it
remains blocked. This Proposed contract remains author work only; a distinct
read-only reviewer and later distinct executor must supply RFC-0007 role
evidence before acceptance or merge.

## Existing contracts remain unchanged

Projects `SignedApprovalEnvelope` schema 1 and `ApprovalClaims` remain
byte-for-byte and semantically unchanged. The v1 verifier continues to reject
unknown fields and every v2 bridge object. Existing Action, CLI, and library
entrypoints continue to accept only the artifacts and modes already covered by
their accepted contracts.

The Projects v1 `subjectRef` remains the opaque host-attested GitHub
installation or principal reference derived from the authenticated read and
write boundary. It is never an MCP subject, capability digest, provider
digest, plan digest, policy digest, workflow identity, or bridge issuer.

MCP `ApprovalReceiptV1` remains owned by MCP. It is signed and verified under
the MCP-selected trust profile. Projects does not reinterpret its subject or
claims and the Projects approval authority does not sign it.

The pinned MCP verifier returns a nonserializable, single-use verified
admission handle. Projects validates only that handle's authenticity and exact
bridge bindings; it does not parse, re-sign, or independently authorize the
MCP assertion. This keeps MCP assertion verification inside the MCP approval
adapter while still making all three artifacts mandatory for atomic provider
admission.

## Closed bridge envelope

The private bridge wire representation is canonical JSON no larger than
32 KiB and no deeper than six objects. It has exactly these top-level fields:

~~~typescript
type ProjectsApprovalBridgeV2Envelope = {
  schema: "yukh-projects-approval-bridge-v2";
  algorithm: "Ed25519";
  keyFingerprint: LowerHexSha256;
  claims: ProjectsApprovalBridgeV2Claims;
  signature: Base64UrlEd25519Signature;
};
~~~

The first accepted profile has exactly this claims shape:

~~~typescript
type ProjectsApprovalBridgeV2Claims = {
  profile: "suite-preview-effect-b-v1";

  approvalV1Digest: LowerHexSha256;
  previewPlanEnvelopeDigest: LowerHexSha256;
  projectsPlanId: LowerHexSha256;
  projectsOperationDigest: LowerHexSha256;
  projectsTargetBindingDigest: LowerHexSha256;
  projectsPostconditionBindingDigest: LowerHexSha256;
  projectsProducerRelease: {
    sourceCommit: LowerHexCommit;
    applyArtifactSha256: LowerHexSha256;
    entrypointVersion: "apply-entrypoint-v1";
  };

  mcpApprovalDigest: LowerHexSha256;
  mcpPlanId: LowerHexSha256;
  mcpOperationDigest: LowerHexSha256;
  mcpSubjectBindingDigest: LowerHexSha256;
  mcpAuthenticationContextDigest: LowerHexSha256;
  mcpCapabilityDefinitionDigest: LowerHexSha256;
  mcpProviderImplementationDigest: LowerHexSha256;
  mcpPolicyCommit: LowerHexCommit;
  mcpNonceBindingDigest: LowerHexSha256;

  wrapperRelease: {
    sourceCommit: LowerHexCommit;
    artifactSha256: LowerHexSha256;
    entrypointVersion: "mcp-effect-b-controlled-apply-v1";
  };
  wrapperProfileDigest: LowerHexSha256;

  issuerRef: BoundedPrivateRef;
  subjectRef: BoundedPrivateRef;
  scopeDigest: LowerHexSha256;
  environment: "apply";
  protectedEnvironment: BoundedPrivateRef;
  issuedAtMs: SafeInteger;
  expiresAtMs: SafeInteger;
  nonce: BoundedPrivateRef;
  projectsNonceBindingDigest: LowerHexSha256;
  projectsLeaseScopeDigest: LowerHexSha256;
  projectsLeaseHolderDigest: LowerHexSha256;
  coordinationEpoch: SafeInteger;
  trustRootFingerprint: LowerHexSha256;
};
~~~

Every field is required. Exact field sets are validated at every object level.
Unknown fields, missing fields, aliases, duplicate JSON keys, floats, negative
or unsafe integers, invalid Unicode, control characters, unlisted nesting,
arrays, sidecars, detached extension objects, extra signatures, and unknown
schema, profile, algorithm, or entrypoint values fail closed.

`LowerHexSha256` is exactly 64 lowercase hexadecimal characters.
`LowerHexCommit` is exactly 40 lowercase hexadecimal characters.
`BoundedPrivateRef` is 1–256 UTF-8 bytes after JSON decoding and contains no
C0 or DEL control character. The Ed25519 signature is exactly 64 bytes encoded
as unpadded base64url.

## Canonicalization and authentication

Bridge canonicalization uses the accepted Projects canonical JSON rules:
object keys sort by Unicode code point, strings use JSON escaping without
normalization or lossy conversion, integers are safe decimal integers, and no
other JSON values are admitted. The input bytes MUST equal the canonical
serialization byte-for-byte. Parsing and reserializing a noncanonical artifact
does not make it valid.

The signature input is:

~~~text
yukh-projects-approval-bridge-v2 NUL canonical-json({
  schema,
  algorithm,
  keyFingerprint,
  claims
})
~~~

`signature` is excluded from the signed object. The bridge digest is lowercase
SHA-256 of the complete canonical authenticated envelope, including its
signature.

The bridge public key is supplied through a private protected-host handle. A
key embedded in the bridge, approval, policy, repository, workflow input, or
MCP request is never trusted. `trustRootFingerprint` is the canonical digest of
the host-selected Projects trust profile: profile version, exact Ed25519 public
key fingerprint, and ordered issuer allowlist. It is not taken from either
approval or from the bridge. The same host-selected trust profile verifies the
paired Projects v1 approval and bridge. The bridge `issuerRef`, `subjectRef`,
`keyFingerprint`, lifetime, nonce, and protected environment exact-match the
corresponding Projects v1 envelope and claims; `trustRootFingerprint`
exact-matches the separately selected host profile. Key or issuer-allowlist
rotation is an explicit host-profile change and invalidates every outstanding
bridge and paired approval.

Private signing keys never enter the wrapper, MCP runtime, repository,
workflow input, log, output, audit record, or evidence.

## Exact cross-bindings

`approvalV1Digest` is SHA-256 of the exact canonical authenticated Projects v1
envelope bytes. `mcpApprovalDigest` is SHA-256 of the exact canonical
authenticated MCP approval bytes accepted by the pinned MCP verifier. Neither
digest authenticates the underlying artifact by itself.

The paired Projects v1 envelope and bridge MUST exact-match every binding that
exists in v1:

- Projects plan ID and ordered operation-set digest;
- issuer, `subjectRef`, scope, `environment: apply`, protected environment,
  issued-at, expiry, nonce, and key fingerprint.

The bridge MUST additionally exact-match values that are intentionally absent
from the unchanged v1 schema against their separately authenticated sources:

- the exact preview plan-envelope digest;
- the exact Projects target and postcondition binding digests; and
- the independently authority-bound Projects producer release tuple;
- the host-selected Projects trust-profile fingerprint; and
- the protected capsule's Coordination epoch, lease-scope digest, and
  lease-holder digest.

The MCP approval, Projects v1 approval, and bridge MUST exact-match:

- MCP plan and operation-set digests;
- authenticated MCP subject and authentication-context digests;
- exact capability-definition, provider-implementation, and policy digests;
- the nested Projects plan, operation set, target, authenticated GitHub
  principal, producer release, and Effect B postcondition;
- fixed wrapper release and wrapper-profile digests; and
- one shared expiry window that does not extend either approval.

`mcpNonceBindingDigest` exact-matches the domain-separated digest of the nonce
in the verified MCP assertion. `projectsNonceBindingDigest` exact-matches the
domain-separated digest of the nonce in the verified Projects v1 assertion,
whose private raw value remains in `nonce` only because v1 exact matching
requires it. The two nonce digests and raw nonce values MUST be distinct.
`projectsLeaseScopeDigest`, `projectsLeaseHolderDigest`, and
`coordinationEpoch` exact-match the MCP reservation, Projects plan binding,
protected capsule, and wrapper profile before lease acquisition. They describe
the one lease the Projects host may acquire; they are not a lease capability
and do not prove acquisition.

The MCP and Projects approvals bind the same byte-identical canonical Effect B
postcondition. Their subjects, schemas, signers, trust roots, nonces,
verification receipts, authority scopes, and evidence chains remain distinct.
The bridge never maps MCP identity into Projects `subjectRef`; it proves only
that the MCP-approved operation named the same host-attested Projects
principal binding.

The fixed Effect B profile admits exactly one native Projects
`add_dependency(201 blocks 202)` operation for the two server-owned synthetic
issues in the accepted target. Any second operation, reversed relationship,
different issue, field operation, different target, caller-selected identifier,
or different producer or wrapper release fails before provider access.

## Lifetime, replay, and atomicity

The bridge lifetime is at most 15 minutes, begins no earlier than either paired
approval, and ends no later than the first approval to expire. Its
`issuedAtMs` and `expiresAtMs` still exact-match the Projects v1 assertion; if
that interval cannot also fit inside the verified MCP assertion interval, the
compound admission is impossible. The trusted host clock performs all
comparisons. Missing, future-issued, expired, incomparable, or differently
bounded times fail closed.

The Projects nonce remains owned and consumed exactly once by the Projects
controlled-apply host. MCP MUST NOT consume it. The bridge additionally binds
the distinct MCP approval and nonce digests; MCP consumes its own nonce through
its separate lifecycle before wrapper invocation. The wrapper validates the
Projects nonce binding before the Projects host consumes that nonce. A
consumed, expired, replaced, equal, or mismatched nonce or assertion makes the
bridge unusable. There is no bridge refresh, continuation, resume, re-signing,
or replay path.

Compound admission is atomic at the provider boundary:

1. the pinned MCP approval adapter verifies the MCP assertion under the
   MCP-selected trust profile and mints one unforgeable verified-admission
   handle;
2. MCP authenticates the bridge and exact-matches it to the verified MCP
   assertion before invoking Projects;
3. the unchanged Projects v1 verifier verifies the Projects assertion under
   the Projects-selected trust profile;
4. the Projects bridge verifier independently authenticates the same bridge,
   authenticates the MCP verified-admission handle, and exact-matches every
   Projects v1 and cross-component binding;
5. the wrapper validates its immutable profile, protected capsule, private
   handles, producer release, target, policy, and one-operation plan; and
6. only then may construction of a provider-backed read or write transport
   begin.

Each verifier returns only a nonserializable verified value or a stable
failure. Validating one artifact is not retained as partial admission when
another fails. Any missing, unknown, stale, replayed, substituted,
incomparable, or unverifiable artifact denies the complete invocation with
zero GitHub or other provider calls.

MCP independently owns its authorization decision and nonce consumption.
Projects independently owns Projects approval verification, nonce and lease
gates, fresh planning, mutation, and convergence. The wrapper's atomic
sequencing does not merge those authorities.

## Immutable MCP-safe wrapper

An implementation following acceptance may export exactly one MCP-facing
function:

~~~typescript
declare function runMcpEffectBControlledApplyV1(
  invocation: McpEffectBControlledApplyInvocationV1,
): Promise<McpEffectBControlledApplyResultV1>;
~~~

There is no MCP-facing constructor, factory, verifier override, transport port,
credential callback, query callback, generic apply function, CLI, Action,
workflow-dispatch adapter, shell adapter, or dynamic module path.

The closed invocation contains exactly:

~~~typescript
type McpEffectBControlledApplyInvocationV1 = {
  schema: "yukh-projects-mcp-effect-b-invocation-v1";
  attempt: 1;
  mcpVerifiedAdmissionHandle: PrivateSingleUseMcpVerificationHandle;
  projectsApprovalHandle: PrivateSingleUseArtifactHandle;
  projectsTrustHandle: PrivateSingleUseTrustHandle;
  bridgeHandle: PrivateSingleUseArtifactHandle;
  bridgeTrustHandle: PrivateSingleUseTrustHandle;
  hostCapsuleHandle: PrivateSingleUseArtifactHandle;
  readCredentialHandle: PrivateSingleUseSecretHandle;
  writeCredentialHandle: PrivateSingleUseSecretHandle;
  abortHandle: PrivateAbortHandle;
};
~~~

Handles are host-created, nonserializable, nonenumerable, single-use objects.
They are not strings, paths, file descriptors, URLs, environment names, or
caller-constructible records. Their host implementation is fixed by the
immutable wrapper release. The read and write credential handles MUST be
distinct and resolve to distinct short-lived credentials. Equality or
substitution fails before provider access.

`PrivateSingleUseMcpVerificationHandle` is minted only by the immutable
manifest-pinned MCP approval adapter after successful `ApprovalReceiptV1`
verification. It contains no reusable approval authority. The wrapper
authenticates the handle and reads only the exact bounded claim and artifact
digests needed by bridge v2. An ordinary object, serialized claim set, raw
assertion, caller-selected verifier result, or handle from another wrapper
release fails closed.

The invocation cannot contain or select a repository, Project, issue, item,
field, option, provider identifier, target, policy, environment, mode,
producer, wrapper, endpoint, URL, method, header, query, GraphQL document,
REST route, credential, token, approval bytes, trust key, retry rule,
transport, verifier, operation, or output mapping.

The immutable wrapper release manifest fixes:

- profile `yukh-mcp/suite-preview-effect-b-add-dependency-v1`;
- external mode `apply` and internal reconciliation mode `native-v1`;
- exact protected environment, target-profile digest, and policy commit and
  artifact digest;
- capability `projects.add-dependency.v1` and exactly one
  `add_dependency(201 blocks 202)` operation;
- Projects producer source, apply-artifact, and entrypoint release;
- wrapper source, artifact, and entrypoint release;
- the exact pinned MCP verifier source and artifact digests;
- bridge schema/profile and Projects v1 approval schema;
- fixed read and mutation transport implementations; and
- stable result and failure mappings.

Private deployment resolution may supply the concrete synthetic scope only
through the fixed host-owned target profile. The wrapper verifies its canonical
digest against the release manifest and bridge. MCP and the function caller
cannot select or override it. Policy bytes are loaded only from the immutable
manifest-bound artifact; there is no path or caller-provided policy source.

## Reviewed primitive composition

The wrapper owns this exact admission and execution sequence:

1. resolve the one manifest-bound private target profile and policy artifact;
2. bounded-read the Projects v1 approval and host-selected Projects trust
   profile, then call `verifySignedApproval` with the exact artifact, public
   key, and issuer allowlist;
3. require the verified Projects v1 claims to exact-match the bridge, immutable
   wrapper profile, authenticated GitHub principal, plan, operation set, scope,
   environment, lifetime, nonce, and producer bindings;
4. parse the protected capsule with `parseProtectedHostCapsule` against that
   exact scope and protected environment;
5. require capsule enablement `apply-explicitly-enabled`, approved kind
   `add_blocked_by`, the exact permission profile, and request ceilings
   compatible with one dependency operation;
6. call `createControlledApplyHostFactory` with only the parsed capsule options
   and fixed attempt instrumentation;
7. call the factory's `create` once with `reconciliationMode: "native-v1"`,
   the fixed scope and policy, and the distinct resolved read and write
   credentials;
8. exact-match the returned scope and fresh one-operation plan to the bridge;
9. call `runApplyEntrypoint` once with the approved Projects plan ID, fixed
   protected environment, returned scope, Projects v1 approval, and
   Projects-selected public key; and
10. close every private handle in an unconditional finalizer without changing
   the recorded effect outcome.

The explicit `verifySignedApproval` call MUST complete successfully before
`createControlledApplyHostFactory(...).create(...)`. The accepted factory
`create` method performs an initial provider read while constructing the fresh
plan; calling it first would violate the zero-provider-call admission boundary.
An invalid, unavailable, stale, substituted, or mismatched Projects v1
approval returns `YKP-MCP-WRAPPER-003` without constructing the provider-backed
host and with zero provider calls.

`runApplyEntrypoint` receives the original unchanged Projects v1 approval and
Projects public key and MUST re-verify them under its accepted semantics. The
early verification is an additional no-I/O admission gate, not a replacement,
cached success, translated approval, or new approval schema.

The wrapper may use an explicitly accepted successor only after a new
compatibility review and fresh wrapper version. MCP may not call these
primitives directly or recreate this sequence.

The wrapper contains no CLI or Action runner, package installer, dynamic
import, workflow client, generic HTTP client, GitHub SDK, arbitrary GraphQL or
REST client, or caller-selected network surface. All provider IDs are resolved
from fresh scope-bound Projects observations inside the accepted host.

## One attempt and completion semantics

Entering `runApplyEntrypoint` marks the one effect attempt. The fixed write
transport records, without retaining request content, whether the single
mutation request crossed the provider boundary. Exactly one request is allowed.
There is no hidden retry, polling, sleep, backoff, credential switching,
partial selector, continuation, resume, redispatch, or fallback.

The closed result is one of:

~~~typescript
type McpEffectBControlledApplyResultV1 =
  | {
      schema: "yukh-projects-mcp-effect-b-result-v1";
      status: "rejected";
      effectBoundaryEntered: false;
      mutationRequestCount: 0;
      code: McpWrapperFailureCode;
    }
  | {
      schema: "yukh-projects-mcp-effect-b-result-v1";
      status: "effect_observed";
      effectBoundaryEntered: true;
      mutationRequestCount: 1;
      changed: true;
      remaining: 0;
    }
  | {
      schema: "yukh-projects-mcp-effect-b-result-v1";
      status: "completion_unknown";
      effectBoundaryEntered: true;
      mutationRequestCount: 0 | 1;
      code: "YKP-MCP-WRAPPER-009";
    };
~~~

`effect_observed` requires the accepted Projects entrypoint to report verified
success, exactly one operation outcome, and final zero drift. It is an
observation for MCP's independent verifier, not proof of MCP success.

Abort, timeout, process loss, lost response, lease loss, transport ambiguity,
provider ambiguity, verification ambiguity, or cleanup failure after entering
the effect boundary is `completion_unknown` unless independent accepted
evidence proves no request crossed the boundary. Unknown completion is durable
and terminal for that reservation. It cannot be retried, resumed, redispatched,
or automatically restored.

Cleanup always runs but never rewrites `rejected`, `effect_observed`, or
`completion_unknown`. A later attempt requires a fresh observation, both
plans, both approvals, bridge, wrapper binding, credentials, nonces, lease,
reservation, verification, and audit chain.

## Stable failures and redaction

| Code | Meaning | Provider calls |
| --- | --- | --- |
| `YKP-MCP-WRAPPER-001` | invocation or private handle invalid | 0 |
| `YKP-MCP-WRAPPER-002` | MCP approval invalid | 0 |
| `YKP-MCP-WRAPPER-003` | Projects v1 approval invalid | 0 |
| `YKP-MCP-WRAPPER-004` | bridge authentication or canonicalization invalid | 0 |
| `YKP-MCP-WRAPPER-005` | compound binding mismatch | 0 |
| `YKP-MCP-WRAPPER-006` | wrapper, producer, profile, target, or policy mismatch | 0 |
| `YKP-MCP-WRAPPER-007` | capsule, credential separation, nonce, or lease gate failed | 0 |
| `YKP-MCP-WRAPPER-008` | producer proved rejection before possible mutation | 0 |
| `YKP-MCP-WRAPPER-009` | completion may include an effect and is unknown | at most 1 |
| `YKP-MCP-WRAPPER-010` | producer result or zero-drift verification invalid | at most 1 |

Failures are static and bounded. Public and retained evidence excludes artifact
bytes, signatures, keys, credentials, tokens, nonces, capsule content, approval
claims, subject and issuer references, provider identifiers, targets, policy
content, URLs, queries, documents, variables, responses, errors, timestamps,
and operational traces. Redaction occurs before error construction, callback,
logging, serialization, or audit.

## Migration, compatibility, and rollback

Bridge v2 is opt-in only through the new wrapper entrypoint. There is no
automatic upgrade, inference, wrapping, translation, fallback, or
cross-version reuse:

- the existing Projects v1 verifier and entrypoints remain unchanged;
- a v1 approval without a valid paired bridge cannot enter the wrapper;
- a bridge without both exact independently valid approvals grants no
  authority;
- outstanding v1 approvals cannot be upgraded or paired after issuance;
- outstanding bridge or MCP approval artifacts cannot be reused with a new
  wrapper, producer, target profile, policy, or schema;
- changing any field, semantic, canonicalization rule, verifier dependency, or
  release binding requires a new schema or wrapper version and fresh plans and
  approvals.

Pre-implementation rollback is rejection or revision of this proposal.
Post-implementation rollback removes or disables the wrapper registration and
bridge-v2 path while leaving v1 behavior unchanged. Source rollback never
reverses provider state and is not restore authority.

## Immutable release and qualification evidence

Acceptance alone does not create a release. A later implementation issue must
produce a reproducible wrapper artifact with:

- immutable source commit and lowercase SHA-256 artifact digest;
- protected-build provenance binding the source, lockfile, toolchain, bridge
  schema, Projects producer release, pinned MCP verifier release, fixed profile,
  target-profile digest, policy commit and artifact, and entrypoint;
- checksums and an SPDX SBOM;
- byte-for-byte rebuild evidence from a clean checkout;
- a closed conformance vector corpus for canonical valid artifacts;
- negative vectors for every unknown, missing, malformed, stale, replayed,
  substituted, incomparable, or cross-profile field;
- zero-provider-call evidence for every admission failure;
- one-attempt, no-hidden-retry, stop-on-ambiguity, and durable
  `completion_unknown` evidence; and
- bounded redaction evidence for input, result, errors, logs, audit, summaries,
  artifacts, and cleanup.

All fixtures use invented identities and injected transports. No qualification
test may use a credential, provider endpoint, GitHub request, workflow apply,
consumer data, or live sandbox.

## Independent review and next gate

This author record resolves only the Proposed-record conflict under Accepted
RFC-0007. It does not self-review, self-accept, or merge this substantive
contract.

Before this record may move from Proposed to Accepted, issue #150 must contain:

1. a distinct read-only reviewer session's confirmation against the exact
   commit that the bridge schema, canonicalization, authentication, trust,
   lifetime, replay, migration, early Projects approval verification, atomic
   admission, wrapper closure, one-attempt semantics, `completion_unknown`,
   supply-chain evidence, and redaction remain inside Accepted authority;
2. confirmation that the wrapper admits only the Accepted
   `projects.add-dependency.v1` / `add_dependency(201 blocks 202)` Effect B and
   that Proposed MCP RFC-0011 must conform later;
3. all required checks green on that exact commit; and
4. a later executor/merger session distinct from both author and reviewer.

Neither independent review nor later acceptance of this record authorizes an
implementation issue to add the bridge verifier, wrapper, fixture, export,
runtime dependency, credential path, provider call, deployment, or release. A
separately reviewed implementation record remains mandatory.

Acceptance would still authorize no live GitHub request, credential creation,
workflow activation, mutation, deployment, publication, teardown, restore,
consumer migration, or production-readiness claim. Those remain behind later
implementation, qualification, deployment, activation, exact-plan, and
operational-authorization gates.
