import { appendFile, readFile } from "node:fs/promises";
import { readReleaseManifest, RELEASE_REPOSITORY, RELEASE_TAG, RELEASE_VERSION, sha256, validateReleaseManifest } from "./release-candidate-lib.mjs";

const COMMIT=/^[0-9a-f]{40}$/u;
const DIGEST=/^[0-9a-f]{64}$/u;
const WORKFLOW_BLOB=/^[0-9a-f]{40}$/u;
const REVIEW_KEYS=["schema","role","conclusion","issue","pullRequest","reviewedHead","reviewedTree","version","tag","assetManifestSha256","checksumIndexSha256","workflowPath","workflowBlobSha"];
const AUTH_KEYS=["schema","issue","pullRequest","reviewedHead","reviewedTree","releaseCommit","releaseTree","version","tag","assetManifestSha256","checksumIndexSha256","workflowPath","workflowBlobSha","normalReview","securityReview","effects","statement"];
const REVIEW_REF_KEYS=["commentId","bodySha256"];
const EFFECTS=["attest-17-assets","create-immutable-tag","create-github-release","upload-17-assets"];
const STATEMENT="I authorize the Class C publication effects in this record exactly once for this reviewed release candidate; I do not authorize npm publication, tag movement, asset overwrite, retries, or partial-state continuation.";
const ISSUE=156;
const WORKFLOW_PATH=".github/workflows/publish-release.yml";

function exact(value,keys){
 return value!==null&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).join("\0")===keys.join("\0");
}

function canonicalComment(body,keys){
 if(typeof body!=="string"||body.length>16_384)throw new Error("authorization comment body is invalid");
 const value=JSON.parse(body);
 if(!exact(value,keys)||JSON.stringify(value)!==body)throw new Error("authorization comment is not canonical");
 return value;
}

function integer(value){
 return Number.isSafeInteger(value)&&value>0;
}

function validateReviewRecord(value,role){
 if(value.schema!=="yukh-projects-release-review-v1"||value.role!==role||value.conclusion!=="approved"||value.issue!==ISSUE||!integer(value.pullRequest)||!COMMIT.test(value.reviewedHead)||!COMMIT.test(value.reviewedTree)||value.version!==RELEASE_VERSION||value.tag!==RELEASE_TAG||!DIGEST.test(value.assetManifestSha256)||!DIGEST.test(value.checksumIndexSha256)||value.workflowPath!==WORKFLOW_PATH||!WORKFLOW_BLOB.test(value.workflowBlobSha))throw new Error("review record is invalid");
}

function validateAuthorizationRecord(value){
 if(value.schema!=="yukh-projects-release-authorization-v1"||value.issue!==ISSUE||!integer(value.pullRequest)||!COMMIT.test(value.reviewedHead)||!COMMIT.test(value.reviewedTree)||!COMMIT.test(value.releaseCommit)||!COMMIT.test(value.releaseTree)||value.releaseTree!==value.reviewedTree||value.version!==RELEASE_VERSION||value.tag!==RELEASE_TAG||!DIGEST.test(value.assetManifestSha256)||!DIGEST.test(value.checksumIndexSha256)||value.workflowPath!==WORKFLOW_PATH||!WORKFLOW_BLOB.test(value.workflowBlobSha)||!exact(value.normalReview,REVIEW_REF_KEYS)||!integer(value.normalReview.commentId)||!DIGEST.test(value.normalReview.bodySha256)||!exact(value.securityReview,REVIEW_REF_KEYS)||!integer(value.securityReview.commentId)||!DIGEST.test(value.securityReview.bodySha256)||value.normalReview.commentId===value.securityReview.commentId||JSON.stringify(value.effects)!==JSON.stringify(EFFECTS)||value.statement!==STATEMENT)throw new Error("owner authorization record is invalid");
}

function issueNumber(comment){
 const match=/\/issues\/([1-9][0-9]*)$/u.exec(comment.issue_url??"");
 return match?Number(match[1]):0;
}

function immutableComment(comment,repositoryOwner,commentId){
 if(comment.id!==commentId||issueNumber(comment)!==ISSUE||comment.user?.login!==repositoryOwner||comment.author_association!=="OWNER"||comment.created_at!==comment.updated_at)throw new Error("authorization comment identity is invalid");
}

async function github(path,token){
 const response=await fetch(`https://api.github.com${path}`,{headers:{Accept:"application/vnd.github+json",Authorization:`Bearer ${token}`,"X-GitHub-Api-Version":"2026-03-10"},redirect:"error"});
 if(!response.ok)throw new Error(`GitHub read failed with status ${response.status}`);
 return response.json();
}

function decodeContent(value){
 if(value?.encoding!=="base64"||typeof value.content!=="string")throw new Error("GitHub content response is invalid");
 return Buffer.from(value.content.replace(/\n/gu,""),"base64");
}

async function remoteSnapshot(commentId,eventSha,eventRef){
 const token=process.env.GITHUB_TOKEN;
 if(!token)throw new Error("read-only GitHub token is unavailable");
 const ownerComment=await github(`/repos/${RELEASE_REPOSITORY}/issues/comments/${commentId}`,token);
 const authorization=canonicalComment(ownerComment.body,AUTH_KEYS);
 validateAuthorizationRecord(authorization);
 const [repository,normalComment,securityComment,pull,reviewedCommit,releaseCommit,main,manifestContent,workflowContent]=await Promise.all([
  github(`/repos/${RELEASE_REPOSITORY}`,token),
  github(`/repos/${RELEASE_REPOSITORY}/issues/comments/${authorization.normalReview.commentId}`,token),
  github(`/repos/${RELEASE_REPOSITORY}/issues/comments/${authorization.securityReview.commentId}`,token),
  github(`/repos/${RELEASE_REPOSITORY}/pulls/${authorization.pullRequest}`,token),
  github(`/repos/${RELEASE_REPOSITORY}/git/commits/${authorization.reviewedHead}`,token),
  github(`/repos/${RELEASE_REPOSITORY}/git/commits/${authorization.releaseCommit}`,token),
  github(`/repos/${RELEASE_REPOSITORY}/branches/main`,token),
  github(`/repos/${RELEASE_REPOSITORY}/contents/release/1.8.0/release-manifest.json?ref=${authorization.releaseCommit}`,token),
  github(`/repos/${RELEASE_REPOSITORY}/contents/${WORKFLOW_PATH}?ref=${authorization.releaseCommit}`,token)
 ]);
 return{commentId,eventSha,eventRef,repositoryOwner:repository.owner?.login,ownerComment,normalComment,securityComment,pull,reviewedTree:reviewedCommit.tree?.sha,releaseTree:releaseCommit.tree?.sha,mainSha:main.commit?.sha,manifestBytes:decodeContent(manifestContent),workflowBlobSha:workflowContent.sha};
}

async function fixtureSnapshot(path){
 const value=JSON.parse(await readFile(path,"utf8"));
 if(!exact(value,["commentId","eventSha","eventRef","repositoryOwner","ownerComment","normalComment","securityComment","pull","reviewedTree","releaseTree","mainSha","manifestPath","workflowBlobSha"]))throw new Error("authorization fixture is invalid");
 return{...value,manifestBytes:await readFile(value.manifestPath)};
}

function validateReviewComment(comment,reference,role,authorization,repositoryOwner){
 immutableComment(comment,repositoryOwner,reference.commentId);
 const record=canonicalComment(comment.body,REVIEW_KEYS);
 validateReviewRecord(record,role);
 if(sha256(Buffer.from(comment.body,"utf8"))!==reference.bodySha256)throw new Error("review body digest mismatch");
 for(const key of ["issue","pullRequest","reviewedHead","reviewedTree","version","tag","assetManifestSha256","checksumIndexSha256","workflowPath","workflowBlobSha"])if(record[key]!==authorization[key])throw new Error("review binding mismatch");
 return record;
}

async function verify(snapshot){
 const authorization=canonicalComment(snapshot.ownerComment.body,AUTH_KEYS);
 validateAuthorizationRecord(authorization);
 immutableComment(snapshot.ownerComment,snapshot.repositoryOwner,snapshot.commentId);
 if(snapshot.eventRef!=="refs/heads/main"||snapshot.eventSha!==authorization.releaseCommit||snapshot.mainSha!==authorization.releaseCommit)throw new Error("publication event is not the authorized main commit");
 if(!snapshot.pull?.merged||snapshot.pull.number!==authorization.pullRequest||snapshot.pull.head?.sha!==authorization.reviewedHead||snapshot.pull.base?.ref!=="main"||snapshot.pull.merge_commit_sha!==authorization.releaseCommit)throw new Error("reviewed pull request binding mismatch");
 if(snapshot.reviewedTree!==authorization.reviewedTree||snapshot.releaseTree!==authorization.releaseTree||snapshot.workflowBlobSha!==authorization.workflowBlobSha)throw new Error("source tree or workflow binding mismatch");
 const normal=validateReviewComment(snapshot.normalComment,authorization.normalReview,"normal",authorization,snapshot.repositoryOwner);
 const security=validateReviewComment(snapshot.securityComment,authorization.securityReview,"security",authorization,snapshot.repositoryOwner);
 const authorizationTime=Date.parse(snapshot.ownerComment.created_at),normalTime=Date.parse(snapshot.normalComment.created_at),securityTime=Date.parse(snapshot.securityComment.created_at);
 if(!Number.isFinite(authorizationTime)||authorizationTime<=normalTime||authorizationTime<=securityTime)throw new Error("owner authorization predates required review");
 const manifestSource=new TextDecoder("utf-8",{fatal:true}).decode(snapshot.manifestBytes);
 const manifest=validateReleaseManifest(JSON.parse(manifestSource));
 if(`${JSON.stringify(manifest,null,2)}\n`!==manifestSource||sha256(snapshot.manifestBytes)!==authorization.assetManifestSha256||manifest.checksum.sha256!==authorization.checksumIndexSha256)throw new Error("release manifest binding mismatch");
 if(normal.conclusion!=="approved"||security.conclusion!=="approved")throw new Error("required review is not approved");
 return{schema:"yukh-projects-release-authorization-receipt-v1",authorizationCommentId:snapshot.commentId,authorizationBodySha256:sha256(Buffer.from(snapshot.ownerComment.body,"utf8")),releaseCommit:authorization.releaseCommit,releaseTree:authorization.releaseTree,reviewedHead:authorization.reviewedHead,reviewedTree:authorization.reviewedTree,version:authorization.version,tag:authorization.tag,assetManifestSha256:authorization.assetManifestSha256,checksumIndexSha256:authorization.checksumIndexSha256,workflowBlobSha:authorization.workflowBlobSha,effects:authorization.effects,publication:"authorized"};
}

let fixture,commentId;
for(let index=2;index<process.argv.length;index+=2){
 const flag=process.argv[index],value=process.argv[index+1];
 if(flag==="--fixture")fixture=value;
 else if(flag==="--comment-id")commentId=Number(value);
 else throw new Error("authorization verifier arguments are invalid");
}
if(fixture&&commentId)throw new Error("authorization verifier mode is ambiguous");
if(!fixture&&!integer(commentId))throw new Error("authorization comment identifier is invalid");
const snapshot=fixture?await fixtureSnapshot(fixture):await remoteSnapshot(commentId,process.env.GITHUB_SHA,process.env.GITHUB_REF);
const receipt=await verify(snapshot);
process.stdout.write(`${JSON.stringify(receipt)}\n`);
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,Object.entries({release_commit:receipt.releaseCommit,release_tree:receipt.releaseTree,reviewed_head:receipt.reviewedHead,reviewed_tree:receipt.reviewedTree,version:receipt.version,tag:receipt.tag,asset_manifest_sha256:receipt.assetManifestSha256,checksum_index_sha256:receipt.checksumIndexSha256,workflow_blob_sha:receipt.workflowBlobSha,authorization_body_sha256:receipt.authorizationBodySha256}).map(([key,value])=>`${key}=${value}\n`).join(""),"utf8");
