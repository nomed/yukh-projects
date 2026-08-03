import { createHash } from "node:crypto";

export interface ReleaseArtifact { path:string; bytes:Uint8Array }
export interface WouldPublishManifest { schema:1;version:string;commit:string;tag:string;artifacts:readonly {path:string;sha256:string;bytes:number}[];publication:"disabled" }
export function createWouldPublishManifest(version:string,commit:string,packageVersion:string,changelog:string,artifacts:readonly ReleaseArtifact[]):WouldPublishManifest{
 if(!/^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u.test(version)||packageVersion!==version||!/^[0-9a-f]{40}$/u.test(commit)||!new RegExp(`^## (?:\\[)?${version.replaceAll(".","\\.")}(?:\\])?(?:$|\\s|\\()`,"mu").test(changelog))throw new TypeError("release candidate is invalid");
 const seen=new Set<string>();const normalized=artifacts.map(artifact=>{if(!artifact.path||seen.has(artifact.path)||artifact.bytes.byteLength===0)throw new TypeError("release artifact is invalid");seen.add(artifact.path);return{path:artifact.path,sha256:createHash("sha256").update(artifact.bytes).digest("hex"),bytes:artifact.bytes.byteLength};}).sort((a,b)=>a.path.localeCompare(b.path));if(normalized.length!==5)throw new TypeError("release artifact set is incomplete");return{schema:1,version,commit,tag:`v${version}`,artifacts:normalized,publication:"disabled"};
}
