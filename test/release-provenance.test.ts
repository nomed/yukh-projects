import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("builds a root-only package and deterministic disabled provenance",async()=>{
 const temporary=await mkdtemp(join(tmpdir(),"yukh-projects-release-provenance-"));
 try{
  const packagePath=join(temporary,"release-package.tgz");
  const packed=spawnSync(process.execPath,["scripts/create-release-package.mjs","1.8.0",packagePath],{encoding:"utf8"});
  assert.equal(packed.status,0,packed.stderr);
  const generated=spawnSync(process.execPath,["scripts/release-provenance.mjs","1.8.0","a4f05f673bb0a03f66fc9864372cee7839ed78d1",packagePath],{encoding:"utf8"});
  assert.equal(generated.status,0,generated.stderr);
  const provenance=JSON.parse(generated.stdout);
  assert.equal(provenance.schema,"yukh-projects-mcp-effect-b-provenance-v1");
  assert.equal(provenance.publication,"disabled");
  assert.equal(provenance.activation.status,"not-authorized");
  assert.equal(provenance.source.implementationCommit,"a4f05f673bb0a03f66fc9864372cee7839ed78d1");
  assert.equal(provenance.source.implementationTree,"16969542925e35ebf669cc9e9e27ce758dfe5585");
  assert.deepEqual(provenance.package.exports,["."]);
  assert.equal(provenance.projectsProducerRelease.sourceCommit,"71784218366805922e5a12903eef9073f715f59f");
  assert.equal(provenance.wrapper.entrypoint,"mcp-effect-b-controlled-apply-v1");
  const packageBytes=await readFile(packagePath);
  assert.deepEqual(packageBytes,await readFile("release/1.8.0/package.tgz"));
  const packageArtifact=provenance.artifacts.find((item:{path:string})=>item.path==="release-package.tgz");
  assert.equal(packageArtifact.bytes,packageBytes.byteLength);
  assert.equal(packageArtifact.sha256,createHash("sha256").update(packageBytes).digest("hex"));
  assert.equal(generated.stdout,await readFile("release/1.8.0/provenance.json","utf8"));
 }finally{
  await rm(temporary,{recursive:true,force:true});
 }
});

test("normalizes the SPDX SBOM to the exact implementation source",async()=>{
 const first=spawnSync(process.execPath,["scripts/create-release-sbom.mjs","1.8.0","a4f05f673bb0a03f66fc9864372cee7839ed78d1"],{encoding:"utf8"});
 const second=spawnSync(process.execPath,["scripts/create-release-sbom.mjs","1.8.0","a4f05f673bb0a03f66fc9864372cee7839ed78d1"],{encoding:"utf8"});
 assert.equal(first.status,0,first.stderr);
 assert.equal(second.status,0,second.stderr);
 assert.equal(first.stdout,second.stdout);
 assert.equal(first.stdout,await readFile("release/1.8.0/spdx.json","utf8"));
 const document=JSON.parse(first.stdout);
 assert.equal(document.spdxVersion,"SPDX-2.3");
 assert.equal(document.documentNamespace,"https://github.com/nomed/yukh-projects/releases/tag/v1.8.0#spdx-a4f05f673bb0a03f66fc9864372cee7839ed78d1");
 assert.deepEqual(document.creationInfo.creators,["Tool: npm/cli","Tool: yukh-projects/create-release-sbom-v1"]);
});
