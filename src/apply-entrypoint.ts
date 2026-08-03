import { verifySignedApproval } from "./apply-approval.js";
import { bindApplyCoordination, type ApplyCoordinationStore } from "./apply-coordination.js";
import { executeControlledPlan, renderPublicApplyReport, type ExecutorPorts, type PublicApplyReport } from "./executor.js";
import type { BoundScope } from "./planner.js";

export interface ApplyEntrypointRequest{approvedPlanId:string;protectedEnvironment:string;scope:BoundScope;approvalArtifact:unknown;approvalPublicKey:Buffer|string}
export interface ApplyEntrypointHost{enablement:string;allowedIssuerRefs:readonly string[];holderDigest:string;coordinationEpoch:number;coordinationStore:ApplyCoordinationStore;ports:Omit<ExecutorPorts,"verifyApproval"|"acquireLease"|"consumeNonce">}

export async function runApplyEntrypoint(request:ApplyEntrypointRequest,host:ApplyEntrypointHost):Promise<PublicApplyReport>{
 const now=host.ports.nowMs();if(!Number.isSafeInteger(now))throw new TypeError("invalid apply host clock");
 const ports=bindApplyCoordination({...host.ports,verifyApproval:async artifact=>verifySignedApproval(artifact,{publicKey:request.approvalPublicKey,allowedIssuerRefs:host.allowedIssuerRefs})},host.coordinationStore,{holderDigest:host.holderDigest,expiresAtMs:now+15*60*1000,epoch:host.coordinationEpoch});
 return renderPublicApplyReport(await executeControlledPlan({approvedPlanId:request.approvedPlanId,scope:request.scope,approval:request.approvalArtifact,enablement:host.enablement,protectedEnvironment:request.protectedEnvironment},ports));
}
