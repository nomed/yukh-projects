import assert from "node:assert/strict";
import test from "node:test";
import { LEGACY_COMPATIBILITY_MATRIX, runLegacyShadow, runLegacyShadowAudit } from "../src/legacy-shadow.js";
import type { RestProjectSnapshot } from "../src/github-rest-snapshot.js";

const policy=`version: 1
fields:
  kind:
    project_field: Type
    target: issue_type
    required: true
    values: {task: Task}
    labels: {task: "type:task"}
  area:
    project_field: Area
    required: true
    values: {runtime: Runtime}
  priority:
    project_field: Priority
    target: issue_field
    required: true
    values: {P1: High}
    labels: {P1: "priority:P1"}
  component:
    project_field: Component
    values: {shared: Shared}
milestones: {r1: Release 1}
`;
const contract=`<!-- yukh
schema: 1
kind: task
area: runtime
priority: P1
milestone: r1
extensions: {component: shared}
parent: 7
depends_on: [8]
blocks: [9]
-->
`;
function snapshot(overrides:Partial<RestProjectSnapshot["evidence"]>={},complete=true):RestProjectSnapshot{return{subjectRef:"private",ownerLogin:"example",repositoryName:"atlas",projectNumber:17,repositoryRef:"private",projectRef:"private",fields:[],issues:new Map([[42,{issueRef:"private",issueDatabaseId:42,body:contract,itemRef:"private",fingerprint:"private",values:{Area:"Runtime",Component:"Shared",Status:"In progress"},issueType:"Task",labels:["priority:P1","type:task","human-label"],milestone:"Release 1",issueFields:{Priority:"High"},parent:7,blockedBy:complete?[8]:[],blocking:complete?[9]:[],relationshipsComplete:complete}]]),evidence:{restRequests:4,graphqlRequests:0,restCacheHits:0,conditionalRequests:0,coalescedRequests:0,...overrides}};}

test("legacy shadow converges without planning a Project-owned Status change",()=>{const report=runLegacyShadowAudit(policy,snapshot());assert.equal(report.status,"success");assert.equal(report.issues[0]?.status,"converged");assert.deepEqual(report.totals,{});assert.equal(Object.hasOwn(report.totals,"set_status"),false);assert.equal(report.evidence.graphqlRequests,0);});

test("legacy shadow reports bounded drift using stable operation classes",()=>{const changed=snapshot();const issue=changed.issues.get(42)!;changed.issues=new Map([[42,{...issue,issueType:"Bug",labels:["priority:P1","human-label"],milestone:undefined,values:{...issue.values,Area:"Security"}}]]);const report=runLegacyShadowAudit(policy,changed);assert.equal(report.status,"success");assert.equal(report.issues[0]?.status,"drift");assert.deepEqual(report.totals,{set_issue_type:1,add_label:1,set_project_field:1,set_milestone:1});});

test("legacy shadow defers native dependencies when GraphQL is exhausted and REST is incomplete",()=>{const report=runLegacyShadowAudit(policy,snapshot({},false));assert.equal(report.status,"deferred");assert.equal(report.issues[0]?.status,"deferred");assert.equal(report.issues[0]?.diagnostics[0]?.code,"YKP-RATE-001");});

test("compatibility matrix does not claim apply compatibility",()=>{assert.equal(LEGACY_COMPATIBILITY_MATRIX.find(entry=>entry.capability.startsWith("full apply"))?.state,"Missing");assert.equal(LEGACY_COMPATIBILITY_MATRIX.find(entry=>entry.capability==="Project-owned Status")?.state,"Supported");});
test("legacy Action adapter fixes one issue and forces GraphQL remaining zero",async()=>{let reads=0;const report=await runLegacyShadow({ownerLogin:"example",repositoryName:"atlas",projectNumber:17,issueNumbers:[42],policySource:policy,token:"synthetic-token"},async(input,options)=>{reads++;assert.deepEqual(input.issueNumbers,[42]);assert.equal(options.graphqlRemaining,0);return snapshot();});assert.equal(report.status,"success");assert.equal(reads,1);assert.equal(report.evidence.graphqlRequests,0);});
test("legacy Action adapter rejects invalid policy before provider access",async()=>{let reads=0;const report=await runLegacyShadow({ownerLogin:"example",repositoryName:"atlas",projectNumber:17,issueNumbers:[42],policySource:"version: 2",token:"synthetic-token"},async()=>{reads++;return snapshot();});assert.equal(report.status,"error");assert.equal(report.failureClass,"invariant");assert.equal(report.diagnostics[0]?.code,"YKP-LEGACY-001");assert.equal(reads,0);assert.equal(report.evidence.restRequests,0);assert.equal(report.evidence.graphqlRequests,0);});
