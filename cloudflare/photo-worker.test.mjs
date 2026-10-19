import test from "node:test";
import assert from "node:assert/strict";
import worker from "./photo-worker.mjs";
const ORG="d80c364b-df9c-4de4-a746-9e68f2382b20";
const ADDRESS="9d156bd9-6968-4e64-aa70-b5b72e5a3a79";
const JOB="502171c4-c9e3-494d-a5db-6a847edc4e41";
const USER="db9628fb-61e9-4fbd-a7b3-23f9c4909157";
const db=[],files=new Map();let role="admin",auth=true,gps=false,jobGps=false,nPhotos=0,saveOk=true;
const bucket={
 async put(k,b){files.set(k,b);return{}},async get(k){const b=files.get(k);return b?{body:b.stream()}:null},
 async delete(k){files.delete(k)}
};
const env={R2_BUCKET:bucket,SUPABASE_URL:"https://mbinhbascpeupnxrvidk.supabase.co",SUPABASE_PUBLISHABLE_KEY:"public-test",ALLOWED_ORIGIN:"https://deoxesinfo.github.io"};
const original=globalThis.fetch;
globalThis.fetch=async (url,init={})=>{
 const u=new URL(url),p=u.pathname;
 if(p==="/auth/v1/user")return new Response(JSON.stringify(auth?{id:USER}:{}),{status:auth?200:401});
 if(p.endsWith("/sa_memberships"))return Response.json(role?[{role}]:[]);
 if(p.endsWith("/sa_addresses"))return Response.json([{id:ADDRESS,data:{gpsProtectionEnabled:gps}}]);
 if(p.endsWith("/sa_jobs"))return Response.json([{id:JOB,address_id:ADDRESS,data:{gpsRequired:jobGps}}]);
 if(p.endsWith("/sa_photo_metadata")&&init.method==="POST"){if(!saveOk)return new Response(null,{status:403});db.push(JSON.parse(init.body));return new Response(null,{status:201})}
 if(p.endsWith("/sa_photo_metadata")&&u.searchParams.get("select")==="id")return Response.json(Array.from({length:nPhotos},(_,i)=>({id:String(i)})));
 if(p.endsWith("/sa_photo_metadata"))return Response.json(db);
 throw Error("unexpected Supabase request "+p);
};
function request(path,method="GET",headers={},body){
 return new Request("https://svari-aplinka-photos.svariaplinka-lt.workers.dev"+path,{
  method,headers:{"origin":"https://deoxesinfo.github.io","authorization":"Bearer testtoken","x-organization-id":ORG,...headers},body
 });
}
function file(){const x=new Uint8Array(40);x.set(new TextEncoder().encode("RIFF"),0);x.set(new TextEncoder().encode("WEBP"),8);return new Blob([x],{type:"image/webp"})}
function form(){const x=new FormData();x.set("addressId",ADDRESS);x.set("jobId",JOB);x.set("tag","po");x.set("width","400");x.set("height","300");x.set("full",file(),"full.webp");x.set("thumb",file(),"thumb.webp");return x}
test("missing bearer denied",async()=>assert.equal((await worker.fetch(request("/v1/photos","POST",{authorization:""},form()),env)).status,401));
test("origin outside allowlist denied",async()=>assert.equal((await worker.fetch(request("/v1/photos","POST",{origin:"https://evil.example"},form()),env)).status,403));
test("expired session denied",async()=>{auth=false;assert.equal((await worker.fetch(request("/v1/photos","POST",{},form()),env)).status,401);auth=true});
test("non-admin denied upload",async()=>{role="worker";assert.equal((await worker.fetch(request("/v1/photos","POST",{},form()),env)).status,403);role="admin"});
test("GPS-protected address fails closed",async()=>{gps=true;assert.equal((await worker.fetch(request("/v1/photos","POST",{},form()),env)).status,409);gps=false});
test("GPS-protected job fails closed",async()=>{jobGps=true;assert.equal((await worker.fetch(request("/v1/photos","POST",{},form()),env)).status,409);jobGps=false});
test("15 photos limit enforced",async()=>{nPhotos=15;assert.equal((await worker.fetch(request("/v1/photos","POST",{},form()),env)).status,409);nPhotos=0});
test("invalid signature rejected",async()=>{const f=form();f.set("full",new Blob(["<html>garbage contents repeating"],{type:"image/webp"}),"wrong.webp");assert.equal((await worker.fetch(request("/v1/photos","POST",{},f),env)).status,415)});
test("successful upload writes two R2 objects plus metadata",async()=>{
 const r=await worker.fetch(request("/v1/photos","POST",{},form()),env);
 assert.equal(r.status,201,await r.clone().text());const data=await r.json();assert.ok(data.id);assert.equal(db.length,1);assert.equal(files.size,2);
 assert.equal(db[0].object_key,"sa/"+ORG+"/"+data.id);
});
test("private GET image requires session and returns no-store",async()=>{
 const key=db.at(-1).id;
 let r=await worker.fetch(request("/v1/photos/"+key+"/thumb"),env);assert.equal(r.status,200);assert.equal(r.headers.get("cache-control"),"private, no-store, max-age=0");
 r=await worker.fetch(request("/v1/photos/"+key+"/thumb","GET",{authorization:""}),env);assert.equal(r.status,401);
});
test("failed DB write rolls back R2 objects",async()=>{
 saveOk=false;const prior=files.size;const r=await worker.fetch(request("/v1/photos","POST",{},form()),env);
 assert.equal(r.status,409);assert.equal(files.size,prior);saveOk=true;
});
test("delete remains disabled",async()=>assert.equal((await worker.fetch(request("/v1/photos/"+db.at(-1).id,"DELETE"),env)).status,403));
test("unknown routes denied",async()=>assert.equal((await worker.fetch(request("/v1/buckets"),env)).status,404));
test("OPTIONS preflight allowlist",async()=>{
 const r=await worker.fetch(request("/v1/photos","OPTIONS",{"access-control-request-method":"POST"}),env);
 assert.equal(r.status,204);assert.equal(r.headers.get("access-control-allow-origin"),env.ALLOWED_ORIGIN);
});
process.on("exit",()=>{globalThis.fetch=original});