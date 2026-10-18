import { supabase } from "./supabase-client";

/** Preview-only database adapter. It does NOT import, mutate or delete any business data. */
export const CLOUD_TABLES=[
  "sa_addresses","sa_jobs","sa_people","sa_photo_metadata","sa_recruitment_links",
  "sa_activity_log","sa_notifications"
] as const;
export type CloudTable=typeof CLOUD_TABLES[number];
export type CloudPreview={ organizationId:string; counts:Record<CloudTable,number> };

export function isUuid(value:string):boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export async function previewCloudWorkspace(organizationId:string):Promise<CloudPreview> {
  if(!isUuid(organizationId))throw new Error("Neteisingas įmonės identifikatorius");
  const {data:user,error:authError}=await supabase.auth.getUser();
  if(authError||!user.user)throw new Error("Neprisijungta");
  const {data:members,error:membershipError}=await supabase.from("sa_memberships")
   .select("organization_id,role").eq("organization_id",organizationId)
   .eq("user_id",user.user.id).eq("active",true).limit(1);
  if(membershipError||!members?.length)throw new Error("Šiai įmonei neturite prieigos");
  const entries=await Promise.all(CLOUD_TABLES.map(async table=>{
    const {count,error}=await supabase.from(table).select("*",{count:"exact",head:true})
     .eq("organization_id",organizationId);
    if(error)throw new Error("Nepavyko patikrinti debesijos duomenų");
    return [table,count??0] as const;
  }));
  return {organizationId,counts:Object.fromEntries(entries) as Record<CloudTable,number>};
}

export type CloudRow={id:string;organization_id:string;data:Record<string,unknown>};
export async function readCloudRows(organizationId:string,table:"sa_addresses"|"sa_jobs"|"sa_people"|"sa_recruitment_links"){
  if(!isUuid(organizationId))throw new Error("Neteisingas įmonės identifikatorius");
  const all:CloudRow[]=[];
  // Paging avoids silently truncating long-term history at the REST default 1000 rows.
  for(let offset=0;offset<100000;offset+=500){
    const {data,error}=await supabase.from(table).select("id,organization_id,data")
      .eq("organization_id",organizationId).order("id",{ascending:true}).range(offset,offset+499);
    if(error)throw new Error("Nepavyko nuskaityti debesijos duomenų");
    const rows=(data||[]) as CloudRow[];
    all.push(...rows);
    if(rows.length<500)return all;
  }
  throw new Error("Pasiektas saugus skaitymo limitas: reikia puslapiavimo pratęsimo");
}
