import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const [version,sourceCommit]=process.argv.slice(2);
const SEMVER=/^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u;
const COMMIT=/^[0-9a-f]{40}$/u;
const PACKAGE=/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u;
if(!SEMVER.test(version??"")||!COMMIT.test(sourceCommit??"")||sourceCommit!=="a4f05f673bb0a03f66fc9864372cee7839ed78d1")throw new Error("release SBOM arguments are invalid");
const packageDocument=JSON.parse(await readFile("package.json","utf8"));
const lockDocument=JSON.parse(await readFile("package-lock.json","utf8"));
if(packageDocument.name!=="@nomed/yukh-projects"||packageDocument.version!==version||lockDocument.lockfileVersion!==3||lockDocument.packages?.[""]?.version!==version)throw new Error("release SBOM package identity mismatch");

const entries=Object.entries(lockDocument.packages);
const pathToId=new Map();
const packageName=path=>{
 const marker=path.lastIndexOf("node_modules/");
 return marker<0?packageDocument.name:path.slice(marker+"node_modules/".length);
};
const spdxId=(name,packageVersion)=>`SPDXRef-Package-${name.replace(/[^A-Za-z0-9.-]/gu,".")}-${packageVersion}`;
for(const [path,value] of entries){
 const name=packageName(path);
 if(!PACKAGE.test(name)||!SEMVER.test(value.version??""))throw new Error("release SBOM lock package is invalid");
 const id=spdxId(name,value.version);
 if([...pathToId.values()].includes(id))throw new Error("release SBOM package identity is ambiguous");
 pathToId.set(path,id);
}

const integrity=value=>{
 const match=/^sha512-([A-Za-z0-9+/]+={0,2})$/u.exec(value??"");
 if(!match)throw new Error("release SBOM integrity is invalid");
 const bytes=Buffer.from(match[1],"base64");
 if(bytes.byteLength!==64)throw new Error("release SBOM integrity length is invalid");
 return bytes.toString("hex");
};
const purl=(name,packageVersion)=>`pkg:npm/${name.startsWith("@")?`%40${name.slice(1)}`:name}@${packageVersion}`;
const packages=entries.map(([path,value])=>{
 const name=packageName(path),root=path==="",resolved=value.resolved??"NOASSERTION";
 if(resolved!=="NOASSERTION"&&!/^https:\/\/registry\.npmjs\.org\/[A-Za-z0-9@%+._/-]+\.tgz$/u.test(resolved))throw new Error("release SBOM download location is invalid");
 const item={
  name,
  SPDXID:pathToId.get(path),
  versionInfo:value.version,
  packageFileName:path,
  downloadLocation:resolved,
  filesAnalyzed:false,
  licenseDeclared:value.license??"NOASSERTION",
  externalRefs:[{referenceCategory:"PACKAGE-MANAGER",referenceType:"purl",referenceLocator:purl(name,value.version)}]
 };
 if(root)return{...item,description:packageDocument.description,primaryPackagePurpose:"LIBRARY",homepage:packageDocument.homepage??"NOASSERTION"};
 return{...item,checksums:[{algorithm:"SHA512",checksumValue:integrity(value.integrity)}]};
}).sort((a,b)=>a.SPDXID.localeCompare(b.SPDXID));

const resolveDependency=(parentPath,name)=>{
 let cursor=parentPath;
 while(true){
  const candidate=cursor?`${cursor}/node_modules/${name}`:`node_modules/${name}`;
  if(pathToId.has(candidate))return pathToId.get(candidate);
  const marker=cursor.lastIndexOf("/node_modules/");
  if(marker<0){if(cursor==="")break;cursor="";}else cursor=cursor.slice(0,marker);
 }
 throw new Error("release SBOM dependency is unresolved");
};
const relationships=[{spdxElementId:"SPDXRef-DOCUMENT",relatedSpdxElement:pathToId.get(""),relationshipType:"DESCRIBES"}];
for(const [path,value] of entries){
 for(const [field,type] of [["dependencies","DEPENDENCY_OF"],["devDependencies","DEV_DEPENDENCY_OF"],["optionalDependencies","OPTIONAL_DEPENDENCY_OF"]]){
  for(const name of Object.keys(value[field]??{}).sort())relationships.push({spdxElementId:resolveDependency(path,name),relatedSpdxElement:pathToId.get(path),relationshipType:type});
 }
}
relationships.sort((a,b)=>`${a.relatedSpdxElement}\0${a.relationshipType}\0${a.spdxElementId}`.localeCompare(`${b.relatedSpdxElement}\0${b.relationshipType}\0${b.spdxElementId}`));
const document={
 spdxVersion:"SPDX-2.3",
 dataLicense:"CC0-1.0",
 SPDXID:"SPDXRef-DOCUMENT",
 name:`${packageDocument.name}@${version}`,
 documentNamespace:`https://github.com/nomed/yukh-projects/releases/tag/v${version}#spdx-${sourceCommit}`,
 creationInfo:{created:"2026-08-09T18:00:26.000Z",creators:["Tool: yukh-projects/create-release-sbom-v2"]},
 documentDescribes:[pathToId.get("")],
 packages,
 relationships
};
const bytes=Buffer.from(`${JSON.stringify(document,null,2)}\n`,"utf8");
if(createHash("sha256").update(bytes).digest("hex").length!==64)throw new Error("release SBOM digest failed");
process.stdout.write(bytes);
