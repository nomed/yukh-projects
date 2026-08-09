import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const [version,implementationCommit,packagePath="release-package.tgz"]=process.argv.slice(2);
const COMMIT=/^[0-9a-f]{40}$/u;
const DIGEST=/^[0-9a-f]{64}$/u;
if(!/^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u.test(version??"")||!COMMIT.test(implementationCommit??""))throw new Error("release provenance arguments are invalid");
const git=(...args)=>{const result=spawnSync("git",args,{encoding:"utf8",maxBuffer:1024*1024});if(result.error||result.signal||result.status!==0)throw new Error("release provenance git binding failed");return result.stdout.trim();};
const bytes=async path=>{const value=await readFile(path);return{path,sha256:createHash("sha256").update(value).digest("hex"),bytes:value.byteLength};};
const head=git("rev-parse","HEAD"),candidateTree=git("rev-parse","HEAD^{tree}");
if(git("merge-base","--is-ancestor",implementationCommit,head)!=="")throw new Error("release implementation is not an ancestor");
const implementationTree=git("rev-parse",`${implementationCommit}^{tree}`);
const implementationPathCommit=git("log","-1","--format=%H",head,"--","dist/mcp-effect-b/index.js");
if(implementationPathCommit!==implementationCommit)throw new Error("release implementation source mismatch");
const acceptedContractCommit=git("log","-1","--format=%H",head,"--","docs/contracts/mcp-compound-approval-wrapper-v1.md");
const producerCommit=git("rev-parse","v1.7.0^{commit}");
const producerManifest=JSON.parse(git("show","v1.7.0:dist/apply/manifest.json"));
const packageDocument=JSON.parse(await readFile("package.json","utf8"));
const lockDocument=JSON.parse(await readFile("package-lock.json","utf8"));
const mcpManifest=JSON.parse(await readFile("dist/mcp-effect-b/manifest.json","utf8"));
if(packageDocument.name!=="@nomed/yukh-projects"||packageDocument.version!==version||packageDocument.private!==true||Object.keys(packageDocument.exports??{}).join("\0")!=="."||JSON.stringify(packageDocument.files)!==JSON.stringify(["dist/src/"])||lockDocument.version!==version||lockDocument.packages?.[""]?.version!==version)throw new Error("release package metadata mismatch");
if(mcpManifest.publication!=="disabled"||mcpManifest.entrypoint!=="mcp-effect-b-controlled-apply-v1"||mcpManifest.bridgeSchema!=="yukh-projects-approval-bridge-v2"||mcpManifest.profile!=="yukh-mcp/suite-preview-effect-b-add-dependency-v1"||mcpManifest.capability!=="projects.add-dependency.v1"||mcpManifest.operation!=="add_dependency(201 blocks 202)")throw new Error("release MCP manifest mismatch");
const artifacts=await Promise.all(["dist/mcp-effect-b/index.js","dist/mcp-effect-b/manifest.json","test/fixtures/mcp-effect-b-bridge-v2-vector.json",packagePath].map(bytes));
for(const item of artifacts)if(!DIGEST.test(item.sha256)||item.bytes<1)throw new Error("release provenance artifact mismatch");
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
  applyArtifactSha256:producerManifest.artifacts?.["index.js"]?.sha256,
  entrypointVersion:"apply-entrypoint-v1"
 },
 artifacts:artifacts.map(item=>({...item,path:item.path===packagePath?"release-package.tgz":item.path})).sort((a,b)=>a.path.localeCompare(b.path)),
 build:{
  node:"24",
  lockfileVersion:3,
  typescript:packageDocument.devDependencies?.typescript,
  esbuild:packageDocument.devDependencies?.esbuild,
  commands:["npm ci","npm test","npm run verify:bundles","npm audit --audit-level=moderate","npm sbom --sbom-format spdx","npm pack --ignore-scripts"]
 },
 qualification:{providerCalls:0,expectedCostEur:0,fixtures:"synthetic"},
 activation:{status:"not-authorized",requiredBindings:"separately-governed"},
 publication:"disabled"
};
if(!COMMIT.test(provenance.source.acceptedContractCommit)||producerCommit!=="71784218366805922e5a12903eef9073f715f59f"||!DIGEST.test(provenance.projectsProducerRelease.applyArtifactSha256??""))throw new Error("release provenance authority mismatch");
process.stdout.write(`${JSON.stringify(provenance)}\n`);
