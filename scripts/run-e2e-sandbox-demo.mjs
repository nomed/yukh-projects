import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { installGlobalFetchSentinel } from "./e2e-network-sentinel.mjs";

const resultSchema="yukh-projects-e2e-sandbox-demo-result-v1";
const networkSentinel=installGlobalFetchSentinel();
const now=1_800_000_000_000;
const requestedScope={ownerLogin:"example-labs",repositoryName:"atlas",projectNumber:7,issueNumber:42};
const policySource=`schema: 1
fields:
  work_type:
    name: Work Type
    kind: single_select
    mode: managed
    options:
      backlog: Backlog
      task: Task
  area:
    name: Area
    kind: single_select
    mode: managed
    options:
      core: Core
`;
const issueBody=`<!-- yukh:issue:v1
schema: 1
work_type: task
area: core
-->`;
const end={hasNextPage:false,endCursor:null};
const state={workType:"Backlog",fingerprint:"synthetic-item-state-0"};
const mutationRequests=[];
let APPLY_VERSIONS;
let approvalSigningInputForTest;
let canonicalJson;
let createMemoryApplyCoordinationStore;
let prepareReconciliation;
let runApplyEntrypoint;
let runDryRun;

function emit(value,code){
 const output=`${JSON.stringify(value)}\n`;
 if(Buffer.byteLength(output,"utf8")>4096){
  process.stdout.write(`${JSON.stringify({schema:resultSchema,status:"error",code:"YKP-E2E-OUTPUT-001"})}\n`);
  process.exitCode=1;
  return;
 }
 process.stdout.write(output);
 process.exitCode=code;
}

function digest(value){
 return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function localGitHubTransport(){
 return{
  execute:async operation=>{
   const data={
    resolve_scope:{...requestedScope,subjectRef:"subject:synthetic",repositoryRef:"repository:synthetic",projectRef:"project:synthetic",issueRef:"issue:synthetic",issueBody},
    read_project_fields:{projectRef:"project:synthetic",nodes:[{id:"field:area",name:"Area",kind:"single_select",options:[{id:"option:core",name:"Core"}]},{id:"field:work-type",name:"Work Type",kind:"single_select",options:[{id:"option:backlog",name:"Backlog"},{id:"option:task",name:"Task"}]}],pageInfo:end},
    read_project_item:{projectRef:"project:synthetic",issueRef:"issue:synthetic",itemRef:"item:synthetic",fingerprint:state.fingerprint,nodes:[{key:"Area",value:"Core"},{key:"Work Type",value:state.workType}],pageInfo:end},
    read_issue_relationships:{repositoryRef:"repository:synthetic",issueRef:"issue:synthetic",nodes:[{issueNumber:42}],parent:[],blocks:[],pageInfo:end}
   };
   return{byteCount:256,data:data[operation]};
  }
 };
}

async function currentPlan(){
 const prepared=await prepareReconciliation({scope:requestedScope,policySource,transport:localGitHubTransport()});
 if(prepared.status!=="success")throw new Error("plan unavailable");
 return prepared.plan;
}

function signedApproval(pair,plan,nonce){
 const publicDer=pair.publicKey.export({type:"spki",format:"der"});
 const keyFingerprint=createHash("sha256").update(publicDer).digest("hex");
 const scope={subjectRef:"subject:synthetic",repositoryRef:"repository:synthetic",projectRef:"project:synthetic",issueRef:"issue:synthetic",issueNumber:42};
 const claims={
  schema:1,
  issuerRef:"approver:synthetic",
  ...scope,
  scopeDigest:digest(scope),
  planId:plan.planId,
  operationDigest:digest(plan.operations),
  environment:"apply",
  protectedEnvironment:"protected-synthetic",
  issuedAtMs:now-1000,
  expiresAtMs:now+60_000,
  nonce,
  keyFingerprint,
  contractVersion:APPLY_VERSIONS.contract,
  plannerVersion:APPLY_VERSIONS.planner,
  snapshotVersion:APPLY_VERSIONS.snapshot,
  entrypointVersion:APPLY_VERSIONS.entrypoint
 };
 const unsigned={schema:1,algorithm:"Ed25519",keyFingerprint,claims};
 return{...unsigned,signature:sign(null,approvalSigningInputForTest(unsigned),pair.privateKey).toString("base64url")};
}

function host(){
 return{
  enablement:"apply-explicitly-enabled",
  allowedIssuerRefs:["approver:synthetic"],
  holderDigest:"d".repeat(64),
  coordinationEpoch:1,
  coordinationStore:createMemoryApplyCoordinationStore({nowMs:()=>now,epoch:1}),
  ports:{
   nowMs:()=>now,
   replan:currentPlan,
   admit:async kinds=>kinds.length<=1&&kinds.every(kind=>kind==="update_project_item_field_value"),
   inspect:async operation=>state.workType===operation.desired?"already_converged":state.workType==="Backlog"?"ready":"mismatch",
   mutate:async(kind,operation,clientMutationId,fencingToken)=>{
    if(kind!=="update_project_item_field_value"||operation.type!=="set_field_value"||operation.desired!=="Task")throw new Error("unexpected fake request");
    mutationRequests.push({kind,operationType:operation.type,clientMutationId,fencingToken});
    state.workType="Task";
    state.fingerprint="synthetic-item-state-1";
   },
   invalidateAfterMutation:async()=>{},
   verify:async operation=>state.workType===operation.desired,
   audit:async()=>{}
  }
 };
}

async function run(){
 if(process.argv.length!==2){
  emit({schema:resultSchema,status:"rejected",code:"YKP-E2E-REQUEST-001"},2);
  return;
 }
 const dryRun=await runDryRun({scope:requestedScope,policySource,transport:localGitHubTransport()});
 if(dryRun.status!=="success"||dryRun.report.counts.operations!==1)throw new Error("dry-run mismatch");
 const firstPlan=await currentPlan();
 const pair=generateKeyPairSync("ed25519");
 const publicKey=pair.publicKey.export({type:"spki",format:"pem"});
 const request={approvedPlanId:firstPlan.planId,protectedEnvironment:"protected-synthetic",scope:{subjectRef:"subject:synthetic",repositoryRef:"repository:synthetic",projectRef:"project:synthetic",issueRef:"issue:synthetic",issueNumber:42},approvalPublicKey:publicKey};
 const denied=await runApplyEntrypoint({...request,approvalArtifact:{schema:1}},host());
 if(denied.status!=="error"||denied.diagnostics[0]?.code!=="YKP-APPLY-003"||mutationRequests.length!==0)throw new Error("approval gate mismatch");
 const applied=await runApplyEntrypoint({...request,approvalArtifact:signedApproval(pair,firstPlan,"synthetic-demo-nonce-first")},host());
 if(applied.status!=="success"||applied.counts.verified!==1||mutationRequests.length!==1)throw new Error("controlled apply mismatch");
 const convergedDryRun=await runDryRun({scope:requestedScope,policySource,transport:localGitHubTransport()});
 if(convergedDryRun.status!=="success"||convergedDryRun.report.counts.operations!==0)throw new Error("convergence mismatch");
 const zeroPlan=await currentPlan();
 const beforeReplay=mutationRequests.length;
 const replay=await runApplyEntrypoint({...request,approvedPlanId:zeroPlan.planId,approvalArtifact:signedApproval(pair,zeroPlan,"synthetic-demo-nonce-second")},host());
 if(replay.status!=="success"||mutationRequests.length!==beforeReplay)throw new Error("idempotency mismatch");
 if(networkSentinel.attempts!==0)throw new Error("network boundary violated");
 const observed=mutationRequests[0];
 emit({
  schema:resultSchema,
  status:"passed",
  transport:"local-github-fake",
  liveProviderCalls:networkSentinel.attempts,
  phases:[
   {id:"dry-run",status:"passed",operations:dryRun.report.counts.operations},
   {id:"approval-gate",status:"denied",code:denied.diagnostics[0].code,mutationRequests:0},
   {id:"controlled-apply",status:"passed",verified:applied.counts.verified,mutationRequests:mutationRequests.length},
   {id:"idempotency",status:"passed",operations:convergedDryRun.report.counts.operations,additionalMutationRequests:mutationRequests.length-beforeReplay}
  ],
  mutationRequest:{kind:observed.kind,operationType:observed.operationType,clientMutationId:observed.clientMutationId,fencingToken:observed.fencingToken}
 },0);
}

try{
 ({APPLY_VERSIONS,approvalSigningInputForTest}=await import("../dist/src/apply-approval.js"));
 ({createMemoryApplyCoordinationStore}=await import("../dist/src/apply-coordination.js"));
 ({runApplyEntrypoint}=await import("../dist/src/apply-entrypoint.js"));
 ({prepareReconciliation,runDryRun}=await import("../dist/src/dry-run.js"));
 ({canonicalJson}=await import("../dist/src/planner.js"));
 await run();
}catch{
 emit({schema:resultSchema,status:"error",code:"YKP-E2E-RUNNER-001"},1);
}
