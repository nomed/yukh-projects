import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseActionMode } from "../src/action.js";

test("Action metadata is node24 and exposes no apply input",async()=>{const source=await readFile("action.yml","utf8");assert.match(source,/using: node24/u);assert.match(source,/main: dist\/action\/index\.js/u);assert.doesNotMatch(source,/^\s+apply:/mu);});
test("Action exposes only native and legacy shadow modes",async()=>{const source=await readFile("action.yml","utf8");assert.match(source,/^  mode:/mu);assert.equal(parseActionMode(undefined),"native");assert.equal(parseActionMode("native"),"native");assert.equal(parseActionMode("legacy-shadow"),"legacy-shadow");assert.throws(()=>parseActionMode("apply"));});
test("single-issue legacy Action uses the exact controlled planner",async()=>{const source=await readFile("src/action.ts","utf8");assert.match(source,/runLegacyDryRun/u);assert.doesNotMatch(source,/runLegacyShadow/u);assert.doesNotMatch(source,/native&&success/u);});
test("preview sources do not import mutation modules",async()=>{for(const path of ["src/action.ts","src/cli.ts","src/dry-run.ts","src/runtime-input.ts"]){const source=await readFile(path,"utf8");assert.doesNotMatch(source,/executor|github-mutation-transport/u);}});
