# Configure repository policy

Repository policy maps stable logical keys to exact Project field names.

```yaml
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
```

## Choose a mode

- `managed`: Yukh Projects may propose creating the field or adding declared
  options.
- `observed`: the field must already exist and is never created or changed.

## Keep policy portable

Include logical keys and display names only. Exclude:

- GitHub node IDs;
- owner, repository, or Project identifiers;
- URLs and credentials;
- adopter-specific fixtures.

Field and option names match exactly. Case-fold collisions, unknown keys,
duplicate values, aliases, anchors, merge keys, and multiple YAML documents
fail closed.

See the [policy contract](../contracts/repository-policy-v1.md) for the complete
schema and limits.
