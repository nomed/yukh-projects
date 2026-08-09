import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const sha256=(value:string|Uint8Array)=>createHash("sha256").update(value).digest("hex");

async function fixture(){
 const manifestBytes=await readFile("release/1.8.0/release-manifest.json"),manifest=JSON.parse(manifestBytes.toString("utf8"));
 const reviewedHead="a".repeat(40),reviewedTree="b".repeat(40),releaseCommit="c".repeat(40),workflowBlobSha="d".repeat(40);
 const shared={issue:156,pullRequest:157,reviewedHead,reviewedTree,version:"1.8.0",tag:"v1.8.0",assetManifestSha256:sha256(manifestBytes),checksumIndexSha256:manifest.checksum.sha256,workflowPath:".github/workflows/publish-release.yml",workflowBlobSha};
 const normalBody=JSON.stringify({schema:"yukh-projects-release-review-v1",role:"normal",conclusion:"approved",...shared});
 const securityBody=JSON.stringify({schema:"yukh-projects-release-review-v1",role:"security",conclusion:"approved",...shared});
 const authorizationBody=JSON.stringify({schema:"yukh-projects-release-authorization-v1",issue:156,pullRequest:157,reviewedHead,reviewedTree,releaseCommit,releaseTree:reviewedTree,version:"1.8.0",tag:"v1.8.0",assetManifestSha256:shared.assetManifestSha256,checksumIndexSha256:shared.checksumIndexSha256,workflowPath:shared.workflowPath,workflowBlobSha,normalReview:{commentId:1001,bodySha256:sha256(normalBody)},securityReview:{commentId:1002,bodySha256:sha256(securityBody)},effects:["create-immutable-tag","create-github-release","upload-17-assets"],statement:"I authorize the Class C publication effects in this record exactly once for this reviewed release candidate; I do not authorize npm publication, tag movement, asset overwrite, retries, or partial-state continuation."});
 const comment=(id:number,body:string,created_at:string)=>({id,issue_url:"https://api.github.com/repos/nomed/yukh-projects/issues/156",user:{login:"example-release-owner"},author_association:"OWNER",created_at,updated_at:created_at,body});
 return{commentId:1003,eventSha:releaseCommit,eventRef:"refs/heads/main",repositoryOwner:"example-release-owner",ownerComment:comment(1003,authorizationBody,"2026-08-10T12:02:00Z"),normalComment:comment(1001,normalBody,"2026-08-10T12:00:00Z"),securityComment:comment(1002,securityBody,"2026-08-10T12:01:00Z"),pull:{number:157,merged:true,head:{sha:reviewedHead},base:{ref:"main"},merge_commit_sha:releaseCommit},reviewedTree,releaseTree:reviewedTree,mainSha:releaseCommit,manifestPath:resolve("release/1.8.0/release-manifest.json"),workflowBlobSha};
}

test("verifies an authenticated exact owner Class C authorization receipt",async()=>{
 const temporary=await mkdtemp(join(tmpdir(),"yukh-projects-release-authorization-"));
 try{
  const snapshot=await fixture(),fixturePath=join(temporary,"fixture.json");
  await writeFile(fixturePath,JSON.stringify(snapshot));
  const result=spawnSync(process.execPath,["scripts/verify-release-authorization.mjs","--fixture",fixturePath],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr);
  const receipt=JSON.parse(result.stdout);
  assert.equal(receipt.schema,"yukh-projects-release-authorization-receipt-v1");
  assert.equal(receipt.releaseCommit,snapshot.eventSha);
  assert.equal(receipt.releaseTree,snapshot.reviewedTree);
  assert.equal(receipt.assetManifestSha256,sha256(await readFile(snapshot.manifestPath)));
  assert.deepEqual(receipt.effects,["create-immutable-tag","create-github-release","upload-17-assets"]);
  assert.equal(receipt.publication,"authorized");
 }finally{await rm(temporary,{recursive:true,force:true});}
});

test("rejects authorization, review, head, tree, workflow, main, and edit substitution",async()=>{
 const temporary=await mkdtemp(join(tmpdir(),"yukh-projects-release-authorization-adversarial-"));
 try{
  const base=await fixture();
  const reject=async(name:string,mutate:(value:typeof base)=>void)=>{
   const value=JSON.parse(JSON.stringify(base)) as typeof base;
   mutate(value);
   const path=join(temporary,`${name}.json`);
   await writeFile(path,JSON.stringify(value));
   const result=spawnSync(process.execPath,["scripts/verify-release-authorization.mjs","--fixture",path],{encoding:"utf8"});
   assert.notEqual(result.status,0,name);
   assert.equal(result.stdout,"",name);
  };
  await reject("owner-substitution",value=>{value.ownerComment.user.login="example-attacker";});
  await reject("review-substitution",value=>{value.normalComment.id=value.securityComment.id;});
  await reject("wrong-head",value=>{value.pull.head.sha="e".repeat(40);});
  await reject("wrong-tree",value=>{value.reviewedTree="e".repeat(40);});
  await reject("wrong-workflow",value=>{value.workflowBlobSha="e".repeat(40);});
  await reject("wrong-main",value=>{value.mainSha="e".repeat(40);});
  await reject("edited-owner-record",value=>{value.ownerComment.updated_at="2026-08-10T12:03:00Z";});
 }finally{await rm(temporary,{recursive:true,force:true});}
});
