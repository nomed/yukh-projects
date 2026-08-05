import { parseDeferredReceiptV1, type DeferredReceiptV1 } from "./deferred-receipt.js";

export type DeferredHostState="deferred"|"resumable"|"cancelled"|"expired";
export interface DurableDeferralPort{
 schedule(receipt:DeferredReceiptV1):Promise<{wakeupDigest:string;cancellationDigest:string}>;
 state(receipt:DeferredReceiptV1):Promise<DeferredHostState>;
 cancel(receipt:DeferredReceiptV1):Promise<void>;
}
export interface FreshResumeResult{status:"complete"|"deferred"|"blocked";receipt?:DeferredReceiptV1}

export function createResumableDeferralHost(port:DurableDeferralPort,nowMs:()=>number=Date.now){
 return{
  retain:async(source:unknown):Promise<DeferredReceiptV1>=>{const handoff=parseDeferredReceiptV1(source);if(handoff.ownership.disposition!=="handoff"||nowMs()>handoff.resume_by_ms)throw new TypeError("invalid deferral transition");const handles=await port.schedule(handoff),receipt=parseDeferredReceiptV1({...handoff,ownership:{disposition:"retained",mode:"durable-host",wakeup_digest:handles.wakeupDigest,cancellation_digest:handles.cancellationDigest}});return receipt;},
  cancel:async(source:unknown):Promise<void>=>{const receipt=parseDeferredReceiptV1(source);if(receipt.ownership.disposition!=="retained")throw new TypeError("invalid deferral transition");await port.cancel(receipt);},
  resume:async(source:unknown,freshProcess:(bindings:DeferredReceiptV1["bindings"],freshApprovalRequired:boolean)=>Promise<FreshResumeResult>):Promise<FreshResumeResult>=>{const receipt=parseDeferredReceiptV1(source),now=nowMs();if(receipt.ownership.disposition!=="retained"||now<receipt.resume_after_ms||now>receipt.resume_by_ms)throw new TypeError("invalid deferral transition");const state=await port.state(receipt);if(state!=="resumable")return{status:"blocked"};return freshProcess(receipt.bindings,receipt.fresh_approval_required);}
 };
}
