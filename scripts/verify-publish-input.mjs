import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readReleaseManifest, sha256, verifyReleaseAssetDirectory } from "./release-candidate-lib.mjs";

const [directory="release-assets",receiptPath="authorization-receipt.json",output="publish-input.json"]=process.argv.slice(2);
for(const name of ["GITHUB_TOKEN","GH_TOKEN","RELEASE_TOKEN","IMMUTABLE_RELEASES_READ_TOKEN","ACTIONS_ID_TOKEN_REQUEST_URL","ACTIONS_ID_TOKEN_REQUEST_TOKEN"])if(process.env[name])throw new Error("publication token is available during input verification");
const {value:manifest,bytes:manifestBytes,digest:manifestDigest}=await readReleaseManifest(resolve(directory,"release-manifest.json"));
await verifyReleaseAssetDirectory(manifest,resolve(directory,"assets"));
const receiptBytes=await readFile(receiptPath),receipt=JSON.parse(receiptBytes);
const keys=["schema","authorizationCommentId","authorizationBodySha256","releaseCommit","releaseTree","reviewedHead","reviewedTree","version","tag","assetManifestSha256","checksumIndexSha256","workflowBlobSha","effects","publication"];
if(!receipt||typeof receipt!=="object"||Array.isArray(receipt)||Object.keys(receipt).join("\0")!==keys.join("\0")||receipt.schema!=="yukh-projects-release-authorization-receipt-v1"||receipt.version!==manifest.version||receipt.tag!==manifest.tag||receipt.assetManifestSha256!==manifestDigest||receipt.checksumIndexSha256!==manifest.checksum.sha256||receipt.releaseTree!==receipt.reviewedTree||receipt.publication!=="authorized")throw new Error("publication authorization receipt mismatch");
if(`${JSON.stringify(receipt)}\n`!==new TextDecoder("utf-8",{fatal:true}).decode(receiptBytes))throw new Error("publication authorization receipt is not canonical");
const result={schema:"yukh-projects-publish-input-v1",releaseCommit:receipt.releaseCommit,releaseTree:receipt.releaseTree,version:receipt.version,tag:receipt.tag,authorizationCommentId:receipt.authorizationCommentId,authorizationBodySha256:receipt.authorizationBodySha256,assetManifestSha256:sha256(manifestBytes),checksumIndexSha256:manifest.checksum.sha256,workflowBlobSha:receipt.workflowBlobSha,assetNames:[...manifest.assets.map(asset=>asset.name),manifest.checksum.name].sort()};
await writeFile(output,`${JSON.stringify(result)}\n`,{encoding:"utf8",mode:0o600});
