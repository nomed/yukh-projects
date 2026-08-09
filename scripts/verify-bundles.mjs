import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

for(const path of ["dist/action/index.js","dist/cli/index.js"]){const tracked=spawnSync("git",["ls-files","--error-unmatch",path],{stdio:"ignore"});if(tracked.status!==0)throw new Error("preview bundle is not committed");const source=await readFile(path,"utf8");for(const forbidden of ["github-mutation-transport","YukhCreateProjectField","mutation Yukh"])if(source.includes(forbidden))throw new Error("preview bundle contains a prohibited mutation module");}
const diff=spawnSync("git",["diff","--exit-code","--","dist/action/index.js","dist/cli/index.js"],{stdio:"inherit"});if(diff.status!==0)throw new Error("committed preview bundle is not reproducible");
for(const path of ["dist/apply/index.js","dist/apply/action.js","dist/apply/cli.js","dist/apply/manifest.json"]){const tracked=spawnSync("git",["ls-files","--error-unmatch",path],{stdio:"ignore"});if(tracked.status!==0)throw new Error("apply candidate is not committed");}
const applyBytes=await readFile("dist/apply/index.js"),manifest=JSON.parse(await readFile("dist/apply/manifest.json","utf8"));
if(Object.keys(manifest).sort().join("\0")!==["artifact","artifacts","entrypoint","publication","schema"].sort().join("\0")||manifest.schema!==1||manifest.artifact!=="controlled-apply-candidate"||manifest.entrypoint!=="action-cli"||manifest.publication!=="disabled")throw new Error("apply candidate manifest mismatch");for(const path of ["index.js","action.js","cli.js"]){const bytes=await readFile(`dist/apply/${path}`),entry=manifest.artifacts?.[path];if(!entry||Object.keys(entry).sort().join("\0")!=="bytes\0sha256"||entry.bytes!==bytes.byteLength||entry.sha256!==createHash("sha256").update(bytes).digest("hex"))throw new Error("apply candidate artifact mismatch");}
const applySource=applyBytes.toString("utf8");for(const forbidden of ["nats","jetstream","process.env","GITHUB_TOKEN","workflow_dispatch"]){if(applySource.toLowerCase().includes(forbidden.toLowerCase()))throw new Error("apply candidate contains concrete host authority");}
const applyDiff=spawnSync("git",["diff","--exit-code","--","dist/apply/index.js","dist/apply/action.js","dist/apply/cli.js","dist/apply/manifest.json"],{stdio:"inherit"});if(applyDiff.status!==0)throw new Error("committed apply candidate is not reproducible");

for(const path of ["dist/mcp-effect-b/index.js","dist/mcp-effect-b/manifest.json"]){const tracked=spawnSync("git",["ls-files","--error-unmatch",path],{stdio:"ignore"});if(tracked.status!==0)throw new Error("MCP Effect B candidate is not committed");}
const mcpBytes=await readFile("dist/mcp-effect-b/index.js"),mcpManifest=JSON.parse(await readFile("dist/mcp-effect-b/manifest.json","utf8")),vectorBytes=await readFile("test/fixtures/mcp-effect-b-bridge-v2-vector.json");
if(Object.keys(mcpManifest).sort().join("\0")!==["artifact","artifacts","bridgeSchema","capability","entrypoint","operation","profile","publication","schema"].sort().join("\0")||mcpManifest.schema!==1||mcpManifest.artifact!=="mcp-effect-b-controlled-apply-candidate"||mcpManifest.entrypoint!=="mcp-effect-b-controlled-apply-v1"||mcpManifest.bridgeSchema!=="yukh-projects-approval-bridge-v2"||mcpManifest.profile!=="yukh-mcp/suite-preview-effect-b-add-dependency-v1"||mcpManifest.capability!=="projects.add-dependency.v1"||mcpManifest.operation!=="add_dependency(201 blocks 202)"||mcpManifest.publication!=="disabled")throw new Error("MCP Effect B candidate manifest mismatch");
for(const [path,bytes] of [["index.js",mcpBytes],["bridge-v2-vector.json",vectorBytes]]){const entry=mcpManifest.artifacts?.[path];if(!entry||Object.keys(entry).sort().join("\0")!=="bytes\0sha256"||entry.bytes!==bytes.byteLength||entry.sha256!==createHash("sha256").update(bytes).digest("hex"))throw new Error("MCP Effect B candidate artifact mismatch");}
const mcpSource=mcpBytes.toString("utf8");for(const forbidden of ["mintMcpEffectBPrivateInvocationForTest","workflow_dispatch","GITHUB_TOKEN","process.env"])if(mcpSource.includes(forbidden))throw new Error("MCP Effect B candidate contains a prohibited surface");
const mcpExports=Object.keys(await import(new URL("../dist/mcp-effect-b/index.js",import.meta.url)));if(mcpExports.length!==1||mcpExports[0]!=="runMcpEffectBControlledApplyV1")throw new Error("MCP Effect B candidate export surface mismatch");
const mcpDiff=spawnSync("git",["diff","--exit-code","--","dist/mcp-effect-b/index.js","dist/mcp-effect-b/manifest.json"],{stdio:"inherit"});if(mcpDiff.status!==0)throw new Error("committed MCP Effect B candidate is not reproducible");

const smoke=(path,args,expectedStatus,expectedOutput)=>{const result=spawnSync(process.execPath,[path,...args],{encoding:"utf8",env:{},timeout:5000,maxBuffer:64*1024});if(result.error||result.signal||result.status!==expectedStatus||`${result.stdout}${result.stderr}`.includes("Dynamic require")||!expectedOutput.test(`${result.stdout}${result.stderr}`))throw new Error("published bundle startup smoke test failed");};
smoke("dist/action/index.js",[],1,/YKP-RUNTIME-003/u);
smoke("dist/cli/index.js",[],2,/^$/u);
smoke("dist/apply/index.js",[],0,/^$/u);
smoke("dist/apply/action.js",[],1,/YKP-APPLY-001/u);
smoke("dist/apply/cli.js",[],2,/YKP-APPLY-001/u);
smoke("dist/mcp-effect-b/index.js",[],0,/^$/u);
