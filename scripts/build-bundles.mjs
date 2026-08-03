import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const common={bundle:true,platform:"node",target:"node24",format:"esm",sourcemap:false,minify:false,legalComments:"eof",packages:"bundle",logLevel:"info"};
await build({...common,entryPoints:["src/action.ts"],outfile:"dist/action/index.js"});
await build({...common,entryPoints:["src/cli.ts"],outfile:"dist/cli/index.js"});
await build({...common,entryPoints:["src/apply-bundle.ts"],outfile:"dist/apply/index.js"});
const applyBytes=await readFile("dist/apply/index.js"),applyManifest={schema:1,artifact:"controlled-apply-library",entrypoint:"library-only",sha256:createHash("sha256").update(applyBytes).digest("hex"),bytes:applyBytes.byteLength,publication:"disabled"};
await writeFile("dist/apply/manifest.json",`${JSON.stringify(applyManifest)}\n`,{encoding:"utf8",mode:0o644});
