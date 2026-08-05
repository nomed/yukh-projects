import test from "node:test";
import assert from "node:assert/strict";
import { planLegacyReconciliation } from "../src/legacy-plan.js";
import type { RestProjectSnapshot } from "../src/github-rest-snapshot.js";

const policy=`version: 1
fields:
  kind:
    project_field: Work Type
    target: issue_type
    required: true
    values: { gate: Gate }
  area:
    project_field: Area
    required: true
    values: { delivery: Delivery }
  priority:
    project_field: Priority
    required: true
    values: { P0: P0 }
`;
const body=`<!-- yukh
schema: 1
kind: gate
area: delivery
priority: P0
parent: 1
-->
`;
function snapshot(converged=false):RestProjectSnapshot{return{subjectRef:"subject",ownerKind:"orgs",ownerLogin:"example",repositoryName:"atlas",projectNumber:5,repositoryRef:"repository",projectRef:"project",fields:converged?[{id:"area-field",name:"Area",kind:"single_select",options:[{id:"delivery",name:"Delivery"}]},{id:"priority-field",name:"Priority",kind:"single_select",options:[{id:"p0",name:"P0"}]}]:[{id:"priority-field",name:"Priority",kind:"single_select",options:[{id:"p0",name:"P0"}]}],issueTypes:[{id:"gate-type",name:"Gate"}],issues:new Map([[27,{issueRef:"issue-27",issueDatabaseId:27,body,itemRef:"item-27",fingerprint:"fingerprint",values:{Priority:"P0",...(converged?{Area:"Delivery"}:{})},...(converged?{issueType:"Gate",parent:1}:{}),labels:[],issueFields:{},blockedBy:[],blocking:[],relationshipsComplete:true}]]),evidence:{restRequests:5,graphqlRequests:0,restCacheHits:0,conditionalRequests:0,coalescedRequests:0}};}

test("legacy plan expands consumer drift into stable executable operations",()=>{const first=planLegacyReconciliation(policy,snapshot(),27),second=planLegacyReconciliation(policy,snapshot(),27);assert.equal(first.planId,second.planId);assert.equal(first.executable,true);assert.deepEqual(first.operations.map(operation=>operation.type),["create_field","set_field_value","set_issue_type","set_parent"]);assert.deepEqual(first.operations[1]?.dependsOn,["schema.field.area.create"]);});

test("legacy plan proves zero-operation convergence",()=>{const plan=planLegacyReconciliation(policy,snapshot(true),27);assert.equal(plan.executable,true);assert.deepEqual(plan.operations,[]);assert.match(plan.planId,/^[a-f0-9]{64}$/u);});

test("legacy plan fails closed without an Issue Type binding",()=>{const value=snapshot();value.issueTypes=[];assert.throws(()=>planLegacyReconciliation(policy,value,27));});

test("legacy logical issue type routes to Project Work Type for a personal repository",()=>{const value=snapshot();value.ownerKind="users";value.repositoryOwnerKind="users";value.projectOwnerKind="orgs";value.issueTypes=undefined;const plan=planLegacyReconciliation(policy,value,27);assert.equal(plan.operations.some(operation=>operation.type==="set_issue_type"),false);const kindOperations=plan.operations.filter(operation=>operation.resource.logicalKey==="kind");assert.deepEqual(kindOperations.map(operation=>operation.type),["create_field","set_field_value"]);});

test("legacy organization routing rejects conflicting dual representations",()=>{const value=snapshot();const issue=value.issues.get(27)!;value.issues=new Map([[27,{...issue,issueType:"Gate",values:{...issue.values,"Work Type":"Task"}}]]);assert.throws(()=>planLegacyReconciliation(policy,value,27));});
