import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, readFile, readdir, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";

export const RELEASE_MANIFEST_PATH="release/1.8.0/release-manifest.json";
export const RELEASE_VERSION="1.8.0";
export const RELEASE_TAG="v1.8.0";
export const RELEASE_REPOSITORY="nomed/yukh-projects";
export const RELEASE_ASSET_NAMES=[
 "yukh-projects-1.8.0.provenance.json",
 "yukh-projects-1.8.0.spdx.json",
 "yukh-projects-action-1.8.0.js",
 "yukh-projects-action-1.8.0.yml",
 "yukh-projects-apply-action-1.8.0.js",
 "yukh-projects-apply-action-1.8.0.yml",
 "yukh-projects-apply-cli-1.8.0.js",
 "yukh-projects-apply-library-1.8.0.js",
 "yukh-projects-apply-manifest-1.8.0.json",
 "yukh-projects-cli-1.8.0.js",
 "yukh-projects-lock-1.8.0.json",
 "yukh-projects-mcp-effect-b-1.8.0.js",
 "yukh-projects-mcp-effect-b-bridge-v2-vector-1.8.0.json",
 "yukh-projects-mcp-effect-b-manifest-1.8.0.json",
 "yukh-projects-package-1.8.0.tgz",
 "yukh-projects-release-notes-1.8.0.md"
];
export const RELEASE_CHECKSUM_NAME="yukh-projects-1.8.0.sha256";
const COMMIT=/^[0-9a-f]{40}$/u;
const DIGEST=/^[0-9a-f]{64}$/u;
const SOURCE=/^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/u;
const MANIFEST_KEYS=["schema","repository","version","tag","source","assets","checksum","publication"];
const SOURCE_KEYS=["implementationCommit","implementationTree"];
const ASSET_KEYS=["name","source","sha256","bytes"];
const CHECKSUM_KEYS=["name","source","sha256","bytes","covers"];

export function sha256(bytes){
 return createHash("sha256").update(bytes).digest("hex");
}

async function readRegularNoFollow(path){
 const handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{
  const info=await handle.stat();
  if(!info.isFile())throw new Error("release asset is not a regular file");
  return await handle.readFile();
 }finally{await handle.close();}
}

function exact(value,keys){
 return value!==null&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).join("\0")===keys.join("\0");
}

export function validateReleaseManifest(value){
 if(!exact(value,MANIFEST_KEYS)||value.schema!==1||value.repository!==RELEASE_REPOSITORY||value.version!==RELEASE_VERSION||value.tag!==RELEASE_TAG||value.publication!=="disabled")throw new Error("release manifest identity is invalid");
 if(!exact(value.source,SOURCE_KEYS)||!COMMIT.test(value.source.implementationCommit)||!COMMIT.test(value.source.implementationTree))throw new Error("release manifest source is invalid");
 if(!Array.isArray(value.assets)||value.assets.length!==RELEASE_ASSET_NAMES.length)throw new Error("release manifest asset count is invalid");
 const names=[];
 for(const asset of value.assets){
  if(!exact(asset,ASSET_KEYS)||!RELEASE_ASSET_NAMES.includes(asset.name)||!SOURCE.test(asset.source)||!DIGEST.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<1)throw new Error("release manifest asset is invalid");
  names.push(asset.name);
 }
 if(names.join("\0")!==[...RELEASE_ASSET_NAMES].sort().join("\0")||new Set(names).size!==names.length)throw new Error("release manifest allowlist is invalid");
 if(!exact(value.checksum,CHECKSUM_KEYS)||value.checksum.name!==RELEASE_CHECKSUM_NAME||!SOURCE.test(value.checksum.source)||!DIGEST.test(value.checksum.sha256)||!Number.isSafeInteger(value.checksum.bytes)||value.checksum.bytes<1||value.checksum.covers!==RELEASE_ASSET_NAMES.length)throw new Error("release checksum descriptor is invalid");
 return value;
}

export async function readReleaseManifest(path=RELEASE_MANIFEST_PATH){
 const bytes=await readFile(path);
 const source=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
 const value=validateReleaseManifest(JSON.parse(source));
 if(`${JSON.stringify(value,null,2)}\n`!==source)throw new Error("release manifest is not canonical");
 return{value,bytes,digest:sha256(bytes)};
}

export async function readVerifiedSource(root,entry){
 const rootReal=await realpath(root);
 const path=resolve(rootReal,entry.source);
 const pathReal=await realpath(path);
 if((pathReal!==rootReal&&!pathReal.startsWith(`${rootReal}${sep}`))||pathReal!==path)throw new Error("release asset source escapes repository");
 const bytes=await readRegularNoFollow(pathReal);
 if(bytes.byteLength!==entry.bytes||sha256(bytes)!==entry.sha256)throw new Error("release asset source digest mismatch");
 return bytes;
}

export function expectedChecksum(manifest){
 return manifest.assets.map(asset=>`${asset.sha256}  ${asset.name}\n`).join("");
}

export async function verifyReleaseSources(manifest,root=process.cwd()){
 for(const asset of manifest.assets)await readVerifiedSource(root,asset);
 const checksumBytes=await readVerifiedSource(root,manifest.checksum);
 const checksumSource=new TextDecoder("utf-8",{fatal:true}).decode(checksumBytes);
 if(checksumSource!==expectedChecksum(manifest))throw new Error("release checksum content mismatch");
}

export async function verifyReleaseAssetDirectory(manifest,directory){
 const entries=await readdir(directory,{withFileTypes:true});
 const names=entries.map(entry=>entry.name).sort();
 const expected=[...RELEASE_ASSET_NAMES,RELEASE_CHECKSUM_NAME].sort();
 if(names.join("\0")!==expected.join("\0")||entries.some(entry=>!entry.isFile()||entry.isSymbolicLink()))throw new Error("release asset directory is incomplete");
 for(const asset of manifest.assets){
  const bytes=await readRegularNoFollow(resolve(directory,asset.name));
  if(bytes.byteLength!==asset.bytes||sha256(bytes)!==asset.sha256)throw new Error("release asset directory digest mismatch");
 }
 const checksumBytes=await readRegularNoFollow(resolve(directory,manifest.checksum.name));
 if(checksumBytes.byteLength!==manifest.checksum.bytes||sha256(checksumBytes)!==manifest.checksum.sha256||new TextDecoder("utf-8",{fatal:true}).decode(checksumBytes)!==expectedChecksum(manifest))throw new Error("release asset directory checksum mismatch");
 const finalNames=(await readdir(directory,{withFileTypes:true})).map(entry=>entry.name).sort();
 if(finalNames.join("\0")!==expected.join("\0"))throw new Error("release asset directory changed during verification");
}
