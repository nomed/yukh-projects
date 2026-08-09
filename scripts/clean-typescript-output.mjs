import { rm } from "node:fs/promises";

for(const path of ["dist/src","dist/test"]){
 await rm(new URL(`../${path}`,import.meta.url),{recursive:true,force:true});
}
