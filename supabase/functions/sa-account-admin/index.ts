import { createClient } from "npm:@supabase/supabase-js@2.79.0";

const MODULES = [
  "overview","calendar","jobs","addresses","people","messages","analytics",
  "photos","storage","inspections","changes","history","account","settings",
] as const;
type Module = typeof MODULES[number];
type Access = "none"|"view"|"edit";
const MODULE_SET = new Set<string>(MODULES);
const ALLOWED_ORIGINS = new Set([
  "https://deoxesinfo.github.io",
  "https://app.svariaplinka.lt",
]);
const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const service = createClient(URL, SECRET, {auth:{persistSession:false,autoRefreshToken:false}});
const authClient = createClient(URL, ANON, {auth:{persistSession:false,autoRefreshToken:false}});

function response(body:unknown,status=200,origin="https://deoxesinfo.github.io"){
  return new Response(JSON.stringify(body),{status,headers:{
    "content-type":"application/json; charset=utf-8","cache-control":"no-store",
    "access-control-allow-origin":origin,"vary":"Origin",
    "access-control-allow-headers":"authorization, apikey, x-client-info, content-type",
    "access-control-allow-methods":"POST, OPTIONS",
  }});
}
function bad(message:string,status=400,origin?:string){return response({ok:false,error:message},status,origin)}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async(req)=>{
  const rawOrigin=req.headers.get("origin")||"";
  if(rawOrigin && !ALLOWED_ORIGINS.has(rawOrigin))return bad("Neleidžiama svetainė",403);
  const origin=rawOrigin||"https://deoxesinfo.github.io";
  if(req.method==="OPTIONS")return response({ok:true},200,origin);
  if(req.method!=="POST")return bad("Method not allowed",405,origin);
  const token=req.headers.get("authorization")?.replace(/^Bearer /i,"")||"";
  if(!token)return bad("Neprisijungta",401,origin);
  const {data:identity,error:authError}=await authClient.auth.getUser(token);
  const actor=identity?.user;
  if(authError||!actor)return bad("Neteisinga sesija",401,origin);
  let payload:Record<string,unknown>;
  try{payload=await req.json();}catch{return bad("Neteisingas JSON",400,origin)}
  const organizationId=String(payload.organizationId||"");
  if(!UUID.test(organizationId))return bad("Neteisinga organizacija",400,origin);
  const {data:member,error:memberError}=await service.from("sa_memberships")
    .select("role,active").eq("organization_id",organizationId).eq("user_id",actor.id).maybeSingle();
  if(memberError||!member?.active||member.role!=="admin")return bad("Tik administratorius gali valdyti paskyras",403,origin);
  const action=String(payload.action||"");
  try{
    if(action==="list"){
      const [m,d,p]=await Promise.all([
        service.from("sa_memberships").select("user_id,role,active,created_at").eq("organization_id",organizationId),
        service.from("sa_account_directory").select("user_id,email,display_name,invited_at").eq("organization_id",organizationId),
        service.from("sa_user_permissions").select("user_id,module,access").eq("organization_id",organizationId),
      ]);
      if(m.error||d.error||p.error)throw Error("Nepavyko nuskaityti paskyrų");
      const directory=new Map((d.data||[]).map(x=>[x.user_id,x]));
      const accounts=await Promise.all((m.data||[]).slice(0,100).map(async x=>{
        const profile=directory.get(x.user_id);
        let email=profile?.email||"",confirmed=false;
        const {data:user}=await service.auth.admin.getUserById(x.user_id);
        if(user?.user){email=user.user.email||email;confirmed=Boolean(user.user.email_confirmed_at)}
        return {userId:x.user_id,email,displayName:profile?.display_name||"",
          role:x.role,active:x.active,confirmed,createdAt:x.created_at,invitedAt:profile?.invited_at||null,
          permissions:Object.fromEntries((p.data||[]).filter(q=>q.user_id===x.user_id).map(q=>[q.module,q.access]))};
      }));
      return response({ok:true,accounts},200,origin);
    }
    if(action==="invite"){
      const email=String(payload.email||"").trim().toLowerCase();
      const displayName=String(payload.displayName||"").trim();
      const role=String(payload.role||"manager");
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254) return bad("Neteisingas el. paštas",400,origin);
      if(displayName.length>120) return bad("Per ilgas vardas",400,origin);
      if(!["manager","worker"].includes(role))return bad("Ši rolė neleidžiama",400,origin);
      const {data:invitation,error:inviteError}=await service.auth.admin.inviteUserByEmail(email,{
        redirectTo:"https://deoxesinfo.github.io/svari-aplinka-pwa/?sa_auth=invite",
        data:{display_name:displayName},
      });
      if(inviteError||!invitation?.user?.id)return bad("Nepavyko išsiųsti kvietimo: "+(inviteError?.message||"Nežinoma klaida"),400,origin);
      const userId=invitation.user.id;
      const {error:membershipError}=await service.from("sa_memberships").upsert(
        {organization_id:organizationId,user_id:userId,role,active:true},
        {onConflict:"organization_id,user_id"});
      if(membershipError)throw Error("Kvietimas išsiųstas, bet nepavyko susieti su įmone. Paskyra neturi prieigos: "+membershipError.message);
      const {error:directoryError}=await service.from("sa_account_directory").upsert({
        organization_id:organizationId,user_id:userId,email,display_name:displayName,invited_by:actor.id,
      },{onConflict:"organization_id,user_id"});
      if(directoryError)throw Error("Paskyra sukurta, bet nepavyko išsaugoti jos duomenų: "+directoryError.message);
      // Default deny: no rights are created until the admin explicitly assigns them.
      return response({ok:true,userId,invited:true},200,origin);
    }
    if(action==="permissions"||action==="set_active"){
      const userId=String(payload.userId||"");
      if(!UUID.test(userId)||userId===actor.id)return bad("Negalima keisti savo teisių",400,origin);
      const {data:target}=await service.from("sa_memberships")
        .select("role,active").eq("organization_id",organizationId).eq("user_id",userId).maybeSingle();
      if(!target||target.role==="admin")return bad("Administratoriaus teisių keisti negalima",403,origin);
      if(action==="set_active"){
        if(typeof payload.active!=="boolean")return bad("Neteisinga paskyros būsena",400,origin);
        const {error}=await service.from("sa_memberships").update({active:payload.active})
          .eq("organization_id",organizationId).eq("user_id",userId);
        if(error)throw Error("Nepavyko pakeisti paskyros būsenos");
        return response({ok:true},200,origin);
      }
      if(!target.active)return bad("Paskyra išjungta",400,origin);
      const input=payload.permissions;
      if(!input||typeof input!=="object"||Array.isArray(input))return bad("Neteisingos teisės",400,origin);
      const values=input as Record<string,unknown>;
      if(Object.keys(values).some(k=>!MODULE_SET.has(k)))return bad("Nežinomas leidimų modulis",400,origin);
      const entries=MODULES.map(module=>{
        const level=values[module]??"none";
        if(!["none","view","edit"].includes(String(level)))throw Error("Neteisingas leidimas: "+module);
        return {organization_id:organizationId,user_id:userId,module,access:module==="account"?"view":level as Access,
          updated_at:new Date().toISOString()};
      });
      const {error}=await service.from("sa_user_permissions").upsert(entries,
        {onConflict:"organization_id,user_id,module"});
      if(error)throw Error("Nepavyko išsaugoti leidimų: "+error.message);
      return response({ok:true},200,origin);
    }
    return bad("Nežinomas veiksmas",400,origin);
  }catch(err){return bad(err instanceof Error?err.message:"Serverio klaida",500,origin)}
});
