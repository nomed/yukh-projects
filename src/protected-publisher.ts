export interface PublicationReceipt { tag:string; commit:string; releaseId:string }
export interface PublicationPort {
  tagTarget(tag:string):Promise<string|undefined>;
  releaseForTag(tag:string):Promise<string|undefined>;
  createTag(tag:string,commit:string):Promise<void>;
  createRelease(tag:string,version:string,assets:readonly string[]):Promise<string>;
}
export interface PublicationCandidate { version:string;commit:string;tag:string;assets:readonly string[] }

const VERSION=/^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u;
const SHA=/^[0-9a-f]{40}$/u;
export async function publishCandidate(candidate:PublicationCandidate,port:PublicationPort):Promise<PublicationReceipt>{
 if(!VERSION.test(candidate.version)||!SHA.test(candidate.commit)||candidate.tag!==`v${candidate.version}`)throw new TypeError("publication candidate is invalid");
 const assets=[...candidate.assets];if(assets.length!==6||new Set(assets).size!==assets.length||assets.some(value=>!/^yukh-projects-[a-z0-9.-]+$/u.test(value)))throw new TypeError("publication asset set is invalid");
 if(await port.tagTarget(candidate.tag)!==undefined||await port.releaseForTag(candidate.tag)!==undefined)throw new Error("publication state already exists");
 await port.createTag(candidate.tag,candidate.commit);
 if(await port.tagTarget(candidate.tag)!==candidate.commit)throw new Error("published tag receipt mismatch");
 const releaseId=await port.createRelease(candidate.tag,candidate.version,assets);
 if(!releaseId||await port.releaseForTag(candidate.tag)!==releaseId)throw new Error("published release receipt mismatch");
 return{tag:candidate.tag,commit:candidate.commit,releaseId};
}
