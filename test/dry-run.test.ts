import test from "node:test";
import assert from "node:assert/strict";
import { runDryRun } from "../src/dry-run.js";
import type { AllowedReadOperation, ReadOnlyTransport } from "../src/github-readonly.js";

const scope={subjectRef:"installation:synthetic",ownerLogin:"example-labs",repositoryName:"atlas",projectNumber:7,issueNumber:42};
const policy=`schema: 1\nfields:\n  work_type:\n    name: Work Type\n    kind: single_select\n    mode: managed\n    options:\n      task: Task\n  area:\n    name: Area\n    kind: single_select\n    mode: managed\n    options:\n      core: Core\n`;
const body=`<!-- yukh:issue:v1\nschema: 1\nwork_type: task\narea: core\n-->`;
const end={hasNextPage:false,endCursor:null};
const data:Record<AllowedReadOperation,unknown>={resolve_scope:{...scope,repositoryRef:"repo:1",projectRef:"project:1",issueRef:"issue:1",issueBody:body},read_project_fields:{projectRef:"project:1",nodes:[{id:"field:1",name:"Work Type",kind:"single_select",options:[{id:"option:1",name:"Task"}]},{id:"field:2",name:"Area",kind:"single_select",options:[{id:"option:2",name:"Core"}]}],pageInfo:end},read_project_item:{projectRef:"project:1",issueRef:"issue:1",itemRef:"item:1",fingerprint:"item-fingerprint",nodes:[{key:"Work Type",value:"Task"},{key:"Area",value:"Core"}],pageInfo:end},read_issue_relationships:{repositoryRef:"repo:1",issueRef:"issue:1",nodes:[{issueNumber:42}],parent:[],blocks:[],pageInfo:end}};
function transport(change:Partial<Record<AllowedReadOperation,unknown>>={}):ReadOnlyTransport{return{execute:async op=>({byteCount:100,data:change[op]??data[op]})};}

test("produces a deterministic redacted dry-run report",async()=>{const a=await runDryRun({scope,policySource:policy,transport:transport()});const b=await runDryRun({scope,policySource:policy,transport:transport()});assert.deepEqual(a,b);assert.equal(a.status,"success");if(a.status==="success"){assert.equal(a.report.counts.operations,0);assert.equal(a.report.executable,true);assert.doesNotMatch(JSON.stringify(a),/repo:1|issue:1|item-fingerprint|synthetic body/u);}});
test("fails closed on malformed policy before network",async()=>{let calls=0;const result=await runDryRun({scope,policySource:"schema: 1",transport:{execute:async()=>{calls++;throw new Error("should not run");}}});assert.equal(result.status,"error");assert.equal(calls,0);});
test("does not disclose issue content on contract failure",async()=>{const secret="private-token-shaped-value";const result=await runDryRun({scope,policySource:policy,transport:transport({resolve_scope:{...(data.resolve_scope as object),issueBody:secret}})});assert.equal(result.status,"error");assert.doesNotMatch(JSON.stringify(result),/private|token|shaped/u);});
