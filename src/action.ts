import { appendFile, open } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createGitHubRestSnapshotReadTransport } from "./github-rest-snapshot.js";
import { runDryRun } from "./dry-run.js";
import { runLegacyDryRun } from "./legacy-plan.js";
import { loadWorkspacePolicy, parseRuntimeScope } from "./runtime-input.js";

function input(name:string):string{const value=process.env[`INPUT_${name.toUpperCase()}`];if(value===undefined||value==="")throw new TypeError("invalid action input");return value;}
async function output(name:string,value:string):Promise<void>{const path=process.env.GITHUB_OUTPUT;if(!path)throw new TypeError("invalid action output");await appendFile(path,`${name}=${value}\n`,{encoding:"utf8"});}
export type ActionMode="native"|"legacy-shadow";
export function parseActionMode(value:string|undefined):ActionMode{if(value===undefined||value===""||value==="native")return"native";if(value==="legacy-shadow")return value;throw new TypeError("invalid action mode");}
export async function actionMain():Promise<void>{
 try{const mode=parseActionMode(process.env.INPUT_MODE),token=input("GITHUB-TOKEN");process.stdout.write(`::add-mask::${token}\n`);const workspace=process.env.GITHUB_WORKSPACE,temporary=process.env.RUNNER_TEMP;if(!workspace||!temporary)throw new TypeError("invalid action environment");const scope=parseRuntimeScope({owner:input("OWNER"),repository:input("REPOSITORY"),projectNumber:input("PROJECT-NUMBER"),issueNumber:input("ISSUE-NUMBER")});const policySource=await loadWorkspacePolicy(workspace,process.env["INPUT_POLICY-PATH"]||".yukh/project.yaml");const result=mode==="legacy-shadow"?await runLegacyDryRun({...scope,policySource,token}):await runDryRun({scope,policySource,transport:createGitHubRestSnapshotReadTransport({token})});const reportPath=join(temporary,`yukh-projects-${process.pid}.json`);const file=await open(reportPath,"wx",0o600);try{await file.writeFile(`${JSON.stringify(result)}\n`,"utf8");}finally{await file.close();}const success=result.status==="success";await output("status",result.status);await output("executable",String(success));await output("plan-id",success?result.report.planId:"");await output("operation-count",String(success?result.report.counts.operations:0));await output("report-path",reportPath);if(result.status==="error"){process.stderr.write(`::error title=Yukh Projects dry-run::${result.diagnostics[0]?.code??"YKP-RUNTIME-003"}\n`);process.exitCode=1;}}
 catch{process.stderr.write("::error title=Yukh Projects dry-run::YKP-RUNTIME-003\n");process.exitCode=1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void actionMain();
