# First usable preview Projects effects v1 — proposed specification

- **Status:** Proposed
- **Proposed:** 2026-08-09
- **Governing issue:** [#147](https://github.com/nomed/yukh-projects/issues/147)
- **Suite decision:** [RFC-0005 at `b23f47f2`](https://github.com/nomed/nomed.github.io/blob/b23f47f2/docs/rfcs/RFC-0005-first-usable-yukh-preview.md)
- **Decision gate:** explicit owner acceptance is required before implementation
- **Authority:** proposal and review only; no provider access or mutation

## Objective

Define the Yukh Projects-owned boundary for the two consequential effects in
the first usable Yukh preview without collapsing RFC-0003 steps 8 and 9 into
one authorization path.

Effect A is direct Projects reconciliation. Effect B is a separately
MCP-admitted capability whose bounded provider invokes Projects controlled
apply for a different target and operation. The effects share only an
immutable compatibility profile and redacted evidence index. They do not share
authority-bearing artifacts.

This proposal adds no runtime, transport, credential source, mutation kind, or
release surface. Until it is accepted and separately implemented, all
qualification is limited to deterministic invented fixtures and injected
synthetic adapters.

## Exact synthetic scope

The version-1 corpus uses this invented logical sandbox:

| Binding | Effect A | Effect B |
| --- | --- | --- |
| Repository | `example-org/example-repo` | `example-org/example-repo` |
| Project | synthetic Project `7` | synthetic Project `7` |
| Primary issue | synthetic issue `101` | synthetic issue `201` |
| Related issue | none | synthetic issue `202` |
| Projects plan | exactly one `set_field_value` | exactly one `add_dependency` |
| Logical intent | set managed `status` from `backlog` to `ready` | add `201 blocks 202` |
| MCP capability | none | `projects.add-dependency.v1` |

These values identify test fixtures only. They do not name or reserve provider
state, authorize creation of the named resources, or permit a test harness to
discover a similarly named live resource.

The immutable corpus supplies provider-neutral synthetic references for every
subject, item, field, option, fingerprint, and relationship. Tests MUST reject
any caller substitution of repository, Project, issue, logical field,
relationship direction, desired value, or operation count.

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
definition digest bound to the exact Effect B plan. Its provider receives a
closed invocation containing that plan and the accepted Projects
controlled-apply inputs. It cannot select a URL, method, GraphQL document,
credential, endpoint, mutation kind, target, retry policy, verifier, or
postcondition.

MCP admission is necessary but is not Projects approval. Projects independently
verifies the Effect B approval and all accepted controlled-apply gates before
the provider boundary. A denied MCP admission performs zero Projects provider
calls. A valid Projects approval cannot bypass MCP admission.

## Two plans and two approvals

The preview contains exactly two consequential plans and two independently
issued approvals:

- Projects plan `A` and approval `A` authorize only Effect A;
- Projects plan `B` and approval `B` authorize only Effect B after MCP
  admission.

Approval `B` uses the accepted Projects approval envelope. Its bounded subject
reference identifies the immutable MCP capability definition digest, allowing
MCP and Projects to verify the same exact authority artifact without deriving,
translating, or minting a second approval.

The following values MUST be distinct between A and B:

- complete plan ID and ordered operation-set digest;
- approval issuer allowlist, trust-root fingerprint, subject reference,
  issued-at, expiry, and nonce;
- fresh observation fingerprint and precondition set;
- read and write credential handles and credential-profile evidence;
- repository–Project–issue lease and holder digest;
- component idempotency key;
- verifier identity and declared postconditions; and
- private audit chain and terminal receipt.

The effects may not consume, copy, infer, transform, or treat success from any
value in the other effect as authority. Equality of any value that must be
distinct fails both effects before provider invocation.

Shared release commits, contract versions, sandbox profile identifiers, and
public compatibility evidence are descriptive bindings only. They grant no
execution authority.

## Execution and verification

Each effect starts from its own complete fresh observation and independently
reproduces its approved plan under its own lease. Accepted rate admission,
precondition checks, nonce consumption, one-request mutation attempt,
stop-on-first-failure behavior, targeted verification, and final
zero-operation reconciliation remain unchanged.

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
the final-state mechanism:

1. both effects reach independently verified zero drift;
2. all authority artifacts expire or are consumed;
3. the sandbox owner receives a separate teardown decision that is not a
   Projects plan, MCP capability, or Coordination message;
4. teardown removes the dedicated synthetic sandbox as one bounded lifecycle
   action outside the Projects and MCP effect paths; and
5. an independent verifier records only the declared final-state outcome.

Teardown credentials, provider calls, resource identifiers, and raw evidence
remain private to the separately governed sandbox owner. Teardown failure
cannot be reported as effect success. Reusing either effect approval for
teardown is forbidden.

Any future in-place restore through reverse Projects mutations requires a new
accepted destructive-operation contract and threat-model review.

## Evidence

The deterministic repository corpus emits only:

- contract and fixture versions;
- immutable synthetic input digest;
- distinct plan and operation-set digests for A and B;
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

The proposal introduces no executable trust boundary, but acceptance would
permit later implementation of a new MCP-to-Projects call path. Review must
address:

- capability or target substitution at the MCP provider boundary;
- one approval being replayed, translated, or treated as authority for both
  effects;
- credential, nonce, lease, idempotency, verifier, or audit-chain reuse;
- MCP admission being mistaken for Projects approval, or vice versa;
- provider completion becoming ambiguous after possible effect;
- public evidence correlating private authority-bearing identifiers; and
- teardown being triggered by effect authority or reported complete without
  independent final-state verification.

All pre-effect denial tests must prove zero provider invocation. The dry-run,
parser, planner, and public-report dependency graphs remain structurally free
of mutation and MCP provider imports.

## Acceptance and follow-up gates

Owner acceptance must explicitly approve or revise:

1. the exact invented targets and disjoint operation sets;
2. the two-plan, two-approval model and Effect B subject binding;
3. the required distinct authority-bearing values;
4. the MCP provider closure and zero-call denial boundary;
5. teardown as the version-1 final-state mechanism; and
6. the redacted evidence and threat-model delta.

Only after acceptance may separate issues propose deterministic synthetic
implementation, adversarial tests, sandbox qualification, candidate release
artifacts, or operational-readiness evidence. Any live synthetic provider
mutation remains gated by a fresh exact plan, approval, protected host, and
separate operational authorization.

This proposal authorizes no implementation, merge, provider access, credential
creation, Project or issue mutation, teardown, deployment, release, tag,
consumer migration, suite publication, or production-readiness claim.
