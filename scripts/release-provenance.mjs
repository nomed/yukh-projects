import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const [version,implementationCommit,packagePath="release-package.tgz"]=process.argv.slice(2);
const COMMIT=/^[0-9a-f]{40}$/u;
const DIGEST=/^[0-9a-f]{64}$/u;
if(!/^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u.test(version??"")||!COMMIT.test(implementationCommit??""))throw new Error("release provenance arguments are invalid");
const git=(...args)=>{const result=spawnSync("git",args,{encoding:"utf8",maxBuffer:1024*1024});if(result.error||result.signal||result.status!==0)throw new Error("release provenance git binding failed");return result.stdout.trim();};
const bytes=async path=>{const value=await readFile(path);return{path,sha256:createHash("sha256").update(value).digest("hex"),bytes:value.byteLength};};
const candidateTree=git("rev-parse","HEAD^{tree}");
if(implementationCommit!=="a4f05f673bb0a03f66fc9864372cee7839ed78d1")throw new Error("release implementation source mismatch");
const implementationTree="16969542925e35ebf669cc9e9e27ce758dfe5585";
const acceptedContractCommit="521be0d0ef1297579e84a6322dea29f80c2549dc";
const producerCommit="71784218366805922e5a12903eef9073f715f59f";
const packageDocument=JSON.parse(await readFile("package.json","utf8"));
const lockDocument=JSON.parse(await readFile("package-lock.json","utf8"));
const mcpManifest=JSON.parse(await readFile("dist/mcp-effect-b/manifest.json","utf8"));
if(packageDocument.name!=="@nomed/yukh-projects"||packageDocument.version!==version||packageDocument.private!==true||Object.keys(packageDocument.exports??{}).join("\0")!=="."||JSON.stringify(packageDocument.files)!==JSON.stringify(["dist/src/"])||lockDocument.version!==version||lockDocument.packages?.[""]?.version!==version)throw new Error("release package metadata mismatch");
if(mcpManifest.publication!=="disabled"||mcpManifest.entrypoint!=="mcp-effect-b-controlled-apply-v1"||mcpManifest.bridgeSchema!=="yukh-projects-approval-bridge-v2"||mcpManifest.profile!=="yukh-mcp/suite-preview-effect-b-add-dependency-v1"||mcpManifest.capability!=="projects.add-dependency.v1"||mcpManifest.operation!=="add_dependency(201 blocks 202)")throw new Error("release MCP manifest mismatch");
const artifacts=await Promise.all(["dist/mcp-effect-b/index.js","dist/mcp-effect-b/manifest.json","test/fixtures/mcp-effect-b-bridge-v2-vector.json",packagePath].map(bytes));
for(const item of artifacts)if(!DIGEST.test(item.sha256)||item.bytes<1)throw new Error("release provenance artifact mismatch");
const exactArtifacts=new Map([
 ["dist/mcp-effect-b/index.js",["0af1e26b6ebe96657dc0d92de2ec7c5bfa3755a9078703b170b0b4dd8e16fdb0",453469]],
 ["dist/mcp-effect-b/manifest.json",["b8dbd22d884906ece3595cfbc8e75854ae6cf2cdbc9b3873413108be411ecae2",571]],
 ["test/fixtures/mcp-effect-b-bridge-v2-vector.json",["a4ed0f0fb58a25c02c68f0d22583604348fe78c615fd7478f899d2d0313bb4c9",3533]]
]);
for(const item of artifacts){const exact=exactArtifacts.get(item.path);if(exact&&(item.sha256!==exact[0]||item.bytes!==exact[1]))throw new Error("release implementation artifact mismatch");}
const provenance={
 schema:"yukh-projects-mcp-effect-b-provenance-v1",
 version,
 tag:`v${version}`,
 source:{
  implementationCommit,
  implementationTree,
  candidateTree,
  acceptedContractCommit,
  acceptedRfc0007Commit:"bb8628edf7a07c2af56f07e4f9140f58c851ef47"
 },
 package:{
  name:packageDocument.name,
  private:true,
  exports:["."],
  files:["dist/src/"],
  lockfileSha256:createHash("sha256").update(await readFile("package-lock.json")).digest("hex")
 },
 wrapper:{
  entrypoint:mcpManifest.entrypoint,
  bridgeSchema:mcpManifest.bridgeSchema,
  profile:mcpManifest.profile,
  capability:mcpManifest.capability,
  operation:mcpManifest.operation
 },
 projectsProducerRelease:{
  sourceCommit:producerCommit,
  applyArtifactSha256:"e37a6d50f0cc862b4f8c68ec5b9be2386184a69c6800fcbb98cc132e46ffa9a2",
  entrypointVersion:"apply-entrypoint-v1"
 },
 artifacts:artifacts.map(item=>({...item,path:item.path===packagePath?"release-package.tgz":item.path})).sort((a,b)=>a.path.localeCompare(b.path)),
 build:{
  node:"24",
  lockfileVersion:3,
  typescript:packageDocument.devDependencies?.typescript,
  esbuild:packageDocument.devDependencies?.esbuild,
  commands:["npm ci","npm test","npm run verify:bundles","npm audit --audit-level=moderate","node scripts/create-release-sbom.mjs","npm pack --ignore-scripts"]
 },
 qualification:{providerCalls:0,expectedCostEur:0,fixtures:"synthetic"},
 activation:{status:"not-authorized",requiredBindings:"separately-governed"},
 publication:"disabled"
};
if(!COMMIT.test(provenance.source.acceptedContractCommit)||!DIGEST.test(provenance.projectsProducerRelease.applyArtifactSha256))throw new Error("release provenance authority mismatch");
process.stdout.write(`${JSON.stringify(provenance)}\n`);
