import { supabase } from "./supabase-client";
import type { Person,Address } from "./types";

export type CleaningService="laiptine"|"teritorija";
export type TransportMode="self"|"public"|"company";
export type Frequency="once"|"weekly";
export type Assignment={
 id:string;organization_id:string;address_id:string;person_id:string;
 recurrence:Frequency;service_types:CleaningService[];
 stair_days:number[];yard_days:number[];single_date:string|null;
 start_date:string;start_time:string|null;travel_mode:TransportMode;
 company_pass:boolean;pass_valid_until:string|null;notes:string;active:boolean;
};
export type AssignmentDraft=Omit<Assignment,"id"|"organization_id"|"active">;
export const DAYS=["Pr","An","Tr","Kt","Pn","Št","Sk"] as const;
export const DAY_NAMES=["pirmadienis","antradienis","trečiadienis","ketvirtadienis","penktadienis","šeštadienis","sekmadienis"];
export const cleanTypes:Record<CleaningService,string>={laiptine:"Laiptinių valymas",teritorija:"Teritorijos valymas"};
export const travelModes:Record<TransportMode,string>={self:"Vyksta savarankiškai",public:"Viešasis transportas",company:"Įmonės automobilis"};
export const formatDays=(days:number[])=>days.map(d=>DAYS[d-1]).join(", ");

export function validateDraft(d:AssignmentDraft,people:Person[],addresses:Address[],today:string):string|null{
 const employee=people.find(p=>p.id===d.person_id);
 const address=addresses.find(a=>a.id===d.address_id);
 if(!employee||employee.role!=="darbuotojas"||employee.status!=="aktyvus")return "Pasirinkite aktyvų darbuotoją iš Personalo skilties";
 if(!address||address.status==="nebeaptarnaujamas"||address.status==="sustabdytas")return "Objektas neaktyvus";
 if(!d.service_types.length)return "Pažymėkite bent vieną valymo tipą";
 if(d.service_types.some(t=>t!=="laiptine"&&t!=="teritorija"))return "Neteisingas valymo tipas";
 if(d.recurrence==="once"){
  if(!d.single_date||d.single_date<today)return "Vienkartiniam darbui pasirinkite šiandieną arba vėlesnę datą";
 }else{
  if(d.service_types.includes("laiptine")&&!d.stair_days.length)return "Pasirinkite laiptinių valymo dienas";
  if(d.service_types.includes("teritorija")&&!d.yard_days.length)return "Pasirinkite teritorijos valymo dienas";
  if(!d.start_date)return "Nurodykite nuolatinio grafiko pradžią";
 }
 if(d.travel_mode!=="public"&&d.company_pass)return "Nuolatinis bilietas galimas tik viešajam transportui";
 if(d.start_time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.start_time))return "Neteisingas laikas";
 return null;
}
export async function currentAdminOrg(){
 const {data:auth,error:authError}=await supabase.auth.getUser();
 if(authError||!auth.user)throw Error("Neprisijungta");
 const {data:membership,error}=await supabase.from("sa_memberships").select("organization_id,role")
  .eq("user_id",auth.user.id).eq("role","admin").eq("active",true).single();
 if(error||!membership)throw Error("Grafikų kūrimui reikia administratoriaus teisių");
 return membership.organization_id as string;
}
export async function listAssignments(org:string):Promise<Assignment[]>{
 const all:Assignment[]=[];
 for(let start=0;start<100000;start+=500){
  const {data,error}=await supabase.from("sa_work_schedules").select("*")
   .eq("organization_id",org).order("created_at",{ascending:false}).range(start,start+499);
  if(error)throw Error("Nepavyko gauti darbuotojų priskyrimų");
  all.push(...(data as Assignment[]||[]));
  if((data?.length||0)<500)return all;
 }
 throw Error("Per daug grafikų – reikia papildomo puslapiavimo");
}
export async function fillAssignments(org:string){
 const {data,error}=await supabase.rpc("sa_fill_work_schedule_horizon",{p_org:org,p_horizon:28});
 if(error)throw Error("Nepavyko sugeneruoti būsimų darbų: "+error.message);
 return Number(data||0);
}
export async function createAssignment(org:string,draft:AssignmentDraft){
 const {error}=await supabase.from("sa_work_schedules").insert({
  organization_id:org,...draft,active:true
 });
 if(error)throw Error("Nepavyko išsaugoti priskyrimo: "+error.message);
 return fillAssignments(org);
}
