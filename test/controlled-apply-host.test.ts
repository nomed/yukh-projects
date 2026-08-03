import assert from "node:assert/strict";
import test from "node:test";
import { createControlledApplyHostFactory } from "../src/controlled-apply-host.js";

const MEDIA="application/yukh-coordination-primitives+json;version=1";
function json(body:unknown):Response{return new Response(JSON.stringify(body),{status:200,headers:{"content-type":"application/json","x-ratelimit-remaining":"900"}});}

test("concrete host separates credentials and converges through targeted invalidation",async()=>{
 let priority="P1",rest=0,writes=0;
 const fields=[
  {id:10,name:"Work Type",data_type:"single_select",options:[{id:"wt",name:{raw:"task"},color:"GRAY",description:""}]},
  {id:11,name:"Area",data_type:"single_select",options:[{id:"ar",name:{raw:"runtime"},color:"GRAY",description:""}]},
  {id:12,name:"Priority",data_type:"single_select",options:[{id:"p1",name:{raw:"P1"},color:"BLUE",description:"kept"},{id:"p2",name:{raw:"P2"},color:"RED",description:"kept"}]}
 ],issue={id:1,node_id:"I_1",number:1,body:"<!-- yukh:issue:v1\nschema: 1\nwork_type: task\narea: runtime\npriority: p2\n-->",repository:{full_name:"example/atlas"},parent_issue_url:null,issue_dependencies_summary:{blocked_by:0,blocking:0}};
 const readFetch:typeof globalThis.fetch=async(input,init)=>{rest++;assert.match(String((init?.headers as Record<string,string>).authorization),/read-secret/u);const url=String(input);if(url.endsWith("/repos/example/atlas"))return json({node_id:"R_1",owner:{type:"Organization"}});if(url.endsWith("/orgs/example/projectsV2/7"))return json({node_id:"P_7",number:7});if(url.includes("/fields?"))return json(fields);if(url.includes("/items?"))return json([{id:101,node_id:"PVTI_1",content:issue,fields:[{name:"Work Type",value:{name:{raw:"task"}}},{name:"Area",value:{name:{raw:"runtime"}}},{name:"Priority",value:{name:{raw:priority}}}]}]);throw new Error("unexpected read");};
 const writeFetch:typeof globalThis.fetch=async(_input,init)=>{writes++;assert.match(String((init?.headers as Record<string,string>).authorization),/write-secret/u);const sent=JSON.parse(String(init?.body));assert.equal(sent.variables.input.value.singleSelectOptionId,"p2");priority="P2";return json({data:{updateProjectV2ItemFieldValue:{clientMutationId:sent.variables.input.clientMutationId,projectV2Item:{id:"PVTI_1"}}}});};
 const factory=createControlledApplyHostFactory({enablement:"apply-explicitly-enabled",allowedIssuerRefs:["approver:synthetic"],holderDigest:"d".repeat(64),coordinationEpoch:7,coordination:{baseUri:"https://coordination.invalid",epoch:7,deadlineMs:1000,authenticate:async()=>({credential:"coord-secret",proof:"a.b.c"}),fetch:async()=>new Response(JSON.stringify({outcome:"valid",specversion:"1"}),{headers:{"content-type":MEDIA}})},permissions:{projects:"write",issues:"none",extraPermissions:[]},approvedKinds:["update_project_item_field_value"],rate:{restRemaining:1000,graphqlRemaining:1000},readFetch,writeFetch});
 const runtime=await factory.create({requestedScope:{ownerLogin:"example",repositoryName:"atlas",projectNumber:7,issueNumber:1},policySource:"schema: 1\nfields:\n  work_type: {name: Work Type, kind: single_select, mode: managed, options: {task: task}}\n  area: {name: Area, kind: single_select, mode: managed, options: {runtime: runtime}}\n  priority: {name: Priority, kind: single_select, mode: managed, options: {p1: P1, p2: P2}}\n",readToken:"read-secret",writeToken:"write-secret"}),plan=await runtime.host.ports.replan(),operation=plan.operations[0]!;
 assert.equal(plan.operations.length,1);assert.equal(await runtime.host.ports.inspect(operation),"ready");await runtime.host.ports.mutate("update_project_item_field_value",operation,"c".repeat(64),1);await runtime.host.ports.invalidateAfterMutation("update_project_item_field_value",operation);assert.equal(await runtime.host.ports.verify(operation),true);assert.equal((await runtime.host.ports.replan()).operations.length,0);assert.equal(writes,1);assert.equal(rest,5);
});
