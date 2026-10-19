import { supabase } from "./supabase-client";
import { fillAssignments } from "./work-assignments";
import type { AppState } from "./store";
import type { Address, Job, Person, PhotoMeta, RecruitmentLink } from "./types";

export type LiveCloudRole="admin"|"worker";
let currentRole:LiveCloudRole="admin";
export const getCloudRole=()=>currentRole;
export const resetCloudRole=()=>{currentRole="admin"};
type Collection="addresses"|"jobs"|"people"|"recruitmentLinks";
type Entity=Address|Job|Person|RecruitmentLink;
const TABLE:Record<Collection,string>={addresses:"sa_addresses",jobs:"sa_jobs",people:"sa_people",recruitmentLinks:"sa_recruitment_links"};
export const isCloudUUID=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
export type CloudMutation={table:string;kind:"add"|"edit"|"remove";id:string;row?:Record<string,unknown>};

/** No DEMO seeds are ever imported. All tables remain tenant-filtered and RLS-protected. */
async function fetchCollection<T>(org:string,key:Collection):Promise<T[]>{
  const all:T[]=[];
  for(let start=0;start<100000;start+=500){
    const {data,error}=await supabase.from(TABLE[key]).select("id,data").eq("organization_id",org)
      .order("id",{ascending:true}).range(start,start+499);
    if(error)throw new Error("Nepavyko nuskaityti "+key);
    for(const entry of data||[])all.push({...entry.data,id:entry.id} as unknown as T);
    if((data?.length||0)<500)return all;
  }
  throw new Error("Duomenų skaitymo limitas; būtinas papildomas puslapiavimas");
}
/** Photo bytes live exclusively in private R2; only metadata is stored in Supabase. */
async function fetchPhotoMetadata(org:string):Promise<PhotoMeta[]>{
  const all:PhotoMeta[]=[];
  for(let start=0;start<100000;start+=500){
    const {data,error}=await supabase.from("sa_photo_metadata")
      .select("id,address_id,job_id,created_at,data")
      .eq("organization_id",org).order("id",{ascending:true}).range(start,start+499);
    if(error)throw new Error("Nepavyko nuskaityti nuotraukų");
    for(const p of data||[]){
      const d=(p.data||{}) as Record<string,unknown>;
      if(d.trashedAt||d.purgingAt)continue; // retain DB row; hide only from active galleries
      all.push({
        id:p.id,addressId:p.address_id,jobId:p.job_id||undefined,createdAt:p.created_at,
        width:Number(d.width)||0,height:Number(d.height)||0,size:Number(d.size)||0,
        type:typeof d.type==="string"?d.type:"image/webp",
        tag:d.tag==="pries"||d.tag==="po"||d.tag==="problema"?d.tag:undefined,
        proofMode:d.proofMode==="gps_live"||d.proofMode==="admin_override"?d.proofMode:undefined,
        gpsVerifiedAt:typeof d.gpsVerifiedAt==="string"?d.gpsVerifiedAt:undefined,
        gpsDistanceMeters:typeof d.gpsDistanceMeters==="number"?d.gpsDistanceMeters:undefined,
        gpsAccuracyMeters:typeof d.gpsAccuracyMeters==="number"?d.gpsAccuracyMeters:undefined,
        gpsRadiusMeters:typeof d.gpsRadiusMeters==="number"?d.gpsRadiusMeters:undefined,
        gpsOverrideReason:typeof d.gpsOverrideReason==="string"?d.gpsOverrideReason:undefined
      });
    }
    if((data?.length||0)<500)return all;
  }
  throw new Error("Nuotraukų skaitymo limitas – reikia papildomo puslapiavimo");
}
export async function loadCloudState(org:string):Promise<Pick<AppState,"addresses"|"jobs"|"people"|"photos"|"workers"|"recruitmentLinks">>{
  if(!isCloudUUID(org))throw new Error("Neteisingas organizacijos ID");
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user)throw new Error("Sesija nepatvirtinta");
  const verified=await supabase.from("sa_memberships").select("role").eq("organization_id",org)
    .eq("user_id",data.user.id).eq("active",true).single();
  if(verified.error||!["admin","worker"].includes(verified.data?.role||""))
    throw new Error("Įmonės paskyrai nesuteiktos šios programėlės teisės");
  const isAdmin=verified.data?.role==="admin";
  // The rolling horizon and all administrative writes remain admin-only.
  if(isAdmin)await fillAssignments(org);
  const [addresses,jobs,people,recruitmentLinks,photos]=await Promise.all([
    fetchCollection<Address>(org,"addresses"),fetchCollection<Job>(org,"jobs"),
    fetchCollection<Person>(org,"people"),
    isAdmin?fetchCollection<RecruitmentLink>(org,"recruitmentLinks"):Promise.resolve([]),
    fetchPhotoMetadata(org)
  ]);
  currentRole=isAdmin?"admin":"worker";
  return {addresses,jobs,people,recruitmentLinks,photos,
    workers:people.filter(p=>p.role==="darbuotojas"&&(p.status==="aktyvus"||p.status==="atostogos")).map(p=>p.name)};
}
export function cloudMutations(before:AppState,after:AppState,org:string):CloudMutation[]{
  const deletes:CloudMutation[]=[],adds:CloudMutation[]=[],changes:CloudMutation[]=[];
  for(const key of ["jobs","recruitmentLinks","people","addresses"] as Collection[]){
    const oldRecords=new Map((before[key] as Entity[]).map(p=>[p.id,p]));
    const newRecords=new Map((after[key] as Entity[]).map(p=>[p.id,p]));
    for(const [id] of oldRecords)if(!newRecords.has(id))deletes.push({table:TABLE[key],kind:"remove",id});
    for(const [id,record] of newRecords){
      if(!isCloudUUID(id))throw new Error("Neteisingas naujo objekto ID");
      const jobDetails=key==="jobs"?{address_id:(record as Job).addressId}:{};
      if(!oldRecords.has(id)){
        adds.push({table:TABLE[key],kind:"add",id,row:{id,organization_id:org,data:record,...jobDetails}});
      }else if(JSON.stringify(oldRecords.get(id))!==JSON.stringify(record)){
        changes.push({table:TABLE[key],kind:"edit",id,row:{data:record,...jobDetails}});
      }
    }
  }
  // Delete dependent jobs before addresses; create addresses before dependent jobs.
  adds.sort((a,b)=>Number(a.table==="sa_jobs")-Number(b.table==="sa_jobs"));
  return [...deletes,...adds,...changes];
}
export async function saveCloudMutations(org:string,mutations:CloudMutation[]){
  for(const change of mutations){
    if(change.kind==="add"){
      const {error}=await supabase.from(change.table).insert(change.row!);
      if(error)throw new Error(change.table+": "+error.message);
    }else if(change.kind==="edit"){
      const {error,data}=await supabase.from(change.table).update(change.row!)
        .eq("organization_id",org).eq("id",change.id).select("id");
      if(error||!data?.length)throw new Error(change.table+": įrašo atnaujinimo klaida");
    }else {
      const {error}=await supabase.from(change.table).delete().eq("organization_id",org).eq("id",change.id);
      if(error)throw new Error(change.table+": "+error.message);
    }
  }
}
