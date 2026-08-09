import { spawnSync } from "node:child_process";

const [version,sourceCommit]=process.argv.slice(2);
if(!/^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u.test(version??"")||!/^[0-9a-f]{40}$/u.test(sourceCommit??""))throw new Error("release SBOM arguments are invalid");
if(sourceCommit!=="a4f05f673bb0a03f66fc9864372cee7839ed78d1")throw new Error("release SBOM source commit mismatch");
const generated=spawnSync("npm",["sbom","--sbom-format","spdx"],{encoding:"utf8",maxBuffer:4*1024*1024});
if(generated.error||generated.signal||generated.status!==0)throw new Error("release SBOM generation failed");
const document=JSON.parse(generated.stdout);
if(document.spdxVersion!=="SPDX-2.3"||document.dataLicense!=="CC0-1.0"||document.SPDXID!=="SPDXRef-DOCUMENT"||document.name!==`@nomed/yukh-projects@${version}`||!Array.isArray(document.packages)||!Array.isArray(document.relationships))throw new Error("release SBOM document is invalid");
document.documentNamespace=`https://github.com/nomed/yukh-projects/releases/tag/v${version}#spdx-${sourceCommit}`;
document.creationInfo={created:"2026-08-09T18:00:26.000Z",creators:["Tool: npm/cli","Tool: yukh-projects/create-release-sbom-v1"]};
process.stdout.write(`${JSON.stringify(document,null,2)}\n`);
