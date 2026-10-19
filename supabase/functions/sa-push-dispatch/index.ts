// ŠA V2.3.20: secure Web Push dispatch. NEVER expose the VAPID private key.
import {createClient} from "npm:@supabase/supabase-js@2.79.0";
import webpush from "npm:web-push@3.6.7";

type RecordPush={id:string;organization_id:string;recipient_id:string;title:string;body:string;path:string};
type Subscription={id:string;endpoint:string;p256dh:string;auth:string};
function safePushEndpoint(endpoint:string):boolean{
 try{
  const url=new URL(endpoint);
  const host=url.hostname.toLowerCase();
  return url.protocol==="https:" && !url.username && !url.password && !url.port &&
   (host==="fcm.googleapis.com"||host==="updates.push.services.mozilla.com"||
     host==="web.push.apple.com"||/^[a-z0-9-]+[.]push[.]apple[.]com$/.test(host));
 }catch{return false}
}
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",
   "access-control-allow-origin":"*","access-control-allow-headers":"authorization, apikey, content-type, x-client-info",
   "access-control-allow-methods":"POST, OPTIONS"}
});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return respond({ok:true});
 if(req.method!=="POST")return respond({error:"METHOD_NOT_ALLOWED"},405);
 const url=Deno.env.get("SUPABASE_URL")||"";
 const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";

 const subject=Deno.env.get("SA_VAPID_SUBJECT")||"mailto:info@svariaplinka.lt";
 if(!url||!anon||!service)return respond({error:"SERVER_MISCONFIGURED"},503);
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)return respond({error:"UNAUTHORIZED"},401);
 let input:{action?:string;organizationId?:string};
 try{input=await req.json()}catch{return respond({error:"BAD_BODY"},400)}
 const isServer=token===service;
 const userClient=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}}});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 // Generate keys INSIDE the Edge runtime; encrypt them with Supabase Vault once.
 // Never return the private key to clients or GitHub. Server-side RPCs enforce service_role.
 async function getServerVapid():Promise<{publicKey:string;privateKey:string}>{
  async function readKeys(){
   const {data,error}=await db.rpc("sa_push_get_vapid");
   if(error)throw new Error("VAPID_READ_FAILED");
   const row=Array.isArray(data)?data[0]:data;
   return {
    publicKey:String(row?.public_key||""),
    privateKey:String(row?.private_key||""),
   };
  }
  let keys=await readKeys();
  if(!keys.publicKey||!keys.privateKey){
   const generated=webpush.generateVAPIDKeys();
   const {error}=await db.rpc("sa_push_store_vapid",{
    p_public:generated.publicKey,p_private:generated.privateKey
   });
   if(error)throw new Error("VAPID_STORE_FAILED");
   keys=await readKeys();
  }
  if(!keys.publicKey||!keys.privateKey)throw new Error("VAPID_UNAVAILABLE");
  // Protected one-minute cron sends due notifications even when PWA is closed.
  // Credentials are stored only encrypted at rest in Supabase Vault.
  const {error:schedulerError}=await db.rpc("sa_push_register_scheduler",{
   p_service_key:service,p_edge_url:url.replace(/\/$/,"")+"/functions/v1/sa-push-dispatch"
  });
  if(schedulerError)throw new Error("SCHEDULER_SETUP_FAILED");
  return keys;
 }
 let userId:string|null=null;
 if(!isServer){
  const {data,error}=await userClient.auth.getUser(token);
  if(error||!data.user)return respond({error:"UNAUTHORIZED"},401);
  userId=data.user.id;
 }
 if(input.action==="config"){
  if(!userId)return respond({error:"UNAUTHORIZED"},401);
  const {data,error}=await userClient.from("sa_memberships").select("organization_id")
   .eq("user_id",userId).eq("active",true).limit(1);
  if(error||!data?.length)return respond({error:"FORBIDDEN"},403);
  try{
   const keys=await getServerVapid();
   return respond({enabled:true,publicKey:keys.publicKey});
  }catch{return respond({enabled:false,publicKey:null,error:"PUSH_SETUP_UNAVAILABLE"},503)}
 }
 if(input.action!=="dispatch"&&input.action!=="scheduler")return respond({error:"INVALID_ACTION"},400);

 if(input.action==="scheduler"&&!isServer)return respond({error:"FORBIDDEN"},403);
 let org:string|null=null;
 if(input.action==="dispatch"){
  if(!userId||typeof input.organizationId!=="string")return respond({error:"BAD_ORG"},400);
  org=input.organizationId;
  const {data,error}=await userClient.from("sa_memberships").select("role")
   .eq("organization_id",org).eq("user_id",userId).eq("active",true).single();
  if(error||data?.role!=="admin")return respond({error:"FORBIDDEN"},403);
 }
 let keys:{publicKey:string;privateKey:string};
 try{keys=await getServerVapid()}catch{return respond({error:"PUSH_SETUP_UNAVAILABLE"},503)}
 webpush.setVapidDetails(subject,keys.publicKey,keys.privateKey);
 const {data:due,error:claimError}=await db.rpc("sa_push_claim_due",{p_limit:20,p_org:org});
 if(claimError)return respond({error:"CLAIM_FAILED"},503);
 let sent=0,none=0,failed=0;
 for(const job of (due||[]) as RecordPush[]){
  const found=await db.from("sa_push_subscriptions").select("id,endpoint,p256dh,auth")
   .eq("organization_id",job.organization_id).eq("user_id",job.recipient_id);
  if(found.error){await db.rpc("sa_push_finish",{p_id:job.id,p_state:"failed",p_error:"SUBSCRIPTION_READ"});failed++;continue}
  const devices=(found.data||[]) as Subscription[];
  if(!devices.length){await db.rpc("sa_push_finish",{p_id:job.id,p_state:"no_device"});none++;continue}
  let successful=0;
  for(const device of devices){
   if(!safePushEndpoint(device.endpoint))continue; // prevent SSRF even if the DB is bypassed
   try{
    await webpush.sendNotification({
     endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth}
    },JSON.stringify({id:job.id,title:job.title,
     body:job.body||"Atidarykite Švari Aplinka programėlę",path:job.path}),
    {TTL:3600,urgency:"high"});
    successful++;
   }catch(error){
    // Invalid subscriptions must not cause endless retry loops.
    const status=Number((error as {statusCode?:number})?.statusCode||0);
    if(status===404||status===410){
     await db.from("sa_push_subscriptions").delete().eq("id",device.id)
      .eq("organization_id",job.organization_id).eq("user_id",job.recipient_id);
    }
   }
  }
  if(successful){
   await db.rpc("sa_push_finish",{p_id:job.id,p_state:"sent_to_service"});sent++;
  }else{
   await db.rpc("sa_push_finish",{p_id:job.id,p_state:"failed",p_error:"DELIVERY_FAILED"});failed++;
  }
 }
 return respond({ok:true,claimed:(due||[]).length,sentToService:sent,noDevice:none,failed});
});
