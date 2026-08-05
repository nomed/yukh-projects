import { createHash } from "node:crypto";
import { readRestProjectSnapshot, type RestProjectSnapshot } from "./github-rest-snapshot.js";
import { parseLegacyContract, parseLegacyPolicy } from "./legacy-shadow.js";
import { canonicalJson, renderPublicReport, type BoundScope, type PlannedOperation, type ReconciliationPlan } from "./planner.js";
import type { DryRunResult } from "./dry-run.js";
import { selectWorkTypeProvider, WorkTypeProviderError } from "./work-type-provider.js";

function digest(value:unknown):string{return createHash("sha256").update(canonicalJson(value)).digest("hex");}
function operationKey(...parts:(string|number)[]):string{return parts.join(".");}
function finish(operations:readonly PlannedOperation[]):ReconciliationPlan{const base={schema:1 as const,executable:true,diagnostics:[],observations:[],operations};return{...base,planId:digest(base)};}

export function planLegacyReconciliation(policySource:string,snapshot:RestProjectSnapshot,issueNumber:number):ReconciliationPlan{
 const policy=parseLegacyPolicy(policySource),observed=snapshot.issues.get(issueNumber);if(!observed)throw new TypeError("legacy issue is unavailable");
 const contract=parseLegacyContract(observed.body),scope:BoundScope={subjectRef:snapshot.subjectRef,repositoryRef:snapshot.repositoryRef,projectRef:snapshot.projectRef,issueRef:observed.issueRef,issueNumber},core:Record<string,string|number|undefined>={kind:contract.kind,area:contract.area,priority:contract.priority,size:contract.size,estimate:contract.estimate},operations:PlannedOperation[]=[];
 for(const key of Object.keys(policy.fields).sort()){
  const declaration=policy.fields[key]!,logical=core[key]??contract.extensions[key];if(logical===undefined)continue;const desired=typeof logical==="string"&&Object.keys(declaration.values).length?declaration.values[logical]:logical;if(desired===undefined)throw new TypeError("legacy value is unsupported");
  if(declaration.target==="issue_field")throw new TypeError("legacy issue fields are not apply-compatible");
  if(declaration.target==="issue_type"){
   const selection=selectWorkTypeProvider({projectOwnerKind:snapshot.projectOwnerKind??snapshot.ownerKind,repositoryOwnerKind:snapshot.repositoryOwnerKind??snapshot.ownerKind,desired:String(desired),nativeValue:observed.issueType,projectValue:observed.values[declaration.projectField],issueTypes:snapshot.issueTypes,fields:snapshot.fields,fieldName:declaration.projectField});
   if(selection.converged)continue;if(selection.provider==="native_issue_type"){operations.push({operationKey:operationKey("issue","type","set"),type:"set_issue_type",subject:{ref:scope.subjectRef},resource:{kind:"issue_type",logicalKey:key,scopeRef:scope.repositoryRef,providerRef:selection.issueTypeId},action:"set",environment:"dry-run",reason:"legacy.issue_type.differs",preconditions:[{kind:"old_value",logicalKey:key,expected:observed.issueType??null}],dependsOn:[],desired});continue;}
  }
  if(observed.values[declaration.projectField]===desired)continue;const field=snapshot.fields.find(value=>value.name===declaration.projectField),createKey=operationKey("schema","field",key,"create");
  if(!field)operations.push({operationKey:createKey,type:"create_field",subject:{ref:scope.subjectRef},resource:{kind:"project_field",logicalKey:key,scopeRef:scope.projectRef},action:"create",environment:"dry-run",reason:"legacy.project_field.missing",preconditions:[{kind:"field_absent",logicalKey:key,expected:true}],dependsOn:[],desired:declaration.projectField});
  operations.push({operationKey:operationKey("item","field",key,"set"),type:"set_field_value",subject:{ref:scope.subjectRef},resource:{kind:"project_item_field",logicalKey:key,scopeRef:scope.projectRef,...(field?{providerRef:field.id}:{})},action:"set",environment:"dry-run",reason:"legacy.project_field.differs",preconditions:[{kind:"item_fingerprint",logicalKey:"item",expected:observed.fingerprint},{kind:"old_value",logicalKey:key,expected:observed.values[declaration.projectField]??null}],dependsOn:field?[]:[createKey],desired});
 }
 if(contract.milestone||Object.values(policy.fields).some(field=>Object.keys(field.labels).length))throw new TypeError("legacy labels or milestones are not apply-compatible");
 if(contract.parent!==undefined&&contract.parent!==observed.parent)operations.push({operationKey:operationKey("relationship","parent",contract.parent,"set"),type:"set_parent",subject:{ref:scope.subjectRef},resource:{kind:"issue_parent",logicalKey:"parent",scopeRef:scope.repositoryRef},action:"set",environment:"dry-run",reason:"legacy.parent.missing",preconditions:[{kind:"parent_absent",logicalKey:"parent",expected:true}],dependsOn:[],desired:contract.parent});
 if(contract.dependsOn.length||contract.blocks.length)throw new TypeError("legacy dependency apply requires complete graph planning");
 return finish(operations);
}

export async function runLegacyDryRun(input:{ownerLogin:string;repositoryName:string;projectNumber:number;issueNumber:number;policySource:string;token:string},reader:typeof readRestProjectSnapshot=readRestProjectSnapshot):Promise<DryRunResult>{try{const policy=parseLegacyPolicy(input.policySource),includeIssueTypes=Object.values(policy.fields).some(field=>field.target==="issue_type"),snapshot=await reader({ownerLogin:input.ownerLogin,repositoryName:input.repositoryName,projectNumber:input.projectNumber,issueNumbers:[input.issueNumber]},{token:input.token,graphqlRemaining:0,includeIssueTypes}),plan=planLegacyReconciliation(input.policySource,snapshot,input.issueNumber);return{status:"success",report:renderPublicReport(plan)};}catch(error){const code=error instanceof WorkTypeProviderError?error.code:"YKP-LEGACY-001",failureClass=code==="YKP-WORKTYPE-004"?"authentication":code==="YKP-WORKTYPE-005"?"authorization":code==="YKP-WORKTYPE-006"?"provider":code==="YKP-WORKTYPE-008"?"deferred":"invariant";return{status:"error",failureClass,diagnostics:[{code,message:"dry-run could not produce a complete report"}]};}}
