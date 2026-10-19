import test from "node:test";
import assert from "node:assert/strict";
import worker from "./photo-worker.mjs";
const ORG="d80c364b-df9c-4de4-a746-9e68f2382b20";
const ADDRESS="9d156bd9-6968-4e64-aa70-b5b72e5a3a79";
const JOB="502171c4-c9e3-494d-a5db-6a847edc4e41";
const USER="db9628fb-61e9-4fbd-a7b3-23f9c4909157";
const CLAIM="__sa_pilot_guard__/one-photo-v1";
test.beforeEach(()=>{files.delete(CLAIM)});
const db=[],files=new Map();
let role="admin",auth=true,gps=false,jobGps=false,nPhotos=0,saveOk=true;
let transportFault="none",claimFault=false,scopeFault=false;
const bucket={
 async put(k,b,opts){
   if(k===CLAIM){
     if(claimFault)throw new TypeError("simulated R2 runtime failure");
     // Model conditional R2 PUT with If-None-Match:* as an atomic create.
     assert.equal(opts?.onlyIf?.get("If-None-Match"),"*");
     if(files.has(k))return null;
     files.set(k,b);return{etag:"claim"};
   }
   files.set(k,b);return{};
 },
 async get(k){const b=files.get(k);return b?{body:b.stream()}:null},
 async head(k){return files.has(k)?{etag:"mock"}:null},
 async delete(k){files.delete(k)}
};
const env={R2_BUCKET:bucket,SUPABASE_URL:"https://mbinhbascpeupnxrvidk.supabase.co",SUPABASE_PUBLISHABLE_KEY:"public-test",ALLOWED_ORIGIN:"https://deoxesinfo.github.io",ENABLE_UPLOADS:"true",
 PILOT_ENABLED:"true",PILOT_ORG_ID:ORG,PILOT_USER_ID:USER,PILOT_JOB_ID:JOB};
const original=globalThis.fetch;
globalThis.fetch=async (url,init={})=>{
 const u=new URL(url),p=u.pathname;
 if(p==="/auth/v1/user")return new Response(JSON.stringify(auth?{id:USER}:{}),{status:auth?200:401});
 if(p.endsWith("/sa_memberships"))return Response.json(role?[{role}]:[]);
 if(p.endsWith("/sa_addresses"))return Response.json([{id:ADDRESS,data:{gpsProtectionEnabled:gps}}]);
 if(p.endsWith("/sa_jobs")){if(scopeFault)throw new TypeError("simulated scope transport failure");return Response.json([{id:JOB,address_id:ADDRESS,data:{gpsRequired:jobGps}}]);}
 if(p.endsWith("/sa_photo_metadata")&&init.method==="POST"){
   if(!saveOk)return new Response(null,{status:403});
   if(transportFault==="before")throw Error("simulated transport before database commit");
   db.push(JSON.parse(init.body));
   if(transportFault==="after")throw Error("simulated transport after database commit");
   return new Response(null,{status:201});
 }
 if(p.endsWith("/sa_photo_metadata")&&u.searchParams.get("select")==="id"){
   const idQuery=u.searchParams.get("id");
   if(idQuery)return Response.json(db.filter(row=>row.id===idQuery.slice(3)).map(row=>({id:row.id})));
   return Response.json(Array.from({length:nPhotos},(_,i)=>({id:String(i)})));
 }
 if(p.endsWith("/sa_photo_metadata")){
   const idQuery=u.searchParams.get("id");
   const result=idQuery?db.filter(row=>row.id===idQuery.slice(3)):db;
   return Response.json(result);
 }
 throw Error("unexpected Supabase request "+p);
};
function request(path,method="GET",headers={},body){
 return new Request("https://svari-aplinka-photos.svariaplinka-lt.workers.dev"+path,{
  method,headers:{"origin":"https://deoxesinfo.github.io","authorization":"Bearer testtoken","x-organization-id":ORG,...headers},body
 });
}
function file(){
 const x=new Uint8Array(40);
 x.set(new TextEncoder().encode("RIFF"),0);
 new DataView(x.buffer).setUint32(4,x.byteLength-8,true);
 x.set(new TextEncoder().encode("WEBP"),8);
 x.set(new TextEncoder().encode("VP8 "),12);
 return new Blob([x],{type:"image/webp"});
}
function form(){const x=new FormData();x.set("addressId",ADDRESS);x.set("jobId",JOB);x.set("tag","po");x.set("width","400");x.set("height","300");x.set("full",file(),"full.webp");x.set("thumb",file(),"thumb.webp");return x}
test("upload switch defaults closed unless explicitly enabled",async()=>{
 env.ENABLE_UPLOADS="false";
 assert.equal((await worker.fetch(request("/v1/photos","POST",{},form()),env)).status,503);
 env.ENABLE_UPLOADS="true";
});
test("missing pilot configuration fails closed before any new image writes",async()=>{
 const before=files.size,previous=env.PILOT_JOB_ID;
 env.PILOT_JOB_ID="";
 const r=await worker.fetch(request("/v1/photos","POST",{},form()),env);
 assert.equal(r.status,503);assert.equal((await r.json()).error,"PILOT_NOT_CONFIGURED");
 assert.equal(files.size,before);env.PILOT_JOB_ID=previous;
});
test("wrong pilot organization is rejected",async()=>{
 const old=env.PILOT_ORG_ID;env.PILOT_ORG_ID="91f66427-4e3b-4f20-9100-122e26666e56";
 const r=await worker.fetch(request("/v1/photos","POST",{},form()),env);
 assert.equal(r.status,403);assert.equal(files.has(CLAIM),false);env.PILOT_ORG_ID=old;
});
test("wrong pilot admin user is rejected",async()=>{
 const old=env.PILOT_USER_ID;env.PILOT_USER_ID="91f66427-4e3b-4f20-9100-122e26666e56";
 const r=await worker.fetch(request("/v1/photos","POST",{},form()),env);
 assert.equal(r.status,403);assert.equal(files.has(CLAIM),false);env.PILOT_USER_ID=old;
});
test("wrong pilot job rejected before reserving slot",async()=>{
 const old=env.PILOT_JOB_ID;env.PILOT_JOB_ID="91f66427-4e3b-4f20-9100-122e26666e56";
 const r=await worker.fetch(request("/v1/photos","POST",{},form()),env);
 assert.equal(r.status,403);assert.equal(files.has(CLAIM),false);env.PILOT_JOB_ID=old;
});
test("missing bearer denied",async()=>assert.equal((await worker.fetch(request("/v1/photos","POST",{authorization:""},form()),env)).status,401));
test("origin outside allowlist denied",async()=>assert.equal((await worker.fetch(request("/v1/photos","POST",{origin:"https://evil.example"},form()),env)).status,403));
test("expired session denied",async()=>{auth=false;assert.equal((await worker.fetch(request("/v1/photos","POST",{},form()),env)).status,401);auth=true});
test("non-admin denied upload",async()=>{role="worker";assert.equal((await worker.fetch(request("/v1/photos","POST",{},form()),env)).status,403);role="admin"});
test("GPS-protected address fails closed",async()=>{gps=true;assert.equal((await worker.fetch(request("/v1/photos","POST",{},form()),env)).status,409);gps=false});
test("GPS-protected job fails closed",async()=>{jobGps=true;assert.equal((await worker.fetch(request("/v1/photos","POST",{},form()),env)).status,409);jobGps=false});
test("15 photos limit enforced",async()=>{nPhotos=15;assert.equal((await worker.fetch(request("/v1/photos","POST",{},form()),env)).status,409);nPhotos=0});
test("invalid signature rejected",async()=>{
 const f=form();f.set("full",new Blob(["<html>garbage contents repeating"],{type:"image/webp"}),"wrong.webp");
 assert.equal((await worker.fetch(request("/v1/photos","POST",{},f),env)).status,415);
});
test("invalid RIFF length rejected",async()=>{
 const bytes=new Uint8Array(await file().arrayBuffer());
 new DataView(bytes.buffer).setUint32(4,1,true);
 const f=form();f.set("full",new Blob([bytes],{type:"image/webp"}),"corrupt.webp");
 assert.equal((await worker.fetch(request("/v1/photos","POST",{},f),env)).status,415);
});
test("duplicate form fields rejected",async()=>{
 const f=form();f.append("tag","pries");
 assert.equal((await worker.fetch(request("/v1/photos","POST",{},f),env)).status,400);
});
test("address-only pilot uploads are blocked until a safe database quota exists",async()=>{
 const f=form();f.delete("jobId");
 const r=await worker.fetch(request("/v1/photos","POST",{},f),env);
 assert.equal(r.status,409);assert.equal((await r.json()).error,"JOB_REQUIRED_FOR_PILOT");
});
test("oversized declared request refused",async()=>{
 const r=await worker.fetch(request("/v1/photos","POST",{"content-length":"99999999"},form()),env);
 assert.equal(r.status,413);
});
test("R2 reservation runtime failure is classified and leaves claim unused",async()=>{
 claimFault=true;
 const old=console.error; console.error=()=>{};
 try{
  const r=await worker.fetch(request("/v1/photos","POST",{},form()),env);
  assert.equal(r.status,502);
  assert.equal((await r.json()).error,"UPLOAD_R2_RESERVATION_FAILED");
  assert.equal(files.has(CLAIM),false);
 }finally{claimFault=false;console.error=old}
});
test("unexpected scope transport failure reports stage and creates no R2 claim",async()=>{
 scopeFault=true;
 const old=console.error; console.error=()=>{};
 try{
  const r=await worker.fetch(request("/v1/photos","POST",{},form()),env);
  assert.equal(r.status,502);
  assert.equal((await r.json()).error,"UPLOAD_DB_SCOPE_CHECK_FAILED");
  assert.equal(files.has(CLAIM),false);
 }finally{scopeFault=false;console.error=old}
});
test("successful upload writes two R2 objects plus metadata",async()=>{
 const r=await worker.fetch(request("/v1/photos","POST",{},form()),env);
 assert.equal(r.status,201,await r.clone().text());const data=await r.json();assert.ok(data.id);assert.equal(db.length,1);assert.equal(files.size,3);assert.ok(files.has(CLAIM));
 assert.equal(db[0].object_key,"sa/"+ORG+"/"+data.id);
});
test("one-shot guard prevents repeat upload even after success",async()=>{
 const first=await worker.fetch(request("/v1/photos","POST",{},form()),env);
 assert.equal(first.status,201,await first.clone().text());
 const dataRows=db.length,objectCount=files.size;
 const repeat=await worker.fetch(request("/v1/photos","POST",{},form()),env);
 assert.equal(repeat.status,409);
 assert.equal((await repeat.json()).error,"PILOT_ALREADY_USED");
 assert.equal(db.length,dataRows);assert.equal(files.size,objectCount);
});
test("two simultaneous uploads: at most one reaches R2 image writes and DB",async()=>{
 const beforeDb=db.length,beforeObjects=files.size;
 const [a,b]=await Promise.all([
  worker.fetch(request("/v1/photos","POST",{},form()),env),
  worker.fetch(request("/v1/photos","POST",{},form()),env)
 ]);
 assert.deepEqual([a.status,b.status].sort(),[201,409]);
 assert.equal(db.length,beforeDb+1);
 assert.equal(files.size,beforeObjects+3);
});
test("private GET image requires session and returns no-store",async()=>{
 const key=db.at(-1).id;
 let r=await worker.fetch(request("/v1/photos/"+key+"/thumb"),env);assert.equal(r.status,200);assert.equal(r.headers.get("cache-control"),"private, no-store, max-age=0");
 r=await worker.fetch(request("/v1/photos/"+key+"/thumb","GET",{authorization:""}),env);assert.equal(r.status,401);
});
test("failed DB write rolls back R2 objects",async()=>{
 saveOk=false;const prior=files.size;const r=await worker.fetch(request("/v1/photos","POST",{},form()),env);
 assert.equal(r.status,403);assert.equal(files.size,prior+1);assert.ok(files.has(CLAIM));
 // The claim persists on failed database write: no automatic retry is permitted.
 const retry=await worker.fetch(request("/v1/photos","POST",{},form()),env);
 assert.equal(retry.status,409);saveOk=true;
});
test("database reply lost after successful commit keeps blobs and reports success",async()=>{
 transportFault="after";const before=files.size,previous=db.length;
 const r=await worker.fetch(request("/v1/photos","POST",{},form()),env);
 assert.equal(r.status,201,await r.clone().text());
 assert.equal(db.length,previous+1);assert.equal(files.size,before+3);
 transportFault="none";
});
test("database disconnected before commit safely removes new blobs",async()=>{
 transportFault="before";const before=files.size;
 const r=await worker.fetch(request("/v1/photos","POST",{},form()),env);
 assert.equal(r.status,503);assert.equal(files.size,before+1);
 transportFault="none";
});
test("delete remains disabled",async()=>assert.equal((await worker.fetch(request("/v1/photos/"+db.at(-1).id,"DELETE"),env)).status,403));
test("read-only R2 /health probe reports actual storage readiness",async()=>{
 const r=await worker.fetch(request("/health","GET",{"x-organization-id":""}),env);
 assert.equal(r.status,200);
 assert.deepEqual(await r.json(),{status:"ok",storage:"ready"});
});
test("production mode permits multiple sequential admin uploads without pilot reservation",async()=>{
 env.PILOT_ENABLED="false";
 const before=db.length,blobs=files.size;
 try{
  const a=await worker.fetch(request("/v1/photos","POST",{},form()),env);
  const b=await worker.fetch(request("/v1/photos","POST",{},form()),env);
  assert.equal(a.status,201,await a.clone().text());
  assert.equal(b.status,201,await b.clone().text());
  assert.equal(db.length,before+2);
  assert.equal(files.size,blobs+4);
  assert.equal(files.has(CLAIM),false);
 }finally{env.PILOT_ENABLED="true"}
});
test("production mode still blocks unauthenticated and non-admin uploads",async()=>{
 env.PILOT_ENABLED="false";
 try{
  const anon=await worker.fetch(request("/v1/photos","POST",{authorization:""},form()),env);
  assert.equal(anon.status,401);
  role="worker";
  const ordinary=await worker.fetch(request("/v1/photos","POST",{},form()),env);
  assert.equal(ordinary.status,403);
 }finally{role="admin";env.PILOT_ENABLED="true"}
});
test("unknown routes denied",async()=>assert.equal((await worker.fetch(request("/v1/buckets"),env)).status,404));
test("OPTIONS preflight allowlist",async()=>{
 const r=await worker.fetch(request("/v1/photos","OPTIONS",{"access-control-request-method":"POST"}),env);
 assert.equal(r.status,204);assert.equal(r.headers.get("access-control-allow-origin"),env.ALLOWED_ORIGIN);
});
process.on("exit",()=>{globalThis.fetch=original});