# GitHub read-only transport probe — 2026-08-02

- **Governing issue:** [#22](https://github.com/nomed/yukh-projects/issues/22)
- **Target class:** public, maintainer-owned repository and Project
- **Credential class:** existing OAuth credential held only in process memory
- **Mutation authorization:** none

## Result

~~~json
{
  "status": "success",
  "operations": {
    "resolve_scope": 1,
    "read_project_fields": 1,
    "read_project_item": 1,
    "read_issue_relationships": 1
  },
  "pages": 4,
  "fields": 20,
  "item_present": false,
  "relationship_nodes": 1
}
~~~

The probe used the fixed public GitHub endpoint and the four allowlisted named query documents. It performed no retry, mutation, write, redirect, fallback, or filesystem access. Output was reduced to aggregate counts before recording; credentials, raw responses, query variables, provider identifiers, titles, content, URLs, and private-resource discovery were excluded.

An initial schema-validation failure was safely reduced to `YKP-GH-READ-003`. Introspection identified an unsupported field and then an unused GraphQL variable. Both fixed documents were corrected, the full synthetic suite was rerun, and only then was the successful probe executed.
