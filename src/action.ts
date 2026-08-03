import { appendFile, open } from "node:fs/promises";
import { join } from "node:path";
import { createGitHubRestSnapshotReadTransport } from "./github-rest-snapshot.js";
import { runDryRun } from "./dry-run.js";
import { loadWorkspacePolicy, parseRuntimeScope } from "./runtime-input.js";

function input(name:string):string{const value=process.env[`INPUT_${name.toUpperCase()}`];if(value===undefined||value==="")throw new TypeError("invalid action input");return value;}
async function output(name:string,value:string):Promise<void>{const path=process.env.GITHUB_OUTPUT;if(!path)throw new TypeError("invalid action output");await appendFile(path,`${name}=${value}\n`,{encoding:"utf8"});}
export async function actionMain():Promise<void>{
 try{const token=input("GITHUB-TOKEN");process.stdout.write(`::add-mask::${token}\n`);const workspace=process.env.GITHUB_WORKSPACE,temporary=process.env.RUNNER_TEMP;if(!workspace||!temporary)throw new TypeError("invalid action environment");const scope=parseRuntimeScope({owner:input("OWNER"),repository:input("REPOSITORY"),projectNumber:input("PROJECT-NUMBER"),issueNumber:input("ISSUE-NUMBER")});const policySource=await loadWorkspacePolicy(workspace,process.env["INPUT_POLICY-PATH"]||".yukh/project.yaml");const result=await runDryRun({scope,policySource,transport:createGitHubRestSnapshotReadTransport({token})});const reportPath=join(temporary,`yukh-projects-${process.pid}.json`);const file=await open(reportPath,"wx",0o600);try{await file.writeFile(`${JSON.stringify(result)}\n`,"utf8");}finally{await file.close();}await output("status",result.status);await output("executable",result.status==="success"?String(result.report.executable):"false");await output("plan-id",result.status==="success"?result.report.planId:"");await output("operation-count",result.status==="success"?String(result.report.counts.operations):"0");await output("report-path",reportPath);if(result.status==="error"){process.stderr.write(`::error title=Yukh Projects dry-run::${result.diagnostics[0]?.code??"YKP-RUNTIME-003"}\n`);process.exitCode=1;}}
 catch{process.stderr.write("::error title=Yukh Projects dry-run::YKP-RUNTIME-003\n");process.exitCode=1;}
}
void actionMain();
