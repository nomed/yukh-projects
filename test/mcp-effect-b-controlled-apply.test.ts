import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { APPLY_VERSIONS, approvalSigningInputForTest, type SignedApprovalEnvelope } from "../src/apply-approval.js";
import type { ApprovalClaims } from "../src/executor.js";
import {
 createMcpEffectBTestInvocation,
 mcpEffectBDigestForTest,
 mcpEffectBLeaseScopeDigestForTest,
 mcpEffectBNonceComparisonDigestForTest,
 mcpEffectBProfileDigestForTest,
 mcpEffectBProjectNonceDigestForTest,
 mcpEffectBTerminalResultForTest,
 projectsApprovalBridgeV2SigningInputForTest,
 projectsApprovalTrustFingerprintForTest,
 runMcpEffectBControlledApplyV1,
 verifyProjectsApprovalBridgeV2ForTest,
 type McpEffectBControlledApplyInvocationV1,
 type McpEffectBFixedProfile,
 type ProjectsApprovalBridgeV2Claims,
 type ProjectsApprovalBridgeV2Envelope,
 type VerifiedMcpEffectBAdmission
} from "../src/mcp-effect-b-controlled-apply.js";
import { canonicalJson, type BoundScope, type PlannedOperation, type ReconciliationPlan } from "../src/planner.js";

const NOW=1_800_000_000_000;
const READ_SECRET="synthetic-effect-b-read-credential";
const WRITE_SECRET="synthetic-effect-b-write-credential";
const ISSUER="approver:synthetic-effect-b";
const PROTECTED_ENVIRONMENT="protected-synthetic-effect-b";
const COORDINATION_MEDIA="application/yukh-coordination-primitives+json;version=1";
const POLICY_SOURCE=[
 "schema: 1",
 "fields:",
 "  area:",
 "    name: Area",
 "    kind: single_select",
 "    mode: managed",
 "    options:",
 "      bridge: Bridge",
 "  work_type:",
 "    name: Work Type",
 "    kind: single_select",
 "    mode: managed",
 "    options:",
 "      task: Task",
 ""
].join("\n");

const digest=(value:string|Buffer)=>createHash("sha256").update(value).digest("hex");
const canonical=(value:unknown)=>canonicalJson(value);
const json=(value:unknown,headers:Record<string,string>={})=>new Response(canonical(value),{status:200,headers:{"content-type":"application/json","x-ratelimit-remaining":"1800",...headers}});

interface FixtureOptions{
 invalidMcp?:boolean;
 invalidApproval?:boolean;
 invalidBridge?:boolean;
 bridgeClaims?:(claims:ProjectsApprovalBridgeV2Claims)=>ProjectsApprovalBridgeV2Claims;
 profile?:(profile:McpEffectBFixedProfile)=>McpEffectBFixedProfile;
 equalNonce?:boolean;
 sameCredentials?:boolean;
 aborted?:boolean;
 writeFailure?:boolean;
 verificationFailure?:boolean;
 cleanupFailure?:boolean;
}

function expectedOperation(scope:BoundScope):PlannedOperation{
 return{
  operationKey:"relationship.dependency.201.202.add",
  type:"add_dependency",
  subject:{ref:scope.subjectRef},
  resource:{kind:"issue_dependency",logicalKey:"201->202",scopeRef:scope.repositoryRef},
  action:"add",
  environment:"dry-run",
  reason:"relationship.dependency.missing",
  preconditions:[{kind:"dependency_absent",logicalKey:"201->202",expected:true}],
  dependsOn:[],
  desired:202
 };
}

function expectedPlan(scope:BoundScope):ReconciliationPlan{
 const base={
  schema:1 as const,
  executable:true,
  diagnostics:[],
  observations:[
   {type:"preserve_field_value" as const,logicalKey:"area",displayValue:"Bridge"},
   {type:"preserve_field_value" as const,logicalKey:"work_type",displayValue:"Task"}
  ],
  operations:[expectedOperation(scope)]
 };
 return{...base,planId:mcpEffectBDigestForTest(base)};
}

function issue(number:201|202,dependencyPresent:boolean){
 const primary=number===201;
 return{
  id:number,
  node_id:`I_${number}`,
  number,
  body:primary
   ?"<!-- yukh:issue:v1\nschema: 1\nwork_type: task\narea: bridge\nrelationships:\n  blocks: [202]\n-->"
   :"<!-- yukh:issue:v1\nschema: 1\nwork_type: task\narea: bridge\n-->",
  repository:{full_name:"example-org/example-repo"},
  parent_issue_url:null,
  issue_dependencies_summary:{
   blocked_by:dependencyPresent&&!primary?1:0,
   blocking:dependencyPresent&&primary?1:0
  }
 };
}

function profile(scope:BoundScope):McpEffectBFixedProfile{
 const plan=expectedPlan(scope);
 const target={
  requestedScope:{ownerLogin:"example-org",repositoryName:"example-repo",projectNumber:7,issueNumber:201},
  expectedScope:scope,
  blockedIssueRef:"I_202"
 };
 const targetProfileDigest=mcpEffectBDigestForTest(target);
 const projectsPostcondition={
  schema:"yukh-projects-effect-b-postcondition-v1" as const,
  capability:"projects.add-dependency.v1" as const,
  relationship:"blocks" as const,
  blockingIssueNumber:201 as const,
  blockedIssueNumber:202 as const,
  expected:"present" as const,
  targetProfileDigest
 };
 const withoutDigest:McpEffectBFixedProfile={
  schema:"yukh-projects-mcp-effect-b-profile-v1",
  profile:"yukh-mcp/suite-preview-effect-b-add-dependency-v1",
  capability:"projects.add-dependency.v1",
  externalMode:"apply",
  reconciliationMode:"native-v1",
  protectedEnvironment:PROTECTED_ENVIRONMENT,
  target,
  targetProfileDigest,
  policySource:POLICY_SOURCE,
  policyCommit:"a".repeat(40),
  policyArtifactSha256:digest(POLICY_SOURCE),
  previewPlanEnvelopeDigest:"b".repeat(64),
  projectsPlanId:plan.planId,
  projectsOperationDigest:mcpEffectBDigestForTest(plan.operations),
  projectsPostcondition,
  projectsPostconditionBindingDigest:mcpEffectBDigestForTest(projectsPostcondition),
  projectsProducerRelease:{sourceCommit:"c".repeat(40),applyArtifactSha256:"d".repeat(64),entrypointVersion:"apply-entrypoint-v1"},
  wrapperRelease:{sourceCommit:"e".repeat(40),artifactSha256:"f".repeat(64),entrypointVersion:"mcp-effect-b-controlled-apply-v1"},
  wrapperProfileDigest:"0".repeat(64),
  mcpVerifierRelease:{sourceCommit:"1".repeat(40),artifactSha256:"2".repeat(64)},
  mcpCapabilityDefinitionDigest:"9".repeat(64),
  mcpProviderImplementationDigest:"a".repeat(64),
  projectsLeaseScopeDigest:mcpEffectBLeaseScopeDigestForTest(scope),
  projectsLeaseHolderDigest:"3".repeat(64),
  coordinationEpoch:7
 };
 return{...withoutDigest,wrapperProfileDigest:mcpEffectBProfileDigestForTest(withoutDigest)};
}

function canonicalApproval(pair:ReturnType<typeof generateKeyPairSync>,scope:BoundScope,fixed:McpEffectBFixedProfile){
 const keyFingerprint=digest(pair.publicKey.export({type:"spki",format:"der"}));
 const claims:ApprovalClaims={
  schema:1,
  issuerRef:ISSUER,
  subjectRef:scope.subjectRef,
  repositoryRef:scope.repositoryRef,
  projectRef:scope.projectRef,
  issueRef:scope.issueRef,
  issueNumber:scope.issueNumber,
  scopeDigest:mcpEffectBDigestForTest(scope),
  planId:fixed.projectsPlanId,
  operationDigest:fixed.projectsOperationDigest,
  environment:"apply",
  protectedEnvironment:PROTECTED_ENVIRONMENT,
  issuedAtMs:NOW-1000,
  expiresAtMs:NOW+60_000,
  nonce:"projects-effect-b-nonce-0001",
  keyFingerprint,
  contractVersion:APPLY_VERSIONS.contract,
  plannerVersion:APPLY_VERSIONS.planner,
  snapshotVersion:APPLY_VERSIONS.snapshot,
  entrypointVersion:APPLY_VERSIONS.entrypoint
 };
 const unsigned={schema:1 as const,algorithm:"Ed25519" as const,keyFingerprint,claims};
 const envelope:SignedApprovalEnvelope={...unsigned,signature:sign(null,approvalSigningInputForTest(unsigned),pair.privateKey).toString("base64url")};
 return{claims,envelope,bytes:canonical(envelope),keyFingerprint};
}

function hostCapsule(fixed:McpEffectBFixedProfile){
 const pair=generateKeyPairSync("ec",{namedCurve:"P-256"});
 return canonical({
  allowed_issuer_refs:[ISSUER],
  approved_kinds:["add_blocked_by"],
  coordination:{base_uri:"https://coordination.invalid",credential:"synthetic-coordination-credential",dpop_private_jwk:pair.privateKey.export({format:"jwk"}),epoch:fixed.coordinationEpoch},
  enablement:"apply-explicitly-enabled",
  expires_at_ms:NOW+60_000,
  holder_digest:fixed.projectsLeaseHolderDigest,
  issued_at_ms:NOW-1000,
  permissions:{extra_permissions:[],issues:"write",projects:"none"},
  rate:{graphql_remaining:2000,graphql_reserve:500,max_graphql_points:500,max_graphql_requests:4,max_rest_requests:32,rest_remaining:2000,rest_reserve:500},
  schema:1,
  scope:{environment:PROTECTED_ENVIRONMENT,issue_number:201,owner:"example-org",project_number:7,repository:"example-repo"},
  version:"protected-host-capsule-v1"
 });
}

function fixture(options:FixtureOptions={}){
 const projectPair=generateKeyPairSync("ed25519");
 const subjectRef=`github-token:${digest(READ_SECRET)}`;
 const scope:BoundScope={subjectRef,repositoryRef:"R_1",projectRef:"P_7",issueRef:"I_201",issueNumber:201};
 let fixed=profile(scope);
 if(options.profile)fixed=options.profile(fixed);
 const approval=canonicalApproval(projectPair,scope,fixed);
 const trustRootFingerprint=projectsApprovalTrustFingerprintForTest(approval.keyFingerprint,[ISSUER]);
 const projectsTrust={publicKey:projectPair.publicKey.export({type:"spki",format:"pem"}),allowedIssuerRefs:[ISSUER],trustRootFingerprint};
 const mcpNonce=options.equalNonce?approval.claims.nonce:"mcp-effect-b-nonce-0001";
 const mcpAdmission:VerifiedMcpEffectBAdmission={
  artifactDigest:options.invalidMcp?"invalid":"4".repeat(64),
  mcpPlanId:"5".repeat(64),
  mcpOperationDigest:"6".repeat(64),
  mcpSubjectBindingDigest:"7".repeat(64),
  mcpAuthenticationContextDigest:"8".repeat(64),
  mcpCapabilityDefinitionDigest:fixed.mcpCapabilityDefinitionDigest,
  mcpProviderImplementationDigest:fixed.mcpProviderImplementationDigest,
  mcpPolicyCommit:fixed.policyCommit,
  mcpNonceBindingDigest:"b".repeat(64),
  mcpNonceComparisonDigest:mcpEffectBNonceComparisonDigestForTest(mcpNonce),
  projectsPrincipalRef:scope.subjectRef,
  previewPlanEnvelopeDigest:fixed.previewPlanEnvelopeDigest,
  projectsPlanId:fixed.projectsPlanId,
  projectsOperationDigest:fixed.projectsOperationDigest,
  projectsTargetBindingDigest:fixed.targetProfileDigest,
  projectsPostconditionBindingDigest:fixed.projectsPostconditionBindingDigest,
  projectsProducerRelease:fixed.projectsProducerRelease,
  wrapperRelease:fixed.wrapperRelease,
  wrapperProfileDigest:fixed.wrapperProfileDigest,
  mcpVerifierRelease:fixed.mcpVerifierRelease,
  projectsLeaseScopeDigest:fixed.projectsLeaseScopeDigest,
  projectsLeaseHolderDigest:fixed.projectsLeaseHolderDigest,
  coordinationEpoch:fixed.coordinationEpoch,
  issuedAtMs:NOW-2000,
  expiresAtMs:NOW+120_000
 };
 let bridgeClaims:ProjectsApprovalBridgeV2Claims={
  profile:"suite-preview-effect-b-v1",
  approvalV1Digest:digest(approval.bytes),
  previewPlanEnvelopeDigest:fixed.previewPlanEnvelopeDigest,
  projectsPlanId:fixed.projectsPlanId,
  projectsOperationDigest:fixed.projectsOperationDigest,
  projectsTargetBindingDigest:fixed.targetProfileDigest,
  projectsPostconditionBindingDigest:fixed.projectsPostconditionBindingDigest,
  projectsProducerRelease:fixed.projectsProducerRelease,
  mcpApprovalDigest:mcpAdmission.artifactDigest,
  mcpPlanId:mcpAdmission.mcpPlanId,
  mcpOperationDigest:mcpAdmission.mcpOperationDigest,
  mcpSubjectBindingDigest:mcpAdmission.mcpSubjectBindingDigest,
  mcpAuthenticationContextDigest:mcpAdmission.mcpAuthenticationContextDigest,
  mcpCapabilityDefinitionDigest:mcpAdmission.mcpCapabilityDefinitionDigest,
  mcpProviderImplementationDigest:mcpAdmission.mcpProviderImplementationDigest,
  mcpPolicyCommit:mcpAdmission.mcpPolicyCommit,
  mcpNonceBindingDigest:mcpAdmission.mcpNonceBindingDigest,
  wrapperRelease:fixed.wrapperRelease,
  wrapperProfileDigest:fixed.wrapperProfileDigest,
  issuerRef:approval.claims.issuerRef,
  subjectRef:approval.claims.subjectRef,
  scopeDigest:approval.claims.scopeDigest,
  environment:"apply",
  protectedEnvironment:approval.claims.protectedEnvironment,
  issuedAtMs:approval.claims.issuedAtMs,
  expiresAtMs:approval.claims.expiresAtMs,
  nonce:approval.claims.nonce,
  projectsNonceBindingDigest:mcpEffectBProjectNonceDigestForTest(approval.claims.nonce),
  projectsLeaseScopeDigest:fixed.projectsLeaseScopeDigest,
  projectsLeaseHolderDigest:fixed.projectsLeaseHolderDigest,
  coordinationEpoch:fixed.coordinationEpoch,
  trustRootFingerprint
 };
 if(options.bridgeClaims)bridgeClaims=options.bridgeClaims(bridgeClaims);
 const bridgeUnsigned={schema:"yukh-projects-approval-bridge-v2" as const,algorithm:"Ed25519" as const,keyFingerprint:approval.keyFingerprint,claims:bridgeClaims};
 let bridge:ProjectsApprovalBridgeV2Envelope={...bridgeUnsigned,signature:sign(null,projectsApprovalBridgeV2SigningInputForTest(bridgeUnsigned),projectPair.privateKey).toString("base64url")};
 if(options.invalidBridge)bridge={...bridge,signature:`${bridge.signature.startsWith("A")?"B":"A"}${bridge.signature.slice(1)}`};
 let dependencyPresent=false,readCalls=0,writeCalls=0,coordinationCalls=0,closed=0;
 const items=()=>[201,202].map(number=>({id:number+1000,node_id:`PVTI_${number}`,content:issue(number as 201|202,dependencyPresent),fields:[{name:"Area",value:{name:{raw:"Bridge"}}},{name:"Work Type",value:{name:{raw:"Task"}}}]}));
 const readFetch:typeof globalThis.fetch=async(input)=>{
  readCalls++;
  const url=String(input);
  if(url.endsWith("/repos/example-org/example-repo"))return json({node_id:"R_1",owner:{type:"Organization"}});
  if(url.endsWith("/orgs/example-org/projectsV2/7"))return json({node_id:"P_7",number:7});
  if(url.includes("/fields?"))return json([
   {id:10,node_id:"F_area",name:"Area",data_type:"single_select",options:[{id:"O_bridge",name:{raw:"Bridge"}}]},
   {id:11,node_id:"F_work",name:"Work Type",data_type:"single_select",options:[{id:"O_task",name:{raw:"Task"}}]}
  ]);
  if(url.includes("/items?"))return json(items());
  if(url==="https://api.github.com/graphql")return json({data:{nodes:[
   {id:"I_201",number:201,parent:null,subIssues:{nodes:[],pageInfo:{hasNextPage:false}},blockedBy:{nodes:[],pageInfo:{hasNextPage:false}},blocking:{nodes:dependencyPresent?[{number:202}]:[],pageInfo:{hasNextPage:false}}},
   {id:"I_202",number:202,parent:null,subIssues:{nodes:[],pageInfo:{hasNextPage:false}},blockedBy:{nodes:dependencyPresent?[{number:201}]:[],pageInfo:{hasNextPage:false}},blocking:{nodes:[],pageInfo:{hasNextPage:false}}}
  ],rateLimit:{cost:1,remaining:1700,resetAt:"2030-01-01T00:00:00Z"}}});
  throw new Error("unexpected synthetic read");
 };
 const writeFetch:typeof globalThis.fetch=async(_input,init)=>{
  writeCalls++;
  if(options.writeFailure)throw new Error("synthetic ambiguous write");
  const sent=JSON.parse(String(init?.body)) as {variables:{input:{clientMutationId:string}}};
  if(!options.verificationFailure)dependencyPresent=true;
  return json({data:{addBlockedBy:{clientMutationId:sent.variables.input.clientMutationId,issue:{id:"I_202"},blockingIssue:{id:"I_201"}}}});
 };
 const coordinationFetch:typeof globalThis.fetch=async(input)=>{
  coordinationCalls++;
  const path=new URL(String(input)).pathname;
  const body=path.endsWith("leases:acquire")
   ?{fencing_token:1,lease_capability:"synthetic-lease-capability",outcome:"acquired",specversion:"1"}
   :path.endsWith("leases:inspect")
    ?{outcome:"valid",specversion:"1"}
    :path.endsWith("nonces:consume")
     ?{outcome:"consumed",specversion:"1"}
     :{outcome:"released",specversion:"1"};
  return new Response(canonical(body),{status:200,headers:{"content-type":COORDINATION_MEDIA}});
 };
 const invocation=createMcpEffectBTestInvocation({
  mcpAdmission,
  projectsApprovalBytes:options.invalidApproval?canonical({...approval.envelope,signature:"A".repeat(86)}):approval.bytes,
  projectsTrust,
  bridgeBytes:canonical(bridge),
  bridgeTrust:projectsTrust,
  hostCapsule:{
   source:hostCapsule(fixed),
   profile:fixed,
   readFetch,
   writeFetch,
   coordinationFetch,
   nowMs:()=>NOW,
   jti:()=>"00000000-0000-4000-8000-000000000001"
  },
  readCredential:READ_SECRET,
  writeCredential:options.sameCredentials?READ_SECRET:WRITE_SECRET,
  abort:{aborted:()=>options.aborted??false},
  close:async()=>{closed++;if(options.cleanupFailure)throw new Error("synthetic cleanup failure");}
 });
 return{
  invocation,bridge:canonical(bridge),projectsTrust,
  calls:()=>({read:readCalls,write:writeCalls,coordination:coordinationCalls,closed}),
  profile:fixed
 };
}

test("authenticates the canonical bridge v2 conformance vector",()=>{
 const value=fixture();
 const claims=verifyProjectsApprovalBridgeV2ForTest(value.bridge,value.projectsTrust);
 assert.equal(claims?.profile,"suite-preview-effect-b-v1");
 assert.equal(claims?.projectsPlanId,value.profile.projectsPlanId);
 assert.equal(claims?.projectsOperationDigest,value.profile.projectsOperationDigest);
 assert.equal(claims?.projectsTargetBindingDigest,value.profile.targetProfileDigest);
 assert.equal(claims?.projectsPostconditionBindingDigest,value.profile.projectsPostconditionBindingDigest);
});

test("keeps the committed canonical conformance vector byte-stable",()=>{
 const vector=JSON.parse(readFileSync("test/fixtures/mcp-effect-b-bridge-v2-vector.json","utf8")) as {
  schema:string;publicKeyPem:string;allowedIssuerRefs:string[];trustRootFingerprint:string;
  bridgeSha256:string;bridge:string;
 };
 assert.equal(vector.schema,"yukh-projects-approval-bridge-v2-conformance-v1");
 assert.equal(digest(vector.bridge),vector.bridgeSha256);
 const claims=verifyProjectsApprovalBridgeV2ForTest(vector.bridge,{publicKey:vector.publicKeyPem,allowedIssuerRefs:vector.allowedIssuerRefs,trustRootFingerprint:vector.trustRootFingerprint});
 assert.equal(claims?.profile,"suite-preview-effect-b-v1");
 assert.equal(claims?.subjectRef,"subject:synthetic-vector");
});

test("rejects noncanonical, unknown, malformed, oversized and substituted bridge vectors",()=>{
 const value=fixture();
 const parsed=JSON.parse(value.bridge) as Rec;
 const vectors=[
  `${value.bridge}\n`,
  canonical({...parsed,unknown:true}),
  canonical({...parsed,algorithm:"ES256"}),
  canonical({...parsed,keyFingerprint:"A".repeat(64)}),
  canonical({...parsed,claims:{...(parsed.claims as Rec),profile:"unknown"}}),
  canonical({...parsed,claims:{...(parsed.claims as Rec),expiresAtMs:1.5}}),
  canonical({...parsed,signature:"A".repeat(85)}),
  `"${"a".repeat(33*1024)}"`
 ];
 for(const vector of vectors)assert.equal(verifyProjectsApprovalBridgeV2ForTest(vector,value.projectsTrust),null);
});

test("rejects every missing bridge field and open nested release object",()=>{
 const value=fixture(),parsed=JSON.parse(value.bridge) as Rec;
 for(const key of Object.keys(parsed)){
  const missing={...parsed};
  delete missing[key];
  assert.equal(verifyProjectsApprovalBridgeV2ForTest(canonical(missing),value.projectsTrust),null,key);
 }
 const claims=parsed.claims as Rec;
 for(const key of Object.keys(claims)){
  const missingClaims={...claims};
  delete missingClaims[key];
  assert.equal(verifyProjectsApprovalBridgeV2ForTest(canonical({...parsed,claims:missingClaims}),value.projectsTrust),null,key);
 }
 for(const releaseKey of ["projectsProducerRelease","wrapperRelease"]){
  const open={...(claims[releaseKey] as Rec),unknown:true};
  assert.equal(verifyProjectsApprovalBridgeV2ForTest(canonical({...parsed,claims:{...claims,[releaseKey]:open}}),value.projectsTrust),null,releaseKey);
 }
});

test("performs exact Effect B once and records only effect_observed",async()=>{
 const value=fixture();
 const result=await runMcpEffectBControlledApplyV1(value.invocation);
 assert.deepEqual(result,{schema:"yukh-projects-mcp-effect-b-result-v1",status:"effect_observed",effectBoundaryEntered:true,mutationRequestCount:1,changed:true,remaining:0},canonical(value.calls()));
 assert.equal(value.calls().write,1);
 assert.equal(value.calls().closed,9);
 assert.deepEqual(mcpEffectBTerminalResultForTest(value.invocation),result);
 const replay=await runMcpEffectBControlledApplyV1(value.invocation);
 assert.equal(replay.status,"rejected");
 assert.equal(replay.status==="rejected"&&replay.code,"YKP-MCP-WRAPPER-001");
 assert.equal(value.calls().write,1);
});

test("keeps every compound admission denial before all provider calls",async()=>{
 const cases:[string,FixtureOptions,string][]=[
  ["MCP handle claims",{invalidMcp:true},"YKP-MCP-WRAPPER-002"],
  ["Projects v1 approval",{invalidApproval:true},"YKP-MCP-WRAPPER-003"],
  ["bridge authentication",{invalidBridge:true},"YKP-MCP-WRAPPER-004"],
  ["compound binding",{bridgeClaims:claims=>({...claims,mcpPlanId:"0".repeat(64)})},"YKP-MCP-WRAPPER-005"],
  ["authenticated subject",{bridgeClaims:claims=>({...claims,subjectRef:"subject:substituted"})},"YKP-MCP-WRAPPER-005"],
  ["expired lifetime",{bridgeClaims:claims=>({...claims,issuedAtMs:NOW-61_000,expiresAtMs:NOW-1})},"YKP-MCP-WRAPPER-005"],
  ["future lifetime",{bridgeClaims:claims=>({...claims,issuedAtMs:NOW+1,expiresAtMs:NOW+60_000})},"YKP-MCP-WRAPPER-005"],
  ["fixed profile",{bridgeClaims:claims=>({...claims,projectsTargetBindingDigest:"0".repeat(64)})},"YKP-MCP-WRAPPER-006"],
  ["producer release",{bridgeClaims:claims=>({...claims,projectsProducerRelease:{...claims.projectsProducerRelease,sourceCommit:"0".repeat(40)}})},"YKP-MCP-WRAPPER-006"],
  ["nonce equality",{equalNonce:true},"YKP-MCP-WRAPPER-005"],
  ["credential separation",{sameCredentials:true},"YKP-MCP-WRAPPER-007"],
  ["abort gate",{aborted:true},"YKP-MCP-WRAPPER-007"]
 ];
 for(const [name,options,code] of cases){
  const value=fixture(options),result=await runMcpEffectBControlledApplyV1(value.invocation);
  assert.equal(result.status,"rejected",name);
  assert.equal(result.status==="rejected"&&result.code,code,name);
  assert.deepEqual({...value.calls(),closed:undefined},{read:0,write:0,coordination:0,closed:undefined},name);
  assert.equal(value.calls().closed,9,name);
 }
});

test("rejects open invocation schemas and ordinary objects without touching a provider",async()=>{
 const value=fixture();
 const open={...value.invocation,unknown:true} as unknown as McpEffectBControlledApplyInvocationV1;
 const result=await runMcpEffectBControlledApplyV1(open);
 assert.equal(result.status,"rejected");
 assert.equal(result.status==="rejected"&&result.code,"YKP-MCP-WRAPPER-001");
 assert.deepEqual(value.calls(),{read:0,write:0,coordination:0,closed:0});
 const ordinary={...value.invocation,mcpVerifiedAdmissionHandle:{}} as McpEffectBControlledApplyInvocationV1;
 const second=await runMcpEffectBControlledApplyV1(ordinary);
 assert.equal(second.status,"rejected");
 assert.equal(second.status==="rejected"&&second.code,"YKP-MCP-WRAPPER-001");
});

test("returns durable completion_unknown after one ambiguous mutation and never retries",async()=>{
 const value=fixture({writeFailure:true});
 const result=await runMcpEffectBControlledApplyV1(value.invocation);
 assert.deepEqual(result,{schema:"yukh-projects-mcp-effect-b-result-v1",status:"completion_unknown",effectBoundaryEntered:true,mutationRequestCount:1,code:"YKP-MCP-WRAPPER-009"});
 assert.equal(value.calls().write,1);
 assert.deepEqual(mcpEffectBTerminalResultForTest(value.invocation),result);
});

test("requires post-mutation convergence and keeps ambiguous verification terminal",async()=>{
 const value=fixture({verificationFailure:true});
 const result=await runMcpEffectBControlledApplyV1(value.invocation);
 assert.equal(result.status,"completion_unknown");
 assert.equal(result.mutationRequestCount,1);
 assert.equal(value.calls().write,1);
});

test("cleanup failure cannot rewrite an independently observed effect",async()=>{
 const value=fixture({cleanupFailure:true});
 const result=await runMcpEffectBControlledApplyV1(value.invocation);
 assert.equal(result.status,"effect_observed");
 assert.equal(value.calls().closed,9);
 assert.doesNotMatch(JSON.stringify(result),/credential|nonce|subject|example-org|coordination/u);
});

type Rec=Record<string,unknown>;
