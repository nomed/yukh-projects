# MCP Effect B hermetic conformance runner

- **Status:** local, unpublished, test-only Class B-X author candidate
- **Authority:** RFC-0007 at
  `nomed/nomed.github.io@bb8628edf7a07c2af56f07e4f9140f58c851ef47`
- **Source baseline:**
  `nomed/yukh-projects@a4f05f673bb0a03f66fc9864372cee7839ed78d1`
- **Runtime authority added:** none
- **Provider calls:** none; every read, write, and Coordination fetch is an
  injected deterministic fake

## Purpose and boundary

The runner is a repository-checkout conformance seam for sibling-suite tests. It
is not a package API, runtime entrypoint, handle broker, approval authority,
credential source, provider adapter, release artifact, or deployment tool.

`runMcpEffectBControlledApplyV1` remains the sole production MCP Effect B
export. The runner reuses the existing esbuild test bundle injection that adds
private handle construction only to an ephemeral, project-local test bundle.
The bundle is deleted after every command. It is excluded from TypeScript
production output, the package file allowlist, declarations, committed
candidate bundles, and every package subpath.

The runner accepts no URL, endpoint, credential, handle, module, source path,
provider identifier, target, policy, operation, environment, or arbitrary test
definition. Process environment values are not passed to the conformance
subprocess. No network, live provider, credential, publication, tag, release,
or workflow activation is involved.

## Command and closed protocol

The fixed selector is:

~~~text
npm --silent run test:mcp-effect-b-conformance -- --corpus=core-v1
~~~

The equivalent standard-input request is at most 512 bytes and has exactly two
fields:

~~~json
{"schema":"yukh-projects-mcp-effect-b-conformance-request-v1","corpus":"core-v1"}
~~~

Unknown, missing, or extra fields; unknown arguments; alternate corpus names;
and oversized or malformed JSON fail closed with exit status `2` and:

~~~json
{"schema":"yukh-projects-mcp-effect-b-conformance-result-v1","status":"rejected","code":"YKP-CONFORMANCE-REQUEST-001"}
~~~

Successful output is one JSON line no larger than 4096 bytes. It contains only
the closed result schema, fixed corpus name, aggregate status, fixed case IDs,
and pass/fail values. It cannot contain raw handles, secrets, credentials,
endpoints, provider responses, stack traces, arbitrary module names, or
operational payloads.

## Fixed `core-v1` evidence

The subprocess selects only tests carrying the following immutable case IDs:

| Case | Assertion |
| --- | --- |
| `effect-observed` | one exact mutation reaches independently verified zero drift |
| `denial-zero-call` | compound admission denial performs zero provider and Coordination calls |
| `trust-mismatch` | substituted Projects/bridge trust fails before all calls |
| `nonce-substitution` | a validly signed substituted nonce fails before all calls |
| `lease-substitution` | a validly signed substituted lease binding fails before all calls |
| `completion-unknown-no-retry` | one ambiguous request is terminal and replay performs no retry |
| `independent-verification` | trust changed after initial admission is rejected by entrypoint re-verification before mutation |
| `cleanup` | all nine handles close and cleanup failure cannot rewrite the terminal effect |

External-process tests also require the production runtime and candidate bundle
to export only `runMcpEffectBControlledApplyV1`, reject every authority-shaped
runner input, keep package deep imports closed, and emit bounded redacted JSON.

## RFC-0007 B-X author evidence

~~~text
Decision ID: projects-effect-b-hermetic-conformance-runner-v1
Class: B-X local test-only implementation candidate
Authority chain: RFC-0007@bb8628edf7a07c2af56f07e4f9140f58c851ef47;
  yukh-projects@a4f05f673bb0a03f66fc9864372cee7839ed78d1
Author session: 8aaca174-43dc-40c0-8630-f3f7373ba47e; role Author;
  recorded 2026-08-10T19:52:46.879+02:00
Decision: add a closed hermetic subprocess seam around the existing test-only
  injection without changing production authority or exports
Author-gate outcome: implementation and pull-request evidence only
~~~

This author record grants no self-review, acceptance, merge, release,
publication, tag, credential, endpoint, provider effect, live teardown,
deployment, or activation authority. A distinct reviewer must evaluate the
exact pull-request head. Merge, if later authorized, remains a separate role.
