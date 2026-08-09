import { createHash, createPublicKey, verify, type KeyObject } from "node:crypto";
import { verifySignedApproval, type ApprovalTrust, type SignedApprovalEnvelope } from "./apply-approval.js";
import { createControlledApplyHostFactory } from "./controlled-apply-host.js";
import type { ApprovalClaims, PublicApplyReport } from "./executor.js";
import type { RequestedGitHubScope } from "./github-readonly.js";
import { canonicalJson, type BoundScope, type PlannedOperation, type ReconciliationPlan } from "./planner.js";
import { parseProtectedHostCapsule } from "./protected-host-capsule.js";
import { runApplyEntrypoint } from "./apply-entrypoint.js";

type Rec=Record<string,unknown>;
type AsyncClose=()=>void|Promise<void>;

declare const privateMcpHandleBrand:unique symbol;
export interface PrivateSingleUseMcpVerificationHandle{readonly [privateMcpHandleBrand]:"mcp-verification"}
export interface PrivateSingleUseArtifactHandle{readonly [privateMcpHandleBrand]:"artifact"}
export interface PrivateSingleUseTrustHandle{readonly [privateMcpHandleBrand]:"trust"}
export interface PrivateSingleUseSecretHandle{readonly [privateMcpHandleBrand]:"secret"}
export interface PrivateAbortHandle{readonly [privateMcpHandleBrand]:"abort"}

export interface ProjectsApprovalBridgeV2Envelope{
 schema:"yukh-projects-approval-bridge-v2";
 algorithm:"Ed25519";
 keyFingerprint:string;
 claims:ProjectsApprovalBridgeV2Claims;
 signature:string;
}

export interface ProjectsApprovalBridgeV2Claims{
 profile:"suite-preview-effect-b-v1";
 approvalV1Digest:string;
 previewPlanEnvelopeDigest:string;
 projectsPlanId:string;
 projectsOperationDigest:string;
 projectsTargetBindingDigest:string;
 projectsPostconditionBindingDigest:string;
 projectsProducerRelease:ProducerRelease;
 mcpApprovalDigest:string;
 mcpPlanId:string;
 mcpOperationDigest:string;
 mcpSubjectBindingDigest:string;
 mcpAuthenticationContextDigest:string;
 mcpCapabilityDefinitionDigest:string;
 mcpProviderImplementationDigest:string;
 mcpPolicyCommit:string;
 mcpNonceBindingDigest:string;
 wrapperRelease:WrapperRelease;
 wrapperProfileDigest:string;
 issuerRef:string;
 subjectRef:string;
 scopeDigest:string;
 environment:"apply";
 protectedEnvironment:string;
 issuedAtMs:number;
 expiresAtMs:number;
 nonce:string;
 projectsNonceBindingDigest:string;
 projectsLeaseScopeDigest:string;
 projectsLeaseHolderDigest:string;
 coordinationEpoch:number;
 trustRootFingerprint:string;
}

export interface ProducerRelease{
 sourceCommit:string;
 applyArtifactSha256:string;
 entrypointVersion:"apply-entrypoint-v1";
}

export interface WrapperRelease{
 sourceCommit:string;
 artifactSha256:string;
 entrypointVersion:"mcp-effect-b-controlled-apply-v1";
}

export type McpWrapperFailureCode=`YKP-MCP-WRAPPER-${"001"|"002"|"003"|"004"|"005"|"006"|"007"|"008"|"009"|"010"}`;

export interface McpEffectBControlledApplyInvocationV1{
 schema:"yukh-projects-mcp-effect-b-invocation-v1";
 attempt:1;
 mcpVerifiedAdmissionHandle:PrivateSingleUseMcpVerificationHandle;
 projectsApprovalHandle:PrivateSingleUseArtifactHandle;
 projectsTrustHandle:PrivateSingleUseTrustHandle;
 bridgeHandle:PrivateSingleUseArtifactHandle;
 bridgeTrustHandle:PrivateSingleUseTrustHandle;
 hostCapsuleHandle:PrivateSingleUseArtifactHandle;
 readCredentialHandle:PrivateSingleUseSecretHandle;
 writeCredentialHandle:PrivateSingleUseSecretHandle;
 abortHandle:PrivateAbortHandle;
}

export type McpEffectBControlledApplyResultV1=
 |{schema:"yukh-projects-mcp-effect-b-result-v1";status:"rejected";effectBoundaryEntered:false;mutationRequestCount:0;code:Exclude<McpWrapperFailureCode,"YKP-MCP-WRAPPER-009">}
 |{schema:"yukh-projects-mcp-effect-b-result-v1";status:"effect_observed";effectBoundaryEntered:true;mutationRequestCount:1;changed:true;remaining:0}
 |{schema:"yukh-projects-mcp-effect-b-result-v1";status:"completion_unknown";effectBoundaryEntered:true;mutationRequestCount:0|1;code:"YKP-MCP-WRAPPER-009"};

interface McpVerifierRelease{sourceCommit:string;artifactSha256:string}
interface EffectBTargetProfile{
 requestedScope:RequestedGitHubScope;
 expectedScope:BoundScope;
 blockedIssueRef:string;
}
interface EffectBPostcondition{
 schema:"yukh-projects-effect-b-postcondition-v1";
 capability:"projects.add-dependency.v1";
 relationship:"blocks";
 blockingIssueNumber:201;
 blockedIssueNumber:202;
 expected:"present";
 targetProfileDigest:string;
}

/** @internal */
export interface McpEffectBFixedProfile{
 schema:"yukh-projects-mcp-effect-b-profile-v1";
 profile:"yukh-mcp/suite-preview-effect-b-add-dependency-v1";
 capability:"projects.add-dependency.v1";
 externalMode:"apply";
 reconciliationMode:"native-v1";
 protectedEnvironment:string;
 target:EffectBTargetProfile;
 targetProfileDigest:string;
 policySource:string;
 policyCommit:string;
 policyArtifactSha256:string;
 previewPlanEnvelopeDigest:string;
 projectsPlanId:string;
 projectsOperationDigest:string;
 projectsPostcondition:EffectBPostcondition;
 projectsPostconditionBindingDigest:string;
 projectsProducerRelease:ProducerRelease;
 wrapperRelease:WrapperRelease;
 wrapperProfileDigest:string;
 mcpVerifierRelease:McpVerifierRelease;
 mcpCapabilityDefinitionDigest:string;
 mcpProviderImplementationDigest:string;
 projectsLeaseScopeDigest:string;
 projectsLeaseHolderDigest:string;
 coordinationEpoch:number;
}

/** @internal */
export interface VerifiedMcpEffectBAdmission{
 artifactDigest:string;
 mcpPlanId:string;
 mcpOperationDigest:string;
 mcpSubjectBindingDigest:string;
 mcpAuthenticationContextDigest:string;
 mcpCapabilityDefinitionDigest:string;
 mcpProviderImplementationDigest:string;
 mcpPolicyCommit:string;
 mcpNonceBindingDigest:string;
 mcpNonceComparisonDigest:string;
 projectsPrincipalRef:string;
 previewPlanEnvelopeDigest:string;
 projectsPlanId:string;
 projectsOperationDigest:string;
 projectsTargetBindingDigest:string;
 projectsPostconditionBindingDigest:string;
 projectsProducerRelease:ProducerRelease;
 wrapperRelease:WrapperRelease;
 wrapperProfileDigest:string;
 mcpVerifierRelease:McpVerifierRelease;
 projectsLeaseScopeDigest:string;
 projectsLeaseHolderDigest:string;
 coordinationEpoch:number;
 issuedAtMs:number;
 expiresAtMs:number;
}

interface PrivateTrust extends ApprovalTrust{trustRootFingerprint:string}
interface HostCapsuleValue{
 source:string;
 profile:McpEffectBFixedProfile;
 readFetch:typeof globalThis.fetch;
 writeFetch:typeof globalThis.fetch;
 coordinationFetch:typeof globalThis.fetch;
 nowMs:()=>number;
 jti:()=>string;
}
interface AbortValue{aborted():boolean}
type HandleKind="mcp"|"projects-approval"|"projects-trust"|"bridge"|"bridge-trust"|"capsule"|"read-secret"|"write-secret"|"abort";
interface HandleRecord{kind:HandleKind;bundle:object;value:unknown;close?:AsyncClose;consumed:boolean}
const privateHandles=new WeakMap<object,HandleRecord>();
const terminalResults=new WeakMap<object,McpEffectBControlledApplyResultV1>();

const DIGEST=/^[a-f0-9]{64}$/u;
const COMMIT=/^[a-f0-9]{40}$/u;
const SIGNATURE=/^[A-Za-z0-9_-]{86}$/u;
const BRIDGE_KEYS=["schema","algorithm","keyFingerprint","claims","signature"] as const;
const PRODUCER_KEYS=["sourceCommit","applyArtifactSha256","entrypointVersion"] as const;
const WRAPPER_KEYS=["sourceCommit","artifactSha256","entrypointVersion"] as const;
const CLAIM_KEYS=[
 "profile","approvalV1Digest","previewPlanEnvelopeDigest","projectsPlanId","projectsOperationDigest",
 "projectsTargetBindingDigest","projectsPostconditionBindingDigest","projectsProducerRelease",
 "mcpApprovalDigest","mcpPlanId","mcpOperationDigest","mcpSubjectBindingDigest",
 "mcpAuthenticationContextDigest","mcpCapabilityDefinitionDigest","mcpProviderImplementationDigest",
 "mcpPolicyCommit","mcpNonceBindingDigest","wrapperRelease","wrapperProfileDigest","issuerRef",
 "subjectRef","scopeDigest","environment","protectedEnvironment","issuedAtMs","expiresAtMs","nonce",
 "projectsNonceBindingDigest","projectsLeaseScopeDigest","projectsLeaseHolderDigest","coordinationEpoch",
 "trustRootFingerprint"
] as const;
const INVOCATION_KEYS=[
 "schema","attempt","mcpVerifiedAdmissionHandle","projectsApprovalHandle","projectsTrustHandle",
 "bridgeHandle","bridgeTrustHandle","hostCapsuleHandle","readCredentialHandle","writeCredentialHandle",
 "abortHandle"
] as const;
const MCP_KEYS=[
 "artifactDigest","mcpPlanId","mcpOperationDigest","mcpSubjectBindingDigest",
 "mcpAuthenticationContextDigest","mcpCapabilityDefinitionDigest","mcpProviderImplementationDigest",
 "mcpPolicyCommit","mcpNonceBindingDigest","mcpNonceComparisonDigest","projectsPrincipalRef",
 "previewPlanEnvelopeDigest","projectsPlanId","projectsOperationDigest","projectsTargetBindingDigest",
 "projectsPostconditionBindingDigest","projectsProducerRelease","wrapperRelease","wrapperProfileDigest",
 "mcpVerifierRelease","projectsLeaseScopeDigest","projectsLeaseHolderDigest","coordinationEpoch",
 "issuedAtMs","expiresAtMs"
] as const;
const PROFILE_KEYS=[
 "schema","profile","capability","externalMode","reconciliationMode","protectedEnvironment",
 "target","targetProfileDigest","policySource","policyCommit","policyArtifactSha256",
 "previewPlanEnvelopeDigest","projectsPlanId","projectsOperationDigest","projectsPostcondition",
 "projectsPostconditionBindingDigest","projectsProducerRelease","wrapperRelease",
 "wrapperProfileDigest","mcpVerifierRelease","mcpCapabilityDefinitionDigest",
 "mcpProviderImplementationDigest","projectsLeaseScopeDigest",
 "projectsLeaseHolderDigest","coordinationEpoch"
] as const;
const TARGET_KEYS=["requestedScope","expectedScope","blockedIssueRef"] as const;
const REQUESTED_SCOPE_KEYS=["ownerLogin","repositoryName","projectNumber","issueNumber"] as const;
const BOUND_SCOPE_KEYS=["subjectRef","repositoryRef","projectRef","issueRef","issueNumber"] as const;
const POSTCONDITION_KEYS=["schema","capability","relationship","blockingIssueNumber","blockedIssueNumber","expected","targetProfileDigest"] as const;
const MCP_VERIFIER_RELEASE_KEYS=["sourceCommit","artifactSha256"] as const;
const TRUST_KEYS=["publicKey","allowedIssuerRefs","trustRootFingerprint"] as const;
const HOST_CAPSULE_KEYS=["source","profile","readFetch","writeFetch","coordinationFetch","nowMs","jti"] as const;
const ABORT_KEYS=["aborted"] as const;

function rec(value:unknown):value is Rec{return typeof value==="object"&&value!==null&&!Array.isArray(value);}
function exact(value:unknown,keys:readonly string[]):value is Rec{return rec(value)&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));}
function digest(value:string|Buffer):string{return createHash("sha256").update(value).digest("hex");}
function bounded(value:unknown,max=256):value is string{return typeof value==="string"&&Buffer.byteLength(value,"utf8")>0&&Buffer.byteLength(value,"utf8")<=max&&!/[\u0000-\u001f\u007f]/u.test(value)&&validUnicode(value);}
function safeInteger(value:unknown):value is number{return Number.isSafeInteger(value)&&Number(value)>=0;}
function validUnicode(value:string):boolean{for(let index=0;index<value.length;index++){const code=value.charCodeAt(index);if(code>=0xd800&&code<=0xdbff){const next=value.charCodeAt(++index);if(!(next>=0xdc00&&next<=0xdfff))return false;}else if(code>=0xdc00&&code<=0xdfff)return false;}return true;}
function unicodeTree(value:unknown,depth=0):boolean{
 if(depth>6)return false;
 if(typeof value==="string")return validUnicode(value);
 if(typeof value==="number")return Number.isSafeInteger(value);
 if(!rec(value))return false;
 return Object.entries(value).every(([key,item])=>validUnicode(key)&&unicodeTree(item,depth+1));
}
function canonicalObject(source:string,maxBytes:number):Rec|null{
 if(typeof source!=="string"||Buffer.byteLength(source,"utf8")>maxBytes)return null;
 let value:unknown;
 try{value=JSON.parse(source);}catch{return null;}
 return rec(value)&&unicodeTree(value)&&canonicalJson(value)===source?value:null;
}
function publicKey(value:Buffer|string):{key:KeyObject;fingerprint:string}|null{
 try{
  const key=createPublicKey(value);
  if(key.asymmetricKeyType!=="ed25519")return null;
  return{key,fingerprint:digest(key.export({type:"spki",format:"der"}))};
 }catch{return null;}
}
function producer(value:unknown):value is ProducerRelease{
 return exact(value,PRODUCER_KEYS)&&COMMIT.test(String(value.sourceCommit))&&DIGEST.test(String(value.applyArtifactSha256))&&value.entrypointVersion==="apply-entrypoint-v1";
}
function wrapper(value:unknown):value is WrapperRelease{
 return exact(value,WRAPPER_KEYS)&&COMMIT.test(String(value.sourceCommit))&&DIGEST.test(String(value.artifactSha256))&&value.entrypointVersion==="mcp-effect-b-controlled-apply-v1";
}
function sameProducer(a:ProducerRelease,b:ProducerRelease):boolean{return canonicalJson(a)===canonicalJson(b);}
function sameWrapper(a:WrapperRelease,b:WrapperRelease):boolean{return canonicalJson(a)===canonicalJson(b);}
function validBridgeClaims(value:unknown):value is ProjectsApprovalBridgeV2Claims{
 if(!exact(value,CLAIM_KEYS))return false;
 const claims=value as unknown as ProjectsApprovalBridgeV2Claims;
 const digests=[
  claims.approvalV1Digest,claims.previewPlanEnvelopeDigest,claims.projectsPlanId,
  claims.projectsOperationDigest,claims.projectsTargetBindingDigest,
  claims.projectsPostconditionBindingDigest,claims.mcpApprovalDigest,claims.mcpPlanId,
  claims.mcpOperationDigest,claims.mcpSubjectBindingDigest,claims.mcpAuthenticationContextDigest,
  claims.mcpCapabilityDefinitionDigest,claims.mcpProviderImplementationDigest,
  claims.mcpNonceBindingDigest,claims.wrapperProfileDigest,claims.scopeDigest,
  claims.projectsNonceBindingDigest,claims.projectsLeaseScopeDigest,
  claims.projectsLeaseHolderDigest,claims.trustRootFingerprint
 ];
 return claims.profile==="suite-preview-effect-b-v1"&&digests.every(item=>DIGEST.test(item))&&
  COMMIT.test(claims.mcpPolicyCommit)&&producer(claims.projectsProducerRelease)&&
  wrapper(claims.wrapperRelease)&&bounded(claims.issuerRef)&&bounded(claims.subjectRef)&&
  bounded(claims.protectedEnvironment)&&bounded(claims.nonce)&&claims.environment==="apply"&&
  safeInteger(claims.issuedAtMs)&&safeInteger(claims.expiresAtMs)&&
  safeInteger(claims.coordinationEpoch)&&claims.coordinationEpoch>0;
}
function bridgeSigningInput(envelope:Omit<ProjectsApprovalBridgeV2Envelope,"signature">):Buffer{
 return Buffer.from(`yukh-projects-approval-bridge-v2\0${canonicalJson(envelope)}`,"utf8");
}
function trustProfileFingerprint(keyFingerprint:string,issuerRefs:readonly string[]):string{
 return digest(canonicalJson({profile:"yukh-projects-approval-trust-v1",keyFingerprint,issuerRefs}));
}
interface VerifiedBridge{claims:ProjectsApprovalBridgeV2Claims;digest:string;keyFingerprint:string}
function verifyBridge(source:string,trust:PrivateTrust):VerifiedBridge|null{
 const value=canonicalObject(source,32*1024);
 if(!exact(value,BRIDGE_KEYS)||value.schema!=="yukh-projects-approval-bridge-v2"||value.algorithm!=="Ed25519"||!DIGEST.test(String(value.keyFingerprint))||!SIGNATURE.test(String(value.signature))||!validBridgeClaims(value.claims))return null;
 const envelope=value as unknown as ProjectsApprovalBridgeV2Envelope,trusted=publicKey(trust.publicKey);
 if(!trusted||trusted.fingerprint!==envelope.keyFingerprint||!trust.allowedIssuerRefs.includes(envelope.claims.issuerRef)||trust.trustRootFingerprint!==trustProfileFingerprint(trusted.fingerprint,trust.allowedIssuerRefs)||envelope.claims.trustRootFingerprint!==trust.trustRootFingerprint)return null;
 let signature:Buffer;
 try{signature=Buffer.from(envelope.signature,"base64url");}catch{return null;}
 if(signature.length!==64||!verify(null,bridgeSigningInput({schema:envelope.schema,algorithm:envelope.algorithm,keyFingerprint:envelope.keyFingerprint,claims:envelope.claims}),trusted.key,signature))return null;
 return Object.freeze({claims:Object.freeze({...envelope.claims}),digest:digest(source),keyFingerprint:envelope.keyFingerprint});
}
function rejected(code:Exclude<McpWrapperFailureCode,"YKP-MCP-WRAPPER-009">):McpEffectBControlledApplyResultV1{
 return{schema:"yukh-projects-mcp-effect-b-result-v1",status:"rejected",effectBoundaryEntered:false,mutationRequestCount:0,code};
}
function unknown(count:number):McpEffectBControlledApplyResultV1{
 return{schema:"yukh-projects-mcp-effect-b-result-v1",status:"completion_unknown",effectBoundaryEntered:true,mutationRequestCount:count===1?1:0,code:"YKP-MCP-WRAPPER-009"};
}
function exactPlanOperation(value:PlannedOperation,profile:McpEffectBFixedProfile):boolean{
 const expected:PlannedOperation={
  operationKey:"relationship.dependency.201.202.add",
  type:"add_dependency",
  subject:{ref:profile.target.expectedScope.subjectRef},
  resource:{kind:"issue_dependency",logicalKey:"201->202",scopeRef:profile.target.expectedScope.repositoryRef},
  action:"add",
  environment:"dry-run",
  reason:"relationship.dependency.missing",
  preconditions:[{kind:"dependency_absent",logicalKey:"201->202",expected:true}],
  dependsOn:[],
  desired:202
 };
 return canonicalJson(value)===canonicalJson(expected);
}
function scopeDigest(scope:BoundScope):string{return digest(canonicalJson(scope));}
function projectNonceDigest(nonce:string):string{return digest(`yukh-projects-approval-nonce-v1\0${nonce}`);}
function nonceComparisonDigest(nonce:string):string{return digest(`yukh-compound-approval-nonce-equality-v1\0${nonce}`);}
function leaseScopeDigest(scope:BoundScope):string{return digest(`lease-key\0${scopeDigest(scope)}`);}
function targetDigest(target:EffectBTargetProfile):string{return digest(canonicalJson(target));}
function postconditionDigest(value:EffectBPostcondition):string{return digest(canonicalJson(value));}
function policyDigest(value:string):string{return digest(Buffer.from(value,"utf8"));}
function profileBinding(profile:McpEffectBFixedProfile):Rec{
 return{
  schema:profile.schema,profile:profile.profile,capability:profile.capability,
  externalMode:profile.externalMode,reconciliationMode:profile.reconciliationMode,
  protectedEnvironment:profile.protectedEnvironment,targetProfileDigest:profile.targetProfileDigest,
  policyCommit:profile.policyCommit,policyArtifactSha256:profile.policyArtifactSha256,
  previewPlanEnvelopeDigest:profile.previewPlanEnvelopeDigest,projectsPlanId:profile.projectsPlanId,
  projectsOperationDigest:profile.projectsOperationDigest,
  projectsPostconditionBindingDigest:profile.projectsPostconditionBindingDigest,
  projectsProducerRelease:profile.projectsProducerRelease,wrapperRelease:profile.wrapperRelease,
  mcpVerifierRelease:profile.mcpVerifierRelease,
  mcpCapabilityDefinitionDigest:profile.mcpCapabilityDefinitionDigest,
  mcpProviderImplementationDigest:profile.mcpProviderImplementationDigest,
  projectsLeaseScopeDigest:profile.projectsLeaseScopeDigest,
  projectsLeaseHolderDigest:profile.projectsLeaseHolderDigest,coordinationEpoch:profile.coordinationEpoch
 };
}
function profileValid(profile:McpEffectBFixedProfile):boolean{
 if(!exact(profile,PROFILE_KEYS)||profile.schema!=="yukh-projects-mcp-effect-b-profile-v1"||profile.profile!=="yukh-mcp/suite-preview-effect-b-add-dependency-v1"||profile.capability!=="projects.add-dependency.v1"||profile.externalMode!=="apply"||profile.reconciliationMode!=="native-v1"||!bounded(profile.protectedEnvironment,64))return false;
 const requested=profile.target?.requestedScope,expected=profile.target?.expectedScope;
 if(!exact(profile.target,TARGET_KEYS)||!exact(requested,REQUESTED_SCOPE_KEYS)||requested.ownerLogin!=="example-org"||requested.repositoryName!=="example-repo"||requested.projectNumber!==7||requested.issueNumber!==201||!exact(expected,BOUND_SCOPE_KEYS)||expected.issueNumber!==201||!bounded(expected.subjectRef)||!bounded(expected.repositoryRef)||!bounded(expected.projectRef)||!bounded(expected.issueRef)||!bounded(profile.target.blockedIssueRef)||profile.target.blockedIssueRef===expected.issueRef)return false;
 if(profile.targetProfileDigest!==targetDigest(profile.target)||profile.policyArtifactSha256!==policyDigest(profile.policySource)||!COMMIT.test(profile.policyCommit)||!DIGEST.test(profile.previewPlanEnvelopeDigest)||!DIGEST.test(profile.projectsPlanId)||!DIGEST.test(profile.projectsOperationDigest)||!producer(profile.projectsProducerRelease)||!wrapper(profile.wrapperRelease))return false;
 const post=profile.projectsPostcondition;
 if(!exact(post,POSTCONDITION_KEYS)||post.schema!=="yukh-projects-effect-b-postcondition-v1"||post.capability!=="projects.add-dependency.v1"||post.relationship!=="blocks"||post.blockingIssueNumber!==201||post.blockedIssueNumber!==202||post.expected!=="present"||post.targetProfileDigest!==profile.targetProfileDigest||profile.projectsPostconditionBindingDigest!==postconditionDigest(post))return false;
 if(!exact(profile.mcpVerifierRelease,MCP_VERIFIER_RELEASE_KEYS)||!COMMIT.test(profile.mcpVerifierRelease.sourceCommit)||!DIGEST.test(profile.mcpVerifierRelease.artifactSha256)||!DIGEST.test(profile.mcpCapabilityDefinitionDigest)||!DIGEST.test(profile.mcpProviderImplementationDigest)||profile.projectsLeaseScopeDigest!==leaseScopeDigest(expected)||!DIGEST.test(profile.projectsLeaseHolderDigest)||!safeInteger(profile.coordinationEpoch)||profile.coordinationEpoch<1)return false;
 return profile.wrapperProfileDigest===digest(canonicalJson(profileBinding(profile)));
}
function mcpValid(value:unknown):value is VerifiedMcpEffectBAdmission{
 if(!exact(value,MCP_KEYS))return false;
 const item=value as unknown as VerifiedMcpEffectBAdmission;
 const digests=[
  item.artifactDigest,item.mcpPlanId,item.mcpOperationDigest,item.mcpSubjectBindingDigest,
  item.mcpAuthenticationContextDigest,item.mcpCapabilityDefinitionDigest,
  item.mcpProviderImplementationDigest,item.mcpNonceBindingDigest,item.mcpNonceComparisonDigest,
  item.previewPlanEnvelopeDigest,item.projectsPlanId,item.projectsOperationDigest,
  item.projectsTargetBindingDigest,item.projectsPostconditionBindingDigest,item.wrapperProfileDigest,
  item.projectsLeaseScopeDigest,item.projectsLeaseHolderDigest
 ];
 return digests.every(entry=>DIGEST.test(entry))&&COMMIT.test(item.mcpPolicyCommit)&&
  bounded(item.projectsPrincipalRef)&&producer(item.projectsProducerRelease)&&
  wrapper(item.wrapperRelease)&&COMMIT.test(item.mcpVerifierRelease.sourceCommit)&&
  DIGEST.test(item.mcpVerifierRelease.artifactSha256)&&safeInteger(item.coordinationEpoch)&&
  item.coordinationEpoch>0&&safeInteger(item.issuedAtMs)&&safeInteger(item.expiresAtMs)&&
  item.issuedAtMs<=item.expiresAtMs;
}
function trustValid(value:unknown):value is PrivateTrust{
 return exact(value,TRUST_KEYS)&&(typeof value.publicKey==="string"||Buffer.isBuffer(value.publicKey))&&
  Array.isArray(value.allowedIssuerRefs)&&value.allowedIssuerRefs.length>0&&
  value.allowedIssuerRefs.length<=16&&value.allowedIssuerRefs.every(item=>bounded(item))&&
  new Set(value.allowedIssuerRefs).size===value.allowedIssuerRefs.length&&
  DIGEST.test(String(value.trustRootFingerprint));
}
function hostCapsuleValue(value:unknown):value is HostCapsuleValue{
 return exact(value,HOST_CAPSULE_KEYS)&&typeof value.source==="string"&&rec(value.profile)&&
  typeof value.readFetch==="function"&&typeof value.writeFetch==="function"&&
  typeof value.coordinationFetch==="function"&&typeof value.nowMs==="function"&&typeof value.jti==="function";
}
function abortValue(value:unknown):value is AbortValue{return exact(value,ABORT_KEYS)&&typeof value.aborted==="function";}
function isAborted(value:AbortValue):boolean{try{return value.aborted()!==false;}catch{return true;}}
function guardedFetch(fetcher:typeof globalThis.fetch,abort:AbortValue):typeof globalThis.fetch{
 return async(input,init)=>{if(isAborted(abort))throw new TypeError("effect B aborted");return fetcher(input,init);};
}
function approvalBytes(value:unknown):{bytes:string;artifact:SignedApprovalEnvelope}|null{
 if(typeof value!=="string")return null;
 const parsed=canonicalObject(value,32*1024);
 return parsed?{bytes:value,artifact:parsed as unknown as SignedApprovalEnvelope}:null;
}
function handle(value:unknown,kind:HandleKind):HandleRecord|null{
 if(!rec(value))return null;
 const found=privateHandles.get(value);
 return found?.kind===kind&&!found.consumed?found:null;
}
function consume(records:readonly HandleRecord[]):void{records.forEach(record=>{record.consumed=true;});}
async function close(records:readonly HandleRecord[]):Promise<void>{
 for(const record of records){
  if(record.close)try{await record.close();}catch{/* cleanup cannot rewrite the terminal result */}
 }
}
function invocationRecords(invocation:unknown):{invocation:McpEffectBControlledApplyInvocationV1;records:HandleRecord[]}|null{
 if(!exact(invocation,INVOCATION_KEYS)||invocation.schema!=="yukh-projects-mcp-effect-b-invocation-v1"||invocation.attempt!==1)return null;
 const typed=invocation as unknown as McpEffectBControlledApplyInvocationV1;
 const requested:[unknown,HandleKind][]=[
  [typed.mcpVerifiedAdmissionHandle,"mcp"],[typed.projectsApprovalHandle,"projects-approval"],
  [typed.projectsTrustHandle,"projects-trust"],[typed.bridgeHandle,"bridge"],
  [typed.bridgeTrustHandle,"bridge-trust"],[typed.hostCapsuleHandle,"capsule"],
  [typed.readCredentialHandle,"read-secret"],[typed.writeCredentialHandle,"write-secret"],
  [typed.abortHandle,"abort"]
 ];
 const records=requested.map(([value,kind])=>handle(value,kind));
 if(records.some(record=>!record))return null;
 const found=records as HandleRecord[],bundle=found[0]!.bundle;
 if(found.some(record=>record.bundle!==bundle)||new Set(requested.map(([value])=>value)).size!==requested.length)return null;
 return{invocation:typed,records:found};
}
function pairMatches(claims:ApprovalClaims,verified:VerifiedBridge,approvalDigest:string,trust:PrivateTrust,now:number):boolean{
 const bridge=verified.claims;
 return bridge.approvalV1Digest===approvalDigest&&bridge.projectsPlanId===claims.planId&&
  bridge.projectsOperationDigest===claims.operationDigest&&bridge.issuerRef===claims.issuerRef&&
  bridge.subjectRef===claims.subjectRef&&bridge.scopeDigest===claims.scopeDigest&&
  bridge.environment===claims.environment&&bridge.protectedEnvironment===claims.protectedEnvironment&&
  bridge.issuedAtMs===claims.issuedAtMs&&bridge.expiresAtMs===claims.expiresAtMs&&
  bridge.nonce===claims.nonce&&bridge.projectsNonceBindingDigest===projectNonceDigest(claims.nonce)&&
  bridge.trustRootFingerprint===trust.trustRootFingerprint&&claims.keyFingerprint===verified.keyFingerprint&&
  claims.issuedAtMs<=now&&claims.expiresAtMs>=now&&claims.expiresAtMs-claims.issuedAtMs<=15*60*1000;
}
function profileMatches(profile:McpEffectBFixedProfile,bridge:ProjectsApprovalBridgeV2Claims,mcp:VerifiedMcpEffectBAdmission):boolean{
 return bridge.previewPlanEnvelopeDigest===profile.previewPlanEnvelopeDigest&&
  bridge.projectsPlanId===profile.projectsPlanId&&bridge.projectsOperationDigest===profile.projectsOperationDigest&&
  bridge.projectsTargetBindingDigest===profile.targetProfileDigest&&bridge.projectsPostconditionBindingDigest===profile.projectsPostconditionBindingDigest&&
  sameProducer(bridge.projectsProducerRelease,profile.projectsProducerRelease)&&sameWrapper(bridge.wrapperRelease,profile.wrapperRelease)&&
  bridge.wrapperProfileDigest===profile.wrapperProfileDigest&&bridge.protectedEnvironment===profile.protectedEnvironment&&
  bridge.projectsLeaseScopeDigest===profile.projectsLeaseScopeDigest&&bridge.projectsLeaseHolderDigest===profile.projectsLeaseHolderDigest&&
  bridge.coordinationEpoch===profile.coordinationEpoch&&mcp.previewPlanEnvelopeDigest===profile.previewPlanEnvelopeDigest&&
  mcp.projectsPlanId===profile.projectsPlanId&&mcp.projectsOperationDigest===profile.projectsOperationDigest&&
  mcp.projectsTargetBindingDigest===profile.targetProfileDigest&&mcp.projectsPostconditionBindingDigest===profile.projectsPostconditionBindingDigest&&
  sameProducer(mcp.projectsProducerRelease,profile.projectsProducerRelease)&&sameWrapper(mcp.wrapperRelease,profile.wrapperRelease)&&
  mcp.wrapperProfileDigest===profile.wrapperProfileDigest&&canonicalJson(mcp.mcpVerifierRelease)===canonicalJson(profile.mcpVerifierRelease)&&
  mcp.mcpCapabilityDefinitionDigest===profile.mcpCapabilityDefinitionDigest&&mcp.mcpProviderImplementationDigest===profile.mcpProviderImplementationDigest&&
  mcp.mcpPolicyCommit===profile.policyCommit&&mcp.projectsLeaseScopeDigest===profile.projectsLeaseScopeDigest&&
  mcp.projectsLeaseHolderDigest===profile.projectsLeaseHolderDigest&&mcp.coordinationEpoch===profile.coordinationEpoch;
}
function compoundMatches(bridge:ProjectsApprovalBridgeV2Claims,mcp:VerifiedMcpEffectBAdmission,now:number):boolean{
 return bridge.mcpApprovalDigest===mcp.artifactDigest&&bridge.mcpPlanId===mcp.mcpPlanId&&
  bridge.mcpOperationDigest===mcp.mcpOperationDigest&&bridge.mcpSubjectBindingDigest===mcp.mcpSubjectBindingDigest&&
  bridge.mcpAuthenticationContextDigest===mcp.mcpAuthenticationContextDigest&&
  bridge.mcpCapabilityDefinitionDigest===mcp.mcpCapabilityDefinitionDigest&&
  bridge.mcpProviderImplementationDigest===mcp.mcpProviderImplementationDigest&&
  bridge.mcpPolicyCommit===mcp.mcpPolicyCommit&&bridge.mcpNonceBindingDigest===mcp.mcpNonceBindingDigest&&
  bridge.subjectRef===mcp.projectsPrincipalRef&&bridge.issuedAtMs>=mcp.issuedAtMs&&
  bridge.expiresAtMs<=mcp.expiresAtMs&&bridge.issuedAtMs<=now&&bridge.expiresAtMs>=now&&
  bridge.expiresAtMs-bridge.issuedAtMs<=15*60*1000&&
  bridge.projectsNonceBindingDigest!==bridge.mcpNonceBindingDigest&&
  nonceComparisonDigest(bridge.nonce)!==mcp.mcpNonceComparisonDigest;
}
function planMatches(plan:ReconciliationPlan,profile:McpEffectBFixedProfile):boolean{
 return plan.planId===profile.projectsPlanId&&plan.operations.length===1&&
  digest(canonicalJson(plan.operations))===profile.projectsOperationDigest&&
  exactPlanOperation(plan.operations[0]!,profile);
}
function reportObserved(report:PublicApplyReport,count:number):boolean{
 return report.schema===1&&report.status==="success"&&report.remaining===0&&count===1&&
  report.counts.verified===1&&report.counts.already_converged===0&&
  report.counts.failed===0&&report.counts.not_attempted===0&&report.diagnostics.length===0;
}
function fixedWriteFetch(value:HostCapsuleValue,counter:{mutations:number},abort:AbortValue):typeof globalThis.fetch{
 return async(input,init)=>{
  if(isAborted(abort))throw new TypeError("effect B aborted");
  if(counter.mutations!==0||String(input)!=="https://api.github.com/graphql"||init?.method!=="POST"||typeof init.body!=="string")throw new TypeError("invalid fixed mutation request");
  let body:unknown;
  try{body=JSON.parse(init.body);}catch{throw new TypeError("invalid fixed mutation request");}
  const variables=rec(body)&&rec(body.variables)&&rec(body.variables.input)?body.variables.input:null;
  if(!variables||variables.issueId!==value.profile.target.blockedIssueRef||variables.blockingIssueId!==value.profile.target.expectedScope.issueRef)throw new TypeError("invalid fixed mutation request");
  counter.mutations=1;
  return value.writeFetch(input,init);
 };
}
function capsuleValid(value:HostCapsuleValue,trust:PrivateTrust,readSecret:string,writeSecret:string):ReturnType<typeof parseProtectedHostCapsule>|null{
 let parsed:ReturnType<typeof parseProtectedHostCapsule>;
 try{parsed=parseProtectedHostCapsule(value.source,{scope:value.profile.target.requestedScope,environment:value.profile.protectedEnvironment},{nowMs:value.nowMs,jti:value.jti});}catch{return null;}
 const options=parsed.options;
 if(options.enablement!=="apply-explicitly-enabled"||canonicalJson(options.allowedIssuerRefs)!==canonicalJson(trust.allowedIssuerRefs)||
  options.holderDigest!==value.profile.projectsLeaseHolderDigest||options.coordinationEpoch!==value.profile.coordinationEpoch||
  options.permissions.projects!=="none"||options.permissions.issues!=="write"||options.permissions.extraPermissions.length!==0||
  canonicalJson(options.approvedKinds)!==canonicalJson(["add_blocked_by"])||
  (options.rate.maxRestRequests??Number.POSITIVE_INFINITY)>32||(options.rate.maxGraphqlRequests??Number.POSITIVE_INFINITY)>4||(options.rate.maxGraphqlPoints??Number.POSITIVE_INFINITY)>500||
  (options.rate.restReserve??0)<500||(options.rate.graphqlReserve??0)<500||readSecret===writeSecret)return null;
 return parsed;
}

export async function runMcpEffectBControlledApplyV1(invocation:McpEffectBControlledApplyInvocationV1):Promise<McpEffectBControlledApplyResultV1>{
 const resolved=invocationRecords(invocation);
 if(!resolved)return rejected("YKP-MCP-WRAPPER-001");
 const [mcpRecord,approvalRecord,projectsTrustRecord,bridgeRecord,bridgeTrustRecord,capsuleRecord,readRecord,writeRecord,abortRecord]=resolved.records;
 consume(resolved.records);
 const bundle=mcpRecord!.bundle;
 let result:McpEffectBControlledApplyResultV1=rejected("YKP-MCP-WRAPPER-001");
 try{
  const mcp=mcpRecord!.value;
  if(!mcpValid(mcp)){result=rejected("YKP-MCP-WRAPPER-002");return result;}
  const approval=approvalBytes(approvalRecord!.value),projectsTrust=projectsTrustRecord!.value,bridgeSource=bridgeRecord!.value,bridgeTrust=bridgeTrustRecord!.value,capsule=capsuleRecord!.value,readSecret=readRecord!.value,writeSecret=writeRecord!.value,abort=abortRecord!.value;
  if(!approval||!trustValid(projectsTrust)||typeof bridgeSource!=="string"||!trustValid(bridgeTrust)||!hostCapsuleValue(capsule)||typeof readSecret!=="string"||typeof writeSecret!=="string"||!abortValue(abort)){result=rejected("YKP-MCP-WRAPPER-001");return result;}
  const projectKey=publicKey(projectsTrust.publicKey),bridgeKey=publicKey(bridgeTrust.publicKey);
  if(!projectKey||!bridgeKey||projectKey.fingerprint!==bridgeKey.fingerprint||canonicalJson(projectsTrust.allowedIssuerRefs)!==canonicalJson(bridgeTrust.allowedIssuerRefs)||projectsTrust.trustRootFingerprint!==bridgeTrust.trustRootFingerprint){result=rejected("YKP-MCP-WRAPPER-005");return result;}
  const projectsClaims=verifySignedApproval(approval.artifact,projectsTrust);
  if(!projectsClaims){result=rejected("YKP-MCP-WRAPPER-003");return result;}
  const bridge=verifyBridge(bridgeSource,bridgeTrust);
  if(!bridge){result=rejected("YKP-MCP-WRAPPER-004");return result;}
  const hostValue=capsule;
  let now:number;
  try{now=hostValue.nowMs();}catch{result=rejected("YKP-MCP-WRAPPER-006");return result;}
  if(!safeInteger(now)||!pairMatches(projectsClaims,bridge,digest(approval.bytes),projectsTrust,now)){result=rejected("YKP-MCP-WRAPPER-005");return result;}
  if(!compoundMatches(bridge.claims,mcp,now)){result=rejected("YKP-MCP-WRAPPER-005");return result;}
  if(!profileValid(hostValue.profile)||!profileMatches(hostValue.profile,bridge.claims,mcp)){result=rejected("YKP-MCP-WRAPPER-006");return result;}
  if(projectsClaims.subjectRef!==hostValue.profile.target.expectedScope.subjectRef||projectsClaims.scopeDigest!==scopeDigest(hostValue.profile.target.expectedScope)||projectsClaims.planId!==hostValue.profile.projectsPlanId||projectsClaims.operationDigest!==hostValue.profile.projectsOperationDigest){result=rejected("YKP-MCP-WRAPPER-005");return result;}
  if(!bounded(readSecret,4096)||!bounded(writeSecret,4096)||isAborted(abort)){result=rejected("YKP-MCP-WRAPPER-007");return result;}
  const parsedCapsule=capsuleValid(hostValue,projectsTrust,readSecret,writeSecret);
  if(!parsedCapsule){result=rejected("YKP-MCP-WRAPPER-007");return result;}
  const counter={mutations:0};
  const options={...parsedCapsule.options,relatedIssueNumbers:[202],coordination:{...parsedCapsule.options.coordination,fetch:guardedFetch(hostValue.coordinationFetch,abort)},readFetch:guardedFetch(hostValue.readFetch,abort),writeFetch:fixedWriteFetch(hostValue,counter,abort),nowMs:hostValue.nowMs};
  let runtime:Awaited<ReturnType<ReturnType<typeof createControlledApplyHostFactory>["create"]>>;
  try{
   runtime=await createControlledApplyHostFactory(options).create({reconciliationMode:"native-v1",requestedScope:hostValue.profile.target.requestedScope,policySource:hostValue.profile.policySource,readToken:readSecret,writeToken:writeSecret});
  }catch{result=rejected("YKP-MCP-WRAPPER-008");return result;}
  if(isAborted(abort)){result=rejected("YKP-MCP-WRAPPER-008");return result;}
  if(canonicalJson(runtime.scope)!==canonicalJson(hostValue.profile.target.expectedScope)){result=rejected("YKP-MCP-WRAPPER-006");return result;}
  let freshPlan:ReconciliationPlan;
  try{freshPlan=await runtime.host.ports.replan();}catch{result=rejected("YKP-MCP-WRAPPER-008");return result;}
  if(!planMatches(freshPlan,hostValue.profile)){result=rejected("YKP-MCP-WRAPPER-006");return result;}
  let report:PublicApplyReport;
  try{
   report=await runApplyEntrypoint({approvedPlanId:hostValue.profile.projectsPlanId,protectedEnvironment:hostValue.profile.protectedEnvironment,scope:runtime.scope,approvalArtifact:approval.artifact,approvalPublicKey:projectsTrust.publicKey},runtime.host);
  }catch{result=counter.mutations===0?rejected("YKP-MCP-WRAPPER-008"):unknown(counter.mutations);return result;}
  if(reportObserved(report,counter.mutations)){
   result={schema:"yukh-projects-mcp-effect-b-result-v1",status:"effect_observed",effectBoundaryEntered:true,mutationRequestCount:1,changed:true,remaining:0};
   return result;
  }
  result=counter.mutations===0?rejected(report.schema===1?"YKP-MCP-WRAPPER-008":"YKP-MCP-WRAPPER-010"):unknown(counter.mutations);
  return result;
 }finally{
  terminalResults.set(bundle,result);
  await close(resolved.records);
 }
}

function privateHandle(kind:HandleKind,bundle:object,value:unknown,close?:AsyncClose):object{
 const item=Object.create(null) as Rec;
 Object.defineProperty(item,"toJSON",{value:()=>{throw new TypeError("private handle");},enumerable:false});
 Object.freeze(item);
 privateHandles.set(item,{kind,bundle,value,close,consumed:false});
 return item;
}

/** @internal */
export interface McpEffectBPrivateBundleInput{
 mcpAdmission:VerifiedMcpEffectBAdmission;
 projectsApprovalBytes:string;
 projectsTrust:PrivateTrust;
 bridgeBytes:string;
 bridgeTrust:PrivateTrust;
 hostCapsule:HostCapsuleValue;
 readCredential:string;
 writeCredential:string;
 abort:AbortValue;
 close?:AsyncClose;
}

/** @internal */
export function mintMcpEffectBPrivateInvocationForTest(input:McpEffectBPrivateBundleInput):McpEffectBControlledApplyInvocationV1{
 const bundle=Object.freeze({});
 return{
  schema:"yukh-projects-mcp-effect-b-invocation-v1",
  attempt:1,
  mcpVerifiedAdmissionHandle:privateHandle("mcp",bundle,input.mcpAdmission,input.close) as PrivateSingleUseMcpVerificationHandle,
  projectsApprovalHandle:privateHandle("projects-approval",bundle,input.projectsApprovalBytes,input.close) as PrivateSingleUseArtifactHandle,
  projectsTrustHandle:privateHandle("projects-trust",bundle,input.projectsTrust,input.close) as PrivateSingleUseTrustHandle,
  bridgeHandle:privateHandle("bridge",bundle,input.bridgeBytes,input.close) as PrivateSingleUseArtifactHandle,
  bridgeTrustHandle:privateHandle("bridge-trust",bundle,input.bridgeTrust,input.close) as PrivateSingleUseTrustHandle,
  hostCapsuleHandle:privateHandle("capsule",bundle,input.hostCapsule,input.close) as PrivateSingleUseArtifactHandle,
  readCredentialHandle:privateHandle("read-secret",bundle,input.readCredential,input.close) as PrivateSingleUseSecretHandle,
  writeCredentialHandle:privateHandle("write-secret",bundle,input.writeCredential,input.close) as PrivateSingleUseSecretHandle,
  abortHandle:privateHandle("abort",bundle,input.abort,input.close) as PrivateAbortHandle
 };
}

/** @internal */
export function projectsApprovalBridgeV2SigningInputForTest(envelope:Omit<ProjectsApprovalBridgeV2Envelope,"signature">):Buffer{return bridgeSigningInput(envelope);}
/** @internal */
export function verifyProjectsApprovalBridgeV2ForTest(source:string,trust:PrivateTrust):ProjectsApprovalBridgeV2Claims|null{return verifyBridge(source,trust)?.claims??null;}
/** @internal */
export function mcpEffectBDigestForTest(value:unknown):string{return digest(typeof value==="string"?value:canonicalJson(value));}
/** @internal */
export function mcpEffectBProjectNonceDigestForTest(value:string):string{return projectNonceDigest(value);}
/** @internal */
export function mcpEffectBNonceComparisonDigestForTest(value:string):string{return nonceComparisonDigest(value);}
/** @internal */
export function mcpEffectBLeaseScopeDigestForTest(value:BoundScope):string{return leaseScopeDigest(value);}
/** @internal */
export function mcpEffectBProfileDigestForTest(value:McpEffectBFixedProfile):string{return digest(canonicalJson(profileBinding(value)));}
/** @internal */
export function projectsApprovalTrustFingerprintForTest(keyFingerprint:string,issuerRefs:readonly string[]):string{return trustProfileFingerprint(keyFingerprint,issuerRefs);}
/** @internal */
export function mcpEffectBTerminalResultForTest(invocation:McpEffectBControlledApplyInvocationV1):McpEffectBControlledApplyResultV1|null{
 const record=privateHandles.get(invocation.mcpVerifiedAdmissionHandle as object);
 return record?terminalResults.get(record.bundle)??null:null;
}
