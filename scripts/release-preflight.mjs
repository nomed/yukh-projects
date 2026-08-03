import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createWouldPublishManifest } from "../dist/src/release-plan.js";

const [version,commit]=process.argv.slice(2);if(!version||!commit)throw new Error("release candidate arguments are required");
const head=spawnSync("git",["rev-parse","HEAD"],{encoding:"utf8"});if(head.status!==0||head.stdout.trim()!==commit)throw new Error("release commit mismatch");
const ancestor=spawnSync("git",["merge-base","--is-ancestor",commit,"origin/main"]);if(ancestor.status!==0)throw new Error("release commit is not on main");
const packageDocument=JSON.parse(await readFile("package.json","utf8"));const changelog=await readFile("CHANGELOG.md","utf8");const paths=["action.yml","dist/action/index.js","dist/cli/index.js","package-lock.json","release.spdx.json"];const artifacts=await Promise.all(paths.map(async path=>({path,bytes:await readFile(path)})));const manifest=createWouldPublishManifest(version,commit,packageDocument.version,changelog,artifacts);process.stdout.write(`${JSON.stringify(manifest)}\n`);
