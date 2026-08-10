import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, symlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const forbidden=[
 "mintMcpEffectBPrivateInvocationForTest",
 "createMcpEffectBTestInvocation",
 "McpEffectBTestBundleInput",
 "mcpEffectBTerminalResultForTest",
 "projectsApprovalBridgeV2SigningInputForTest",
 "verifyProjectsApprovalBridgeV2ForTest",
 "mcpEffectBDigestForTest",
 "mcpEffectBProjectNonceDigestForTest",
 "mcpEffectBNonceComparisonDigestForTest",
 "mcpEffectBLeaseScopeDigestForTest",
 "mcpEffectBProfileDigestForTest",
 "projectsApprovalTrustFingerprintForTest"
] as const;

async function filesBelow(path:string):Promise<string[]>{
 const entries=await readdir(path,{withFileTypes:true});
 const nested=await Promise.all(entries.map(entry=>{
  const child=join(path,entry.name);
  return entry.isDirectory()?filesBelow(child):[child];
 }));
 return nested.flat().sort();
}

test("exposes no MCP Effect B handle authority from runtime or candidate bundles",async()=>{
 const packageRoot=await import(pathToFileURL(join(root,"dist/src/index.js")).href);
 const runtime=await import(pathToFileURL(join(root,"dist/src/mcp-effect-b-controlled-apply.js")).href);
 const candidate=await import(pathToFileURL(join(root,"dist/mcp-effect-b/index.js")).href);
 assert.deepEqual(Object.keys(packageRoot).filter(name=>/McpEffectB|PrivateSingleUse|PrivateAbort/u.test(name)),["runMcpEffectBControlledApplyV1"]);
 assert.deepEqual(Object.keys(runtime),["runMcpEffectBControlledApplyV1"]);
 assert.deepEqual(Object.keys(candidate),["runMcpEffectBControlledApplyV1"]);
 const forged=Object.fromEntries([
  "mcpVerifiedAdmissionHandle","projectsApprovalHandle","projectsTrustHandle","bridgeHandle",
  "bridgeTrustHandle","hostCapsuleHandle","readCredentialHandle","writeCredentialHandle","abortHandle"
 ].map(key=>[key,Object.freeze({})]));
 const result=await runtime.runMcpEffectBControlledApplyV1({
  schema:"yukh-projects-mcp-effect-b-invocation-v1",
  attempt:1,
  ...forged
 });
 assert.deepEqual(result,{
  schema:"yukh-projects-mcp-effect-b-result-v1",
  status:"rejected",
  effectBoundaryEntered:false,
  mutationRequestCount:0,
  code:"YKP-MCP-WRAPPER-001"
 });
});

test("packs only the closed root export and blocks every MCP Effect B subpath",async()=>{
 const temporary=join(root,".test-work",`package-${process.pid}`);
 try{
  await rm(temporary,{recursive:true,force:true});
  await mkdir(temporary,{recursive:true});
  const packed=spawnSync("npm",["pack","--json","--pack-destination",temporary],{cwd:root,encoding:"utf8"});
  assert.equal(packed.status,0,packed.stderr);
  const report=JSON.parse(packed.stdout) as [{filename:string;files:{path:string}[]}];
  assert.equal(report.length,1);
  const names=report[0]!.files.map(file=>file.path).sort();
  assert.equal(names.some(name=>name.startsWith("test/")||name.startsWith("src/")||name.startsWith("scripts/")||name.startsWith("dist/test/")),false);
  assert.equal(names.some(name=>name.endsWith(".map")),false);
  assert.equal(names.includes("dist/src/mcp-effect-b-controlled-apply.js"),true);
  assert.equal(names.includes("dist/src/mcp-effect-b-controlled-apply.d.ts"),true);

  const extract=join(temporary,"extract"),consumer=join(temporary,"consumer");
  await mkdir(extract);
  const untar=spawnSync("tar",["-xzf",join(temporary,report[0]!.filename),"-C",extract],{encoding:"utf8"});
  assert.equal(untar.status,0,untar.stderr);
  const packageRoot=join(extract,"package");
  const manifest=JSON.parse(await readFile(join(packageRoot,"package.json"),"utf8")) as {exports:Record<string,unknown>;files:string[]};
  assert.deepEqual(Object.keys(manifest.exports),["."]);
  assert.deepEqual(manifest.files,["dist/src/"]);

  const productionFiles=await filesBelow(packageRoot);
  for(const path of productionFiles.filter(path=>/\.(?:js|d\.ts|json|map)$/u.test(path))){
   const source=await readFile(path,"utf8");
   for(const token of forbidden)assert.equal(source.includes(token),false,`${token} leaked through ${path}`);
  }

  const packageTarget=join(consumer,"node_modules/@nomed/yukh-projects");
  await mkdir(dirname(packageTarget),{recursive:true});
  await symlink(packageRoot,packageTarget,"dir");
  for(const specifier of [
   "@nomed/yukh-projects/dist/src/mcp-effect-b-controlled-apply.js",
   "@nomed/yukh-projects/dist/src/mcp-effect-b-bundle.js",
   "@nomed/yukh-projects/dist/mcp-effect-b/index.js",
   "@nomed/yukh-projects/mcp-effect-b",
   "@nomed/yukh-projects/package.json"
  ]){
   const attempted=spawnSync(process.execPath,["--input-type=module","--eval",`import(${JSON.stringify(specifier)})`],{cwd:consumer,encoding:"utf8"});
   assert.notEqual(attempted.status,0,specifier);
   assert.match(attempted.stderr,/ERR_PACKAGE_PATH_NOT_EXPORTED/u,specifier);
  }
 }finally{
  await rm(temporary,{recursive:true,force:true});
 }
});
