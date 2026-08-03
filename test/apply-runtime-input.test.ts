import assert from "node:assert/strict";
import { mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseApplyCliArgs, readApprovalArtifact, readExclusiveWorkspaceFile } from "../src/apply-runtime-input.js";

const args=["--mode","apply","--owner","synthetic-owner","--repository","synthetic-repository","--project-number","17","--issue-number","7","--approved-plan-id","a".repeat(64),"--approval-file","approval.json","--approval-public-key-file","approval.pem","--environment","protected-synthetic","--github-read-token-fd","3","--github-write-token-fd","4"];
test("apply CLI accepts only the fixed surface and distinct credential descriptors",()=>{const value=parseApplyCliArgs(args);assert.equal(value.mode,"apply");assert.equal(value.readTokenFd,3);assert.equal(value.writeTokenFd,4);for(const bad of [[...args,"--force","true"],args.map(value=>value==="apply"?"dry-run":value),args.map(value=>value==="4"?"3":value)])assert.throws(()=>parseApplyCliArgs(bad));});
test("protected artifacts are bounded regular files beneath the workspace",async()=>{const root=await mkdtemp(join(tmpdir(),"yukh-apply-input-"));await writeFile(join(root,"approval.json"),'{"schema":1}',{mode:0o600});assert.equal((await readApprovalArtifact(root,"approval.json") as {schema:number}).schema,1);await symlink(join(root,"approval.json"),join(root,"link.json"));await assert.rejects(readExclusiveWorkspaceFile(root,"link.json"));await assert.rejects(readExclusiveWorkspaceFile(root,"../outside"));});
