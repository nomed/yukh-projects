import { lstat, open, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import type { RequestedGitHubScope } from "./github-readonly.js";

const OWNER=/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u;
const REPOSITORY=/^[A-Za-z0-9_.-]{1,100}$/u;
const DECIMAL=/^[1-9][0-9]{0,9}$/u;

export interface RuntimeScopeInput { owner:string; repository:string; projectNumber:string; issueNumber:string }
export function parseRuntimeScope(input:RuntimeScopeInput):RequestedGitHubScope{
 if(!OWNER.test(input.owner)||!REPOSITORY.test(input.repository)||input.repository==="."||input.repository===".."||!DECIMAL.test(input.projectNumber)||!DECIMAL.test(input.issueNumber))throw new TypeError("invalid runtime input");
 const projectNumber=Number(input.projectNumber),issueNumber=Number(input.issueNumber);if(projectNumber>2147483647||issueNumber>2147483647)throw new TypeError("invalid runtime input");
 return{ownerLogin:input.owner,repositoryName:input.repository,projectNumber,issueNumber};
}

export async function loadWorkspacePolicy(workspace:string,policyPath=".yukh/project.yaml"):Promise<string>{
 if(!policyPath||isAbsolute(policyPath)||policyPath.split(/[\\/]/u).includes("..")||/[\u0000-\u001f\u007f]/u.test(policyPath))throw new TypeError("invalid policy path");
 const root=await realpath(workspace),candidate=resolve(root,policyPath),resolved=await realpath(candidate);const rel=relative(root,resolved);if(rel===""||rel===".."||rel.startsWith(`..${sep}`)||isAbsolute(rel))throw new TypeError("invalid policy path");
 const metadata=await lstat(candidate);if(metadata.isSymbolicLink()||!metadata.isFile()||metadata.size>64*1024)throw new TypeError("invalid policy file");
 const source=await readFile(resolved,"utf8");if(Buffer.byteLength(source,"utf8")>64*1024)throw new TypeError("invalid policy file");return source;
}

export async function writeWorkspaceReport(workspace:string,reportPath:string,content:string):Promise<void>{
 if(!reportPath||isAbsolute(reportPath)||reportPath.split(/[\\/]/u).includes("..")||/[\u0000-\u001f\u007f]/u.test(reportPath)||Buffer.byteLength(content,"utf8")>1024*1024)throw new TypeError("invalid report path");
 const root=await realpath(workspace),parent=await realpath(dirname(resolve(root,reportPath))),rel=relative(root,parent);if(rel===".."||rel.startsWith(`..${sep}`)||isAbsolute(rel))throw new TypeError("invalid report path");
 const file=await open(resolve(parent,reportPath.split(/[\\/]/u).at(-1)!),"wx",0o600);try{await file.writeFile(content,"utf8");}finally{await file.close();}
}
