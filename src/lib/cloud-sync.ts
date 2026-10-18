import { supabase } from "./supabase-client";
import { fillAssignments } from "./work-assignments";
import type { AppState } from "./store";
import type { Address, Job, Person, RecruitmentLink } from "./types";

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
export async function loadCloudState(org:string):Promise<Pick<AppState,"addresses"|"jobs"|"people"|"photos"|"workers"|"recruitmentLinks">>{
  if(!isCloudUUID(org))throw new Error("Neteisingas organizacijos ID");
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user)throw new Error("Sesija nepatvirtinta");
  const verified=await supabase.from("sa_memberships").select("role").eq("organization_id",org)
    .eq("user_id",data.user.id).eq("active",true).single();
  if(verified.error||verified.data?.role!=="admin")throw new Error("Šiame etape debesijos valdymas leidžiamas tik administratoriui");
  // Rolling 28-day window. Unique index prevents repeated jobs on every login/refresh.
  // When no one opens the app, nothing runs; a true daily background task is a later option.
  await fillAssignments(org);
  const [addresses,jobs,people,recruitmentLinks]=await Promise.all([
    fetchCollection<Address>(org,"addresses"),fetchCollection<Job>(org,"jobs"),
    fetchCollection<Person>(org,"people"),fetchCollection<RecruitmentLink>(org,"recruitmentLinks")
  ]);
  return {addresses,jobs,people,recruitmentLinks,photos:[],
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
