# First usable preview Projects effects v1 — proposed specification

- **Status:** Accepted
- **Proposed:** 2026-08-09
- **Accepted:** 2026-08-09 by `@nomed`
- **Governing issue:** [#147](https://github.com/nomed/yukh-projects/issues/147)
- **Suite decision:** RFC-0005 in
  `nomed/nomed.github.io@12d9215f10c4b7fb1762a5025367e3e81543800f`
- **Decision gate:** #150 approval-bridge and wrapper contract review
- **Authority:** specification acceptance only; no provider access or mutation

## Objective

Define the Yukh Projects-owned boundary for the two consequential effects in
the first usable Yukh preview without collapsing RFC-0003 steps 8 and 9 into
one authorization path.

Effect A is direct Projects reconciliation. Effect B is a separately
MCP-admitted capability whose bounded provider invokes Projects controlled
apply for a different target and operation. The effects share only an
immutable compatibility profile and redacted evidence index. They do not share
authority-bearing artifacts.

This accepted specification adds no runtime, transport, credential source,
mutation kind, or release surface. Until each follow-up contract is separately
accepted and implemented, all qualification is limited to deterministic
invented fixtures and injected synthetic adapters.

## Exact synthetic scope

The version-1 corpus uses this invented logical sandbox:

| Binding | Effect A | Effect B |
| --- | --- | --- |
| Repository | `example-org/example-repo` | `example-org/example-repo` |
| Project | synthetic Project `7` | synthetic Project `7` |
| Primary issue | synthetic issue `101` | synthetic issue `201` |
| Related issue | none | synthetic issue `202` |
| Suite effect plan | Projects plan `A` | MCP plan `B-MCP` |
| Nested provider plan | none | Projects plan `B-Projects` with exactly one `add_dependency` |
| Approval assertions | Projects Approval `A` | MCP Approval `B-MCP` and Projects Approval `B-Projects` |
| Projects producer release | binding `projectsProducerReleaseA` | binding `projectsProducerReleaseBProjects` |
| Canonical postcondition | `effectAPostconditionBinding` | `effectBPostconditionBinding` |
| Projects operation | exactly one `set_field_value` | exactly one `add_dependency` |
| Logical intent | set managed `status` from `backlog` to `ready` | add `201 blocks 202` |
| MCP capability | none | `projects.add-dependency.v1` |

These values identify test fixtures only. They do not name or reserve provider
state, authorize creation of the named resources, or permit a test harness to
discover a similarly named live resource.

The immutable corpus supplies provider-neutral synthetic references for every
subject, item, field, option, fingerprint, and relationship. Tests MUST reject
any caller substitution of repository, Project, issue, logical field,
relationship direction, desired value, or operation count.

Each Projects producer release binding is a canonical tuple containing the
immutable lowercase 40-hex source commit, lowercase 64-hex apply-artifact
SHA-256 digest, and exact controlled-apply entrypoint version. A preview effect
plan envelope includes the complete tuple in its canonical digest; a display
version, tag, compatibility-matrix entry, or shared suite metadata cannot
substitute for it.

## Disjoint operation allowlists

### Effect A — direct Projects reconciliation

Effect A accepts one fresh executable reconciliation plan containing exactly:

~~~text
set_field_value(status, backlog -> ready)
~~~

The managed `status` field, `backlog` and `ready` options, bound Project item,
and exact old value must already exist in the synthetic observation. The plan
may contain no schema creation, option creation, relationship, Issue Type, or
second field operation.

The direct Projects host performs accepted controlled-apply preflight,
one-operation execution, targeted verification, and a fresh final
zero-operation reconciliation. MCP has no role in Effect A.

### Effect B — MCP-admitted Projects capability

Effect B accepts one fresh executable Projects plan containing exactly:

~~~text
add_dependency(201 blocks 202)
~~~

The two issues must be distinct, freshly observed, and bound to the same
synthetic repository. The dependency must be absent and must not create a
cycle. The plan may contain no field, schema, parent, Issue Type, second
relationship, or caller-selected operation.

MCP may admit only capability `projects.add-dependency.v1` with an immutable
definition digest bound to the exact MCP plan `B-MCP`. Its provider receives a
closed invocation containing the separately generated Projects plan
`B-Projects` and accepted Projects controlled-apply inputs. It cannot select a
URL, method, GraphQL document, credential, endpoint, mutation kind, target,
retry policy, verifier, or postcondition.

MCP admission is necessary but is not Projects approval. Projects independently
verifies Projects Approval `B-Projects` and all accepted controlled-apply gates
before the provider boundary. A denied MCP admission performs zero Projects
provider calls. A valid Projects approval cannot bypass MCP admission.

## Two effects, two suite plans, and three approvals

The preview contains exactly two suite-level effect plans:

- Projects plan `A` defines Effect A;
- MCP plan `B-MCP` defines Effect B.

Effect B additionally contains the distinct nested provider-owned Projects
plan `B-Projects`. That nested plan is not a third suite effect, but it remains
an independently canonicalized controlled-apply plan with its own plan ID and
ordered operation-set digest.

The preview therefore requires exactly three independently verifiable approval
assertions. MCP Approval `B-MCP` is one authenticated artifact. Each Projects
approval assertion is an atomic pair of the unchanged v1 envelope and the
proposed v2 bridge claim:

1. **Projects Approval `A`** binds Projects plan `A`, its operation set,
   `projectsProducerReleaseA`, `effectAPostconditionBinding`, and the
   authenticated GitHub principal for Effect A.
2. **MCP Approval `B-MCP`** binds MCP plan `B-MCP`, the MCP subject, capability
   definition, provider implementation, verifier, and the digest of nested
   Projects plan `B-Projects`, including
   `projectsProducerReleaseBProjects` and `effectBPostconditionBinding`.
3. **Projects Approval `B-Projects`** binds Projects plan `B-Projects`, its
   ordered operation set, `projectsProducerReleaseBProjects`,
   `effectBPostconditionBinding`, and the authenticated GitHub principal for
   the provider-owned mutation.

### Proposed Projects approval bridge v2

The accepted Projects approval envelope v1 is closed and rejects unknown
fields. It remains byte-for-byte and semantically unchanged and does not carry
a producer-release tuple, preview-plan-envelope digest, or postcondition
binding. This proposal does not add fields to v1.

Projects Approval `A` and Projects Approval `B-Projects` each require a
separately authenticated, closed bridge claim paired with the unchanged v1
envelope:

~~~typescript
type ProjectsApprovalBridgeV2 = {
  schema: "yukh-projects-approval-bridge-v2";
  approvalV1Digest: string;
  previewPlanEnvelopeDigest: string;
  producerRelease: {
    sourceCommit: string;
    applyArtifactSha256: string;
    entrypointVersion: string;
  };
  postconditionBindingDigest: string;
  issuerRef: string;
  subjectRef: string;
  scopeDigest: string;
  environment: "apply";
  issuedAt: string;
  expiresAt: string;
  nonce: string;
  trustRootFingerprint: string;
};
~~~

`approvalV1Digest` is lowercase SHA-256 of the exact authenticated v1 approval
envelope bytes. The plan, producer-release, and postcondition digests are
lowercase SHA-256 of their canonical values. All strings and timestamps use the
accepted approval bounds. The bridge is canonical JSON authenticated with the
same issuer and trust-root rules as the paired v1 approval. Every listed field
is required; unknown fields, unknown schema values, aliases, unlisted nesting,
sidecars, partial claims, and extra signatures fail closed.

The paired v1 envelope and v2 bridge must exact-match issuer, subject, scope,
environment, issued-at, expiry, nonce, trust-root fingerprint, plan, and
operation-set bindings. The v2 verifier validates both artifacts atomically.
Either artifact alone grants no preview authority.

The existing v1 verifier MUST reject this v2 schema and continues to accept
only unchanged v1 approvals for already accepted entrypoints. Preview
implementation is blocked until a separately reviewed and accepted Projects
approval-bridge v2 and entrypoint compatibility contract defines the verifier,
wire representation, bounds, and negative corpus. There is no automatic
upgrade, inference, wrapping, or fallback between v1 and v2. Outstanding
approvals cannot cross schema versions. Rollback disables the preview bridge
path and leaves current v1 behavior unchanged.

Projects Approval `B-Projects` keeps the accepted v1 `subjectRef` meaning: the
opaque host-attested GitHub installation or principal reference defined by the
read-only adapter. Both paired artifacts MUST exactly match the authenticated
subject bound by the Effect B read and write hosts. Neither contains or uses an
MCP capability, provider, verifier, plan, or policy digest as `subjectRef`.

MCP Approval `B-MCP` is the separately authenticated admission artifact that
binds:

- capability name and immutable capability-definition digest;
- immutable provider-implementation and MCP verifier digests;
- MCP plan `B-MCP` ID, subject, and ordered operation-set digest;
- Effect B target and exact `add_dependency` operation;
- nested Projects plan `B-Projects` ID and ordered operation-set digest;
- exact `projectsProducerReleaseBProjects` tuple;
- exact `effectBPostconditionBinding` digest;
- the same host-attested GitHub principal reference carried by the Projects
  scope and approval; and
- MCP policy, expiry, nonce, idempotency, and audit bindings.

MCP Approval `B-MCP` and Projects Approval `B-Projects` form a compound
admission bridge: both must authenticate and exact-match the shared target,
nested Projects plan ID, Projects operation-set digest, GitHub principal, and
`projectsProducerReleaseBProjects` tuple, and the same canonical
`effectBPostconditionBinding` before provider invocation. MCP independently
verifies `B-MCP`; Projects independently verifies the paired v1/v2
`B-Projects` artifacts, authenticated principal, producer release, plan, and
controlled-apply gates. Neither approval authorizes, derives, modifies,
substitutes for, or implies the other. Any missing artifact or mismatch denies
before provider invocation.

The following values MUST be distinct across Projects Approval `A`, MCP
Approval `B-MCP`, and Projects Approval `B-Projects`, where the value applies:

- complete plan ID and ordered operation-set digest;
- approval issuer allowlist, trust-root fingerprint, subject reference,
  issued-at, expiry, and nonce;
- fresh observation fingerprint and precondition set;
- read and write credential handles and credential-profile evidence;
- repository–Project–issue lease and holder digest;
- component idempotency key;
- verifier identity and verifier-artifact digest; and
- private audit chain and terminal receipt.

`effectAPostconditionBinding` and `effectBPostconditionBinding` are distinct
because the effects have different targets and operations. Within Effect B,
MCP Approval `B-MCP` and Projects Approval `B-Projects` MUST carry the same
byte-identical canonical `effectBPostconditionBinding` digest. Their verifier
identities, verifier artifacts, evidence chains, and authority scopes remain
distinct; verifier independence does not permit a different declared
postcondition. A postcondition mismatch denies before provider invocation.

The two Projects producer release bindings are independently authority-bound
values, but they are not required to differ. They may resolve to the same
immutable commit, artifact digest, and entrypoint version only when plan `A`
and Projects Approval `A` separately carry `projectsProducerReleaseA`, while
plan `B-Projects`, MCP Approval `B-MCP`, and Projects Approval `B-Projects`
separately carry and exact-match `projectsProducerReleaseBProjects`. Byte
equality does not make either plan, approval, or release binding shared or
reusable.

The effects may not consume, copy, infer, transform, or treat success from any
value in the other effect as authority. Equality of any value that must be
distinct fails both effects before provider invocation.

Contract versions, sandbox profile identifiers, and public compatibility
evidence are descriptive bindings only. Projects producer release commits and
artifact digests are explicitly excluded from that category.

## Execution and verification

Effect A starts from its own complete fresh observation and reproduces Projects
plan `A` under its own lease after exact equality checks for
`projectsProducerReleaseA`. Effect B independently verifies MCP plan `B-MCP`,
then Projects starts from a separate complete fresh observation, exact-matches
`projectsProducerReleaseBProjects`, and reproduces nested Projects plan
`B-Projects` under its own lease. Accepted rate admission, precondition checks,
nonce consumption, one-request mutation attempt, stop-on-first-failure
behavior, targeted verification, and final zero-operation reconciliation
remain unchanged.

Changing either producer release commit, artifact digest, or entrypoint version
invalidates that complete effect plan and every approval that binds it. The
effect requires a fresh observation, fresh plan envelope, and every applicable
fresh approval before provider invocation. No compatibility declaration,
successful sibling effect, or equal release value can carry authority forward.

A provider acknowledgement is not success. A lost response or timeout after a
possible effect produces `completion_unknown`, no automatic retry, and no
reuse of the old plan, approval, nonce, lease, credential, or idempotency key.
Recovery begins with a fresh complete observation and separately governed
authority.

Effect A success proves only the status effect. Effect B success requires both
the MCP audit and verifier chain and the Projects controlled-apply verification
for the dependency effect. Neither terminal receipt can complete the other.

## Restore and teardown

Accepted Projects contracts do not allow clearing a field value, removing a
dependency, deleting a Project, or deleting a repository. This proposal does
not add those operations and therefore cannot describe reverse mutation as
Projects-controlled restore.

The version-1 preview declares teardown, rather than reverse reconciliation, as
the final-state mechanism. Teardown is available after every terminal effect
outcome: pre-effect denial, verified success, failure, or
`completion_unknown`. It does not require either effect to converge or report
zero drift.

The lifecycle order is:

1. each started effect seals its own terminal outcome and effect-specific
   evidence before teardown;
2. unused authority artifacts expire and consumed artifacts remain consumed;
3. the sandbox owner independently authorizes teardown through a decision that
   is not a Projects plan, MCP capability, effect approval, or Coordination
   message;
4. teardown removes the dedicated synthetic sandbox as one bounded lifecycle
   action outside the Projects and MCP effect paths; and
5. an independent teardown verifier records the declared cleanup final state
   without rewriting either effect record.

Teardown credentials, provider calls, resource identifiers, and raw evidence
remain private to the separately governed sandbox owner. Teardown failure
cannot be reported as effect success. Reusing either effect approval for
teardown is forbidden. Teardown success cannot convert a denied, failed, or
`completion_unknown` effect into success, prove that an unknown effect did not
occur, erase remaining drift, or act as compensating mutation evidence. Public
evidence preserves each effect's original terminal status and reports teardown
authorization, execution, and verification separately.

Any future in-place restore through reverse Projects mutations requires a new
accepted destructive-operation contract and threat-model review.

## Evidence

The deterministic repository corpus emits only:

- contract and fixture versions;
- immutable synthetic input digest;
- distinct suite plan digests for A and B plus the nested `B-Projects` plan and
  operation-set digest;
- separate canonical producer-release binding digests for Effect A and nested
  `B-Projects`;
- distinct Effect A and Effect B postcondition digests, with byte-identical
  `effectBPostconditionBinding` in both Effect B approvals;
- atomic verification outcomes for each Projects v1 approval and its required
  v2 bridge claim;
- independent verification outcomes for all three named approval artifacts;
- stable operation kind and aggregate count for each effect;
- MCP capability definition digest and admission outcome for B;
- zero-provider-call outcome for every pre-effect denial;
- verification and final zero-drift outcome for each effect;
- `completion_unknown` classification where applicable;
- independent audit-chain and receipt-chain verification outcomes; and
- teardown decision and final-state verification outcome.

Public evidence excludes repository, Project, issue, item, field, option,
provider, subject, issuer, environment, workflow, credential, approval, nonce,
lease, idempotency, audit, and infrastructure identifiers; raw plans,
preconditions, provider bodies, URLs, timestamps, and operational traces are
also excluded.

## Stable failure classes

| Code | Meaning |
| --- | --- |
| `YKP-PREVIEW-001` | fixture scope or operation allowlist mismatch |
| `YKP-PREVIEW-002` | effect authority bindings are missing, reused, or not distinct |
| `YKP-PREVIEW-003` | MCP capability definition or admission mismatch |
| `YKP-PREVIEW-004` | pre-effect gate failed with zero provider invocation |
| `YKP-PREVIEW-005` | provider completion is unknown and cannot be retried |
| `YKP-PREVIEW-006` | effect verification or final zero-drift check failed |
| `YKP-PREVIEW-007` | audit, receipt, or public evidence validation failed |
| `YKP-PREVIEW-008` | teardown decision, ordering, or final-state verification failed |

Messages are static and contain no raw binding, provider response, consumer
content, or operational identifier.

## Threat-model delta

This specification introduces no executable trust boundary, but its accepted
follow-up gates may permit later implementation of a new MCP-to-Projects call
path. Follow-up review must address:

- capability or target substitution at the MCP provider boundary;
- an MCP capability or provider digest being substituted for the authenticated
  Projects principal in `subjectRef`;
- one of the three approvals being replayed, translated, or treated as
  authority for another assertion or effect;
- a producer commit, artifact digest, or entrypoint version being substituted,
  inherited from the other effect, or treated as descriptive metadata;
- Effect B approvals carrying different postcondition bindings or one verifier
  result substituting for the other;
- credential, nonce, lease, idempotency, verifier, or audit-chain reuse;
- MCP admission being mistaken for Projects approval, or vice versa;
- provider completion becoming ambiguous after possible effect;
- public evidence correlating private authority-bearing identifiers; and
- teardown being triggered by effect authority or reported complete without
  independent final-state verification;
- cleanup being unavailable after denial, failure, or unknown completion; and
- teardown success concealing or rewriting an effect-specific failure,
  remaining drift, or `completion_unknown` outcome.

All pre-effect denial tests must prove zero provider invocation. The dry-run,
parser, planner, and public-report dependency graphs remain structurally free
of mutation and MCP provider imports.

## Acceptance record and follow-up gates

The owner accepted this specification on 2026-08-09, including:

1. the exact invented targets and disjoint operation sets;
2. two suite-level effect plans, nested Projects plan `B-Projects`, and the
   three named approval assertions;
3. the compound `B-MCP`/`B-Projects` admission bridge, authenticated Projects
   principal binding, and no authority substitution;
4. the independent Effect A and nested Effect B Projects producer-release
   bindings and their fresh-plan/fresh-approval invalidation rule;
5. the proposed closed Projects approval bridge v2, separate acceptance
   dependency, migration behavior, and unchanged v1 envelope;
6. one canonical Effect B postcondition shared by `B-MCP` and `B-Projects`
   while verifier identity and evidence remain distinct;
7. the required distinct authority-bearing values;
8. the MCP provider closure and zero-call denial boundary;
9. teardown as the version-1 final-state mechanism; and
10. the redacted evidence and threat-model delta.

Acceptance advances only the separately governed #150 approval-bridge and
wrapper contract. Deterministic implementation, adversarial tests, sandbox
qualification, candidate release artifacts, and operational-readiness evidence
remain blocked until that contract is explicitly accepted. Any live synthetic
provider mutation remains gated by a fresh exact plan, approval, protected host,
and separate operational authorization. Effect B requires fresh `B-MCP` and
`B-Projects` plans and both independently verified approvals.

Acceptance authorizes no implementation, provider access, credential creation,
Project or issue mutation, teardown, deployment, release, tag, consumer
migration, suite publication, or production-readiness claim.
