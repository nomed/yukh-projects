import type { ApplyReconciliationMode } from "./apply-host.js";

export type ControlledApplyMode="apply"|"legacy-apply-v1"|"legacy-single-token-apply-v1";

export function parseControlledApplyMode(value:string):ControlledApplyMode{
 if(value==="apply"||value==="legacy-apply-v1"||value==="legacy-single-token-apply-v1")return value;
 throw new TypeError("invalid apply mode");
}

export function allowsSharedControlledApplyCredential(mode:ControlledApplyMode):boolean{return mode==="legacy-single-token-apply-v1";}

export function reconciliationModeForControlledApply(mode:ControlledApplyMode):ApplyReconciliationMode{
 return mode==="apply"?"native-v1":mode==="legacy-apply-v1"?"legacy-v1":"legacy-single-token-v1";
}
