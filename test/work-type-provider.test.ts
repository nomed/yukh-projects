import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWorkTypeProviderFailure, selectWorkTypeProvider, WorkTypeProviderError } from "../src/work-type-provider.js";
import { GitHubMutationTransportError } from "../src/github-mutation-transport.js";
import { GitHubTransportError } from "../src/github-transport.js";

const field={id:"field-work-type",name:"Work Type",kind:"single_select",options:[{id:"option-gate",name:"Gate"}]};
for(const [projectOwner,repositoryOwner,provider] of [
 ["users","orgs","native_issue_type"],
 ["orgs","orgs","native_issue_type"],
 ["users","users","project_work_type"],
 ["orgs","users","project_work_type"]
] as const)test(`${projectOwner} Project and ${repositoryOwner} repository select ${provider}`,()=>{const result=selectWorkTypeProvider({projectOwnerKind:projectOwner,repositoryOwnerKind:repositoryOwner,desired:"Gate",nativeValue:repositoryOwner==="orgs"?"Task":undefined,projectValue:repositoryOwner==="users"?"Task":undefined,issueTypes:[{id:"type-gate",name:"Gate"}],fields:[field],fieldName:"Work Type"});assert.equal(result.provider,provider);assert.equal(result.converged,false);});

test("Project ownership cannot override repository provider selection",()=>{for(const projectOwnerKind of ["users","orgs"] as const){assert.equal(selectWorkTypeProvider({projectOwnerKind,repositoryOwnerKind:"orgs",desired:"Gate",issueTypes:[{id:"type-gate",name:"Gate"}],fields:[field],fieldName:"Work Type"}).provider,"native_issue_type");assert.equal(selectWorkTypeProvider({projectOwnerKind,repositoryOwnerKind:"users",desired:"Gate",fields:[field],fieldName:"Work Type"}).provider,"project_work_type");}});

test("conflicting dual representations fail without selecting a provider",()=>{assert.throws(()=>selectWorkTypeProvider({projectOwnerKind:"users",repositoryOwnerKind:"orgs",desired:"Gate",nativeValue:"Gate",projectValue:"Task",issueTypes:[{id:"type-gate",name:"Gate"}],fields:[field],fieldName:"Work Type"}),(error:unknown)=>error instanceof WorkTypeProviderError&&error.code==="YKP-WORKTYPE-003");});

test("ambiguous catalog and incompatible Project fields fail closed",()=>{assert.throws(()=>selectWorkTypeProvider({projectOwnerKind:"users",repositoryOwnerKind:"orgs",desired:"Gate",issueTypes:[{id:"a",name:"Gate"},{id:"b",name:"Gate"}],fields:[],fieldName:"Work Type"}),(error:unknown)=>error instanceof WorkTypeProviderError&&error.code==="YKP-WORKTYPE-002");assert.throws(()=>selectWorkTypeProvider({projectOwnerKind:"orgs",repositoryOwnerKind:"users",desired:"Gate",fields:[{...field,kind:"text"}],fieldName:"Work Type"}),(error:unknown)=>error instanceof WorkTypeProviderError&&error.code==="YKP-WORKTYPE-002");});

test("provider failures normalize to stable redacted work type diagnostics",()=>{const cases:[unknown,string][]=[[new GitHubTransportError("YKP-GH-READ-002"),"YKP-WORKTYPE-004"],[new GitHubMutationTransportError("YKP-GH-WRITE-007"),"YKP-WORKTYPE-005"],[new GitHubMutationTransportError("YKP-GH-WRITE-004"),"YKP-WORKTYPE-006"],[new Error("private provider body"),"YKP-WORKTYPE-007"],[new GitHubTransportError("YKP-RATE-001"),"YKP-WORKTYPE-008"]];for(const [error,code] of cases){const normalized=normalizeWorkTypeProviderFailure(error);assert.equal(normalized.code,code);assert.doesNotMatch(String(normalized),/private|provider body/u);}});
