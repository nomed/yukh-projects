import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const runner=resolve(root,"scripts/run-e2e-sandbox-demo.mjs");

function execute(args:readonly string[]=[]){
 return spawnSync(process.execPath,[runner,...args],{cwd:root,encoding:"utf8",env:{},timeout:30_000,maxBuffer:16*1024});
}

test("closed E2E sandbox command is deterministic and proves deny, mutation, and idempotency",()=>{
 const first=execute(),second=execute();
 assert.equal(first.status,0);
 assert.equal(first.stderr,"");
 assert.equal(second.status,0);
 assert.equal(second.stdout,first.stdout);
 const result=JSON.parse(first.stdout);
 assert.equal(result.schema,"yukh-projects-e2e-sandbox-demo-result-v1");
 assert.equal(result.status,"passed");
 assert.equal(result.transport,"local-github-fake");
 assert.equal(result.liveProviderCalls,0);
 assert.deepEqual(result.phases,[
  {id:"dry-run",status:"passed",operations:1},
  {id:"approval-gate",status:"denied",code:"YKP-APPLY-003",mutationRequests:0},
  {id:"controlled-apply",status:"passed",verified:1,mutationRequests:1},
  {id:"idempotency",status:"passed",operations:0,additionalMutationRequests:0}
 ]);
 assert.equal(result.mutationRequest.kind,"update_project_item_field_value");
 assert.equal(result.mutationRequest.operationType,"set_field_value");
 assert.match(result.mutationRequest.clientMutationId,/^[a-f0-9]{64}$/u);
 assert.equal(result.mutationRequest.fencingToken,1);
 assert.doesNotMatch(first.stdout,/token|authorization|signature|private|https?:|example-labs|atlas|field:|item:/u);
});

test("E2E sandbox command rejects caller-selected inputs",()=>{
 const result=execute(["--target=caller-selected"]);
 assert.equal(result.status,2);
 assert.equal(result.stderr,"");
 assert.deepEqual(JSON.parse(result.stdout),{schema:"yukh-projects-e2e-sandbox-demo-result-v1",status:"rejected",code:"YKP-E2E-REQUEST-001"});
});
