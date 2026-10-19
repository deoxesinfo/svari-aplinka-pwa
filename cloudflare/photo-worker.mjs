/**
 * Švari Aplinka private photos API — guarded rollout.
 * R2 binding: R2_BUCKET
 * Text vars: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, ALLOWED_ORIGIN, ENABLE_UPLOADS
 * One-photo pilot (DRAFT, OFF): PILOT_ENABLED, PILOT_ORG_ID, PILOT_USER_ID, PILOT_JOB_ID
 * Never use a service_role token or public bucket.
 */
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const MAX_REQUEST=7*1024*1024,MAX_IMAGE=3*1024*1024,MAX_THUMB=512*1024,MAX_DIMENSION=2000;
const TAGS=new Set(["pries","po","problema"]);
const NO_STORE="private, no-store, max-age=0";
// One global, immutable marker per pilot version: NOT automatically deleted on errors.
// R2 conditional PUT uses If-None-Match:* to atomically permit only ONE upload attempt.
const PILOT_CLAIM_KEY="__sa_pilot_guard__/one-photo-v1";
class Problem extends Error{constructor(status,code){super(code);this.status=status;this.code=code}}
function fail(status,code){throw new Problem(status,code)}
function response(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":NO_STORE,"x-content-type-options":"nosniff","referrer-policy":"no-referrer"}})}
function cors(res,origin,env){if(!origin||origin!==env.ALLOWED_ORIGIN)return res;const x=new Response(res.body,res);x.headers.set("access-control-allow-origin",origin);x.headers.set("vary","Origin");return x}
function validate(env){
 if(!env.R2_BUCKET||!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY||!env.ALLOWED_ORIGIN)fail(503,"NOT_CONFIGURED");
 if(env.SUPABASE_URL!=="https://mbinhbascpeupnxrvidk.supabase.co"||env.ALLOWED_ORIGIN!=="https://deoxesinfo.github.io")fail(503,"CONFIG_MISMATCH");
}
function uuid(s){if(!UUID.test(s||""))fail(400,"INVALID_ID");return s}
function orgFrom(request){return uuid(request.headers.get("x-organization-id"))}
function jwtFrom(request){const m=/^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization")||"");if(!m)fail(401,"AUTH_REQUIRED");return m[1]}
async function call(env,jwt,path,options={}){
 const headers=new Headers(options.headers||{});
 headers.set("authorization","Bearer "+jwt);
 headers.set("apikey",env.SUPABASE_PUBLISHABLE_KEY);
 headers.set("accept","application/json");
 // Cloudflare Workers throws TypeError for redirect:"error" on this Supabase
 // outbound request even when the endpoint itself responds HTTP 200.
 // "manual" avoids automatic credential forwarding across domains.
 const res=await fetch(env.SUPABASE_URL+path,{...options,headers,redirect:"manual"});
 if(res.status>=300&&res.status<400)fail(502,"DATABASE_REDIRECT_DENIED");
 return res;
}
async function rows(env,jwt,path){
 const res=await call(env,jwt,path);
 if(!res.ok)fail(res.status===401?401:502,"DATABASE_CHECK_FAILED");
 const json=await res.json();
 if(!Array.isArray(json))fail(502,"INVALID_DATABASE_RESPONSE");
 return json;
}
async function one(env,jwt,path){return (await rows(env,jwt,path))[0]||null}
async function authenticated(env,request,org,write){
 const jwt=jwtFrom(request);
 const res=await call(env,jwt,"/auth/v1/user");
 if(!res.ok)fail(401,"AUTH_INVALID");
 const user=await res.json();
 if(!UUID.test(user?.id||""))fail(401,"AUTH_INVALID");
 const membership=await one(env,jwt,"/rest/v1/sa_memberships?select=role&organization_id=eq."+org+"&user_id=eq."+user.id+"&active=eq.true&limit=1");
 if(!membership)fail(403,"NO_MEMBERSHIP");
 if(write&&!["admin","worker"].includes(membership.role))fail(403,"ROLE_FORBIDDEN");
 return {jwt,userId:user.id,role:membership.role}; // RLS applies
}
function pilotConfiguration(env){
 if(env.PILOT_ENABLED!=="true" ||
    !UUID.test(env.PILOT_ORG_ID||"") ||
    !UUID.test(env.PILOT_USER_ID||"") ||
    !UUID.test(env.PILOT_JOB_ID||""))fail(503,"PILOT_NOT_CONFIGURED");
 return {organizationId:env.PILOT_ORG_ID,userId:env.PILOT_USER_ID,jobId:env.PILOT_JOB_ID};
}
async function claimOneAttempt(env){
 // R2 honors If-None-Match:* conditional write atomically.
 // Never rely on an R2 HEAD/GET followed by unconditional PUT (race condition).
 // Fail CLOSED if the platform returns null, false, or throws.
 const claimed=await env.R2_BUCKET.put(
  PILOT_CLAIM_KEY,"claimed",{
   onlyIf:new Headers({"If-None-Match":"*"}),
   httpMetadata:{contentType:"text/plain"}
  }
 );
 if(!claimed)fail(409,"PILOT_ALREADY_USED");
 // Never delete this guard (even after partial failure). Re-arming requires
 // an explicitly reviewed new pilot version with a NEW immutable key.
}
async function limitedForm(req){
 const type=req.headers.get("content-type")||"";
 if(!/^multipart\/form-data\s*;\s*boundary=/i.test(type))fail(415,"MULTIPART_REQUIRED");
 const declared=req.headers.get("content-length");
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_REQUEST))fail(413,"BODY_TOO_LARGE");
 if(!req.body)fail(400,"EMPTY_BODY");
 const reader=req.body.getReader(),parts=[];let length=0;
 try{
  for(;;){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;
   if(length>MAX_REQUEST){await reader.cancel();fail(413,"BODY_TOO_LARGE")}parts.push(value)}
 }finally{try{reader.releaseLock()}catch{}}
 const form=await new Response(new Blob(parts),{headers:{"content-type":type}}).formData().catch(()=>{throw new Problem(400,"MALFORMED_MULTIPART");});
 const keys=new Set(["addressId","jobId","tag","width","height","full","thumb","gpsLatitude","gpsLongitude","gpsAccuracy","gpsOverrideReason"]);
 for(const [name] of form)if(!keys.has(name)||form.getAll(name).length!==1)fail(400,"INVALID_FORM_FIELDS");
 return form;
}
function value(fd,name,limit=80){const s=fd.get(name);if(typeof s!=="string"||!s||s.length>limit)fail(400,"INVALID_"+name.toUpperCase());return s}
async function checkFile(blob,limit){
 if(!(blob instanceof Blob)||!["image/webp","image/jpeg"].includes(blob.type))fail(415,"IMAGE_TYPE_INVALID");
 if(blob.size<20||blob.size>limit)fail(413,"IMAGE_SIZE_INVALID");
 const x=new Uint8Array(await blob.slice(0,12).arrayBuffer());
 const prefix=String.fromCharCode(...x.slice(0,4)),suffix=String.fromCharCode(...x.slice(8,12));
 if(blob.type==="image/webp"){
  const chunk=new Uint8Array(await blob.slice(12,16).arrayBuffer());
  const fourcc=String.fromCharCode(...chunk);
  const declared=new DataView(x.buffer).getUint32(4,true);
  if(prefix!=="RIFF"||suffix!=="WEBP"||declared!==blob.size-8||
    !["VP8 ","VP8L","VP8X"].includes(fourcc))fail(415,"IMAGE_SIGNATURE_INVALID");
 }else{
  const last=new Uint8Array(await blob.slice(-2).arrayBuffer());
  if(x[0]!==255||x[1]!==216||x[2]!==255||last[0]!==255||last[1]!==217)fail(415,"IMAGE_SIGNATURE_INVALID");
 }
 return blob;
}
function fileExt(type){return type==="image/jpeg"?"jpg":"webp"}
function objectPaths(key,data){return [key+"/full."+fileExt(data.type),key+"/thumb."+fileExt(data.thumbType)]}

// No GPS session countdown or indefinitely reusable GPS tokens: the browser
// supplies fresh geolocation at each photo upload and at job completion.
// Server computes distance against the administrator-confirmed object pin.
function gpsDistance(lat1,lon1,lat2,lon2){
 const rad=n=>n*Math.PI/180;
 const a=Math.sin(rad(lat2-lat1)/2)**2+
  Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(rad(lon2-lon1)/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
}
async function assignedJob(env,jwt,org,jobId,addressId,userId,role){
 const job=await one(env,jwt,"/rest/v1/sa_jobs?select=id,address_id,assigned_user_id,data&organization_id=eq."+org+"&id=eq."+uuid(jobId)+"&limit=1");
 if(!job||job.data?.deletedAt||job.data?.archivedAt||job.address_id!==addressId)fail(404,"JOB_UNAVAILABLE");
 if(role!=="admin"&&job.assigned_user_id!==userId)fail(403,"JOB_NOT_ASSIGNED");
 return job;
}
async function verifiedPosition(env,jwt,org,addressId,job,lat,lon,accuracy,role,reason){
 const adr=await one(env,jwt,"/rest/v1/sa_addresses?select=id,data&organization_id=eq."+org+"&id=eq."+uuid(addressId)+"&limit=1");
 if(!adr||adr.data?.deletedAt||adr.data?.archivedAt)fail(404,"ADDRESS_UNAVAILABLE");
 if(!adr.data?.gpsLocationConfirmed||!Number.isFinite(Number(adr.data?.latitude))||
    !Number.isFinite(Number(adr.data?.longitude)))fail(409,"GPS_OBJECT_PIN_REQUIRED");
 const radius=[30,50,100].includes(Number(job.data?.gpsRadiusMeters))
  ?Number(job.data.gpsRadiusMeters):50;
 if(reason){
  if(role!=="admin")fail(403,"ADMIN_ONLY");
  if(typeof reason!=="string"||reason.trim().length<15||reason.trim().length>240)
   fail(400,"GPS_OVERRIDE_REASON_REQUIRED");
  return {mode:"admin_override",radius,reason:reason.trim()};
 }
 if(typeof lat!=="number"||typeof lon!=="number"||typeof accuracy!=="number"||
    !Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(accuracy)||
    Math.abs(lat)>90||Math.abs(lon)>180||accuracy<=0)fail(400,"GPS_POSITION_INVALID");
 const distance=Math.round(gpsDistance(lat,lon,Number(adr.data.latitude),Number(adr.data.longitude)));
 if(accuracy>Math.min(50,radius))fail(409,"GPS_ACCURACY_LOW");
 if(distance>radius)fail(409,"GPS_OUTSIDE_RADIUS");
 return {mode:"gps_live",radius,distanceMeters:distance,accuracyMeters:Math.round(accuracy)};
}
function readPosition(payload){
 return [payload?.latitude,payload?.longitude,payload?.accuracy];
}
async function verifyLocation(req,env,jwt,org,userId,role){
 const raw=await req.text();if(raw.length>1200)fail(413,"GPS_REQUEST_TOO_LARGE");
 let p;try{p=JSON.parse(raw)}catch{fail(400,"GPS_REQUEST_INVALID")}
 if(!p||typeof p!=="object")fail(400,"GPS_REQUEST_INVALID");
 const jobId=uuid(p.jobId),addressId=uuid(p.addressId);
 const job=await assignedJob(env,jwt,org,jobId,addressId,userId,role);
 const pos=await verifiedPosition(env,jwt,org,addressId,job,...readPosition(p),role,null);
 return response({ok:true,radius:pos.radius,
   distanceMeters:pos.distanceMeters,accuracyMeters:pos.accuracyMeters},200);
}
async function upload(request,env,jwt,org,pilot,userId,role){
 let stage="FORM_PARSE";
 try{
 const fd=await limitedForm(request);
 const addressId=uuid(value(fd,"addressId"));
 const jr=fd.get("jobId");
 const jobId=typeof jr==="string"&&jr?uuid(jr):null;
 // Phase 1 requires a job: DB has transactional 15-photo guard only for job photos.
 // Address-only photos need a separately approved server-side quota/lock.
 if(!jobId)fail(409,"JOB_REQUIRED_FOR_PILOT");
 if(pilot&&jobId!==pilot.jobId)fail(403,"PILOT_SCOPE_DENIED");
 const tag=value(fd,"tag",16);if(!TAGS.has(tag))fail(400,"INVALID_TAG");
 const width=Number(value(fd,"width",8)),height=Number(value(fd,"height",8));
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>MAX_DIMENSION||height>MAX_DIMENSION)fail(400,"INVALID_DIMENSIONS");
 stage="FILE_VALIDATION";
 const full=await checkFile(fd.get("full"),MAX_IMAGE),thumb=await checkFile(fd.get("thumb"),MAX_THUMB);
 stage="DB_SCOPE_CHECK";
 const adr=await one(env,jwt,"/rest/v1/sa_addresses?select=id,data&organization_id=eq."+org+"&id=eq."+addressId+"&limit=1");
 if(!adr||adr.data?.deletedAt||adr.data?.archivedAt)fail(404,"ADDRESS_UNAVAILABLE");
 let job=null;
 if(jobId){
  job=await assignedJob(env,jwt,org,jobId,addressId,userId,role);
  const photos=await rows(env,jwt,"/rest/v1/sa_photo_metadata?select=id&organization_id=eq."+org+"&job_id=eq."+jobId+"&limit=16");
  if(photos.length>=15)fail(409,"PHOTO_LIMIT");
 }
 // Server-only session scoped to authenticated user and target job.
 // Geolocation supplied by browser can still be spoofed by the device user.
 const gpsProtected=Boolean(adr.data?.gpsProtectionEnabled||job?.data?.gpsRequired||role==="worker");
 const reason=typeof fd.get("gpsOverrideReason")==="string"?fd.get("gpsOverrideReason"):"";
 const gpsData=gpsProtected?await verifiedPosition(env,jwt,org,addressId,job,
  fd.has("gpsLatitude")?Number(fd.get("gpsLatitude")):undefined,
  fd.has("gpsLongitude")?Number(fd.get("gpsLongitude")):undefined,
  fd.has("gpsAccuracy")?Number(fd.get("gpsAccuracy")):undefined,role,reason):null;

 // Claim AFTER identity, file and job validation, BEFORE ANY photo R2/DB writes.
 stage="R2_RESERVATION";
 if(pilot)await claimOneAttempt(env);
 stage="R2_BLOBS";
 const photoId=crypto.randomUUID(),key="sa/"+org+"/"+photoId;
 const digest=await crypto.subtle.digest("SHA-256",await full.arrayBuffer());
 const sha256=Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,"0")).join("");
 if(gpsData){
  const existing=await rows(env,jwt,"/rest/v1/sa_photo_metadata?select=id&organization_id=eq."+org+"&data->>sha256=eq."+sha256+"&limit=1");
  if(existing.length)fail(409,"DUPLICATE_PHOTO");
 }
 const meta={id:photoId,organization_id:org,address_id:addressId,job_id:jobId,object_key:key,
  data:{width,height,size:full.size,type:full.type,thumbType:thumb.type,tag,sha256,uploadedBy:userId,
    ...(gpsData?{proofMode:gpsData.mode,gpsVerifiedAt:new Date().toISOString(),
       gpsDistanceMeters:gpsData.distanceMeters??null,gpsAccuracyMeters:gpsData.accuracyMeters??null,
       gpsRadiusMeters:gpsData.radius,...(gpsData.reason?{gpsOverrideReason:gpsData.reason}:{})}:{})
  }};
 const [fk,tk]=objectPaths(key,meta.data);
 try{
  await env.R2_BUCKET.put(fk,full,{httpMetadata:{contentType:full.type}});
  await env.R2_BUCKET.put(tk,thumb,{httpMetadata:{contentType:thumb.type}});
 }catch(e){
  // Unique server-generated names mean cleanup never deletes another user's object.
  await Promise.allSettled([env.R2_BUCKET.delete(fk),env.R2_BUCKET.delete(tk)]);
  throw e;
 }
 stage="DB_METADATA";
 const dbInsert=()=>call(env,jwt,"/rest/v1/sa_photo_metadata",{
  method:"POST",headers:{"content-type":"application/json","prefer":"return=minimal"},body:JSON.stringify(meta)
 });
 try{
  const res=await dbInsert();
  if(!res.ok){
   await Promise.allSettled([env.R2_BUCKET.delete(fk),env.R2_BUCKET.delete(tk)]);
   fail(res.status===403?403:(res.status===409||res.status===400)?409:502,
     res.status===409?"DUPLICATE_PHOTO":"METADATA_SAVE_FAILED");
  }
 }catch(e){
  if(e instanceof Problem)throw e;
  // The network may have failed AFTER Supabase committed the row.
  // Query before cleanup, and keep R2 blobs on an indeterminate result.
  try{
   const saved=await one(env,jwt,"/rest/v1/sa_photo_metadata?select=id&organization_id=eq."+org+"&id=eq."+photoId+"&limit=1");
   if(!saved){
    await Promise.allSettled([env.R2_BUCKET.delete(fk),env.R2_BUCKET.delete(tk)]);
    fail(503,"DATABASE_UNAVAILABLE");
   }
  }catch(checkError){
   if(checkError instanceof Problem&&checkError.code==="DATABASE_UNAVAILABLE")throw checkError;
   fail(503,"UPLOAD_OUTCOME_UNKNOWN");
  }
 }
 return response({id:photoId,addressId,jobId,createdAt:new Date().toISOString(),tag,width,height,size:full.size,type:full.type},201);
 }catch(e){
   if(e instanceof Problem){
    // Emit only fixed diagnostic identifiers. Never log JWT, customer details, file bytes or URLs.
    console.warn("R2_UPLOAD_REJECTED",{stage,code:e.code,status:e.status});
    throw e;
   }
   // Record only stage and JS error class. Never log JWT, customer data, form, URLs or file bodies.
   console.error("R2_UPLOAD_UNEXPECTED",{stage,errorType:e instanceof Error?e.name:"unknown"});
   // Prevent unclassified 500: stage-specific recovery code makes future diagnosis self-serve.
   fail(502,"UPLOAD_"+stage+"_FAILED");
 }
}
async function readImage(env,jwt,org,photoId,kind){
 const row=await one(env,jwt,"/rest/v1/sa_photo_metadata?select=id,object_key,data&organization_id=eq."+org+"&id=eq."+photoId+"&limit=1");
 if(!row||row.object_key!=="sa/"+org+"/"+photoId||row.data?.trashedAt||row.data?.purgingAt)fail(404,"PHOTO_NOT_FOUND");
 const details=row.data;
 if(!details||!["image/webp","image/jpeg"].includes(details.type)||
   !["image/webp","image/jpeg"].includes(details.thumbType))fail(404,"PHOTO_NOT_FOUND");
 const files=objectPaths(row.object_key,details);
 const item=await env.R2_BUCKET.get(kind==="full"?files[0]:files[1]);
 if(!item)fail(404,"FILE_NOT_FOUND");
 return new Response(item.body,{headers:{"content-type":kind==="full"?row.data.type:row.data.thumbType,
  "content-disposition":"inline","cache-control":NO_STORE,"x-content-type-options":"nosniff"}});
}

/* V2.3.13: admin-only storage controls. Flags are OFF unless explicitly enabled. */
const STORAGE_PERIODS=new Set(["30d","6m","12m","24m"]);
function storageCutoff(period,now=new Date()){
 if(!STORAGE_PERIODS.has(period))fail(400,"INVALID_PERIOD");
 if(period==="30d")return new Date(now.getTime()-30*86400000);
 const m=now.getUTCMonth()-Number(period.slice(0,-1)),y=now.getUTCFullYear();
 const d=Math.min(now.getUTCDate(),new Date(Date.UTC(y,m+1,0)).getUTCDate());
 return Date.UTC(y,m,d,now.getUTCHours(),now.getUTCMinutes(),now.getUTCSeconds(),now.getUTCMilliseconds());
}
function storageKeys(org,row){
 if(row.object_key!=="sa/"+org+"/"+row.id)fail(409,"STORAGE_SCOPE_INVALID");
 if(!row.data||!["image/webp","image/jpeg"].includes(row.data.type)||
   !["image/webp","image/jpeg"].includes(row.data.thumbType))fail(409,"STORAGE_FORMAT_INVALID");
 return objectPaths(row.object_key,row.data);
}
async function patchStorageRow(env,jwt,org,row,data){
 const res=await call(env,jwt,"/rest/v1/sa_photo_metadata?organization_id=eq."+org+"&id=eq."+row.id,{
  method:"PATCH",headers:{"content-type":"application/json","prefer":"return=representation"},body:JSON.stringify({data})});
 const changed=res.ok?await res.json().catch(()=>[]):[];
 if(!Array.isArray(changed)||changed.length!==1)fail(503,"STORAGE_UPDATE_FAILED");
}
async function usageStorage(env,org){
 let cursor,bytes=0,objects=0;const folders=new Set(),prefix="sa/"+org+"/";
 for(let page=0;page<150;page++){
  const batch=await env.R2_BUCKET.list({prefix,limit:1000,...(cursor?{cursor}:{})});
  if(!batch||!Array.isArray(batch.objects))fail(503,"R2_LIST_FAILED");
  for(const object of batch.objects){objects++;bytes+=object.size;
   const id=object.key.slice(prefix.length).split("/")[0];if(UUID.test(id))folders.add(id);}
  if(!batch.truncated)return response({r2Bytes:bytes,r2Objects:objects,r2PhotoFolders:folders.size});
  if(!batch.cursor||batch.cursor===cursor)fail(503,"R2_CURSOR_FAILED");
  cursor=batch.cursor;
 }
 fail(503,"R2_LIST_LIMIT");
}
async function editStorage(req,env,jwt,org,userId,action){
 if(env.ENABLE_STORAGE_ACTIONS!=="true")fail(503,"STORAGE_ACTIONS_DISABLED");
 if(action==="purge"&&env.ENABLE_STORAGE_PURGE!=="true")fail(503,"STORAGE_PURGE_DISABLED");
 const raw=await req.text();if(raw.length>4000)fail(413,"BODY_TOO_LARGE");
 let input;try{input=JSON.parse(raw)}catch{fail(400,"INVALID_BODY")}
 const ids=input?.ids;
 if(!Array.isArray(ids)||!ids.length||ids.length>50||new Set(ids).size!==ids.length)fail(400,"INVALID_IDS");
 ids.forEach(uuid);
 if(action==="trash"&&!STORAGE_PERIODS.has(input.period))fail(400,"INVALID_PERIOD");
 if(action==="purge"&&input.confirmation!=="SALINTI VISAM LAIKUI")fail(400,"CONFIRMATION_REQUIRED");
 const photoRows=await rows(env,jwt,"/rest/v1/sa_photo_metadata?select=id,object_key,created_at,data"+
  "&organization_id=eq."+org+"&id=in.("+ids.join(",")+")");
 if(photoRows.length!==ids.length)fail(409,"STORAGE_SELECTION_CHANGED");
 const found=new Map(photoRows.map(x=>[x.id,x]));
 const items=ids.map(id=>found.get(id));
 const limit=action==="trash"?Number(storageCutoff(input.period)):0;
 for(const row of items){
  const d=row.data||{},paths=storageKeys(org,row);
  if(action==="trash"&&(d.trashedAt||d.purgingAt||!(Date.parse(row.created_at)<limit)))
   fail(409,"STORAGE_CANDIDATE_CHANGED");
  if(action!=="trash"&&!d.trashedAt)fail(409,"STORAGE_NOT_TRASHED");
  if(action==="restore"&&d.purgingAt)fail(409,"STORAGE_ALREADY_PURGING");
  if(action!=="purge")for(const path of paths)if(!await env.R2_BUCKET.head(path))fail(409,"R2_FILE_MISSING");
 }
 let changed=0;
 for(const row of items){
  const d=row.data;
  if(action==="trash")await patchStorageRow(env,jwt,org,row,{...d,trashedAt:new Date().toISOString(),trashedBy:userId});
  else if(action==="restore"){
   const {trashedAt,trashedBy,...rest}=d;await patchStorageRow(env,jwt,org,row,rest);
  }else{
   // Tombstone BEFORE touching R2. Retry purge if storage/DB fails.
   if(!d.purgingAt)await patchStorageRow(env,jwt,org,row,{...d,purgingAt:new Date().toISOString(),purgingBy:userId});
   await env.R2_BUCKET.delete(storageKeys(org,row));
   const res=await call(env,jwt,"/rest/v1/rpc/sa_storage_finalize_photo_purge",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({p_org:org,p_photo:row.id})});
   if(!res.ok||await res.json().catch(()=>false)!==true)
    fail(503,"STORAGE_PURGE_METADATA_PENDING");
  }
  changed++;
 }
 return response({ok:true,changed});
}

export default {async fetch(req,env){
 let origin=req.headers.get("origin");
 try{
  validate(env);
  if(origin&&origin!==env.ALLOWED_ORIGIN)fail(403,"ORIGIN_DENIED");
  if(req.method==="OPTIONS"){
   if(!origin)fail(403,"ORIGIN_REQUIRED");
   return cors(new Response(null,{status:204,headers:{"access-control-allow-methods":"GET,POST,OPTIONS",
     "access-control-allow-headers":"authorization,x-organization-id,content-type",
     "access-control-max-age":"600"}}),origin,env);
  }
  const path=new URL(req.url).pathname;
  if(req.method==="GET"&&path==="/health"){
   try{
    await env.R2_BUCKET.head("__sa_healthcheck__/missing-object");
    return cors(response({status:"ok",storage:"ready"}),origin,env);
   }catch(e){
    console.error("R2_HEALTH_UNAVAILABLE",{errorType:e instanceof Error?e.name:"unknown"});
    return cors(response({status:"degraded",storage:"unavailable"},503),origin,env);
   }
  }
  const org=orgFrom(req);
  if(req.method==="POST"&&path==="/v1/photos"){
   if(env.ENABLE_UPLOADS!=="true")fail(503,"UPLOADS_DISABLED");
   // Pilot guard applies only when explicitly enabled. Full admin uploads
   // continue under JWT, organization RLS, GPS exclusion and 15-photo DB trigger.
   const pilot=env.PILOT_ENABLED==="true"?pilotConfiguration(env):null;
   if(pilot&&org!==pilot.organizationId)fail(403,"PILOT_SCOPE_DENIED");
   const {jwt,userId,role}=await authenticated(env,req,org,true);
   if(pilot&&userId!==pilot.userId)fail(403,"PILOT_SCOPE_DENIED");
   return cors(await upload(req,env,jwt,org,pilot,userId,role),origin,env);
  }
  if(req.method==="POST"&&path==="/v1/gps/verify"){
   if(env.ENABLE_UPLOADS!=="true")fail(503,"UPLOADS_DISABLED");
   const {jwt,userId,role}=await authenticated(env,req,org,false);
   return cors(await verifyLocation(req,env,jwt,org,userId,role),origin,env);
  }

  const storageAction=/^\/v1\/storage\/(trash|restore|purge)$/.exec(path);
  if(req.method==="GET"&&path==="/v1/storage/usage"){
   const {role}=await authenticated(env,req,org,false);
   if(role!=="admin")fail(403,"ADMIN_ONLY");
   return cors(await usageStorage(env,org),origin,env);
  }
  if(req.method==="POST"&&storageAction){
   const {jwt,userId,role}=await authenticated(env,req,org,false);
   if(role!=="admin")fail(403,"ADMIN_ONLY");
   return cors(await editStorage(req,env,jwt,org,userId,storageAction[1]),origin,env);
  }
  const complete=/^\/v1\/jobs\/([0-9a-f-]{36})\/complete$/.exec(path);
  if(req.method==="POST"&&complete){
   const jobId=uuid(complete[1]);
   const {jwt,userId,role}=await authenticated(env,req,org,false);
   if(role!=="worker")fail(403,"WORKER_ONLY");
   const raw=await req.text();if(raw.length>1600)fail(413,"REQUEST_TOO_LARGE");
   let payload;try{payload=JSON.parse(raw)}catch{fail(400,"INVALID_COMPLETION")}
   if(!payload||typeof payload!=="object")fail(400,"INVALID_COMPLETION");
   const addressId=uuid(payload.addressId);
   await assignedJob(env,jwt,org,jobId,addressId,userId,role);
   const job=await assignedJob(env,jwt,org,jobId,addressId,userId,role);
   await verifiedPosition(env,jwt,org,addressId,job,...readPosition(payload),role,null);
   const note=typeof payload.note==="string"?payload.note.trim():"";
   if(note.length>1200)fail(413,"NOTE_TOO_LONG");
   const res=await call(env,jwt,"/rest/v1/rpc/sa_complete_assigned_job",{
     method:"POST",headers:{"content-type":"application/json"},
     body:JSON.stringify({p_org:org,p_job:jobId,p_note:note})
   });
   if(!res.ok)fail(res.status===403?403:409,"COMPLETION_REQUIREMENTS_NOT_MET");
   return cors(response({ok:true,completedAt:new Date().toISOString()}),origin,env);
  }
  const m=/^\/v1\/photos\/([0-9a-f-]{36})\/(full|thumb)$/.exec(path);
  if(m&&req.method==="GET"){
   const photoId=uuid(m[1]);
   const {jwt}=await authenticated(env,req,org,false);
   return cors(await readImage(env,jwt,org,photoId,m[2]),origin,env);
  }
  // No public list or delete endpoints; DELETE RLS policy remains unchanged.
  // Image GET uses the caller's JWT; Supabase RLS decides visibility.
  if(req.method==="DELETE"&&path.startsWith("/v1/photos/"))fail(403,"DELETE_DISABLED");
  fail(404,"UNKNOWN_ROUTE");
 }catch(e){
  const known=e instanceof Problem;
  if(req.method==="POST"&&new URL(req.url).pathname==="/v1/photos")
    console.warn("R2_UPLOAD_REQUEST_RESULT",{status:known?e.status:500,code:known?e.code:"INTERNAL_ERROR"});
  if(!known)console.error("R2_WORKER_UNEXPECTED",{errorType:e instanceof Error?e.name:"unknown"});
  return cors(response({error:known?e.code:"INTERNAL_ERROR"},known?e.status:500),origin,env);
 }
}};