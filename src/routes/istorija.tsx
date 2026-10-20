import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/ui-bits";
import { supabase } from "@/lib/supabase-client";

export const Route=createFileRoute("/istorija")({component:HistoryPage});
type Change={old?:unknown;new?:unknown};
type Event={id:string,entity_type:string,event_type:string,created_at:string,actor_user_id:string|null,entity_id:string|null,details?:{changes?:Record<string,Change>}};
const jobKeys:Record<string,string>={type:"Paslauga",date:"Darbo data",status:"Būsena",priority:"Prioritetas",inspection:"Patikra",worker:"Darbuotojas",completedAt:"Užbaigimo laikas"};
const val=(v:unknown):string=>{
 if(v===undefined||v===null||v==="")return "Nenurodyta";
 if(typeof v==="string")return v;
 return String(v);
};
const eventNames:Record<string,string>={insert:"Sukurta",update:"Pakeista",delete:"Pašalinta"};
const entityNames:Record<string,string>={
 sa_addresses:"Adresas",sa_jobs:"Darbas",sa_people:"Darbuotojas",sa_recruitment_links:"Darbo skelbimas"
};
const pad=(x:number)=>String(x).padStart(2,"0");
const localDate=(d:Date)=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join("-");
function HistoryPage(){
 const {jobs,addresses}=useAppState();
 const today=localDate(new Date());
 const [from,setFrom]=useState(""),[to,setTo]=useState(today);
 const [page,setPage]=useState(0),[events,setEvents]=useState<Event[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{
  let alive=true;
  const run=async()=>{
   setLoading(true);setError("");
   try{
    const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth.user)throw new Error("Neprisijungta");
    const {data:member,error:mError}=await supabase.from("sa_memberships")
     .select("organization_id").eq("user_id",auth.user.id).eq("role","admin").eq("active",true).single();
    if(mError||!member)throw new Error("Istorija prieinama tik administratoriui");
    let q=supabase.from("sa_activity_log").select("id,entity_type,event_type,created_at,actor_user_id,entity_id,details")
     .eq("organization_id",member.organization_id);
    if(from)q=q.gte("created_at",from+"T00:00:00");
    if(to)q=q.lt("created_at",new Date(Date.parse(to+"T00:00:00Z")+86400000).toISOString());
    const {data,error:dbError}=await q.order("created_at",{ascending:false}).range(page*100,page*100+99);
    if(dbError)throw new Error("Nepavyko nuskaityti pakeitimų istorijos");
    if(alive)setEvents((data||[]) as Event[]);
   }catch(e){if(alive)setError(e instanceof Error?e.message:"Klaida")}
   finally{if(alive)setLoading(false)}
  };
  void run();return()=>{alive=false};
 },[page,from,to]);
 const csv=()=>{
  const value=(s:string)=>'"'+s.replaceAll('"','""')+'"';
  const lines=[["Laikas","Objektas","Veiksmas","Įrašo ID"].map(value).join(","),
   ...events.map(e=>[e.created_at,entityNames[e.entity_type]||e.entity_type,eventNames[e.event_type]||e.event_type,e.entity_id||""].map(value).join(","))];
  const blob=new Blob(["\ufeff"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="svari-aplinka-istorija.csv";
  link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return <div>
   <PageHeader title="Pakeitimų istorija" subtitle="Supabase įvykių žurnalas · atskiras nuo programėlės versijų žurnalo"/>
   <div className="card-surface mb-4 space-y-3 p-4">
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="text-xs font-semibold">Nuo
       <input type="date" className="mt-1 block w-full rounded-lg border bg-card p-2.5 text-sm" value={from} onChange={e=>{setFrom(e.target.value);setPage(0)}}/>
     </label>
     <label className="text-xs font-semibold">Iki
       <input type="date" className="mt-1 block w-full rounded-lg border bg-card p-2.5 text-sm" value={to} onChange={e=>{setTo(e.target.value);setPage(0)}}/>
     </label>
    </div>
    <Button variant="outline" disabled={!events.length} onClick={csv}><Download/> Eksportuoti rodomą puslapį CSV</Button>
    <p className="text-xs text-muted-foreground">Žurnale įrašomas laikas, veiksmas ir autorius, bet ne slapti durų kodai. Duomenys saugomi Supabase, tačiau ilgalaikiam 5–10 metų archyvui būtina atskira atsarginių kopijų ir saugojimo politika.</p>
   </div>
   {error?<p className="rounded-lg border p-3 text-sm text-destructive">{error}</p>:
    loading?<p className="text-sm text-muted-foreground">Kraunama istorija…</p>:
    events.length?<div className="card-surface divide-y">
     {events.map(e=>{
      const job=e.entity_type==="sa_jobs"?jobs.find(j=>j.id===e.entity_id):undefined;
      const address=job?addresses.find(a=>a.id===job.addressId):undefined;
      const changes=e.details?.changes||{};
      const keys=Object.keys(changes).filter(k=>Object.prototype.hasOwnProperty.call(jobKeys,k));
      return <details key={e.id} className="group p-3 text-sm">
       <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
        <BookOpen className="mt-1 size-4 shrink-0 text-primary"/>
        <div className="min-w-0 flex-1">
         <p className="font-medium">{entityNames[e.entity_type]||e.entity_type}: {eventNames[e.event_type]||e.event_type}</p>
         {address&&<p className="text-sm text-muted-foreground">{address.street}, {address.city}</p>}
         <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("lt-LT")}</p>
        </div>
        <span className="text-xs font-medium text-primary group-open:hidden">Plačiau ▾</span>
        <span className="hidden text-xs font-medium text-primary group-open:inline">Suskleisti ▴</span>
       </summary>
       <div className="ml-7 mt-3 space-y-2 rounded-lg bg-muted/40 p-3">
        {job&&<p><strong>Darbas:</strong> {job.type==="laiptine"?"Laiptinių valymas":job.type==="teritorija"?"Teritorijos tvarkymas":"Patikrinimas"}
         {" · "}{job.worker||"Nepriskirta"}</p>}
        {e.actor_user_id&&<p className="text-xs text-muted-foreground">Veiksmą atliko paskyra: {e.actor_user_id.slice(0,8)}…</p>}
        {keys.length>0?<div className="space-y-1">
          {keys.map(k=>{const entry=changes[k];return entry?<p key={k}><strong>{jobKeys[k]}:</strong> {"old" in entry ? val(entry.old)+" → ":""}{val(entry.new)}</p>:null})}
         </div>:<p className="text-xs text-muted-foreground">Šiam ankstesniam įrašui tiksli pakeistų laukų istorija nebuvo kaupiama. Rodoma tik dabartinė darbo informacija, jei ji išlikusi.</p>}
        {job&&<Link to="/darbai/$jobId" params={{jobId:job.id}} className="inline-block text-sm font-semibold text-primary underline">Atidaryti darbą →</Link>}
       </div>
      </details>;
     })}
    </div>:<p className="card-surface p-5 text-sm text-muted-foreground">Šiam laikotarpiui įrašų nėra.</p>}
   <div className="mt-4 flex items-center justify-between">
    <Button variant="outline" disabled={page===0||loading} onClick={()=>setPage(p=>Math.max(0,p-1))}><ChevronLeft/> Atgal</Button>
    <span className="text-xs text-muted-foreground">{page+1} puslapis · iki 100 įrašų</span>
    <Button variant="outline" disabled={events.length<100||loading} onClick={()=>setPage(p=>p+1)}>Toliau <ChevronRight/></Button>
   </div>
 </div>;
}
