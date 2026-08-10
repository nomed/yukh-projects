import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const runner=join(root,"scripts/run-mcp-effect-b-conformance.mjs");
const schema="yukh-projects-mcp-effect-b-conformance-result-v1";
const expectedCases=[
 "effect-observed",
 "denial-zero-call",
 "trust-mismatch",
 "nonce-substitution",
 "lease-substitution",
 "completion-unknown-no-retry",
 "independent-verification",
 "cleanup"
];

function run(args:string[],input?:string,env:Record<string,string>={}){
 return spawnSync(process.execPath,[runner,...args],{
  cwd:root,
  encoding:"utf8",
  env,
  input,
  timeout:120_000,
  maxBuffer:16*1024
 });
}

function parsed(result:ReturnType<typeof run>):Record<string,unknown>{
 assert.equal(result.signal,null);
 assert.equal(result.stderr,"");
 assert.ok(Buffer.byteLength(result.stdout,"utf8")<=4096);
 assert.equal(result.stdout.trim().split("\n").length,1);
 return JSON.parse(result.stdout) as Record<string,unknown>;
}

test("runs the fixed hermetic corpus as an external process with bounded redacted JSON",()=>{
 const result=run(["--corpus=core-v1"],undefined,{
  GITHUB_TOKEN:"synthetic-ignored-environment-value",
  YUKH_ENDPOINT:"https://endpoint-selection.invalid"
 });
 assert.equal(result.status,0,result.stderr);
 const output=parsed(result);
 assert.deepEqual(output,{
  schema,
  corpus:"core-v1",
  status:"passed",
  cases:expectedCases.map(id=>({id,status:"passed"}))
 });
 assert.doesNotMatch(result.stdout,/synthetic-effect-b|credential|private handle|endpoint-selection|https?:|node:/iu);
});

test("accepts only the closed versioned JSON request",()=>{
 const accepted=run([],JSON.stringify({
  schema:"yukh-projects-mcp-effect-b-conformance-request-v1",
  corpus:"core-v1"
 }));
 assert.equal(accepted.status,0);
 assert.equal(parsed(accepted).status,"passed");

 const invalid=[
  ["--corpus=mint-handles"],
  ["--endpoint=https://example.invalid"],
  ["--credential=synthetic"],
  ["--module=node:fs"],
  ["--corpus=core-v1","--module=node:fs"]
 ];
 for(const args of invalid){
  const rejected=run(args);
  assert.equal(rejected.status,2,args.join(" "));
  assert.deepEqual(parsed(rejected),{schema,status:"rejected",code:"YKP-CONFORMANCE-REQUEST-001"});
 }
 for(const extra of [
  {handles:true},
  {endpoint:"https://example.invalid"},
  {credential:"synthetic"},
  {module:"node:fs"}
 ]){
  const rejected=run([],JSON.stringify({
   schema:"yukh-projects-mcp-effect-b-conformance-request-v1",
   corpus:"core-v1",
   ...extra
  }));
  assert.equal(rejected.status,2);
  assert.deepEqual(parsed(rejected),{schema,status:"rejected",code:"YKP-CONFORMANCE-REQUEST-001"});
 }
 const oversized=run([],"x".repeat(513));
 assert.equal(oversized.status,2);
 assert.deepEqual(parsed(oversized),{schema,status:"rejected",code:"YKP-CONFORMANCE-REQUEST-001"});
});

test("keeps the production export surface closed in an independent process",()=>{
 const source=[
  `const root=await import(${JSON.stringify(new URL("../src/index.js",import.meta.url).href)});`,
  `const runtime=await import(${JSON.stringify(new URL("../src/mcp-effect-b-controlled-apply.js",import.meta.url).href)});`,
  `const bundle=await import(${JSON.stringify(new URL("../mcp-effect-b/index.js",import.meta.url).href)});`,
  "process.stdout.write(JSON.stringify({root:Object.keys(root).filter(name=>/McpEffectB|PrivateSingleUse|PrivateAbort/u.test(name)),runtime:Object.keys(runtime),bundle:Object.keys(bundle)}));"
 ].join("");
 const checked=spawnSync(process.execPath,["--input-type=module","--eval",source],{
  cwd:join(root,"dist"),
  encoding:"utf8",
  env:{},
  timeout:10_000,
  maxBuffer:4096
 });
 assert.equal(checked.status,0,checked.stderr);
 assert.equal(checked.stderr,"");
 assert.deepEqual(JSON.parse(checked.stdout),{
  root:["runMcpEffectBControlledApplyV1"],
  runtime:["runMcpEffectBControlledApplyV1"],
  bundle:["runMcpEffectBControlledApplyV1"]
 });
});
