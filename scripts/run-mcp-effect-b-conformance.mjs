import { spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMcpEffectBTestBundle } from "./build-mcp-effect-b-test-bundle.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const requestSchema="yukh-projects-mcp-effect-b-conformance-request-v1";
const resultSchema="yukh-projects-mcp-effect-b-conformance-result-v1";
const corpus="core-v1";
const caseIds=[
 "effect-observed",
 "denial-zero-call",
 "trust-mismatch",
 "nonce-substitution",
 "lease-substitution",
 "completion-unknown-no-retry",
 "independent-verification",
 "cleanup"
];

function emit(value,code){
 const output=`${JSON.stringify(value)}\n`;
 if(Buffer.byteLength(output,"utf8")>4096){
  process.stdout.write(`${JSON.stringify({schema:resultSchema,status:"error",code:"YKP-CONFORMANCE-RUNNER-002"})}\n`);
  process.exitCode=1;
  return;
 }
 process.stdout.write(output);
 process.exitCode=code;
}

function rejectRequest(){
 emit({schema:resultSchema,status:"rejected",code:"YKP-CONFORMANCE-REQUEST-001"},2);
}

function exactRequest(value){
 return typeof value==="object"&&value!==null&&!Array.isArray(value)&&
  Object.keys(value).length===2&&Object.hasOwn(value,"schema")&&Object.hasOwn(value,"corpus")&&
  value.schema===requestSchema&&value.corpus===corpus;
}

async function readBoundedStdin(){
 const chunks=[];
 let bytes=0;
 for await(const chunk of process.stdin){
  bytes+=chunk.length;
  if(bytes>512){
   process.stdin.destroy();
   return null;
  }
  chunks.push(chunk);
 }
 return Buffer.concat(chunks).toString("utf8");
}

async function request(){
 if(process.argv.length===3){
  return process.argv[2]===`--corpus=${corpus}`?{schema:requestSchema,corpus}:null;
 }
 if(process.argv.length!==2)return null;
 const source=await readBoundedStdin();
 if(source===null)return null;
 let value;
 try{value=JSON.parse(source);}catch{return null;}
 return exactRequest(value)?value:null;
}

let selected;
try{selected=await request();}catch{selected=null;}
if(!selected){
 rejectRequest();
}else{
 const work=join(root,".test-work",`mcp-effect-b-conformance-${process.pid}`);
 try{
  await rm(work,{recursive:true,force:true});
  await mkdir(work,{recursive:true});
  const bundle=join(work,"mcp-effect-b-conformance.test.mjs");
  await buildMcpEffectBTestBundle("test/mcp-effect-b-controlled-apply.test.ts",bundle);
  const child=spawnSync(process.execPath,[
   "--test",
   "--test-reporter=tap",
   "--test-name-pattern",String.raw`^\[conformance:`,
   bundle
  ],{
   cwd:root,
   encoding:"utf8",
   env:{},
   timeout:120_000,
   maxBuffer:128*1024
  });
  const seen=new Map();
  const tap=typeof child.stdout==="string"?child.stdout:"";
  const line=/^\s*(not )?ok \d+ - \[conformance:([a-z0-9-]+)\](?: .*)?$/gmu;
  for(const match of tap.matchAll(line)){
   if(caseIds.includes(match[2])&&!seen.has(match[2]))seen.set(match[2],match[1]?"failed":"passed");
  }
  const bundledPass=!child.error&&!child.signal&&child.status===0&&seen.size===0&&/^# pass 1$/mu.test(tap);
  const cases=caseIds.map(id=>({id,status:bundledPass||seen.get(id)==="passed"?"passed":"failed"}));
  const passed=!child.error&&!child.signal&&child.status===0&&cases.every(item=>item.status==="passed");
  emit({schema:resultSchema,corpus,status:passed?"passed":"failed",cases},passed?0:1);
 }catch{
  emit({schema:resultSchema,status:"error",code:"YKP-CONFORMANCE-RUNNER-001"},1);
 }finally{
  await rm(work,{recursive:true,force:true});
 }
}
