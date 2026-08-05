type RecordValue=Record<string,unknown>;
const DIGEST=/^[a-f0-9]{64}$/u;
const REASONS=["rest-reserve","graphql-reserve","provider-secondary-limit"] as const;
export type DeferredReason=typeof REASONS[number];
export interface DeferredReceiptV1{
 schema:1;
 version:"deferred-receipt-v1";
 status:"deferred";
 reason:DeferredReason;
 issued_at_ms:number;
 resume_after_ms:number;
 resume_by_ms:number;
 bindings:{scope_digest:string;request_digest:string;plan_digest:string|null};
 ownership:
  |{disposition:"retained";mode:"durable-host";wakeup_digest:string;cancellation_digest:string}
  |{disposition:"handoff";mode:"governed-handoff";wakeup_digest:null;cancellation_digest:null};
 fresh_approval_required:boolean;
}

function record(value:unknown):value is RecordValue{return typeof value==="object"&&value!==null&&!Array.isArray(value);}
function exact(value:RecordValue,keys:readonly string[]):void{if(Object.keys(value).sort().join("\0")!==[...keys].sort().join("\0"))throw new TypeError("invalid deferred receipt");}
function integer(value:unknown):number{if(!Number.isSafeInteger(value)||(value as number)<0)throw new TypeError("invalid deferred receipt");return value as number;}
function digest(value:unknown):string{if(typeof value!=="string"||!DIGEST.test(value))throw new TypeError("invalid deferred receipt");return value;}

export function parseDeferredReceiptV1(source:unknown):DeferredReceiptV1{
 if(!record(source))throw new TypeError("invalid deferred receipt");
 exact(source,["schema","version","status","reason","issued_at_ms","resume_after_ms","resume_by_ms","bindings","ownership","fresh_approval_required"]);
 if(source.schema!==1||source.version!=="deferred-receipt-v1"||source.status!=="deferred"||!REASONS.includes(source.reason as DeferredReason)||typeof source.fresh_approval_required!=="boolean")throw new TypeError("invalid deferred receipt");
 const issued=integer(source.issued_at_ms),after=integer(source.resume_after_ms),by=integer(source.resume_by_ms);
 if(after<issued||by<after||by-issued>24*60*60*1000)throw new TypeError("invalid deferred receipt");
 if(!record(source.bindings))throw new TypeError("invalid deferred receipt");
 exact(source.bindings,["scope_digest","request_digest","plan_digest"]);
 const bindings={scope_digest:digest(source.bindings.scope_digest),request_digest:digest(source.bindings.request_digest),plan_digest:source.bindings.plan_digest===null?null:digest(source.bindings.plan_digest)};
 if(!record(source.ownership))throw new TypeError("invalid deferred receipt");
 exact(source.ownership,["disposition","mode","wakeup_digest","cancellation_digest"]);
 let ownership:DeferredReceiptV1["ownership"];
 if(source.ownership.disposition==="retained"&&source.ownership.mode==="durable-host")ownership={disposition:"retained",mode:"durable-host",wakeup_digest:digest(source.ownership.wakeup_digest),cancellation_digest:digest(source.ownership.cancellation_digest)};
 else if(source.ownership.disposition==="handoff"&&source.ownership.mode==="governed-handoff"&&source.ownership.wakeup_digest===null&&source.ownership.cancellation_digest===null)ownership={disposition:"handoff",mode:"governed-handoff",wakeup_digest:null,cancellation_digest:null};
 else throw new TypeError("invalid deferred receipt");
 return{schema:1,version:"deferred-receipt-v1",status:"deferred",reason:source.reason as DeferredReason,issued_at_ms:issued,resume_after_ms:after,resume_by_ms:by,bindings,ownership,fresh_approval_required:source.fresh_approval_required};
}

export function createGovernedHandoffReceipt(input:{resource:"rest"|"graphql";issuedAtMs:number;resumeAfterMs?:number;resumeByMs?:number;scopeDigest:string;requestDigest:string;planDigest:string|null;freshApprovalRequired:boolean}):DeferredReceiptV1{return parseDeferredReceiptV1({schema:1,version:"deferred-receipt-v1",status:"deferred",reason:input.resource==="rest"?"rest-reserve":"graphql-reserve",issued_at_ms:input.issuedAtMs,resume_after_ms:input.resumeAfterMs??input.issuedAtMs+60_000,resume_by_ms:input.resumeByMs??input.issuedAtMs+15*60_000,bindings:{scope_digest:input.scopeDigest,request_digest:input.requestDigest,plan_digest:input.planDigest},ownership:{disposition:"handoff",mode:"governed-handoff",wakeup_digest:null,cancellation_digest:null},fresh_approval_required:input.freshApprovalRequired});}
