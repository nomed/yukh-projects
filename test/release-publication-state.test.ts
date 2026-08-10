import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const sha256=(value:string|Uint8Array)=>createHash("sha256").update(value).digest("hex");
type Operation={host:string;method:string;path:string;body?:Record<string,unknown>};

test("the reviewed publisher atomically reserves and preserves the authorized tag",async t=>{
 const temporary=await mkdtemp(join(process.cwd(),"dist","test",".publication-state-test-"));
 try{
  const input=join(temporary,"release-input"),assets=join(input,"assets");
  await mkdir(input);
  const assembled=spawnSync(process.execPath,["scripts/assemble-release-assets.mjs",assets],{encoding:"utf8"});
  assert.equal(assembled.status,0,assembled.stderr);
  await copyFile("release/1.8.0/release-manifest.json",join(input,"release-manifest.json"));
  const manifestBytes=await readFile("release/1.8.0/release-manifest.json"),manifest=JSON.parse(manifestBytes.toString("utf8"));
  const releaseCommit="c".repeat(40),releaseTree="b".repeat(40),workflowBlobSha="d".repeat(40),authorizationCommentId=1003;
  const effects=["attest-17-assets","create-immutable-tag","create-github-release","upload-17-assets"];
  const authorizationBody=JSON.stringify({releaseCommit,releaseTree,version:"1.8.0",tag:"v1.8.0",assetManifestSha256:sha256(manifestBytes),checksumIndexSha256:manifest.checksum.sha256,workflowBlobSha,effects});
  const receipt={schema:"yukh-projects-release-authorization-receipt-v1",authorizationCommentId,authorizationBodySha256:sha256(authorizationBody),releaseCommit,releaseTree,reviewedHead:"a".repeat(40),reviewedTree:releaseTree,version:"1.8.0",tag:"v1.8.0",assetManifestSha256:sha256(manifestBytes),checksumIndexSha256:manifest.checksum.sha256,workflowBlobSha,effects,publication:"authorized"};
  await writeFile(join(input,"authorization-receipt.json"),`${JSON.stringify(receipt)}\n`);
  const workflow=await readFile(".github/workflows/publish-release.yml","utf8"),section=workflow.slice(workflow.indexOf("- name: Publish authorized immutable release once"));
  const match=/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/u.exec(section);
  assert.ok(match?.[1]);
  await writeFile(join(temporary,"publisher.mjs"),match[1].replace(/^ {10}/gmu,""));
  await writeFile(join(temporary,"mock.mjs"),`
import {appendFileSync,readFileSync} from "node:fs";
const repository="/repos/nomed/yukh-projects",tagPath=repository+"/git/ref/tags/v1.8.0",tagRef="refs/tags/v1.8.0";
const manifest=JSON.parse(readFileSync("release-input/release-manifest.json","utf8"));
const expected=[...manifest.assets,manifest.checksum].sort((a,b)=>a.name.localeCompare(b.name));
const byName=new Map(expected.map(value=>[value.name,value]));
const uploads=new Map();
let tagReads=0,reserved=false,draft=false,published=false;
const correctTag=()=>({ref:tagRef,object:{type:"commit",sha:process.env.RELEASE_COMMIT}});
const wrongTag=()=>({ref:tagRef,object:{type:"commit",sha:"e".repeat(40)}});
const json=(status,value)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json"}});
globalThis.fetch=async(input,init={})=>{
 const url=new URL(String(input)),method=init.method??"GET";
 let body;
 if(typeof init.body==="string"){try{body=JSON.parse(init.body);}catch{body={raw:init.body};}}
 appendFileSync(process.env.REQUEST_LOG,JSON.stringify({host:url.host,method,path:url.pathname,body})+"\\n");
 if(url.host==="uploads.github.com"){
  if(method!=="POST"||!draft)throw new Error("unexpected upload request");
  const name=url.searchParams.get("name"),asset=byName.get(name);
  if(!asset)throw new Error("unexpected asset upload");
  const value={name,size:asset.bytes,digest:"sha256:"+asset.sha256};
  uploads.set(name,value);
  if(process.env.MODE==="digest-mismatch"&&uploads.size===1)value.digest="sha256:"+"0".repeat(64);
  return json(201,value);
 }
 if(url.host!=="api.github.com")throw new Error("unexpected publication host");
 if(url.pathname===repository&&method==="GET")return json(200,{owner:{login:"example-release-owner"}});
 if(url.pathname===repository+"/issues/comments/1003"&&method==="GET")return json(200,{id:1003,issue_url:"https://api.github.com/repos/nomed/yukh-projects/issues/156",user:{login:"example-release-owner"},author_association:"OWNER",body:process.env.AUTHORIZATION_BODY,created_at:"2026-08-10T12:02:00Z",updated_at:"2026-08-10T12:02:00Z"});
 if(url.pathname===repository+"/branches/main"&&method==="GET")return json(200,{commit:{sha:process.env.RELEASE_COMMIT}});
 if(url.pathname===repository+"/git/commits/"+process.env.RELEASE_COMMIT&&method==="GET")return json(200,{sha:process.env.RELEASE_COMMIT,tree:{sha:process.env.RELEASE_TREE}});
 if(url.pathname===repository+"/contents/.github/workflows/publish-release.yml"&&method==="GET")return json(200,{sha:process.env.WORKFLOW_BLOB_SHA});
 if(url.pathname===repository+"/immutable-releases"&&method==="GET")return json(200,{enabled:true});
 if(url.pathname===repository+"/releases"&&method==="GET"){
  if(process.env.MODE==="rerun")return json(200,[{tag_name:"v1.8.0",draft:false}]);
  if(process.env.MODE==="partial-release")return json(200,[{tag_name:"v1.8.0",draft:true}]);
  return json(200,[]);
 }
 if(url.pathname===tagPath&&method==="GET"){
  tagReads++;
  if(tagReads===1){
   if(process.env.MODE==="preexisting-correct")return json(200,correctTag());
   if(process.env.MODE==="preexisting-wrong")return json(200,wrongTag());
   return json(404,{message:"Not Found"});
  }
  if(!reserved)throw new Error("tag read before reservation");
  if(process.env.MODE==="substituted-target"&&tagReads===2)return json(200,wrongTag());
  if(process.env.MODE==="moved-after-upload"&&uploads.size===expected.length&&!published)return json(200,wrongTag());
  return json(200,correctTag());
 }
 if(url.pathname===repository+"/git/refs"&&method==="POST"){
  if(process.env.MODE==="creation-race")return json(422,{message:"Reference already exists"});
  if(body?.ref!==tagRef||body?.sha!==process.env.RELEASE_COMMIT)return json(422,{message:"Invalid reference"});
  reserved=true;
  return json(201,correctTag());
 }
 if(url.pathname===repository+"/releases"&&method==="POST"){
  if(!reserved||body?.tag_name!=="v1.8.0"||body?.target_commitish!==process.env.RELEASE_COMMIT||body?.draft!==true)throw new Error("release created without exact reserved tag");
  draft=true;
  return json(201,{id:7003,tag_name:"v1.8.0",draft:true});
 }
 if(url.pathname===repository+"/releases/7003/assets"&&method==="GET")return json(200,[...uploads.values()]);
 if(url.pathname===repository+"/releases/7003"&&method==="PATCH"){
  if(!draft||uploads.size!==expected.length||body?.draft!==false)throw new Error("release published before complete upload");
  published=true;
  return json(200,{id:7003,tag_name:"v1.8.0",draft:false});
 }
 if(url.pathname===repository+"/releases/7003"&&method==="GET")return json(200,{id:7003,tag_name:"v1.8.0",draft:!published,immutable:published});
 throw new Error("unexpected publication request "+method+" "+url.pathname);
};
`);
  const baseEnv={...process.env,GH_TOKEN:"synthetic-job-token",RELEASE_COMMIT:releaseCommit,RELEASE_TREE:releaseTree,RELEASE_VERSION:"1.8.0",RELEASE_TAG:"v1.8.0",WORKFLOW_BLOB_SHA:workflowBlobSha,AUTHORIZATION_COMMENT_ID:String(authorizationCommentId),AUTHORIZATION_BODY_SHA256:sha256(authorizationBody),ASSET_MANIFEST_SHA256:sha256(manifestBytes),CHECKSUM_INDEX_SHA256:manifest.checksum.sha256,AUTHORIZATION_BODY:authorizationBody};
  const run=async(mode:string)=>{
   const log=join(temporary,`requests-${mode}.jsonl`);
   await writeFile(log,"");
   const result=spawnSync(process.execPath,["--import",join(temporary,"mock.mjs"),join(temporary,"publisher.mjs")],{cwd:temporary,encoding:"utf8",env:{...baseEnv,MODE:mode,REQUEST_LOG:log}});
   const text=await readFile(log,"utf8");
   return{result,operations:text.trim()?text.trim().split("\n").map(line=>JSON.parse(line) as Operation):[]};
  };
  const writes=(operations:Operation[])=>operations.filter(value=>value.method!=="GET");
  const releaseCreates=(operations:Operation[])=>operations.filter(value=>value.host==="api.github.com"&&value.path==="/repos/nomed/yukh-projects/releases"&&value.method==="POST");

  await t.test("an absent tag is reserved at the exact commit before the draft and succeeds",async()=>{
   const {result,operations}=await run("success");
   assert.equal(result.status,0,result.stderr);
   const reservation=operations.findIndex(value=>value.path==="/repos/nomed/yukh-projects/git/refs"&&value.method==="POST");
   const release=operations.findIndex(value=>value.path==="/repos/nomed/yukh-projects/releases"&&value.method==="POST");
   assert.ok(reservation>=0&&release>reservation);
   assert.deepEqual(operations[reservation]?.body,{ref:"refs/tags/v1.8.0",sha:releaseCommit});
   assert.deepEqual(operations[release]?.body?.tag_name,"v1.8.0");
   assert.deepEqual(operations[release]?.body?.target_commitish,releaseCommit);
   assert.equal(operations.filter(value=>value.host==="uploads.github.com"&&value.method==="POST").length,17);
   assert.equal(operations.filter(value=>value.path==="/repos/nomed/yukh-projects/releases/7003"&&value.method==="PATCH").length,1);
   assert.equal(operations.filter(value=>value.path.includes("/git/ref")&&["PATCH","DELETE"].includes(value.method)).length,0);
   assert.equal(operations.filter(value=>value.path==="/repos/nomed/yukh-projects/git/refs"&&value.method==="POST").length,1);
  });

  for(const [mode,title] of [["preexisting-correct","a preexisting correct tag is terminal"],["preexisting-wrong","a preexisting wrong tag is terminal"]] as const){
   await t.test(title,async()=>{
    const {result,operations}=await run(mode);
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/release rerun or partial state detected/u);
    assert.equal(writes(operations).length,0);
   });
  }

  await t.test("a competing atomic creation race is terminal and never creates a draft",async()=>{
   const {result,operations}=await run("creation-race");
   assert.notEqual(result.status,0);
   assert.match(result.stderr,/status 422/u);
   assert.equal(operations.filter(value=>value.path==="/repos/nomed/yukh-projects/git/refs"&&value.method==="POST").length,1);
   assert.equal(releaseCreates(operations).length,0);
  });

  await t.test("a substituted post-creation target is detected before draft creation",async()=>{
   const {result,operations}=await run("substituted-target");
   assert.notEqual(result.status,0);
   assert.match(result.stderr,/reserved tag binding mismatch/u);
   assert.equal(releaseCreates(operations).length,0);
  });

  for(const mode of ["rerun","partial-release"]){
   await t.test(`${mode} state is rejected without mutation`,async()=>{
    const {result,operations}=await run(mode);
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/release rerun or partial state detected/u);
    assert.equal(writes(operations).length,0);
   });
  }

  await t.test("provider digest mismatch leaves terminal partial state without publish",async()=>{
   const {result,operations}=await run("digest-mismatch");
   assert.notEqual(result.status,0);
   assert.match(result.stderr,/release asset upload receipt mismatch/u);
   assert.equal(releaseCreates(operations).length,1);
   assert.equal(operations.filter(value=>value.host==="uploads.github.com"&&value.method==="POST").length,1);
   assert.equal(operations.filter(value=>value.method==="PATCH").length,0);
  });

  await t.test("tag movement after upload is detected before publication",async()=>{
   const {result,operations}=await run("moved-after-upload");
   assert.notEqual(result.status,0);
   assert.match(result.stderr,/uploaded tag binding mismatch/u);
   assert.equal(operations.filter(value=>value.host==="uploads.github.com"&&value.method==="POST").length,17);
   assert.equal(operations.filter(value=>value.method==="PATCH").length,0);
  });
 }finally{await rm(temporary,{recursive:true,force:true});}
});
