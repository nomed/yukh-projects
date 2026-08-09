import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const stripYamlDebugEnvironment={name:"strip-yaml-debug-environment",setup(build){build.onLoad({filter:/node_modules\/yaml\/dist\/.*\.js$/},async args=>({contents:(await readFile(args.path,"utf8")).replaceAll("node_process.env.LOG_STREAM","false").replaceAll("node_process.env.LOG_TOKENS","false"),loader:"js"}));}};
const esmRequire='import { createRequire as __yukhCreateRequire } from "node:module";\nconst require=__yukhCreateRequire(import.meta.url);';
const common={bundle:true,platform:"node",target:"node24",format:"esm",sourcemap:false,minify:false,legalComments:"eof",packages:"bundle",logLevel:"info",plugins:[stripYamlDebugEnvironment],banner:{js:esmRequire}};
await build({...common,entryPoints:["src/action.ts"],outfile:"dist/action/index.js"});
await build({...common,entryPoints:["src/cli.ts"],outfile:"dist/cli/index.js"});
await build({...common,entryPoints:["src/apply-bundle.ts"],outfile:"dist/apply/index.js"});
await build({...common,entryPoints:["src/apply-action-main.ts"],outfile:"dist/apply/action.js"});
await build({...common,entryPoints:["src/apply-cli-main.ts"],outfile:"dist/apply/cli.js",banner:{js:`#!/usr/bin/env node\n${esmRequire}`}});
await build({...common,entryPoints:["src/mcp-effect-b-bundle.ts"],outfile:"dist/mcp-effect-b/index.js"});
const applyBytes=await readFile("dist/apply/index.js"),actionBytes=await readFile("dist/apply/action.js"),cliBytes=await readFile("dist/apply/cli.js"),applyManifest={schema:1,artifact:"controlled-apply-candidate",entrypoint:"action-cli",artifacts:{"index.js":{sha256:createHash("sha256").update(applyBytes).digest("hex"),bytes:applyBytes.byteLength},"action.js":{sha256:createHash("sha256").update(actionBytes).digest("hex"),bytes:actionBytes.byteLength},"cli.js":{sha256:createHash("sha256").update(cliBytes).digest("hex"),bytes:cliBytes.byteLength}},publication:"disabled"};
await writeFile("dist/apply/manifest.json",`${JSON.stringify(applyManifest)}\n`,{encoding:"utf8",mode:0o644});
const mcpBytes=await readFile("dist/mcp-effect-b/index.js"),vectorBytes=await readFile("test/fixtures/mcp-effect-b-bridge-v2-vector.json"),mcpManifest={schema:1,artifact:"mcp-effect-b-controlled-apply-candidate",entrypoint:"mcp-effect-b-controlled-apply-v1",bridgeSchema:"yukh-projects-approval-bridge-v2",profile:"yukh-mcp/suite-preview-effect-b-add-dependency-v1",capability:"projects.add-dependency.v1",operation:"add_dependency(201 blocks 202)",artifacts:{"index.js":{sha256:createHash("sha256").update(mcpBytes).digest("hex"),bytes:mcpBytes.byteLength},"bridge-v2-vector.json":{sha256:createHash("sha256").update(vectorBytes).digest("hex"),bytes:vectorBytes.byteLength}},publication:"disabled"};
await writeFile("dist/mcp-effect-b/manifest.json",`${JSON.stringify(mcpManifest)}\n`,{encoding:"utf8",mode:0o644});
