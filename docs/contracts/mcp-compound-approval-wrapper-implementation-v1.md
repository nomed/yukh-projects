# MCP compound approval bridge and wrapper v1 - implementation candidate

- **Status:** Unreviewed implementation candidate
- **Governing issue:** [#154](https://github.com/nomed/yukh-projects/issues/154)
- **Accepted semantic contract:** [MCP compound approval bridge and wrapper v1](mcp-compound-approval-wrapper-v1.md)
- **Authority chain:** RFC-0007 at
  `nomed/nomed.github.io@bb8628edf7a07c2af56f07e4f9140f58c851ef47`,
  RFC-0005 at
  `nomed/nomed.github.io@12d9215f10c4b7fb1762a5025367e3e81543800f`,
  and `nomed/yukh-projects@521be0d0ef1297579e84a6322dea29f80c2549dc`
- **Authority:** local Class B-X author candidate only; normal review, security
  review, merge, release, activation, credentials, and provider effects remain
  unauthorized

## Implemented boundary

The candidate adds one MCP-facing export:

~~~typescript
runMcpEffectBControlledApplyV1(
  invocation: McpEffectBControlledApplyInvocationV1,
): Promise<McpEffectBControlledApplyResultV1>
~~~

`dist/mcp-effect-b/index.js` and the compiled production deep module each export
only that runtime function. There is no public constructor, transport, verifier
override, credential callback, endpoint, CLI, Action, workflow dispatch,
dynamic module, or generic apply surface.

The invocation has the exact accepted schema and contains only nonenumerable,
nonserializable, single-use private handles. Every handle must be minted by one
host bundle, have the exact expected kind, be distinct, and remain unused.
Ordinary objects, mixed bundles, duplicated handles, reused handles, unknown
fields, and a value other than `attempt: 1` return
`YKP-MCP-WRAPPER-001`.

The package exports only its root entrypoint and uses an explicit production
file allowlist. MCP Effect B subpath imports are unavailable, and the packed
JavaScript, declarations, manifests, and bundles contain no handle minter or
test construction helper. Synthetic qualification injects its private host
adapter from excluded test-only source into a temporary bundle that is deleted
after the test process. It is not production output, a package file, or a
candidate artifact.

## Bridge verifier

The bridge verifier accepts at most 32 KiB of canonical JSON and enforces:

- the exact envelope, claims, producer-release, and wrapper-release field sets;
- object depth no greater than six, safe nonnegative integers, valid Unicode,
  bounded private references, lowercase commit and SHA-256 values, and the
  exact schema, profile, algorithms, and entrypoint versions;
- an exact 64-byte unpadded-base64url Ed25519 signature over the accepted
  domain-separated signing input;
- a host-selected Ed25519 key, ordered issuer allowlist, and canonical trust
  profile fingerprint rather than any trust material from the artifact; and
- rejection of noncanonical bytes, duplicate-key encodings, aliases, arrays,
  sidecars, extra signatures, unknown fields, malformed releases, and
  substituted trust profiles.

The committed
`test/fixtures/mcp-effect-b-bridge-v2-vector.json` is the byte-stable valid
vector. The negative corpus deletes every required top-level and claim field
and covers unknown nesting, malformed encodings, wrong algorithms, unknown
profiles, unsafe numbers, invalid signatures, oversized input, stale and
future lifetimes, replay, and cross-binding substitution.

## Atomic admission and execution

The wrapper consumes the complete handle set atomically and then:

1. authenticates the pinned MCP verified-admission handle;
2. canonicalizes the unchanged Projects v1 envelope and calls
   `verifySignedApproval`;
3. authenticates bridge v2 independently;
4. exact-matches the v1 and bridge pair, authenticated Projects `subjectRef`,
   MCP handle, target, policy, plans, operations, producer, wrapper,
   postcondition, distinct nonce bindings, Coordination epoch, lease scope,
   lease holder, environment, and lifetime;
5. parses the protected host capsule with `parseProtectedHostCapsule`;
6. requires the fixed synthetic target, `native-v1`, Issues write only,
   `add_blocked_by`, distinct read/write credentials, and bounded REST and
   GraphQL request ceilings;
7. calls `createControlledApplyHostFactory(...).create(...)` once and
   exact-matches the fresh plan to exactly
   `add_dependency(201 blocks 202)`; and
8. calls `runApplyEntrypoint` once with the original v1 artifact so the accepted
   entrypoint independently re-verifies it.

Steps 1 through 6 perform no provider call. In particular,
`verifySignedApproval` completes before the provider-backed factory's
`create` method. Every admission denial is a static redacted result and leaves
the provider, Coordination, and mutation adapters untouched.

The fixed write instrumentation accepts one exact `addBlockedBy` request with
the host-resolved issue references. It records the boundary before delegating
and rejects a second request. There is no retry, sleep, polling, fallback,
credential switch, continuation, redispatch, or resume.

`effect_observed` is returned only after the accepted entrypoint reports one
verified operation and final zero drift. Any lost response, ambiguous mutation,
or failed post-mutation convergence is terminal `completion_unknown` with at
most one recorded request. A reused handle cannot resume it. Handle cleanup is
unconditional and cannot rewrite the recorded terminal result.

## Compatibility, rollback, and teardown

The unchanged Projects v1 verifier, approval schema, CLI, Action, dry-run, and
existing apply entrypoints retain their current behavior. Bridge v2 is
reachable only through the new wrapper candidate. Removing the root and bundle
exports and deleting the bridge/wrapper module disables the candidate without
changing v1 behavior. Source rollback is not provider restore authority.

This candidate creates no infrastructure or provider state. Its Class B-X
teardown is therefore deletion of local generated candidate files and the
worktree; tests verify all nine private handles close on every admitted or
denied invocation. Live teardown remains a separately governed effect.
