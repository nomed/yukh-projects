import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

for(const path of ["dist/action/index.js","dist/cli/index.js"]){const tracked=spawnSync("git",["ls-files","--error-unmatch",path],{stdio:"ignore"});if(tracked.status!==0)throw new Error("preview bundle is not committed");const source=await readFile(path,"utf8");for(const forbidden of ["github-mutation-transport","YukhCreateProjectField","mutation Yukh"])if(source.includes(forbidden))throw new Error("preview bundle contains a prohibited mutation module");}
const diff=spawnSync("git",["diff","--exit-code","--","dist/action/index.js","dist/cli/index.js"],{stdio:"inherit"});if(diff.status!==0)throw new Error("committed preview bundle is not reproducible");
