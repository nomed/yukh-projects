import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const sha256=(value:string|Uint8Array)=>createHash("sha256").update(value).digest("hex");

test("the reviewed publisher rejects tag and draft partial state before mutation",async()=>{
 const temporary=await mkdtemp(join(tmpdir(),"yukh-projects-publication-state-"));
 try{
  const input=join(temporary,"release-input"),assets=join(input,"assets");
  await mkdir(input);
  const assembled=spawnSync(process.execPath,["scripts/assemble-release-assets.mjs",assets],{encoding:"utf8"});
  assert.equal(assembled.status,0,assembled.stderr);
  await copyFile("release/1.8.0/release-manifest.json",join(input,"release-manifest.json"));
  const manifestBytes=await readFile("release/1.8.0/release-manifest.json"),manifest=JSON.parse(manifestBytes.toString("utf8"));
  const releaseCommit="c".repeat(40),releaseTree="b".repeat(40),workflowBlobSha="d".repeat(40),authorizationCommentId=1003;
  const effects=["create-immutable-tag","create-github-release","upload-17-assets"];
  const authorizationBody=JSON.stringify({releaseCommit,releaseTree,version:"1.8.0",tag:"v1.8.0",assetManifestSha256:sha256(manifestBytes),checksumIndexSha256:manifest.checksum.sha256,workflowBlobSha,effects});
  const receipt={schema:"yukh-projects-release-authorization-receipt-v1",authorizationCommentId,authorizationBodySha256:sha256(authorizationBody),releaseCommit,releaseTree,reviewedHead:"a".repeat(40),reviewedTree:releaseTree,version:"1.8.0",tag:"v1.8.0",assetManifestSha256:sha256(manifestBytes),checksumIndexSha256:manifest.checksum.sha256,workflowBlobSha,effects,publication:"authorized"};
  await writeFile(join(input,"authorization-receipt.json"),`${JSON.stringify(receipt)}\n`);
  const workflow=await readFile(".github/workflows/publish-release.yml","utf8"),section=workflow.slice(workflow.indexOf("- name: Publish authorized immutable release once"));
  const match=/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/u.exec(section);
  assert.ok(match?.[1]);
  const publisher=match[1].replace(/^ {10}/gmu,"");
  await writeFile(join(temporary,"publisher.mjs"),publisher);
  await writeFile(join(temporary,"mock.mjs"),`
globalThis.fetch=async(input,init={})=>{
 const url=new URL(String(input)),method=init.method??"GET";
 if(method!=="GET")throw new Error("mutation attempted during partial-state rejection");
 const json=(status,value)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json"}});
 if(url.pathname==="/repos/nomed/yukh-projects")return json(200,{owner:{login:"example-release-owner"}});
 if(url.pathname==="/repos/nomed/yukh-projects/issues/comments/1003")return json(200,{id:1003,issue_url:"https://api.github.com/repos/nomed/yukh-projects/issues/156",user:{login:"example-release-owner"},author_association:"OWNER",body:process.env.AUTHORIZATION_BODY,created_at:"2026-08-10T12:02:00Z",updated_at:"2026-08-10T12:02:00Z"});
 if(url.pathname==="/repos/nomed/yukh-projects/branches/main")return json(200,{commit:{sha:process.env.RELEASE_COMMIT}});
 if(url.pathname==="/repos/nomed/yukh-projects/git/commits/"+process.env.RELEASE_COMMIT)return json(200,{tree:{sha:process.env.RELEASE_TREE}});
 if(url.pathname==="/repos/nomed/yukh-projects/contents/.github/workflows/publish-release.yml")return json(200,{sha:process.env.WORKFLOW_BLOB_SHA});
 if(url.pathname==="/repos/nomed/yukh-projects/immutable-releases")return json(200,{enabled:true});
 if(url.pathname==="/repos/nomed/yukh-projects/releases")return json(200,process.env.PARTIAL_MODE==="draft"?[{tag_name:"v1.8.0",draft:true}]:[]);
 if(url.pathname==="/repos/nomed/yukh-projects/git/ref/tags/v1.8.0")return json(process.env.PARTIAL_MODE==="tag"?200:404,{});
 throw new Error("unexpected publication request");
};
`);
  const env={...process.env,GH_TOKEN:"synthetic-job-token",RELEASE_COMMIT:releaseCommit,RELEASE_TREE:releaseTree,RELEASE_VERSION:"1.8.0",RELEASE_TAG:"v1.8.0",WORKFLOW_BLOB_SHA:workflowBlobSha,AUTHORIZATION_COMMENT_ID:String(authorizationCommentId),AUTHORIZATION_BODY_SHA256:sha256(authorizationBody),ASSET_MANIFEST_SHA256:sha256(manifestBytes),CHECKSUM_INDEX_SHA256:manifest.checksum.sha256,AUTHORIZATION_BODY:authorizationBody};
  for(const mode of ["tag","draft"]){
   const result=spawnSync(process.execPath,["--import",join(temporary,"mock.mjs"),join(temporary,"publisher.mjs")],{cwd:temporary,encoding:"utf8",env:{...env,PARTIAL_MODE:mode}});
   assert.notEqual(result.status,0,mode);
   assert.match(result.stderr,/release rerun or partial state detected/u,mode);
   assert.doesNotMatch(result.stderr,/mutation attempted/u,mode);
  }
 }finally{await rm(temporary,{recursive:true,force:true});}
});
