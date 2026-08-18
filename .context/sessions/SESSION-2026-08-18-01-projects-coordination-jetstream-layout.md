# SESSION-2026-08-18-01 — Projects and Coordination JetStream layout

- Status: completed
- Governing issue: https://github.com/nomed/yukh-projects/issues/194
- Branch: `agent/projects-coordination-jetstream-layout`

## Objective

Document whether Yukh Projects uses NATS JetStream and how its runtime should
be deployed alongside Yukh Coordination without collapsing their authority
boundaries.

## Outcome

- Added `docs/operations/projects-coordination-jetstream-layout.md`.
- Linked the operations page from `docs/index.md`.
- Added the page to `mkdocs.yml` navigation.
- Extended the documentation structure test so the operations page remains
  visible from the public site.

The documented state is that Projects uses JetStream for the work-governance
event log and rebuildable projections. Coordination may share the same physical
NATS runtime, but its transcript and runtime stores remain separate from
Projects streams, buckets, subjects, APIs, credentials, and ownership.

## Validation

- `npm test -- --test-name-pattern 'public site follows|documentation diagrams|repository-only migration'`
  unintentionally invoked the broader repository test runner. The documentation
  test passed; unrelated existing failures appeared in `e2e-sandbox-demo`,
  `mcp-effect-b-conformance-runner`, and `package-export-surface`.
- `node --test dist/test/documentation.test.js`
- `git diff --check`

## Notes

`.context/manifest.yaml` is referenced by `AGENTS.md` but is not present in
this repository. This was observed but intentionally not changed in this
documentation-only increment.
