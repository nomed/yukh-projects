import { appendFile } from "node:fs/promises";
import { applyActionMain, type ApplyActionIO } from "./apply-action.js";
import { createControlledApplyHostFactory } from "./controlled-apply-host.js";
import { parseRuntimeScope } from "./runtime-input.js";
import { parseProtectedHostCapsule } from "./protected-host-capsule.js";
import { readRunnerCapsule } from "./apply-runtime-input.js";

const env=process.env as Record<string,string|undefined>,runnerTemp=env.RUNNER_TEMP,outputFile=env.GITHUB_OUTPUT;
const io:ApplyActionIO={env,mask:value=>process.stdout.write(`::add-mask::${value}\n`),output:async(name,value)=>{if(!outputFile)throw new TypeError("invalid action environment");await appendFile(outputFile,`${name}=${value}\n`,"utf8");},error:code=>process.stderr.write(`::error title=Yukh Projects controlled apply::${code}\n`)};
try{if(!runnerTemp)throw new TypeError("invalid action environment");const scope=parseRuntimeScope({owner:env.INPUT_OWNER!,repository:env.INPUT_REPOSITORY!,projectNumber:env["INPUT_PROJECT-NUMBER"]!,issueNumber:env["INPUT_ISSUE-NUMBER"]!}),environment=env.INPUT_ENVIRONMENT!,source=await readRunnerCapsule(runnerTemp,env["INPUT_HOST-CAPSULE-FILE"]!),runtime=parseProtectedHostCapsule(source,{scope,environment}),raw=JSON.parse(source);io.mask(String(raw.coordination.credential));io.mask(String(raw.coordination.dpop_private_jwk.d));const report=await applyActionMain(io,createControlledApplyHostFactory(runtime.options));if(report.status!=="success")process.exitCode=1;}catch{io.error("YKP-APPLY-001");process.exitCode=1;}
