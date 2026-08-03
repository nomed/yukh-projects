export interface PublicationReceipt { tag:string; commit:string; releaseId:string }
export interface PublicationPort {
  immutableReleasesEnabled():Promise<boolean>;
  tagTarget(tag:string):Promise<string|undefined>;
  releaseForTag(tag:string):Promise<string|undefined>;
  createDraftRelease(tag:string,version:string,commit:string):Promise<string>;
  uploadAssets(releaseId:string,assets:readonly string[]):Promise<void>;
  publishRelease(releaseId:string):Promise<void>;
  releaseIsImmutable(releaseId:string):Promise<boolean>;
}
export interface PublicationCandidate { version:string;commit:string;tag:string;assets:readonly string[] }

const VERSION=/^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u;
const SHA=/^[0-9a-f]{40}$/u;
export async function publishCandidate(candidate:PublicationCandidate,port:PublicationPort):Promise<PublicationReceipt>{
 if(!VERSION.test(candidate.version)||!SHA.test(candidate.commit)||candidate.tag!==`v${candidate.version}`)throw new TypeError("publication candidate is invalid");
 const assets=[...candidate.assets];if(assets.length!==6||new Set(assets).size!==assets.length||assets.some(value=>!/^yukh-projects-[a-z0-9.-]+$/u.test(value)))throw new TypeError("publication asset set is invalid");
 if(!await port.immutableReleasesEnabled())throw new Error("immutable releases are not enabled");
 if(await port.tagTarget(candidate.tag)!==undefined||await port.releaseForTag(candidate.tag)!==undefined)throw new Error("publication state already exists");
 const releaseId=await port.createDraftRelease(candidate.tag,candidate.version,candidate.commit);if(!releaseId)throw new Error("draft release receipt mismatch");
 await port.uploadAssets(releaseId,assets);
 await port.publishRelease(releaseId);
 if(await port.tagTarget(candidate.tag)!==candidate.commit)throw new Error("published tag receipt mismatch");
 if(await port.releaseForTag(candidate.tag)!==releaseId||!await port.releaseIsImmutable(releaseId))throw new Error("published release receipt mismatch");
 return{tag:candidate.tag,commit:candidate.commit,releaseId};
}
