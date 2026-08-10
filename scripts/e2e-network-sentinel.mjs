export function installGlobalFetchSentinel(){
 let attempts=0;
 const blockedFetch=async()=>{
  attempts++;
  throw new Error("network access blocked by E2E sentinel");
 };
 Object.defineProperty(globalThis,"fetch",{
  value:blockedFetch,
  writable:false,
  configurable:false
 });
 return Object.freeze({
  get attempts(){return attempts;}
 });
}
