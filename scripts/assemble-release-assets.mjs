import { mkdir, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readReleaseManifest, readVerifiedSource, verifyReleaseAssetDirectory, verifyReleaseSources } from "./release-candidate-lib.mjs";

const [output="release-assets",manifestPath]=process.argv.slice(2);
const {value:manifest}=await readReleaseManifest(manifestPath);
await verifyReleaseSources(manifest);
await mkdir(output,{recursive:true});
if((await readdir(output)).length!==0)throw new Error("release output directory is not empty");
for(const entry of [...manifest.assets,manifest.checksum]){
 const bytes=await readVerifiedSource(process.cwd(),entry);
 await writeFile(resolve(output,entry.name),bytes,{flag:"wx",mode:0o644});
}
await verifyReleaseAssetDirectory(manifest,output);
