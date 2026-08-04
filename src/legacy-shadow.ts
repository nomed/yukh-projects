import { parseAllDocuments } from "yaml";
import { readRestProjectSnapshot, type RestProjectSnapshot } from "./github-rest-snapshot.js";
import { GitHubTransportError } from "./github-transport.js";

type RecordValue=Record<string,unknown>;
type CapabilityState="Supported"|"Changed"|"Missing";
export interface CompatibilityEntry{capability:string;state:CapabilityState;note:string}
export const LEGACY_COMPATIBILITY_MATRIX:readonly CompatibilityEntry[]=Object.freeze([
 {capability:"version-1 repository policy",state:"Supported",note:"parsed as a bounded compatibility input"},
 {capability:"hidden yukh issue contract",state:"Supported",note:"accepted for shadow planning without backlog rewrite"},
 {capability:"issue type and managed labels",state:"Supported",note:"observed through versioned REST and compared locally"},
 {capability:"milestone",state:"Supported",note:"observed through versioned REST and compared locally"},
 {capability:"Project fields",state:"Supported",note:"schema is read once and values are planned locally"},
 {capability:"Project-owned Status",state:"Supported",note:"preserved when absent from repository policy"},
 {capability:"native parent",state:"Supported",note:"read from REST Project item content"},
 {capability:"native dependencies",state:"Changed",note:"one fixed bounded GraphQL batch; GraphQL-zero requires complete cached state or returns deferred"},
 {capability:"single issue shadow dry-run",state:"Supported",note:"REST-first immutable snapshot"},
 {capability:"complete backlog shadow audit",state:"Supported",note:"bounded scopes of at most 100 issues reuse one snapshot reader"},
 {capability:"full apply and zero-operation second apply",state:"Missing",note:"blocked until controlled apply issues are complete"},
]);

export interface LegacyField{projectField:string;target:"project_field"|"issue_type"|"issue_field";required:boolean;type:"string"|"number"|"date";values:Record<string,string>;labels:Record<string,string>}
export interface LegacyPolicy{fields:Record<string,LegacyField>;milestones:Record<string,string>}
export interface LegacyContract{kind:string;area:string;priority:string;size?:string;estimate?:number;milestone?:string;parent?:number;dependsOn:number[];blocks:number[];extensions:Record<string,string>}
export interface LegacyShadowIssueReport{issueNumber:number;status:"converged"|"drift"|"error"|"deferred";operationCounts:Readonly<Record<string,number>>;diagnostics:readonly {code:string;message:string}[]}
export interface LegacyShadowReport{schema:1;status:"success"|"error"|"deferred";failureClass?:"authentication"|"authorization"|"provider"|"invariant"|"deferred";diagnostics:readonly {code:string;message:string}[];issues:readonly LegacyShadowIssueReport[];totals:Readonly<Record<string,number>>;capabilities:readonly CompatibilityEntry[];evidence:{restRequests:number;graphqlRequests:number;restCacheHits:number;conditionalRequests:number;coalescedRequests:number}}
export interface LegacyShadowRunInput{ownerLogin:string;repositoryName:string;projectNumber:number;issueNumbers:readonly number[];policySource:string;token:string}

function rec(value:unknown):value is RecordValue{return typeof value==="object"&&value!==null&&!Array.isArray(value);}
function string(value:unknown):string|undefined{return typeof value==="string"&&value.trim()&&[...value.trim()].length<=256&&!/[\u0000-\u001f\u007f]/u.test(value)?value.trim():undefined;}
function stringMap(value:unknown):Record<string,string>{const out:Record<string,string>={};if(!rec(value))return out;for(const key of Object.keys(value).sort()){const parsed=string(value[key]);if(parsed)out[key]=parsed;}return out;}
function list(value:unknown):number[]{if(value===undefined)return[];if(!Array.isArray(value)||value.length>100||value.some(v=>!Number.isSafeInteger(v)||(v as number)<1))throw new TypeError("invalid legacy relationship");return[...new Set(value as number[])].sort((a,b)=>a-b);}
function parseYaml(source:string,maxBytes:number):RecordValue{if(Buffer.byteLength(source,"utf8")>maxBytes)throw new TypeError("legacy input exceeds bound");const documents=parseAllDocuments(source,{schema:"core",strict:true,uniqueKeys:true,prettyErrors:false});if(documents.length!==1||documents[0]!.errors.length)throw new TypeError("legacy YAML is invalid");const value=documents[0]!.toJS({maxAliasCount:0,mapAsMap:false});if(!rec(value))throw new TypeError("legacy YAML root is invalid");return value;}

export function parseLegacyPolicy(source:string):LegacyPolicy{const root=parseYaml(source,64*1024);if(root.version!==1||!rec(root.fields))throw new TypeError("legacy policy is invalid");const fields:Record<string,LegacyField>={};for(const key of Object.keys(root.fields).sort()){const raw=root.fields[key];if(!rec(raw)||!string(raw.project_field))throw new TypeError("legacy policy field is invalid");const target=raw.target===undefined||raw.target==="project_field"?"project_field":raw.target==="issue_type"?"issue_type":raw.target==="issue_field"?"issue_field":undefined;if(!target)throw new TypeError("legacy target is invalid");const type=raw.type===undefined||raw.type==="string"?"string":raw.type==="number"?"number":raw.type==="date"?"date":undefined;if(!type)throw new TypeError("legacy field type is invalid");fields[key]={projectField:string(raw.project_field)!,target,required:raw.required===true,type,values:stringMap(raw.values),labels:stringMap(raw.labels)};}return{fields,milestones:stringMap(root.milestones)};}

export function parseLegacyContract(body:string):LegacyContract{if(Buffer.byteLength(body,"utf8")>256*1024)throw new TypeError("legacy issue body exceeds bound");const marker="<!-- yukh",start=body.indexOf(marker);if(start<0||body.indexOf(marker,start+marker.length)>=0)throw new TypeError("legacy issue contract is missing or duplicated");const end=body.indexOf("-->",start+marker.length);if(end<0)throw new TypeError("legacy issue contract is unterminated");const raw=parseYaml(body.slice(start+marker.length,end),16*1024);if(raw.schema!==1)throw new TypeError("legacy schema is unsupported");const kind=string(raw.kind),area=string(raw.area),priority=string(raw.priority);if(!kind||!area||!priority)throw new TypeError("legacy required field is missing");const extensions=stringMap(raw.extensions),size=string(raw.size),milestone=string(raw.milestone),estimate=raw.estimate===undefined?undefined:Number(raw.estimate),parent=raw.parent===undefined?undefined:Number(raw.parent);if(estimate!==undefined&&(!Number.isFinite(estimate)||estimate<0)||parent!==undefined&&(!Number.isSafeInteger(parent)||parent<1))throw new TypeError("legacy numeric field is invalid");return{kind,area,priority,...(size?{size}:{}),...(estimate!==undefined?{estimate}:{}),...(milestone?{milestone}:{}),...(parent!==undefined?{parent}:{}),dependsOn:list(raw.depends_on),blocks:list(raw.blocks),extensions};}

function same(a:unknown,b:unknown):boolean{return typeof a==="string"&&typeof b==="string"?a===b:a===b;}
function bump(target:Record<string,number>,kind:string):void{target[kind]=(target[kind]??0)+1;}
export function runLegacyShadowAudit(policySource:string,snapshot:RestProjectSnapshot):LegacyShadowReport{
 let policy:LegacyPolicy;try{policy=parseLegacyPolicy(policySource);}catch{return{schema:1,status:"error",failureClass:"invariant",diagnostics:[{code:"YKP-LEGACY-001",message:"legacy policy is invalid"}],issues:[],totals:{},capabilities:LEGACY_COMPATIBILITY_MATRIX,evidence:snapshot.evidence};}
 const reports:LegacyShadowIssueReport[]=[],totals:Record<string,number>={};let deferred=false,failed=false;
 for(const [issueNumber,observed] of [...snapshot.issues.entries()].sort(([a],[b])=>a-b)){
  const counts:Record<string,number>={},diagnostics:{code:string;message:string}[]=[];let contract:LegacyContract;try{contract=parseLegacyContract(observed.body);}catch{reports.push({issueNumber,status:"error",operationCounts:{},diagnostics:[{code:"YKP-LEGACY-001",message:"legacy contract is invalid"}]});failed=true;continue;}
  const core:Record<string,string|number|undefined>={kind:contract.kind,area:contract.area,priority:contract.priority,size:contract.size,estimate:contract.estimate};
  const desiredLabels=new Set<string>();
  for(const key of Object.keys(policy.fields).sort()){
   const field=policy.fields[key]!,logical=core[key]??contract.extensions[key];if(logical===undefined){if(field.required)diagnostics.push({code:"YKP-LEGACY-002",message:"required governed value is missing"});continue;}const mapped=typeof logical==="string"&&Object.keys(field.values).length?field.values[logical]:logical;if(mapped===undefined){diagnostics.push({code:"YKP-LEGACY-003",message:"governed value is unsupported"});continue;}if(typeof logical==="string"&&field.labels[logical])desiredLabels.add(field.labels[logical]!);if(field.target==="issue_type"){if(!same(observed.issueType,mapped))bump(counts,"set_issue_type");}else if(field.target==="issue_field"){if(!same(observed.issueFields[field.projectField],mapped))bump(counts,"set_issue_field");}else if(!same(observed.values[field.projectField],mapped))bump(counts,"set_project_field");
  }
  const managedLabels=new Set(Object.values(policy.fields).flatMap(field=>Object.values(field.labels))),observedManaged=new Set(observed.labels.filter(label=>managedLabels.has(label)));for(const label of desiredLabels)if(!observedManaged.has(label))bump(counts,"add_label");for(const label of observedManaged)if(!desiredLabels.has(label))bump(counts,"remove_label");
  const desiredMilestone=contract.milestone?policy.milestones[contract.milestone]:undefined;if(contract.milestone&&!desiredMilestone)diagnostics.push({code:"YKP-LEGACY-004",message:"milestone mapping is unavailable"});else if(desiredMilestone!==observed.milestone)bump(counts,"set_milestone");if(contract.parent!==observed.parent)bump(counts,"set_parent");
  if(!observed.relationshipsComplete&&(contract.dependsOn.length>0||contract.blocks.length>0)){diagnostics.push({code:"YKP-RATE-001",message:"relationship snapshot requires the bounded fallback or a complete cache"});deferred=true;}else{const wanted=new Set(contract.dependsOn),current=new Set(observed.blockedBy);for(const n of wanted)if(!current.has(n))bump(counts,"add_dependency");for(const n of current)if(!wanted.has(n))bump(counts,"remove_dependency");const wantedBlocks=new Set(contract.blocks),currentBlocks=new Set(observed.blocking);for(const n of wantedBlocks)if(!currentBlocks.has(n))bump(counts,"add_blocking");for(const n of currentBlocks)if(!wantedBlocks.has(n))bump(counts,"remove_blocking");}
  for(const [key,value] of Object.entries(counts))totals[key]=(totals[key]??0)+value;const operations=Object.values(counts).reduce((a,b)=>a+b,0),status=diagnostics.some(d=>d.code!=="YKP-RATE-001")?"error":diagnostics.length?"deferred":operations?"drift":"converged";if(status==="error")failed=true;reports.push({issueNumber,status,operationCounts:counts,diagnostics});
 }
 return{schema:1,status:failed?"error":deferred?"deferred":"success",...(failed?{failureClass:"invariant" as const}:deferred?{failureClass:"deferred" as const}:{}),diagnostics:[],issues:reports,totals,capabilities:LEGACY_COMPATIBILITY_MATRIX,evidence:snapshot.evidence};
}

const EMPTY_EVIDENCE={restRequests:0,graphqlRequests:0,restCacheHits:0,conditionalRequests:0,coalescedRequests:0} as const;
export async function runLegacyShadow(input:LegacyShadowRunInput,reader:typeof readRestProjectSnapshot=readRestProjectSnapshot):Promise<LegacyShadowReport>{
 try{parseLegacyPolicy(input.policySource);}catch{return{schema:1,status:"error",failureClass:"invariant",diagnostics:[{code:"YKP-LEGACY-001",message:"legacy policy is invalid"}],issues:[],totals:{},capabilities:LEGACY_COMPATIBILITY_MATRIX,evidence:EMPTY_EVIDENCE};}
 try{const snapshot=await reader({ownerLogin:input.ownerLogin,repositoryName:input.repositoryName,projectNumber:input.projectNumber,issueNumbers:input.issueNumbers},{token:input.token,graphqlRemaining:0});return runLegacyShadowAudit(input.policySource,snapshot);}catch(error){const code=error instanceof GitHubTransportError?error.code:"YKP-GH-READ-004",failureClass=code==="YKP-GH-READ-002"?"authentication":code==="YKP-GH-READ-003"?"authorization":code==="YKP-RATE-001"?"deferred":code==="YKP-REST-001"||code==="YKP-SNAPSHOT-001"||code==="YKP-CACHE-001"?"invariant":"provider";return{schema:1,status:failureClass==="deferred"?"deferred":"error",failureClass,diagnostics:[{code,message:"snapshot acquisition failed"}],issues:[],totals:{},capabilities:LEGACY_COMPATIBILITY_MATRIX,evidence:EMPTY_EVIDENCE};}
}
