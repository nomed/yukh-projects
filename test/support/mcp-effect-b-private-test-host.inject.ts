interface McpEffectBTestBundleInput{
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

export function createMcpEffectBTestInvocation(input:McpEffectBTestBundleInput):McpEffectBControlledApplyInvocationV1{
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

export function projectsApprovalBridgeV2SigningInputForTest(envelope:Omit<ProjectsApprovalBridgeV2Envelope,"signature">):Buffer{return bridgeSigningInput(envelope);}
export function verifyProjectsApprovalBridgeV2ForTest(source:string,trust:PrivateTrust):ProjectsApprovalBridgeV2Claims|null{return verifyBridge(source,trust)?.claims??null;}
export function mcpEffectBDigestForTest(value:unknown):string{return digest(typeof value==="string"?value:canonicalJson(value));}
export function mcpEffectBProjectNonceDigestForTest(value:string):string{return projectNonceDigest(value);}
export function mcpEffectBNonceComparisonDigestForTest(value:string):string{return nonceComparisonDigest(value);}
export function mcpEffectBLeaseScopeDigestForTest(value:BoundScope):string{return leaseScopeDigest(value);}
export function mcpEffectBProfileDigestForTest(value:McpEffectBFixedProfile):string{return digest(canonicalJson(profileBinding(value)));}
export function projectsApprovalTrustFingerprintForTest(keyFingerprint:string,issuerRefs:readonly string[]):string{return trustProfileFingerprint(keyFingerprint,issuerRefs);}
export function mcpEffectBTerminalResultForTest(invocation:McpEffectBControlledApplyInvocationV1):McpEffectBControlledApplyResultV1|null{
 const record=privateHandles.get(invocation.mcpVerifiedAdmissionHandle as object);
 return record?terminalResults.get(record.bundle)??null:null;
}
