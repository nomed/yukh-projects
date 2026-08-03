import test from "node:test";
import assert from "node:assert/strict";
import { createWouldPublishManifest } from "../src/release-plan.js";

const artifacts=["action.yml","dist/action/index.js","dist/cli/index.js","package-lock.json","release.spdx.json"].map((path,index)=>({path,bytes:Buffer.from(`synthetic-${index}`)}));
test("creates a deterministic non-publishing release manifest",()=>{const a=createWouldPublishManifest("0.1.0","a".repeat(40),"0.1.0","# Changelog\n\n## 0.1.0\n",artifacts);const b=createWouldPublishManifest("0.1.0","a".repeat(40),"0.1.0","## 0.1.0",[...artifacts].reverse());assert.deepEqual(a,b);assert.equal(a.publication,"disabled");assert.equal(a.tag,"v0.1.0");});
test("rejects version, commit, changelog, and artifact mismatches",()=>{const cases:readonly [string,string,string,string,typeof artifacts][]=[["v0.1.0","a".repeat(40),"0.1.0","## 0.1.0",artifacts],["0.1.0","short","0.1.0","## 0.1.0",artifacts],["0.1.0","a".repeat(40),"0.2.0","## 0.1.0",artifacts],["0.1.0","a".repeat(40),"0.1.0","# Changelog",artifacts],["0.1.0","a".repeat(40),"0.1.0","## 0.1.0",artifacts.slice(1)]];for(const [version,commit,packageVersion,changelog,files] of cases)assert.throws(()=>createWouldPublishManifest(version,commit,packageVersion,changelog,files));});
