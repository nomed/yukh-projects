# Reconciliation plan and redacted report v1 — proposed specification

- **Status:** Proposed
- **Governing issue:** [#14](https://github.com/nomed/yukh-projects/issues/14)
- **Security boundary:** validated immutable state to a deterministic plan and redacted report

## Objective

The planner combines accepted issue-contract, repository-policy, and effective-schema values with bounded observed item and relationship state. It emits a non-executing plan. The report renderer exposes reviewable logical intent without provider identifiers or raw input.

The planner owns no adapter. Producing an operation does not authorize or perform it.

## Inputs

~~~typescript
type PlanningInput = {
  scope: BoundScope;
  contract: IssueContract;
  policy: RepositoryPolicy;
  schema: EffectiveSchemaResult;
  observedItem: ObservedItem;
  relationships: ObservedRelationshipGraph;
};
~~~

All inputs are immutable. The caller must supply an `EffectiveSchemaResult` whose complete-plan `executable` value is true. Missing, invalid, or conflicting bindings fail closed.

### Bound scope

`BoundScope` contains opaque, non-empty references for subject, repository, Project, and issue plus a positive issue number. Each reference is at most 256 Unicode scalar values and contains no control character. The pure planner compares and hashes opaque references but never parses, logs, or returns them in a public report.

The scope environment is exactly `dry-run` in v1. Apply is not a planner mode and no credential is accepted.

### Observed item

Observed field values are keyed by logical policy field key rather than provider ID:

~~~typescript
type ObservedValue = string | number | null;
type ObservedItem = {
  values: Readonly<Record<string, ObservedValue>>;
  fingerprint: string;
};
~~~

The item contains at most 64 values. Keys follow the accepted logical-key grammar. Strings contain at most 512 Unicode scalar values. Numbers are finite. The fingerprint is an opaque adapter-produced precondition token of at most 256 scalar values and is never rendered publicly.

Unknown observed logical keys are preserved and ignored. Omission from the issue contract always means no requested change; v1 never clears a field implicitly.

### Relationship graph

The graph contains positive issue-number nodes and two directed edge sets:

- `parent`: child to parent;
- `blocks`: blocker to blocked issue.

Limits are 512 nodes, 511 parent edges, 4,096 dependency edges, and 100 proposed relationship edges for the planned issue. Duplicate edges, self-edges, unknown endpoints, more than one parent for a child, and cycles fail closed. Parent and dependency cycles are evaluated independently.

Issue-contract relationships normalize as follows:

- `parent: P` proposes parent edge `current → P`;
- `blocks: [B]` proposes dependency edge `current → B`;
- `blocked_by: [A]` proposes dependency edge `A → current`.

The same normalized dependency edge declared through contradictory directions is an ambiguity error rather than silently deduplicated.

## Desired field calculation

Issue-contract values map to these logical policy keys:

| Contract value | Logical field key | Required policy kind |
| --- | --- | --- |
| `work_type` | `work_type` | `single_select` |
| `area` | `area` | `single_select` |
| `priority` | `priority` | `single_select` |
| `size` | `size` | `single_select` |
| `estimate` | `estimate` | `number` |
| `iteration` | `iteration` | `iteration` |
| `project.status` | `status` | `single_select` |
| `project.start_date` | `start_date` | `date` |
| `project.target_date` | `target_date` | `date` |

A present contract value requires a policy declaration with mode `managed` and a compatible kind. Text and date values remain strings; estimate requires `number`. Single-select contract values are logical option keys and resolve through the reviewed policy vocabulary. Unknown option keys fail closed. Iteration remains the exact normalized contract string and is valid only for a managed `iteration` field. No fuzzy or case-insensitive value resolution is allowed.

If desired and observed normalized values are identical, the planner records a preserve observation. Otherwise it proposes `set_field_value` with an exact old-value and item-fingerprint precondition. Null or missing observed values are explicit preconditions, not wildcards.

## Operations

V1 operations are additive or non-destructive updates:

- `create_field` and `add_option`, carried forward from the executable effective-schema result;
- `set_field_value`;
- `set_parent` only when no different parent is observed;
- `add_dependency` for a missing normalized dependency edge.

V1 never emits clear-field, delete-field, delete-option, remove-parent, remove-dependency, rename, kind conversion, archive, close, or bulk operations.

Every operation declares:

~~~typescript
type OperationEnvelope = {
  operationKey: string;
  subject: { ref: string };
  resource: { kind: string; logicalKey: string; scopeRef: string };
  action: "create" | "add" | "set";
  environment: "dry-run";
  reason: string;
  preconditions: readonly Precondition[];
  dependsOn: readonly string[];
};
~~~

Reasons are stable codes, not raw prose. Preconditions are exact, bounded, and serializable. Operations that depend on a field or option proposed in the same plan declare its operation key in `dependsOn`. Missing or cyclic operation dependencies fail closed.

## Ordering and canonical form

Operations are ordered by:

1. phase: schema field, schema option, item value, parent, dependency;
2. logical field key;
3. logical option key or related issue number;
4. operation key.

Diagnostics are deduplicated by `(code, path)` and ordered by code then path. Observations are ordered by type then logical key.

Canonical JSON recursively sorts object keys, retains array order, encodes UTF-8 without insignificant whitespace, rejects non-finite numbers, and includes an explicit schema version. `planId` is lowercase hexadecimal SHA-256 of the canonical internal plan excluding `planId` itself. Time, randomness, process state, environment, credentials, and network state are absent from the digest.

Repeated identical inputs must produce byte-identical canonical plans, plan IDs, and public reports.

## Complete-plan gate

~~~typescript
type ReconciliationPlan = {
  schema: 1;
  planId: string;
  executable: boolean;
  diagnostics: readonly PlanDiagnostic[];
  observations: readonly PlanObservation[];
  operations: readonly PlannedOperation[];
};
~~~

`executable` is true only when every input, binding, graph, operation dependency, and precondition is valid. Operations may remain visible for review when false, but any future adapter MUST reject the entire plan. Partial apply is forbidden.

V1 contains no execution method, callback, port, transport, credential parameter, or provider client. Dry-run zero-mutation semantics are structural, not conventional.

## Redacted report

`renderPublicReport(plan)` returns a new value and never serializes the internal plan directly. The report contains:

- report schema version and plan ID;
- executable flag and aggregate counts;
- stable diagnostic code, logical path, severity, and safe message;
- operation type, logical field or relationship key, safe desired display value, reason code, and dependency keys;
- preserve observations using logical keys and safe display values.

The report excludes subject, repository, Project, issue, installation, node, field, option, fingerprint, and credential references; raw issue text; raw policy text; provider error bodies; URLs; environment values; and internal precondition values.

## Diagnostics

| Code | Meaning |
| --- | --- |
| `YKP-PLAN-001` | input boundary invalid |
| `YKP-PLAN-002` | effective schema is not executable |
| `YKP-PLAN-003` | required managed field binding missing |
| `YKP-PLAN-004` | policy kind or mode incompatible with contract value |
| `YKP-PLAN-005` | policy vocabulary value unresolved |
| `YKP-PLAN-006` | observed value invalid |
| `YKP-GRAPH-001` | graph resource limit exceeded |
| `YKP-GRAPH-002` | duplicate, self, or unknown-endpoint edge |
| `YKP-GRAPH-003` | parent cardinality conflict |
| `YKP-GRAPH-004` | parent cycle detected |
| `YKP-GRAPH-005` | dependency cycle detected |
| `YKP-GRAPH-006` | contradictory relationship declaration |
| `YKP-PLAN-007` | operation dependency invalid or cyclic |
| `YKP-REPORT-001` | value cannot be safely rendered |

Messages contain no raw input or provider identifier. Existing meanings cannot be reassigned within v1.

## Compatibility and rollback

Adding an operation type, changing value mapping, weakening a precondition, changing canonicalization, changing plan-ID inputs, changing ordering, or exposing an additional report field requires explicit compatibility review. Destructive operation types require a separate accepted contract and threat-model update.

Because v1 cannot execute, rollback is discarding the plan. A future adapter must revalidate every precondition against newly observed state immediately before any apply.

## Implementation gate

Implementation follows only after explicit acceptance. Tests must prove input and graph bounds, cycle and contradiction rejection, field mapping, option resolution, exact preconditions, operation dependency ordering, canonical byte stability, provider-ID redaction, whole-plan fail-closed behavior, and structural absence of mutation capability using invented fixtures only.
