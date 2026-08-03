import { applyCliMain } from "./apply-cli.js";
import { createControlledApplyHostFactory } from "./controlled-apply-host.js";
import { parseApplyCliArgs, readBoundedFd } from "./apply-runtime-input.js";
import { parseRuntimeScope } from "./runtime-input.js";
import { parseProtectedHostCapsule } from "./protected-host-capsule.js";

let exit=2;try{const argv=process.argv.slice(2),parsed=parseApplyCliArgs(argv),source=await readBoundedFd(parsed.hostCapsuleFd,64*1024),scope=parseRuntimeScope({owner:parsed.owner,repository:parsed.repository,projectNumber:parsed.projectNumber,issueNumber:parsed.issueNumber}),runtime=parseProtectedHostCapsule(source,{scope,environment:parsed.environment});exit=await applyCliMain(argv,process.cwd(),createControlledApplyHostFactory(runtime.options),value=>process.stdout.write(value));}catch{process.stdout.write('{"schema":1,"status":"error","planId":"invalid","counts":{"already_converged":0,"verified":0,"failed":0,"not_attempted":0},"remaining":0,"diagnostics":[{"code":"YKP-APPLY-001","severity":"error","message":"apply request is invalid"}]}\n');}process.exitCode=exit;
