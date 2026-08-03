import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Action metadata is node24 and exposes no apply input",async()=>{const source=await readFile("action.yml","utf8");assert.match(source,/using: node24/u);assert.match(source,/main: dist\/action\/index\.js/u);assert.doesNotMatch(source,/^\s+apply:/mu);});
test("preview sources do not import mutation modules",async()=>{for(const path of ["src/action.ts","src/cli.ts","src/dry-run.ts","src/runtime-input.ts"]){const source=await readFile(path,"utf8");assert.doesNotMatch(source,/executor|github-mutation-transport/u);}});
