import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const verify=(directory:string)=>spawnSync(process.execPath,["--input-type=module","-e","const m=await import('./scripts/release-candidate-lib.mjs');const {value}=await m.readReleaseManifest();await m.verifyReleaseAssetDirectory(value,process.argv[1]);",directory],{encoding:"utf8"});

test("assembles the exact committed 17-asset candidate offline",async()=>{
 const temporary=await mkdtemp(join(tmpdir(),"yukh-projects-release-assets-"));
 try{
  const result=spawnSync(process.execPath,["scripts/assemble-release-assets.mjs",temporary],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr);
  assert.equal(verify(temporary).status,0);
  const manifest=JSON.parse(await readFile("release/1.8.0/release-manifest.json","utf8"));
  assert.equal(manifest.assets.length,16);
  assert.equal(manifest.checksum.covers,16);
  assert.equal(manifest.publication,"disabled");
  assert.equal(manifest.source.implementationCommit,"a4f05f673bb0a03f66fc9864372cee7839ed78d1");
  assert.equal(manifest.source.implementationTree,"16969542925e35ebf669cc9e9e27ce758dfe5585");
 }finally{await rm(temporary,{recursive:true,force:true});}
});

test("rejects missing, extra, substituted, and symbolic-linked release assets",async()=>{
 const root=await mkdtemp(join(tmpdir(),"yukh-projects-release-assets-adversarial-")),valid=join(root,"valid");
 try{
  assert.equal(spawnSync(process.execPath,["scripts/assemble-release-assets.mjs",valid],{encoding:"utf8"}).status,0);
  const cases=["missing","extra","substituted","symlink"];
  for(const name of cases)await cp(valid,join(root,name),{recursive:true});
  const target="yukh-projects-action-1.8.0.yml";
  await unlink(join(root,"missing",target));
  await writeFile(join(root,"extra","unexpected.txt"),"unexpected\n");
  await writeFile(join(root,"substituted",target),"substituted\n");
  await unlink(join(root,"symlink",target));
  await symlink(join(valid,target),join(root,"symlink",target));
  for(const name of cases)assert.notEqual(verify(join(root,name)).status,0,name);
 }finally{await rm(root,{recursive:true,force:true});}
});

test("publication input verification refuses any publication-capable environment",()=>{
 const result=spawnSync(process.execPath,["scripts/verify-publish-input.mjs"],{encoding:"utf8",env:{...process.env,GITHUB_TOKEN:"synthetic-token"}});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/publication token is available/u);
});
