# Hermetic Projects E2E sandbox demo

- **Status:** local, unpublished qualification command
- **Governing issue:** [#54](https://github.com/nomed/yukh-projects/issues/54)
- **Provider effects:** none
- **Required runtime:** Node.js 22.13 or later and repository dependencies

## Command

From a clean repository checkout:

```text
npm --silent run demo:e2e
```

The command builds the current TypeScript sources and runs one closed scenario. It accepts no arguments, target, URL, credential, environment-selected policy, approval, or transport. Unknown arguments fail with exit status `2`. Before loading production runtime modules it replaces global `fetch` with a non-writable, non-configurable sentinel. Every attempted network call is counted, rejected, and makes the run fail closed; `liveProviderCalls` is derived from that counter rather than asserted as a constant. The scenario uses an in-memory GitHub fake and ephemeral synthetic Ed25519 approval key; it never loads a secret, enables live apply, publishes an artifact, or changes provider state.

## Scenario

The runner passes an invented repository policy and invented issue contract through the production read-only orchestration and planner. The initial observation requires one field-value operation. It then:

1. attempts the exact plan with an invalid approval and proves `YKP-APPLY-003` with zero mutation requests;
2. signs an ephemeral approval bound to the exact plan and executes it through the production controlled-apply entrypoint;
3. records one local fake `update_project_item_field_value` request with its deterministic client mutation digest and fencing token;
4. freshly re-observes the fake and proves a zero-operation dry-run;
5. approves the fresh zero plan and proves that the second controlled apply sends no additional mutation.

Success emits one bounded JSON line and exits `0`. Stable fields include:

```json
{"schema":"yukh-projects-e2e-sandbox-demo-result-v1","status":"passed","transport":"local-github-fake","liveProviderCalls":0,"phases":[{"id":"dry-run","status":"passed","operations":1},{"id":"approval-gate","status":"denied","code":"YKP-APPLY-003","mutationRequests":0},{"id":"controlled-apply","status":"passed","verified":1,"mutationRequests":1},{"id":"idempotency","status":"passed","operations":0,"additionalMutationRequests":0}],"mutationRequest":{"kind":"update_project_item_field_value","operationType":"set_field_value","clientMutationId":"<64 lowercase hexadecimal characters>","fencingToken":1}}
```

The output excludes policy and issue contents, provider identifiers, approval material, keys, nonces, credentials, endpoints, raw observations, and operational traces. Failure emits only the result schema and a stable code.
