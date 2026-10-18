import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, BusFront } from "lucide-react";
import { currentAdminOrg,listAssignments,formatDays,travelModes,type Assignment } from "@/lib/work-assignments";
import { useAppState } from "@/lib/store";

export function useSchedules(refreshToken=0){
 const [items,setItems]=useState<Assignment[]>([]);
 const [error,setError]=useState("");
 useEffect(()=>{
  let alive=true;
  void currentAdminOrg().then(listAssignments)
   .then(data=>{if(alive){setItems(data);setError("")}})
   .catch(()=>{if(alive)setError("Nepavyko įkelti nuolatinių priskyrimų")});
  return()=>{alive=false};
 },[refreshToken]);
 return {items,error};
}
export function AssignedSchedules({addressId,refreshToken=0}:{
 addressId:string;refreshToken?:number
}){
 const {people}=useAppState();
 const {items,error}=useSchedules(refreshToken);
 const schedules=items.filter(s=>s.address_id===addressId);
 return <section className="card-surface mt-5 space-y-3 p-4 sm:p-5">
  <h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarDays className="size-5"/> Priskyrimai ({schedules.length})</h2>
  {error&&<p className="text-sm text-destructive">{error}</p>}
  {!schedules.length?<p className="text-sm text-muted-foreground">Dar niekam nepriskirta. Paspauskite „Sukurti darbą“.</p>:
    schedules.map(s=><article key={s.id} className="rounded-lg border p-3 text-sm">
     <p className="font-semibold">{people.find(p=>p.id===s.person_id)?.name||"Darbuotojas archyvuotas"}</p>
     <p className="mt-1 text-muted-foreground">{s.service_types.map(t=>t==="laiptine"?"Laiptinės":"Teritorija").join(" + ")}</p>
     <p className="mt-1">{s.recurrence==="once"?"Vienkartinis – "+s.single_date:
      [s.service_types.includes("laiptine")?"Laiptinės: "+formatDays(s.stair_days):"",s.service_types.includes("teritorija")?"Teritorija: "+formatDays(s.yard_days):""].filter(Boolean).join(" · ")}</p>
     <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><BusFront className="size-3.5"/>{travelModes[s.travel_mode]}{s.company_pass?" · įmonės nuolatinis":""}{s.start_time?" · "+s.start_time:""}</p>
     {s.notes&&<p className="mt-1 text-xs text-muted-foreground">{s.notes}</p>}
     <p className="mt-1 text-xs text-muted-foreground">{s.active?"Aktyvus priskyrimas":"Sustabdytas priskyrimas"}</p>
    </article>)}
  <Link className="text-xs text-primary underline" to="/darbuotojai">Peržiūrėti personalą</Link>
 </section>;
}
