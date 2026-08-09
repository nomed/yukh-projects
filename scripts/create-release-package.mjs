import { spawnSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const [version,output="release-package.tgz"]=process.argv.slice(2);
if(!/^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u.test(version??""))throw new Error("release package version is invalid");
const packageDocument=JSON.parse(await readFile("package.json","utf8"));
if(packageDocument.name!=="@nomed/yukh-projects"||packageDocument.version!==version||packageDocument.private!==true||Object.keys(packageDocument.exports??{}).join("\0")!=="."||JSON.stringify(packageDocument.files)!==JSON.stringify(["dist/src/"]))throw new Error("release package boundary is invalid");
const temporary=await mkdtemp(join(tmpdir(),"yukh-projects-release-package-"));
try{
 const packed=spawnSync("npm",["pack","--ignore-scripts","--json","--pack-destination",temporary],{encoding:"utf8",maxBuffer:1024*1024});
 if(packed.error||packed.signal||packed.status!==0)throw new Error("release package assembly failed");
 const report=JSON.parse(packed.stdout);
 if(!Array.isArray(report)||report.length!==1||typeof report[0]?.filename!=="string")throw new Error("release package receipt is invalid");
 const filename=basename(report[0].filename);
 if(filename!==`nomed-yukh-projects-${version}.tgz`)throw new Error("release package filename is invalid");
 await copyFile(join(temporary,filename),resolve(output));
}finally{
 await rm(temporary,{recursive:true,force:true});
}
