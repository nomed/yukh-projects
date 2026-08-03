import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("apply candidate is library-only and contains no concrete host authority",async()=>{const entry=await readFile("src/apply-bundle.ts","utf8"),workflow=await readFile(".github/workflows/apply-candidate-preflight.yml","utf8");assert.doesNotMatch(entry,/process\.env|nats|jetstream|coordinator|main\s*\(/iu);assert.match(entry,/applyActionMain/u);assert.match(entry,/createGitHubMutationTransport/u);assert.match(workflow,/permissions:\n  contents: read/u);assert.doesNotMatch(workflow,/contents: write|id-token: write|attestations: write|publish-release/u);});

test("preview Action metadata still exposes no apply surface",async()=>{const metadata=await readFile("action.yml","utf8");assert.doesNotMatch(metadata,/apply|write-token|approval/iu);});

test("apply bundle exposes only durable HTTP coordination",async()=>{const entry=await readFile("src/apply-bundle.ts","utf8");assert.match(entry,/createApplyCoordinationHttpStore/u);assert.doesNotMatch(entry,/createMemoryApplyCoordinationStore/u);});
