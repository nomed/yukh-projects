import { createHash } from "node:crypto";
import type { AllowedReadOperation, ReadEnvelope, ReadOnlyTransport } from "./github-readonly.js";
import { GitHubTransportError } from "./github-transport.js";
import { createGitHubRateLedger, type GitHubRateLedger } from "./github-rate-ledger.js";

const API = "https://api.github.com";
const GRAPHQL = `${API}/graphql`;
const API_VERSION = "2026-03-10";
const RELATIONSHIP_QUERY = `query YukhRelationshipSnapshot($ids:[ID!]!){nodes(ids:$ids){... on Issue{id number repository{id} parent{number repository{id}} subIssues(first:100){nodes{number repository{id}}pageInfo{hasNextPage}} blockedBy(first:100){nodes{number repository{id}}pageInfo{hasNextPage}} blocking(first:100){nodes{number repository{id}}pageInfo{hasNextPage}}}} rateLimit{cost remaining resetAt}}`;
export const RELATIONSHIP_QUERY_ESTIMATED_COST=100;

type OwnerKind = "users"|"orgs";
type JsonRecord = Record<string,unknown>;
interface Cached { etag?:string; link?:string; expires:number; body:unknown; bytes:number }
interface RestPage { body:unknown; bytes:number; headers:Headers }
export interface RestSnapshotOptions {
 token:string;
 fetch?:typeof globalThis.fetch;
 cacheTtlMs?:number;
 restReserve?:number;
 graphqlReserve?:number;
 maxRestRequests?:number;
 maxGraphqlRequests?:number;
 graphqlRemaining?:number;
 rateLedger?:GitHubRateLedger;
 now?:()=>number;
}
export interface RestSnapshotEvidence { restRequests:number;graphqlRequests:number;restCacheHits:number;conditionalRequests:number;coalescedRequests:number }
export interface RestProjectSnapshot {
 subjectRef:string;ownerLogin:string;repositoryName:string;projectNumber:number;repositoryRef:string;projectRef:string;
 fields:readonly {id:string;name:string;kind:"text"|"number"|"date"|"single_select"|"iteration";options:readonly {id:string;name:string;color?:"GRAY"|"BLUE"|"GREEN"|"YELLOW"|"ORANGE"|"RED"|"PINK"|"PURPLE";description?:string}[]}[];
 issues:ReadonlyMap<number,{issueRef:string;issueDatabaseId:number;body:string;itemRef:string;fingerprint:string;values:Readonly<Record<string,string|number|null>>;issueType?:string;labels:readonly string[];milestone?:string;issueFields:Readonly<Record<string,string|number>>;parent?:number;blockedBy:readonly number[];blocking:readonly number[];relationshipsComplete:boolean}>;
 evidence:RestSnapshotEvidence;
}

function rec(v:unknown):v is JsonRecord{return typeof v==="object"&&v!==null&&!Array.isArray(v);}
function array(v:unknown):JsonRecord[]{if(!Array.isArray(v)||!v.every(rec))throw new GitHubTransportError("YKP-REST-001");return v;}
function text(v:unknown,max=512):string{if(typeof v!=="string"||v.length===0||[...v].length>max||/[\u0000-\u001f\u007f]/u.test(v))throw new GitHubTransportError("YKP-REST-001");return v;}
function integer(v:unknown):number{if(!Number.isSafeInteger(v)||(v as number)<=0)throw new GitHubTransportError("YKP-REST-001");return v as number;}
function rawName(v:unknown):string{if(typeof v==="string")return text(v,128);if(rec(v)&&rec(v.name)&&typeof v.name.raw==="string")return text(v.name.raw,128);if(rec(v)&&typeof v.raw==="string")return text(v.raw,128);throw new GitHubTransportError("YKP-REST-001");}
function value(v:unknown):string|number|null{if(v===null)return null;if(typeof v==="string"||typeof v==="number"&&Number.isFinite(v))return v;if(rec(v)){if(rec(v.name)&&typeof v.name.raw==="string")return v.name.raw;if(typeof v.raw==="string")return v.raw;}return null;}
function kind(v:unknown):"text"|"number"|"date"|"single_select"|"iteration"{const map:Record<string,"text"|"number"|"date"|"single_select"|"iteration">={text:"text",number:"number",date:"date",single_select:"single_select",iteration:"iteration"};const out=map[String(v)];if(!out)throw new GitHubTransportError("YKP-REST-001");return out;}
function nextLink(value:string|null):string|null{if(!value)return null;for(const part of value.split(",")){const match=part.match(/<([^>]+)>;\s*rel="next"/u);if(match)return match[1]??null;}return null;}
function normalizedPath(value:string):string{if(value.startsWith("/"))return value;let parsed:URL;try{parsed=new URL(value);}catch{throw new GitHubTransportError("YKP-CAPABILITY-001");}if(parsed.origin!==API||parsed.username||parsed.password||parsed.hash)throw new GitHubTransportError("YKP-CAPABILITY-001");return`${parsed.pathname}${parsed.search}`;}
function issueNumberFromUrl(v:unknown):number|undefined{if(typeof v!=="string")return undefined;const match=v.match(/\/issues\/(\d+)$/u);return match?Number(match[1]):undefined;}
function relationshipSummary(content:JsonRecord):{blockedBy:number;blocking:number}{const summary=rec(content.issue_dependencies_summary)?content.issue_dependencies_summary:{};const blockedBy=Number(summary.total_blocked_by??summary.blocked_by??0),blocking=Number(summary.total_blocking??summary.blocking??0);if(!Number.isSafeInteger(blockedBy)||blockedBy<0||!Number.isSafeInteger(blocking)||blocking<0)throw new GitHubTransportError("YKP-REST-001");return{blockedBy,blocking};}

class RestSnapshotClient {
 private readonly request:typeof globalThis.fetch;private readonly now:()=>number;private readonly ttl:number;private readonly cache=new Map<string,Cached>();private readonly flights=new Map<string,Promise<RestPage>>();private readonly generations=new Map<string,number>();
 private readonly ledger:GitHubRateLedger;private bytes=0;
 readonly evidence:RestSnapshotEvidence={restRequests:0,graphqlRequests:0,restCacheHits:0,conditionalRequests:0,coalescedRequests:0};
 constructor(private readonly options:RestSnapshotOptions){if(typeof options.token!=="string"||!options.token||/[\u0000-\u001f\u007f]/u.test(options.token))throw new TypeError("invalid credential");this.request=options.fetch??globalThis.fetch;this.now=options.now??Date.now;this.ttl=options.cacheTtlMs??300_000;this.ledger=options.rateLedger??createGitHubRateLedger({graphqlRemaining:options.graphqlRemaining,restReserve:options.restReserve,graphqlReserve:options.graphqlReserve,maxRestRequests:options.maxRestRequests,maxGraphqlRequests:options.maxGraphqlRequests});}
 private headers(etag?:string):Record<string,string>{return{accept:"application/vnd.github+json",authorization:`Bearer ${this.options.token}`,"x-github-api-version":API_VERSION,...(etag?{"if-none-match":etag}:{})};}
 private classify(response:Response):never{if(response.status===401)throw new GitHubTransportError("YKP-GH-READ-002");if(response.status===403)throw new GitHubTransportError(response.headers.get("x-ratelimit-remaining")==="0"?"YKP-RATE-001":"YKP-GH-READ-003");if(response.status===429)throw new GitHubTransportError("YKP-RATE-001");if([502,503,504].includes(response.status))throw new GitHubTransportError("YKP-GH-READ-004");throw new GitHubTransportError("YKP-REST-001");}
 private updateRate(resource:"rest"|"graphql",headers:Headers):void{const value=headers.get("x-ratelimit-remaining");if(value!==null&&/^\d+$/u.test(value))this.ledger.observe(resource,Number(value));}
 invalidate(input:SnapshotInput,effect:SnapshotInvalidationEffect):void{if(!/^[A-Za-z0-9-]{1,39}$/u.test(input.ownerLogin)||!Number.isSafeInteger(input.projectNumber)||input.projectNumber<1)throw new GitHubTransportError("YKP-GH-READ-001");const prefix=new RegExp(`^/(?:orgs|users)/${input.ownerLogin}/projectsV2/${input.projectNumber}/(?:${effect==="schema"?"fields|items":"items"})\\?`,`u`),keys=new Set([...this.cache.keys(),...this.flights.keys()]);for(const key of keys)if(prefix.test(key)){this.generations.set(key,(this.generations.get(key)??0)+1);this.cache.delete(key);this.flights.delete(key);}}
 async get(path:string):Promise<RestPage>{
  if(!/^\/(repos|users|orgs)\/[A-Za-z0-9_.\/-]+(?:\?[A-Za-z0-9_.,=&-]+)?$/u.test(path))throw new GitHubTransportError("YKP-CAPABILITY-001");
  const key=path, cached=this.cache.get(key), current=this.now();if(cached&&cached.expires>current){this.evidence.restCacheHits++;return{body:cached.body,bytes:cached.bytes,headers:new Headers(cached.link?{link:cached.link}:{})};}
  const existing=this.flights.get(key);if(existing){this.evidence.coalescedRequests++;return existing;}
  const generation=this.generations.get(key)??0,task=(async()=>{if(!this.ledger.reserve("rest"))throw new GitHubTransportError("YKP-RATE-001");this.evidence.restRequests++;if(cached?.etag)this.evidence.conditionalRequests++;let response:Response;try{response=await this.request(`${API}${path}`,{method:"GET",redirect:"manual",headers:this.headers(cached?.etag)});}catch{throw new GitHubTransportError("YKP-GH-READ-004");}this.updateRate("rest",response.headers);if(response.status===304&&cached){const refreshed={...cached,expires:current+this.ttl};if((this.generations.get(key)??0)===generation)this.cache.set(key,refreshed);return{body:refreshed.body,bytes:0,headers:new Headers(refreshed.link?{link:refreshed.link}:{})};}if(response.status>=300&&response.status<400||!response.ok)this.classify(response);if(!response.headers.get("content-type")?.toLowerCase().includes("json"))throw new GitHubTransportError("YKP-REST-001");const raw=new Uint8Array(await response.arrayBuffer());this.bytes+=raw.byteLength;if(raw.byteLength>8*1024*1024||this.bytes>64*1024*1024)throw new GitHubTransportError("YKP-GH-READ-005");let body:unknown;try{body=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw));}catch{throw new GitHubTransportError("YKP-REST-001");}if((this.generations.get(key)??0)===generation)this.cache.set(key,{body,bytes:raw.byteLength,etag:response.headers.get("etag")??undefined,link:response.headers.get("link")??undefined,expires:current+this.ttl});return{body,bytes:raw.byteLength,headers:response.headers};})();
  this.flights.set(key,task);try{return await task;}finally{this.flights.delete(key);}
 }
 async list(path:string):Promise<{nodes:JsonRecord[];bytes:number}>{const nodes:JsonRecord[]=[];let bytes=0,next:string|null=path;for(let page=0;next&&page<20;page++){const response=await this.get(normalizedPath(next));nodes.push(...array(response.body));bytes+=response.bytes;if(nodes.length>10_000)throw new GitHubTransportError("YKP-GH-READ-005");next=nextLink(response.headers.get("link"));}if(next)throw new GitHubTransportError("YKP-GH-READ-005");return{nodes,bytes};}
 async relationships(ids:readonly string[]):Promise<Map<string,{number:number;parent?:number;blockedBy:number[];blocking:number[]}>>{const result=new Map<string,{number:number;parent?:number;blockedBy:number[];blocking:number[]}>();if(ids.length===0)return result;if(ids.length>100)throw new GitHubTransportError("YKP-GH-READ-005");if(this.options.graphqlRemaining===0&&!this.options.rateLedger)return result;if(!this.ledger.reserve("graphql",RELATIONSHIP_QUERY_ESTIMATED_COST))throw new GitHubTransportError("YKP-RATE-001");this.evidence.graphqlRequests++;let response:Response;try{response=await this.request(GRAPHQL,{method:"POST",redirect:"manual",headers:{accept:"application/vnd.github+json","content-type":"application/json",authorization:`Bearer ${this.options.token}`,"x-github-api-version":"2022-11-28"},body:JSON.stringify({query:RELATIONSHIP_QUERY,variables:{ids}})});}catch{throw new GitHubTransportError("YKP-GH-READ-004");}this.updateRate("graphql",response.headers);if(!response.ok)this.classify(response);let payload:unknown;try{payload=await response.json();}catch{throw new GitHubTransportError("YKP-REST-001");}if(!rec(payload)||Array.isArray(payload.errors)||!rec(payload.data)||!Array.isArray(payload.data.nodes)||!rec(payload.data.rateLimit))throw new GitHubTransportError("YKP-REST-001");this.ledger.observe("graphql",Number(payload.data.rateLimit.remaining));for(const node of payload.data.nodes){if(!rec(node))throw new GitHubTransportError("YKP-REST-001");const connections=["subIssues","blockedBy","blocking"].map(name=>{const c=node[name];if(!rec(c)||!Array.isArray(c.nodes)||!rec(c.pageInfo)||c.pageInfo.hasNextPage===true)throw new GitHubTransportError("YKP-GH-READ-005");return c.nodes.map(v=>{if(!rec(v))throw new GitHubTransportError("YKP-REST-001");return integer(v.number);});});result.set(text(node.id),{number:integer(node.number),...(rec(node.parent)?{parent:integer(node.parent.number)}:{}),blockedBy:connections[1]!,blocking:connections[2]!});}return result;}
}

function subject(token:string):string{return`github-token:${createHash("sha256").update(token).digest("hex")}`;}
function fieldOptions(field:JsonRecord):{id:string;name:string;color?:"GRAY"|"BLUE"|"GREEN"|"YELLOW"|"ORANGE"|"RED"|"PINK"|"PURPLE";description?:string}[]{if(!Array.isArray(field.options))return[];return field.options.map(option=>{if(!rec(option))throw new GitHubTransportError("YKP-REST-001");const colors=["GRAY","BLUE","GREEN","YELLOW","ORANGE","RED","PINK","PURPLE"] as const,color=typeof option.color==="string"&&colors.includes(option.color as typeof colors[number])?option.color as typeof colors[number]:undefined,description=typeof option.description==="string"&&[...option.description].length<=256&&!/[\u0000-\u001f\u007f]/u.test(option.description)?option.description:undefined;return{id:text(option.id),name:rawName(option.name),...(color?{color}:{}),...(description!==undefined?{description}:{})};}).sort((a,b)=>a.id.localeCompare(b.id));}
function itemValues(item:JsonRecord):Record<string,string|number|null>{const out:Record<string,string|number|null>={};for(const field of array(item.fields??[])){const name=text(field.name,128);if(Object.hasOwn(out,name))throw new GitHubTransportError("YKP-REST-001");out[name]=value(field.value);}return out;}
function nativeIssueFields(content:JsonRecord):Record<string,string|number>{const out:Record<string,string|number>={};if(!Array.isArray(content.issue_field_values))return out;for(const entry of content.issue_field_values){if(!rec(entry)||typeof entry.issue_field_name!=="string")throw new GitHubTransportError("YKP-REST-001");const observed=entry.single_select_option;if(rec(observed)&&typeof observed.name==="string")out[entry.issue_field_name]=observed.name;else if(typeof entry.value==="string"||typeof entry.value==="number")out[entry.issue_field_name]=entry.value;}return out;}

export type SnapshotInput={ownerLogin:string;repositoryName:string;projectNumber:number;issueNumbers:readonly number[]};
export type SnapshotInvalidationEffect="item"|"schema";
export interface RestProjectSnapshotReader{read(input:SnapshotInput):Promise<RestProjectSnapshot>;invalidate(input:SnapshotInput,effect:SnapshotInvalidationEffect):void}
export function snapshotInvalidationForMutation(kind:"create_project_field"|"update_project_field_options"|"update_project_item_field_value"|"set_issue_type"|"add_sub_issue"|"add_blocked_by"):SnapshotInvalidationEffect{return kind==="create_project_field"||kind==="update_project_field_options"?"schema":"item";}
async function readWithClient(input:SnapshotInput,options:RestSnapshotOptions,client:RestSnapshotClient):Promise<RestProjectSnapshot>{
 const numbers=[...new Set(input.issueNumbers)].sort((a,b)=>a-b);if(!/^[A-Za-z0-9-]{1,39}$/u.test(input.ownerLogin)||!/^[A-Za-z0-9_.-]{1,100}$/u.test(input.repositoryName)||!Number.isSafeInteger(input.projectNumber)||input.projectNumber<1||numbers.length<1||numbers.length>100||numbers.some(n=>!Number.isSafeInteger(n)||n<1))throw new GitHubTransportError("YKP-GH-READ-001");
 const repoPage=await client.get(`/repos/${input.ownerLogin}/${input.repositoryName}`),repo=repoPage.body;if(!rec(repo)||!rec(repo.owner))throw new GitHubTransportError("YKP-REST-001");const ownerKind:OwnerKind=repo.owner.type==="Organization"?"orgs":repo.owner.type==="User"?"users":(()=>{throw new GitHubTransportError("YKP-CAPABILITY-001");})();const projectPage=await client.get(`/${ownerKind}/${input.ownerLogin}/projectsV2/${input.projectNumber}`),project=projectPage.body;if(!rec(project)||integer(project.number)!==input.projectNumber)throw new GitHubTransportError("YKP-SNAPSHOT-001");const projectRef=text(project.node_id);
 const fieldsPage=await client.list(`/${ownerKind}/${input.ownerLogin}/projectsV2/${input.projectNumber}/fields?per_page=100`);const fields=fieldsPage.nodes.filter(f=>["text","number","date","single_select","iteration"].includes(String(f.data_type))).map(f=>({id:text(f.node_id),name:text(f.name,128),kind:kind(f.data_type),options:fieldOptions(f)}));const fieldSelector=fieldsPage.nodes.map(f=>String(integer(f.id))).join(",");if(fieldSelector.length>4096)throw new GitHubTransportError("YKP-GH-READ-005");const itemsPage=await client.list(`/${ownerKind}/${input.ownerLogin}/projectsV2/${input.projectNumber}/items?per_page=100${fieldSelector?`&fields=${fieldSelector}`:""}`);const wanted=new Set(numbers),selected=new Map<number,JsonRecord>();for(const item of itemsPage.nodes){if(!rec(item.content)||!rec(item.content.repository)||item.content.repository.full_name!==`${input.ownerLogin}/${input.repositoryName}`)continue;const n=item.content.number;if(Number.isSafeInteger(n)&&wanted.has(n as number)){if(selected.has(n as number))throw new GitHubTransportError("YKP-SNAPSHOT-001");selected.set(n as number,item);}}if(selected.size!==numbers.length)throw new GitHubTransportError("YKP-SNAPSHOT-001");const relationshipIds=numbers.flatMap(n=>{const content=selected.get(n)!.content as JsonRecord,summary=relationshipSummary(content);return summary.blockedBy+summary.blocking>0?[text(content.node_id)]:[];});const relationships=await client.relationships(relationshipIds),issues=new Map<number,RestProjectSnapshot["issues"] extends ReadonlyMap<number,infer V>?V:never>();for(const n of numbers){const item=selected.get(n)!,content=item.content as JsonRecord,relation=relationships.get(text(content.node_id));const parent=relation?.parent??issueNumberFromUrl(content.parent_issue_url),labels=Array.isArray(content.labels)?content.labels.map(label=>{if(!rec(label))throw new GitHubTransportError("YKP-REST-001");return text(label.name,128);}).sort():[],milestone=rec(content.milestone)&&typeof content.milestone.title==="string"?text(content.milestone.title,128):undefined,issueType=rec(content.type)&&typeof content.type.name==="string"?text(content.type.name,128):undefined,summary=relationshipSummary(content),relationshipsComplete=Boolean(relation)||(summary.blockedBy===0&&summary.blocking===0);issues.set(n,{issueRef:text(content.node_id),issueDatabaseId:integer(content.id),body:typeof content.body==="string"?content.body:"",itemRef:text(item.node_id),fingerprint:text(item.node_id),values:itemValues(item),...(issueType?{issueType}:{}),labels,...(milestone?{milestone}:{}),issueFields:nativeIssueFields(content),...(parent?{parent}:{}),blockedBy:relation?.blockedBy??[],blocking:relation?.blocking??[],relationshipsComplete});}
 return{subjectRef:subject(options.token),ownerLogin:input.ownerLogin,repositoryName:input.repositoryName,projectNumber:input.projectNumber,repositoryRef:text(repo.node_id),projectRef,fields:fields.sort((a,b)=>a.id.localeCompare(b.id)),issues,evidence:{...client.evidence}};
}

export function createRestProjectSnapshotReader(options:RestSnapshotOptions):RestProjectSnapshotReader{const client=new RestSnapshotClient(options);return{read:input=>readWithClient(input,options,client),invalidate:(input,effect)=>client.invalidate(input,effect)};}
export async function readRestProjectSnapshot(input:SnapshotInput,options:RestSnapshotOptions):Promise<RestProjectSnapshot>{return createRestProjectSnapshotReader(options).read(input);}

export function createGitHubRestSnapshotReadTransportFromReader(reader:RestProjectSnapshotReader):ReadOnlyTransport{
 let snapshotPromise:Promise<RestProjectSnapshot>|undefined;
 let bound:string|undefined;
 return {execute:async(operation:AllowedReadOperation,variables:Readonly<Record<string,unknown>>):Promise<ReadEnvelope>=>{
  const ownerLogin=text(variables.ownerLogin),repositoryName=text(variables.repositoryName),projectNumber=integer(variables.projectNumber),issueNumber=integer(variables.issueNumber);
  const key=`${ownerLogin}/${repositoryName}/${projectNumber}/${issueNumber}`;
  if(bound&&bound!==key)throw new GitHubTransportError("YKP-SNAPSHOT-001");
  bound=key;
  snapshotPromise??=reader.read({ownerLogin,repositoryName,projectNumber,issueNumbers:[issueNumber]});
  const snapshot=await snapshotPromise,issue=snapshot.issues.get(issueNumber);
  if(!issue)throw new GitHubTransportError("YKP-SNAPSHOT-001");
  let data:unknown;
  if(operation==="resolve_scope")data={subjectRef:snapshot.subjectRef,ownerLogin,repositoryName,projectNumber,issueNumber,repositoryRef:snapshot.repositoryRef,projectRef:snapshot.projectRef,issueRef:issue.issueRef,issueBody:issue.body};
  else if(operation==="read_project_fields")data={projectRef:snapshot.projectRef,nodes:snapshot.fields,pageInfo:{hasNextPage:false,endCursor:null}};
  else if(operation==="read_project_item")data={projectRef:snapshot.projectRef,issueRef:issue.issueRef,itemRef:issue.itemRef,fingerprint:issue.fingerprint,nodes:Object.entries(issue.values).map(([key,value])=>({key,value})),pageInfo:{hasNextPage:false,endCursor:null}};
  else{
   const nodes=new Set([issueNumber,...issue.blockedBy,...issue.blocking,...(issue.parent?[issue.parent]:[])]);
   data={repositoryRef:snapshot.repositoryRef,issueRef:issue.issueRef,nodes:[...nodes].sort((a,b)=>a-b).map(issueNumber=>({issueNumber})),parent:issue.parent?[{from:issueNumber,to:issue.parent}]:[],blocks:[...issue.blockedBy.map(from=>({from,to:issueNumber})),...issue.blocking.map(to=>({from:issueNumber,to}))],pageInfo:{hasNextPage:false,endCursor:null}};
  }
  return{byteCount:Buffer.byteLength(JSON.stringify(data)),data};
 }};
}
export function createGitHubRestSnapshotReadTransport(options:RestSnapshotOptions):ReadOnlyTransport{return createGitHubRestSnapshotReadTransportFromReader(createRestProjectSnapshotReader(options));}
