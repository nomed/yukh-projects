export type CoordinationCode="YKP-COORD-001"|"YKP-COORD-002"|"YKP-COORD-003"|"YKP-COORD-004"|"YKP-COORD-005";
export class ApplyCoordinationError extends Error{constructor(readonly code:CoordinationCode){super("apply coordination failed");this.name="ApplyCoordinationError";}}
export interface NonceRequest{keyDigest:string;valueDigest:string;expiresAtMs:number;epoch:number}
export interface LeaseRequest{keyDigest:string;holderDigest:string;expiresAtMs:number;epoch:number}
export interface ApplyLease{readonly fencingToken:number;renew(expiresAtMs:number):Promise<boolean>;valid():Promise<boolean>;release():Promise<boolean>}
export interface ApplyCoordinationStore{consumeNonce(request:NonceRequest):Promise<"consumed"|"replayed">;acquireLease(request:LeaseRequest):Promise<ApplyLease|null>}

const DIGEST=/^[a-f0-9]{64}$/u;
function validTime(value:number,now:number,maxLifetimeMs:number):boolean{return Number.isSafeInteger(value)&&value>now&&value-now<=maxLifetimeMs;}
function requestOK(value:NonceRequest|LeaseRequest,now:number,maxLifetimeMs:number):boolean{return DIGEST.test(value.keyDigest)&&DIGEST.test("valueDigest" in value?value.valueDigest:value.holderDigest)&&Number.isSafeInteger(value.epoch)&&value.epoch>0&&validTime(value.expiresAtMs,now,maxLifetimeMs);}
function digest(value:string):string{return createHash("sha256").update(value).digest("hex");}
function portFailure(error:unknown):never{if(error instanceof ApplyCoordinationError){if(error.code==="YKP-COORD-004")throw new ApplyPortError("authentication");if(error.code==="YKP-COORD-005")throw new ApplyPortError("authorization");if(error.code==="YKP-COORD-002")throw new ApplyPortError("provider");throw new ApplyPortError("invariant");}throw new ApplyPortError("provider");}

export function bindApplyCoordination(base:Omit<ExecutorPorts,"acquireLease"|"consumeNonce">,store:ApplyCoordinationStore,options:{holderDigest:string;expiresAtMs:number;epoch:number}):ExecutorPorts{
 if(!DIGEST.test(options.holderDigest)||!Number.isSafeInteger(options.expiresAtMs)||!Number.isSafeInteger(options.epoch)||options.epoch<1)throw new TypeError("invalid apply coordination binding");
 return{...base,consumeNonce:async nonce=>{try{return(await store.consumeNonce({keyDigest:digest(`nonce-key\0${nonce}`),valueDigest:digest(`nonce-value\0${nonce}`),expiresAtMs:options.expiresAtMs,epoch:options.epoch}))==="consumed";}catch(error){return portFailure(error);}},acquireLease:async scopeDigest=>{let lease:ApplyLease|null;try{lease=await store.acquireLease({keyDigest:digest(`lease-key\0${scopeDigest}`),holderDigest:options.holderDigest,expiresAtMs:options.expiresAtMs,epoch:options.epoch});}catch(error){return portFailure(error);}return lease?{fencingToken:lease.fencingToken,valid:async()=>{try{return await lease.valid();}catch(error){return portFailure(error);}},release:async()=>{await lease.release();}}:null;}};
}

/** Synthetic/conformance adapter only. It is never an authoritative production store. */
export function createMemoryApplyCoordinationStore(options:{nowMs:()=>number;epoch?:number;maxLifetimeMs?:number}):ApplyCoordinationStore{
 const max=options.maxLifetimeMs??15*60*1000,epoch=options.epoch??1,nonces=new Map<string,{valueDigest:string;expiresAtMs:number}>(),leases=new Map<string,{holderDigest:string;expiresAtMs:number;revision:number;released:boolean}>();if(!Number.isSafeInteger(epoch)||epoch<1)throw new TypeError("invalid coordination epoch");let revision=0;
 return{
  consumeNonce:async request=>{const now=options.nowMs();if(!requestOK(request,now,max)||request.epoch!==epoch)throw new ApplyCoordinationError("YKP-COORD-001");if(nonces.has(request.keyDigest))return"replayed";nonces.set(request.keyDigest,{valueDigest:request.valueDigest,expiresAtMs:request.expiresAtMs});return"consumed";},
  acquireLease:async request=>{const now=options.nowMs();if(!requestOK(request,now,max)||request.epoch!==epoch)throw new ApplyCoordinationError("YKP-COORD-001");const current=leases.get(request.keyDigest);if(current&&!current.released&&current.expiresAtMs>now)return null;const state={holderDigest:request.holderDigest,expiresAtMs:request.expiresAtMs,revision:++revision,released:false};leases.set(request.keyDigest,state);const token=state.revision;return{fencingToken:token,renew:async expiresAtMs=>{const observed=leases.get(request.keyDigest),clock=options.nowMs();if(!validTime(expiresAtMs,clock,max)||observed!==state||state.released||state.expiresAtMs<=clock)return false;state.expiresAtMs=expiresAtMs;state.revision=++revision;return true;},valid:async()=>{const observed=leases.get(request.keyDigest);return observed===state&&!state.released&&state.expiresAtMs>options.nowMs();},release:async()=>{const observed=leases.get(request.keyDigest);if(observed!==state||state.released)return false;state.released=true;state.revision=++revision;return true;}};}
 };
}
import { createHash } from "node:crypto";
import { ApplyPortError, type ExecutorPorts } from "./executor.js";
