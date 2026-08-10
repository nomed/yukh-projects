import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const runtimePath=resolve(root,"src/mcp-effect-b-controlled-apply.ts");
const injectionPath=resolve(root,"test/support/mcp-effect-b-private-test-host.inject.ts");

export async function buildMcpEffectBTestBundle(entryPoint,outfile){
 const injection=await readFile(injectionPath,"utf8");
 await build({
  absWorkingDir:root,
  entryPoints:[entryPoint],
  outfile,
  bundle:true,
  platform:"node",
  target:"node22",
  format:"esm",
  sourcemap:false,
  legalComments:"none",
  logLevel:"silent",
  banner:{js:'import { createRequire as __yukhCreateRequire } from "node:module";\nconst require=__yukhCreateRequire(import.meta.url);'},
  plugins:[{
   name:"mcp-effect-b-private-test-host",
   setup(context){
    context.onLoad({filter:/mcp-effect-b-controlled-apply\.ts$/},async args=>{
     if(resolve(args.path)!==runtimePath)return null;
     return{contents:`${await readFile(args.path,"utf8")}\n${injection}`,loader:"ts",resolveDir:dirname(args.path)};
    });
   }
  }]
 });
}
