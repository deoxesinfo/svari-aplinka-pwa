import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { BusFront, Save } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, inputCls,textareaCls } from "./ui-bits";
import { useAppState, refreshCloudWorkspace, isCloudMode } from "@/lib/store";
import { DAYS, createAssignment,currentAdminOrg,validateDraft,type AssignmentDraft,type CleaningService,type TransportMode } from "@/lib/work-assignments";
import { todayISO } from "@/lib/dates";
import type { Address } from "@/lib/types";

export function WorkAssignmentDialog({address,open,onOpenChange,onSaved}:{
 address:Address|null;open:boolean;onOpenChange:(open:boolean)=>void;onSaved?:()=>void
}){
 const {people,addresses}=useAppState();
 const workers=people.filter(p=>p.role==="darbuotojas"&&p.status==="aktyvus");
 const [draft,setDraft]=useState<AssignmentDraft|null>(null);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
   if(!open||!address)return;
   const types:CleaningService[]=address.type==="abu"?["laiptine","teritorija"]:[address.type];
   setDraft({
    address_id:address.id,person_id:"",
    service_types:types,recurrence:"weekly",
    stair_days:[],yard_days:[],single_date:null,
    start_date:todayISO(),start_time:null,
    travel_mode:"self",company_pass:false,pass_valid_until:null,notes:""
   });
 },[open,address?.id]);
 const update=(patch:Partial<AssignmentDraft>)=>setDraft(d=>d?{...d,...patch}:d);
 const toggleService=(type:CleaningService)=>update({service_types:
   draft?.service_types.includes(type)?draft.service_types.filter(t=>t!==type):[...(draft?.service_types||[]),type]});
 const toggleDay=(kind:"stair_days"|"yard_days",day:number)=>{
   const old=draft?.[kind]||[];
   update({[kind]:old.includes(day)?old.filter(d=>d!==day):[...old,day].sort()} as Partial<AssignmentDraft>);
 };
 const save=async(event:FormEvent)=>{
   event.preventDefault();
   if(!draft||!address)return;
   if(!isCloudMode()){toast.error("Priskyrimus galima saugoti tik Supabase įmonės paskyroje");return;}
   const warning=validateDraft(draft,people,addresses,todayISO());
   if(warning){toast.error(warning);return;}
   setBusy(true);
   try{
     const org=await currentAdminOrg();
     const count=await createAssignment(org,{
       ...draft,company_pass:draft.travel_mode==="public"&&draft.company_pass,
       pass_valid_until:draft.travel_mode==="public"&&draft.company_pass?draft.pass_valid_until:null,
       notes:draft.notes.trim().slice(0,2000)
     });
     await refreshCloudWorkspace();
     toast.success("Priskyrimas sukurtas. Į kalendorių įtraukta: "+count+" darbų.");
     onOpenChange(false);onSaved?.();
   }catch(error){toast.error(error instanceof Error?error.message:"Nepavyko išsaugoti priskyrimo");}
   finally{setBusy(false)}
 };
 return <Dialog open={open} onOpenChange={busy?()=>{}:onOpenChange}>
   <DialogContent className="max-h-[90dvh] w-[calc(100vw-1rem)] max-w-xl overflow-y-auto px-4 pb-6 pt-6 sm:p-6">
     <DialogHeader>
       <DialogTitle>Priskirti darbą</DialogTitle>
       <DialogDescription>{address?.street}, {address?.city} · darbuotojas pasirenkamas iš Personalo sąrašo</DialogDescription>
     </DialogHeader>
     {draft&&<form onSubmit={e=>void save(e)} className="space-y-4">
       <div className="space-y-2">
         <p className="text-sm font-semibold">Valymo tipai</p>
         {(["laiptine","teritorija"] as const).filter(type=>address?.type==="abu"||address?.type===type)
           .map(type=><label key={type} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
           <input type="checkbox" className="size-4 accent-primary" checked={draft.service_types.includes(type)}
             onChange={()=>toggleService(type)}/>{type==="laiptine"?"Laiptinių valymas":"Teritorijos valymas"}
           </label>)}
       </div>
       <Field label="Darbuotojas">
         <select className={inputCls} required value={draft.person_id} onChange={e=>update({person_id:e.target.value})}>
           <option value="">Pasirinkti darbuotoją</option>
           {workers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
         </select>
         {!workers.length&&<p className="mt-1 text-xs text-amber-700">Pirma sukurkite aktyvų darbuotoją skiltyje „Darbuotojai“.</p>}
       </Field>
       <div className="space-y-2">
         <p className="text-sm font-semibold">Darbo periodiškumas</p>
         <label className="flex items-center gap-2 text-sm">
           <input type="radio" checked={draft.recurrence==="once"} onChange={()=>update({recurrence:"once",single_date:todayISO()})}/>
           Vienkartinis darbas
         </label>
         <label className="flex items-center gap-2 text-sm">
           <input type="radio" checked={draft.recurrence==="weekly"} onChange={()=>update({recurrence:"weekly",single_date:null})}/>
           Nuolatinis (pasikartojantis) darbas
         </label>
       </div>
       {draft.recurrence==="once"?
         <Field label="Darbo data">
           <input type="date" className={inputCls} min={todayISO()} value={draft.single_date||todayISO()}
             onChange={e=>update({single_date:e.target.value})}/>
         </Field>:
         <div className="space-y-3">
           {draft.service_types.map(type=>{
             const key=type==="laiptine"?"stair_days":"yard_days";
             return <div key={type} className="space-y-2">
               <p className="text-sm font-medium">{type==="laiptine"?"Laiptinių valymo dienos":"Teritorijos valymo dienos"}</p>
               <div className="flex flex-wrap gap-1.5">
                 {DAYS.map((day,i)=><button key={day} type="button"
                   aria-pressed={draft[key].includes(i+1)}
                   className={"min-h-10 min-w-10 rounded-lg border px-2 text-sm "+(draft[key].includes(i+1)?"border-primary bg-primary/10 font-semibold text-primary":"bg-background")}
                   onClick={()=>toggleDay(key,i+1)}>{day}</button>)}
               </div>
             </div>
           })}
           <Field label="Grafiko pradžia">
             <input type="date" min={todayISO()} className={inputCls} value={draft.start_date}
               onChange={e=>update({start_date:e.target.value})}/>
           </Field>
         </div>}
       <Field label="Darbo pradžios laikas (neprivalomas)">
         <input type="time" className={inputCls} value={draft.start_time||""}
           onChange={e=>update({start_time:e.target.value||null})}/>
       </Field>
       <div className="space-y-2 rounded-xl border p-3">
         <p className="flex items-center gap-2 text-sm font-semibold"><BusFront className="size-4"/> Darbuotojo transportas</p>
         <select className={inputCls} value={draft.travel_mode}
           onChange={e=>update({travel_mode:e.target.value as TransportMode,company_pass:false,pass_valid_until:null})}>
           <option value="self">Vyksta savarankiškai (savo transportu)</option>
           <option value="public">Viešasis transportas</option>
           <option value="company">Įmonės automobilis</option>
         </select>
         {draft.travel_mode==="public"&&<>
           <label className="flex items-center gap-2 text-sm">
             <input type="checkbox" checked={draft.company_pass}
               onChange={e=>update({company_pass:e.target.checked,pass_valid_until:null})} className="size-4 accent-primary"/>
             Įmonė suteikia nuolatinį bilietą
           </label>
           {draft.company_pass&&<Field label="Bilieto galiojimas iki (neprivaloma)">
             <input type="date" className={inputCls} value={draft.pass_valid_until||""}
               onChange={e=>update({pass_valid_until:e.target.value||null})}/>
           </Field>}
         </>}
         {draft.travel_mode==="company"&&<p className="text-xs text-muted-foreground">
           Automobilių sąrašą ir konkretų automobilio priskyrimą pridėsime vėliau.
         </p>}
       </div>
       <Field label="Papildoma informacija (neprivaloma)">
         <textarea rows={3} maxLength={2000} className={textareaCls} value={draft.notes}
           onChange={e=>update({notes:e.target.value})} placeholder="Pvz., susitikti su vairuotoju, paimti raktus…"/>
       </Field>
       {draft.recurrence==="weekly"&&<p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
         Darbai sugeneruojami artimiausioms 4 savaitėms. Atidarant programėlę grafikas bus papildomas.
         Atliekami darbai išsaugomi atskirai, jų istorija lieka.
       </p>}
       <DialogFooter className="mt-3 border-t pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
         <Button type="button" variant="outline" disabled={busy} onClick={()=>onOpenChange(false)}>Atšaukti</Button>
         <Button type="submit" disabled={busy||!workers.length}><Save className="size-4"/>
           {busy?"Saugoma…":"Išsaugoti priskyrimą"}
         </Button>
       </DialogFooter>
     </form>}
   </DialogContent>
 </Dialog>;
}
