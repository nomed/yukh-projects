import { parseIssueContract } from "./issue-contract.js";
import { readGitHubObservation, type ReadOnlyTransport, type RequestedGitHubScope } from "./github-readonly.js";
import { calculateEffectiveSchema, parseRepositoryPolicy, type ObservedSchema } from "./policy.js";
import { planReconciliation, renderPublicReport, type ObservedItem, type PublicReport } from "./planner.js";

export type DryRunFailureClass = "input"|"authentication"|"authorization"|"provider"|"invariant"|"deferred";
export interface DryRunFailure { status:"error"; failureClass:DryRunFailureClass; diagnostics:readonly {code:string;message:string}[] }
export interface DryRunSuccess { status:"success"; report:PublicReport }
export type DryRunResult = DryRunSuccess|DryRunFailure;
export interface DryRunInput { scope:RequestedGitHubScope; policySource:string; transport:ReadOnlyTransport }

const MESSAGE="dry-run could not produce a complete report";
function fail(failureClass:DryRunFailureClass,codes:readonly string[]):DryRunFailure{return{status:"error",failureClass,diagnostics:codes.slice(0,64).map(code=>({code,message:MESSAGE}))};}
function readClass(code:string):DryRunFailureClass{return code==="YKP-GH-READ-002"?"authentication":code==="YKP-GH-READ-003"?"authorization":code==="YKP-RATE-001"?"deferred":code==="YKP-REST-001"||code==="YKP-SNAPSHOT-001"||code==="YKP-CACHE-001"?"invariant":"provider";}

export async function runDryRun(input:DryRunInput):Promise<DryRunResult>{
 const policy=parseRepositoryPolicy(input.policySource);if(!policy.policy)return fail("input",policy.diagnostics.map(d=>d.code));
 const read=await readGitHubObservation(input.scope,input.transport);if(!read.observation)return fail(readClass(read.diagnostics[0]?.code??""),read.diagnostics.map(d=>d.code));
 const contract=parseIssueContract(read.observation.issueBody,{issueNumber:input.scope.issueNumber});if(!contract.contract)return fail("input",contract.diagnostics.length?contract.diagnostics.map(d=>d.code):["YKP-RUNTIME-001"]);
 const observed:ObservedSchema={fields:read.observation.projectSchema.fields.map(field=>({providerId:field.id,name:field.name,kind:field.kind,options:field.options.map(option=>({providerId:option.id,name:option.name}))}))};
 const schema=calculateEffectiveSchema(policy.policy,observed);if(!schema.executable)return fail("invariant",schema.diagnostics.map(d=>d.code));
 if(!read.observation.item)return fail("invariant",["YKP-RUNTIME-002"]);
 const values:Record<string,string|number|null>={};for(const [logical,declaration] of Object.entries(policy.policy.fields)){if(Object.hasOwn(read.observation.item.values,declaration.name))values[logical]=read.observation.item.values[declaration.name]!;}
 const item:ObservedItem={values,fingerprint:read.observation.item.fingerprint};
 const plan=planReconciliation({scope:read.observation.scope,contract:contract.contract,policy:policy.policy,schema,observedItem:item,relationships:read.observation.relationships});
 return{status:"success",report:renderPublicReport(plan)};
}
