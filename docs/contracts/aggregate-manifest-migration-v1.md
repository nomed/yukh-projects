# Aggregate manifest migration planner v1 — proposed specification

- **Status:** Accepted
- **Accepted:** 2026-08-03 by `@nomed`
- **Governing issue:** [#68](https://github.com/nomed/yukh-projects/issues/68)
- **Security boundary:** untrusted aggregate planning data to inert candidate issue contracts

## Purpose

The migration planner converts a bounded aggregate roadmap manifest into reviewable candidate
`yukh:issue:v1` contracts. It is a pure, dry-run-only compatibility tool. It does not extend the
steady-state issue contract, infer delivery authority, read GitHub, edit issues, or execute plans.

The planner accepts only deliberately authored migration input. Adopter-specific adapters,
credentials, repository bindings, provider identifiers, and observed GitHub payloads remain outside
this contract.

## Inputs

The planner receives two already-loaded UTF-8 YAML 1.2 documents: a manifest and a mapping. It does
not receive paths, URLs, environment variables, credentials, clocks, callbacks, or transports.

### Manifest

~~~yaml
schema: 1
programs:
  sample_program:
    issues: [issue_alpha, issue_beta]
    gates: [design_gate]
issues:
  issue_alpha:
    number: 101
    kind: feature
    area: runtime
    priority: high
  issue_beta:
    number: 102
    kind: task
    area: runtime
    depends_on: [issue_alpha]
gates:
  design_gate:
    status: open
    blocks: [issue_alpha, issue_beta]
~~~

Every name and number above is synthetic. Root keys are exactly `schema`, `programs`, `issues`, and
`gates`. `schema` is integer `1`. Logical keys match `^[a-z][a-z0-9_]{0,63}$`.

An issue accepts only `number`, `kind`, `area`, `priority`, `size`, `estimate`, `start_date`,
`target_date`, `parent`, and `depends_on`. `number` is a unique positive integer. Relationships use
logical issue keys, never URLs or provider IDs. A gate accepts only `status` and `blocks`; both are
planning evidence and never map implicitly to issue readiness or Project status.

A program accepts only `issues` and `gates`. Program membership is provenance context; it does not
create a parent, dependency, label, Project field, or authorization unless the mapping explicitly
declares a supported transformation.

### Mapping

~~~yaml
schema: 1
fields:
  kind:
    source: issue.kind
    target: work_type
    values:
      feature: feature
      task: task
  area:
    source: issue.area
    target: area
    values:
      runtime: runtime
  priority:
    source: issue.priority
    target: priority
    values:
      high: P1
relationships:
  depends_on: blocked_by
unsupported: report
~~~

Root keys are exactly `schema`, `fields`, `relationships`, and `unsupported`. `schema` is integer
`1`; `unsupported` is exactly `report` or `reject`.

Each field mapping names one allowlisted source and one compatible issue-contract v1 target. Value
maps are mandatory for enumerated or policy-owned values. Relationships may map only
`parent -> parent` and `depends_on -> blocked_by`. Direction reversal, transitive expansion,
program-derived parentage, gate-derived readiness, and similarity-based mapping are forbidden.

The mapping must produce the required `work_type` and `area` fields for every emitted candidate.
Missing mappings, missing source values, unmapped values, collisions, or incompatible target types
are reported and make the affected candidate non-emittable. The planner never chooses a default.

## Resource limits

Validation applies before semantic planning and is atomic per document.

| Limit | Maximum |
| --- | ---: |
| Manifest document | 256 KiB UTF-8 |
| Mapping document | 64 KiB UTF-8 |
| Mapping depth | 10 |
| Programs | 64 |
| Issues | 1,000 |
| Gates | 256 |
| Relationships per issue or gate | 100 |
| Total relationship edges | 10,000 |
| Mapping fields | 32 |
| Values per field mapping | 256 |
| Total scalar values | 32,768 |
| Any scalar string | 512 Unicode scalar values |

Aliases, anchors, merge keys, explicit tags, duplicate keys, non-string mapping keys, implicit
timestamps, binary values, multiple documents, invalid UTF-8, unknown fields, and non-finite numbers
fail closed. Dates and number constraints are identical to issue-contract v1.

## Planning and graph rules

The planner validates all logical references before producing candidates. Duplicate issue numbers,
missing endpoints, self-edges, duplicate edges, more than one parent, parent cycles, and dependency
cycles fail the complete plan. A gate that blocks an issue is retained as a migration observation;
it cannot create a native dependency because a gate is not an issue endpoint.

Processing order is:

1. validate both complete documents and their limits;
2. resolve unique logical keys and issue numbers;
3. validate mappings and value vocabularies;
4. validate parent and dependency graphs;
5. map candidates in ascending issue number;
6. render candidate envelopes and the public report;
7. compute provenance digests over canonical validated inputs and output.

One invalid graph or structural input makes the complete result non-executable and emits no
candidate contract text. Field-level missing or unsupported information may produce reviewable
non-emittable candidate summaries, but never partial contract envelopes.

## Result and authority boundary

~~~typescript
type MigrationPlan = {
  version: 1;
  complete: boolean;
  inputDigest: string;
  mappingDigest: string;
  outputDigest: string | null;
  candidates: readonly {
    issueNumber: number;
    disposition: "emittable" | "non_emittable";
    contract: string | null;
    observations: readonly MigrationObservation[];
  }[];
  diagnostics: readonly MigrationDiagnostic[];
};
~~~

Digests are lowercase SHA-256 over RFC 8785 JSON Canonicalization Scheme bytes of validated data. Contract
rendering uses the accepted issue-contract field order and LF line endings. Repeated identical input
must produce byte-identical output.

Candidate text is inert review material. `complete: true` means only that migration planning
succeeded. It does not mean an issue is ready, authorized, observed, added to a Project, or safe to
mutate. No output contains an apply command, mutation operation, provider ID, repository binding, or
credential.

## Observations and diagnostics

Observations have one of these stable dispositions:

- `mapped`: an explicit mapping produced a target value;
- `preserved`: source information remains as provenance without a target effect;
- `unsupported`: no v1 target exists and policy chose `report`;
- `ambiguous`: more than one valid interpretation exists;
- `missing_required`: required source or target information is absent.

Diagnostics use static English messages and restricted JSONPath-like paths. They never echo source
strings, logical keys, titles, descriptions, repository data, or raw YAML. Initial code families are:

| Code family | Meaning |
| --- | --- |
| `YKP-MIG-DOC-*` | document, YAML, structure, or resource-limit failure |
| `YKP-MIG-MAP-*` | missing, incompatible, ambiguous, or colliding mapping |
| `YKP-MIG-GRAPH-*` | missing endpoint, cardinality, duplicate, or cycle failure |
| `YKP-MIG-CANDIDATE-*` | candidate missing-required or unsupported information |
| `YKP-MIG-PROVENANCE-*` | canonicalization or digest failure |

Diagnostics are deduplicated by `(code, path)` and sorted by document rank, source offset when safe,
code, and path.

## Optional observed comparison

Observed comparison is not part of the pure planner. A later separately specified adapter may
compare candidates with already validated issue-contract observations. It must use the accepted
scope-bound read-only transport, remain structurally unable to mutate, and report equality or drift
without exposing issue content. This specification grants no network or filesystem authority.

## Compatibility and rollback

The planner is additive and does not change issue-contract v1 or repository-policy v1. Adding input
fields, mappings, dispositions, authority, or weaker rejection behavior requires compatibility and
security review. Breaking changes require schema version 2.

Rollback is discarding the generated candidates and restoring the prior reviewed inputs. Because
the planner performs no I/O or mutation, it has no remote rollback procedure.

## Implementation gate

Implementation requires explicit acceptance and a separate Ready issue. Tests must use invented
fixtures and prove bounds, YAML restrictions, stable ordering, exact mappings, no inference,
relationship direction, graph rejection, provenance reproducibility, redaction, zero I/O, and zero
mutation authority.
