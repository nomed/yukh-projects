import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

for(const path of ["dist/action/index.js","dist/cli/index.js"]){const tracked=spawnSync("git",["ls-files","--error-unmatch",path],{stdio:"ignore"});if(tracked.status!==0)throw new Error("preview bundle is not committed");const source=await readFile(path,"utf8");for(const forbidden of ["github-mutation-transport","YukhCreateProjectField","mutation Yukh"])if(source.includes(forbidden))throw new Error("preview bundle contains a prohibited mutation module");}
const diff=spawnSync("git",["diff","--exit-code","--","dist/action/index.js","dist/cli/index.js"],{stdio:"inherit"});if(diff.status!==0)throw new Error("committed preview bundle is not reproducible");
for(const path of ["dist/apply/index.js","dist/apply/manifest.json"]){const tracked=spawnSync("git",["ls-files","--error-unmatch",path],{stdio:"ignore"});if(tracked.status!==0)throw new Error("apply candidate is not committed");}
const applyBytes=await readFile("dist/apply/index.js"),manifest=JSON.parse(await readFile("dist/apply/manifest.json","utf8"));
if(Object.keys(manifest).sort().join("\0")!==["artifact","bytes","entrypoint","publication","schema","sha256"].sort().join("\0")||manifest.schema!==1||manifest.artifact!=="controlled-apply-library"||manifest.entrypoint!=="library-only"||manifest.publication!=="disabled"||manifest.bytes!==applyBytes.byteLength||manifest.sha256!==createHash("sha256").update(applyBytes).digest("hex"))throw new Error("apply candidate manifest mismatch");
const applySource=applyBytes.toString("utf8");for(const forbidden of ["nats","jetstream","process.env","GITHUB_TOKEN","workflow_dispatch"]){if(applySource.toLowerCase().includes(forbidden.toLowerCase()))throw new Error("apply candidate contains concrete host authority");}
const applyDiff=spawnSync("git",["diff","--exit-code","--","dist/apply/index.js","dist/apply/manifest.json"],{stdio:"inherit"});if(applyDiff.status!==0)throw new Error("committed apply candidate is not reproducible");
