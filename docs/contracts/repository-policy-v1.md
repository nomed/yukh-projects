# Repository policy and effective schema v1 — proposed specification

- **Status:** Proposed
- **Governing issue:** [#10](https://github.com/nomed/yukh-projects/issues/10)
- **Security boundary:** reviewed policy plus bounded observed state to a deterministic, non-executable plan

## Purpose

Repository policy declares the Project fields a consumer intends Yukh Projects to manage or observe. It uses stable logical keys that are never provider node identifiers. The effective-schema calculation compares that policy with already bounded observed state and produces diagnostics, observations, and additive operations without performing I/O.

## Policy envelope

The policy is UTF-8 YAML 1.2 with this root shape:

~~~yaml
schema: 1
fields:
  area:
    name: Area
    kind: single_select
    mode: managed
    options:
      architecture: Architecture
      runtime: Runtime
  target_date:
    name: Target date
    kind: date
    mode: observed
~~~

All values are invented. The policy contains display names and logical keys only. Provider IDs, owner names, repository names, Project numbers, credentials, URLs, and environment bindings are forbidden.

### Root fields

| Field | Required | Constraint |
| --- | --- | --- |
| `schema` | yes | integer exactly `1` |
| `fields` | yes | mapping of 1–64 logical field keys |

Unknown root fields fail closed.

### Field declarations

A logical field key matches `^[a-z][a-z0-9_]{0,63}$`. Each declaration accepts only:

| Field | Required | Constraint |
| --- | --- | --- |
| `name` | yes | trimmed display string, 1–128 Unicode scalar values |
| `kind` | yes | `text`, `number`, `date`, `single_select`, or `iteration` |
| `mode` | yes | `managed` or `observed` |
| `options` | conditional | required only for managed `single_select`; mapping of 1–128 logical option keys to display strings |

Option keys follow the field-key grammar. Option display strings are trimmed, contain 1–128 Unicode scalar values, and are unique within a field under the v1 comparison fold. Options are forbidden for non-`single_select` fields. An observed field may not declare options because v1 does not assert ownership over its vocabulary.

A managed field means Yukh Projects may propose creating the field and adding missing declared options. An observed field must already exist and is validated but never created or changed.

### Policy limits

| Limit | Maximum |
| --- | ---: |
| Policy document | 64 KiB UTF-8 |
| Mapping depth | 8 |
| Fields | 64 |
| Options per field | 128 |
| Total scalar values | 2,048 |
| Any scalar string | 512 Unicode scalar values |

The YAML restrictions from issue contract v1 also apply: aliases, anchors, tags, merge keys, duplicate keys, non-string mapping keys, multiple documents, implicit timestamps, and binary values are forbidden.

## Observed schema input

The effective-schema function receives an already bounded immutable value, not raw API output:

~~~typescript
type ObservedSchema = {
  fields: readonly {
    providerId: string;
    name: string;
    kind: "text" | "number" | "date" | "single_select" | "iteration";
    options?: readonly { providerId: string; name: string }[];
  }[];
};
~~~

Observed state is limited to 256 fields, 256 options per field, 2,048 options total, and 256 Unicode scalar values for any provider ID or display name. Duplicate provider IDs fail closed. Duplicate exact names or comparison-fold-equivalent names are ambiguous and fail closed. The pure core treats provider IDs as opaque data and never parses, logs, synthesizes, or accepts them from policy.

## Matching rules

The v1 comparison fold is `value.normalize("NFKC").toLocaleLowerCase("en-US")`. It is used only to detect ambiguity; accepted display values retain their reviewed spelling.

Fields match only by exact display name. Options match only by exact display name inside their matched field. Comparison never infers a rename from similarity, position, logical key, case, provider ID, or missing state.

For every policy field in logical-key order:

1. no exact observed name:
   - if a case-fold-equivalent name exists, emit a conflict;
   - if mode is `observed`, emit a missing-observed-field diagnostic;
   - if mode is `managed`, propose `create_field` with all declared options;
2. one exact observed name:
   - if kind differs, emit a kind conflict;
   - if mode is `observed`, record `preserve_field` and do nothing else;
   - if mode is `managed`, preserve the field and compare options;
3. more than one exact observed name: emit an ambiguity conflict.

For a matched managed `single_select`, every declared option is processed in logical-option-key order:

- exact observed name: record `preserve_option`;
- case-fold-equivalent observed name: emit a conflict;
- no match: propose `add_option`.

Observed fields and options absent from policy are unmanaged and preserved silently. V1 never proposes field deletion, option deletion, rename, kind conversion, option recoloring, option reordering, or destructive replacement.

## Effective-schema result

The result is deterministic and serializable:

~~~typescript
type EffectiveSchemaResult = {
  executable: boolean;
  diagnostics: readonly SchemaDiagnostic[];
  observations: readonly SchemaObservation[];
  operations: readonly SchemaOperation[];
};
~~~

`executable` is true only when there are no error diagnostics. Operations may be retained for an explanatory dry-run when false, but every future mutation adapter MUST reject the complete plan when `executable` is false; partial apply is forbidden.

Operations contain logical keys, desired display values, and only the minimum opaque provider IDs needed by a future adapter. Public rendering and logs must use logical keys and display values, not provider IDs.

Ordering is stable:

1. logical field key;
2. operation rank: `create_field`, `preserve_field`, `add_option`, `preserve_option`;
3. logical option key;
4. diagnostic code and path.

Diagnostics are deduplicated by `(code, path)` and never include raw provider payloads.

## Diagnostic registry

| Code | Meaning |
| --- | --- |
| `YKP-POLICY-001` | required policy field missing |
| `YKP-POLICY-002` | YAML syntax or feature forbidden |
| `YKP-POLICY-003` | policy resource limit exceeded |
| `YKP-POLICY-004` | unknown policy field |
| `YKP-POLICY-005` | invalid policy type |
| `YKP-POLICY-006` | invalid policy value |
| `YKP-POLICY-007` | duplicate or case-fold-colliding display name |
| `YKP-SCHEMA-001` | observed schema resource limit exceeded |
| `YKP-SCHEMA-002` | ambiguous observed field or option |
| `YKP-SCHEMA-003` | required observed field missing |
| `YKP-SCHEMA-004` | field kind conflict |
| `YKP-SCHEMA-005` | policy-to-observed case-fold collision |

Existing meanings cannot be reassigned within v1. Structural errors that make traversal unsafe stop semantic diagnostics.

## Compatibility and rollback

Adding a policy field or option is additive but may produce a future create operation. Removing a declaration only stops management; it does not delete observed state. Changing a display name is interpreted as a new declaration and never as a rename. Changing kind or mode requires an explicit reviewed policy change and may conflict with observed state.

Because this slice performs no I/O, rollback is restoring the previous reviewed policy input. A future adapter must retain the exact plan and revalidate observed preconditions before apply.

## Implementation gate

Implementation follows only after explicit acceptance. Tests must use invented inputs and prove stable ordering, bounds, exact and case-fold matching, ownership behavior, ambiguity rejection, additive-only plans, zero partial apply authority, and zero network, filesystem, environment, credential, or mutation access.
