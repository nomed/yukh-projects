import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readdir, rm } from "node:fs/promises";
import { buildMcpEffectBTestBundle } from "./build-mcp-effect-b-test-bundle.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const temporary=join(root,".test-work",`tests-${process.pid}`);

try{
 await rm(temporary,{recursive:true,force:true});
 await mkdir(temporary,{recursive:true});
 const output=join(temporary,"mcp-effect-b-controlled-apply.test.mjs");
 await buildMcpEffectBTestBundle("test/mcp-effect-b-controlled-apply.test.ts",output);
 const ordinary=(await readdir(resolve(root,"dist/test"),{withFileTypes:true}))
  .filter(entry=>entry.isFile()&&entry.name.endsWith(".test.js")&&entry.name!=="mcp-effect-b-controlled-apply.test.js")
  .map(entry=>resolve(root,"dist/test",entry.name))
  .sort();
 const result=spawnSync(process.execPath,["--test",...ordinary,output],{cwd:root,stdio:"inherit"});
 if(result.error)throw result.error;
 if(result.signal||result.status!==0)process.exitCode=result.status??1;
}finally{
 await rm(temporary,{recursive:true,force:true});
}
