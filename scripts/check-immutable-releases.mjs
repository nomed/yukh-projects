const repository=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN;
if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository??"")||!token||token.length>4096||/[\u0000-\u001f\u007f]/u.test(token))throw new Error("immutable release policy binding is invalid");
const response=await fetch(`https://api.github.com/repos/${repository}/immutable-releases`,{headers:{accept:"application/vnd.github+json",authorization:`Bearer ${token}`,"x-github-api-version":"2026-03-10"},redirect:"error"});
if(response.status!==200||!response.headers.get("content-type")?.toLowerCase().startsWith("application/json"))throw new Error("immutable release policy is unavailable");
const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.byteLength<1||bytes.byteLength>4096)throw new Error("immutable release policy is invalid");
let value;try{value=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}catch{throw new Error("immutable release policy is invalid");}
if(!value||typeof value!=="object"||value.enabled!==true||typeof value.enforced_by_owner!=="boolean")throw new Error("immutable releases are not enabled");
