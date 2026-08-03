import { build } from "esbuild";

const common={bundle:true,platform:"node",target:"node24",format:"esm",sourcemap:false,minify:false,legalComments:"eof",packages:"bundle",logLevel:"info"};
await build({...common,entryPoints:["src/action.ts"],outfile:"dist/action/index.js"});
await build({...common,entryPoints:["src/cli.ts"],outfile:"dist/cli/index.js"});
