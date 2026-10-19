import test from "node:test";
import assert from "node:assert/strict";
import worker from "./photo-worker.mjs";

const org="d80c364b-df9c-4de4-a746-9e68f2382b20";
const user="db9628fb-61e9-4fbd-a7b3-23f9c4909157";
const id="30628c39-72d0-4ec8-9769-5d3bf68e3883";
const imageBase="sa/"+org+"/"+id;
const full=imageBase+"/full.webp",thumb=imageBase+"/thumb.webp";
let role="admin", record, deleted, dbCalls;
const objects=new Map();
const env={SUPABASE_URL:"https://mbinhbascpeupnxrvidk.supabase.co",
 SUPABASE_PUBLISHABLE_KEY:"public-test",ALLOWED_ORIGIN:"https://deoxesinfo.github.io",
 ENABLE_UPLOADS:"false",ENABLE_STORAGE_ACTIONS:"false",ENABLE_STORAGE_PURGE:"false",
 R2_BUCKET:{
  async list({prefix}){return {objects:[...objects.entries()].filter(([key])=>key.startsWith(prefix)).map(([key,size])=>({key,size})),truncated:false};},
  async head(key){return objects.has(key)?{size:objects.get(key)}:null;},
  async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key);}
 }};
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const u=new URL(url);const headers=new Headers(options.headers||{});
 assert.equal(options.redirect,"manual");
 assert.match(headers.get("authorization")||"",/^Bearer /);
 if(u.pathname==="/auth/v1/user")return Response.json({id:user});
 if(u.pathname.endsWith("/sa_memberships"))return Response.json([{role}]);
 if(u.pathname==="/rest/v1/rpc/sa_storage_finalize_photo_purge"){
  dbCalls++;
  const args=JSON.parse(options.body||"{}");
  if(args.p_org!==org||args.p_photo!==id||!record?.data?.purgingAt)return Response.json(false);
  deleted=true;record=null;return Response.json(true);
 }
 if(u.pathname.endsWith("/sa_photo_metadata")){
  dbCalls++;
  const query=u.searchParams.get("id")||"";
  if(query.startsWith("in.")&&!query.includes(id))return Response.json([]);
  if(query.startsWith("eq.")&&query!=="eq."+id)return Response.json([]);
  if(options.method==="PATCH"){
   if(!record)return Response.json([], {status:409});
   record.data=JSON.parse(options.body).data;return Response.json([record]);
  }
  return Response.json(record?[record]:[]);
 }
 throw new Error("unexpected request: "+u.pathname);
};
function req(route,method="GET",data){
 return new Request("https://svari-aplinka-photos.svariaplinka-lt.workers.dev"+route,{
  method,headers:{origin:"https://deoxesinfo.github.io",authorization:"Bearer token",
    "x-organization-id":org,"content-type":"application/json"},
  ...(data?{body:JSON.stringify(data)}:{})
 });
}
test.beforeEach(()=>{
 role="admin";deleted=false;dbCalls=0;objects.clear();
 objects.set(full,8192);objects.set(thumb,1024);
 record={id,object_key:imageBase,organization_id:org,
  created_at:"2025-01-01T00:00:00.000Z",
  data:{type:"image/webp",thumbType:"image/webp",size:8192}};
 env.ENABLE_STORAGE_ACTIONS="false";env.ENABLE_STORAGE_PURGE="false";
});
test("usage: admin sees exact R2 bytes without exposing raw object keys",async()=>{
 const result=await worker.fetch(req("/v1/storage/usage"),env);
 assert.equal(result.status,200,await result.clone().text());
 assert.deepEqual(await result.json(),{r2Bytes:9216,r2Objects:2,r2PhotoFolders:1,photoRecords:1,missingR2Files:0,unlinkedR2Files:0});
});
test("usage: workers are denied before touching bucket",async()=>{
 role="worker";const result=await worker.fetch(req("/v1/storage/usage"),env);
 assert.equal(result.status,403);assert.equal(dbCalls,0);
});
test("trash and purge operations are fail closed without flags",async()=>{
 const args={ids:[id],period:"12m"};
 let result=await worker.fetch(req("/v1/storage/trash","POST",args),env);
 assert.equal(result.status,503);assert.equal(record.data.trashedAt,undefined);
 env.ENABLE_STORAGE_ACTIONS="true";
 result=await worker.fetch(req("/v1/storage/purge","POST",{ids:[id],confirmation:"SALINTI VISAM LAIKUI"}),env);
 assert.equal(result.status,503);assert.equal(deleted,false);assert.equal(objects.size,2);
});
test("worker cannot trash photos even if flag is enabled",async()=>{
 env.ENABLE_STORAGE_ACTIONS="true";role="worker";
 const result=await worker.fetch(req("/v1/storage/trash","POST",{ids:[id],period:"12m"}),env);
 assert.equal(result.status,403);assert.equal(objects.size,2);assert.equal(dbCalls,0);
});
test("trash and restore require admin and preserve R2 bytes",async()=>{
 env.ENABLE_STORAGE_ACTIONS="true";
 let result=await worker.fetch(req("/v1/storage/trash","POST",{ids:[id],period:"12m"}),env);
 assert.equal(result.status,200,await result.clone().text());
 assert.ok(record.data.trashedAt);assert.equal(objects.size,2);
 result=await worker.fetch(req("/v1/photos/"+id+"/full"),env);
 assert.equal(result.status,404,"trashed photos cannot be downloaded as active photos");
 result=await worker.fetch(req("/v1/storage/restore","POST",{ids:[id]}),env);
 assert.equal(result.status,200,await result.clone().text());
 assert.equal(record.data.trashedAt,undefined);assert.equal(objects.size,2);
});
test("age cutoff refuses young images; no writes",async()=>{
 env.ENABLE_STORAGE_ACTIONS="true";
 record.created_at="2026-10-18T00:00:00.000Z";
 const result=await worker.fetch(req("/v1/storage/trash","POST",{ids:[id],period:"12m"}),env);
 assert.equal(result.status,409);assert.equal(record.data.trashedAt,undefined);
});
test("restore rejects missing R2 object instead of exposing a broken photo",async()=>{
 env.ENABLE_STORAGE_ACTIONS="true";record.data.trashedAt="2026-10-19T00:00:00Z";objects.delete(thumb);
 const result=await worker.fetch(req("/v1/storage/restore","POST",{ids:[id]}),env);
 assert.equal(result.status,409);assert.ok(record.data.trashedAt);
});
test("purge requires typed confirmation and enabled purge flag",async()=>{
 env.ENABLE_STORAGE_ACTIONS="true";env.ENABLE_STORAGE_PURGE="true";
 record.data.trashedAt="2026-10-19T00:00:00Z";
 let result=await worker.fetch(req("/v1/storage/purge","POST",{ids:[id]}),env);
 assert.equal(result.status,400);assert.equal(objects.size,2);
 result=await worker.fetch(req("/v1/storage/purge","POST",{ids:[id],confirmation:"SALINTI VISAM LAIKUI"}),env);
 assert.equal(result.status,200,await result.clone().text());
 assert.equal(deleted,true);assert.equal(objects.size,0);
});
test.after(()=>{globalThis.fetch=realFetch;});
