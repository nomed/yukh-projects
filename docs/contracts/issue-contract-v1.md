# Issue contract v1 — proposed public specification

- **Status:** Accepted
- **Accepted:** 2026-08-02 by `@nomed`
- **Governing issue:** [#4](https://github.com/nomed/yukh-projects/issues/4)
- **Security boundary:** untrusted issue text to validated immutable data

## Envelope

An issue contains zero or one contract block. The block is an HTML comment whose opening line is exactly `<!-- yukh:issue:v1` and whose closing line is exactly `-->`. Content between those lines is UTF-8 YAML 1.2 data.

Text outside the block is ordinary issue content and is never interpreted as configuration. A document with no block has no contract and is not an error. Multiple opening markers, nested markers, an unterminated block, or any second contract block fail closed.

~~~markdown
<!-- yukh:issue:v1
schema: 1
work_type: feature
area: runtime
priority: P1
size: M
project:
  status: ready
relationships:
  parent: 41
  blocked_by: [52, 53]
-->
~~~

All names and values above are synthetic. Repository policy, not the issue contract, defines the allowed vocabulary for `area`, `priority`, `size`, and `project.status`.

## Data model

The root is a mapping with these fields:

| Field | Required | Type and constraints |
| --- | --- | --- |
| `schema` | yes | integer exactly `1` |
| `work_type` | yes | one of `epic`, `gate`, `feature`, `task`, `bug`, `technical-debt` |
| `area` | yes | normalized string, 1–64 Unicode scalar values |
| `priority` | no | normalized string, 1–32 scalar values |
| `size` | no | normalized string, 1–32 scalar values |
| `estimate` | no | finite number from 0 through 10000 |
| `iteration` | no | normalized string, 1–128 scalar values |
| `project` | no | mapping described below |
| `relationships` | no | mapping described below |

`project` accepts only `status`, `start_date`, and `target_date`. Status is a normalized string of 1–64 scalar values. Dates use the exact `YYYY-MM-DD` form and must represent calendar dates. When both dates exist, `target_date` cannot precede `start_date`.

`relationships` accepts only:

- `parent`: one positive issue number;
- `blocks`: a sequence of positive issue numbers;
- `blocked_by`: a sequence of positive issue numbers.

Relationship sequences contain at most 100 entries, contain no duplicates, and cannot contain the current issue number when that number is known. Cross-repository references are not part of v1.

Unknown fields fail closed at every level. YAML merge keys, explicit tags, anchors, aliases, duplicate mapping keys, non-string mapping keys, timestamps, binary values, and multiple YAML documents are forbidden.

## Resource limits

Validation occurs before semantic planning and enforces all limits independently of parser defaults:

| Limit | Maximum |
| --- | ---: |
| Complete issue body | 256 KiB UTF-8 |
| Contract block | 16 KiB UTF-8 |
| Mapping depth | 8 |
| Root fields | 32 |
| Fields in any nested mapping | 16 |
| Items in any sequence | 100 |
| Total scalar values | 512 |
| Any scalar string | 512 Unicode scalar values |

Invalid UTF-8, a byte-limit breach, or a structural-limit breach stops semantic validation. Implementations must not partially accept an over-limit contract.

## Normalization

Field names are exact lowercase ASCII and are not case-folded. Enumerated values are exact lowercase ASCII. Vocabulary strings are trimmed at both ends, must not contain control characters, and otherwise retain their original Unicode; implementations do not perform compatibility or locale normalization silently.

Issue numbers are base-10 integers without signs, separators, or leading zeroes. Numeric coercion from strings is forbidden.

## Diagnostics

A diagnostic has this public shape:

~~~json
{
  "code": "YKP-CONTRACT-001",
  "path": "$.schema",
  "severity": "error",
  "message": "required field is missing"
}
~~~

Messages are stable English interface text and contain no raw input. Paths use a restricted JSONPath form rooted at `$`; sequence indices are zero-based.

Diagnostics are deduplicated by `(code, path)`, then ordered by:

1. source byte offset when available;
2. diagnostic code;
3. path.

Each missing required field emits exactly one `YKP-CONTRACT-001` diagnostic at its field path. Structural errors that make safe traversal impossible stop semantic diagnostics, preventing cascades and ambiguous partial interpretation.

## Initial diagnostic registry

| Code | Meaning |
| --- | --- |
| `YKP-CONTRACT-001` | required field missing |
| `YKP-CONTRACT-002` | duplicate, nested, or unterminated envelope |
| `YKP-CONTRACT-003` | body or block byte limit exceeded |
| `YKP-CONTRACT-004` | YAML syntax or forbidden YAML feature |
| `YKP-CONTRACT-005` | structural limit exceeded |
| `YKP-CONTRACT-006` | unknown field |
| `YKP-CONTRACT-007` | invalid type |
| `YKP-CONTRACT-008` | invalid or unsupported value |
| `YKP-CONTRACT-009` | duplicate sequence value |
| `YKP-CONTRACT-010` | invalid relationship |
| `YKP-CONTRACT-011` | inconsistent date range |

New meanings require new codes. Existing codes cannot be reassigned within schema v1.

## Compatibility

Additive vocabulary changes belong to repository policy and do not change this schema. Adding a root field, weakening a rejection rule, changing normalization, changing diagnostic meaning or order, or changing a resource limit requires explicit compatibility review. A breaking contract change uses a new envelope and schema version; implementations never guess or upgrade an unknown version.

## Implementation gate

Parser implementation follows only after this proposal is accepted. It must use invented fixtures and prove duplicate rejection, bounds, aliases disabled, stable ordering, exactly-one missing-field diagnostics, and zero filesystem, network, environment, credential, or mutation access.
