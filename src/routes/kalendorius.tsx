import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Printer, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppState,isCloudMode } from "@/lib/store";
import { JobFormDialog } from "@/components/app/forms";
import { JobRow } from "@/components/app/JobRow";
import { EmployeeSchedulePrint } from "@/components/app/EmployeeSchedulePrint";
import { PageHeader, Pill } from "@/components/app/ui-bits";
import { addDays,fmtLong,fmtMonth,parseISO,startOfWeek,todayISO } from "@/lib/dates";
import { jobsForDay,sortJobs } from "@/lib/scheduling";
import { currentAdminOrg } from "@/lib/work-assignments";
import { calendarRange,employeeJobs,jobsWithinRange,shiftCalendarMonth,type CalendarMode } from "@/lib/employee-calendar";

export const Route=createFileRoute("/kalendorius")({component:CalendarView});
function CalendarView(){
 const {jobs,people,addresses}=useAppState();
 const today=todayISO();
 const [day,setDay]=useState(today);
 const [mode,setMode]=useState<CalendarMode>("savaite");
 const [create,setCreate]=useState(false);
 const [personId,setPersonId]=useState("");
 const [printing,setPrinting]=useState(false);
 const workers=useMemo(()=>people.filter(p=>p.role==="darbuotojas").sort((a,b)=>a.name.localeCompare(b.name,"lt")),[people]);
 const chosen=workers.find(p=>p.id===personId);
 const filteredJobs=useMemo(()=>{
   if(!personId)return jobs;
   if(!chosen)return [];
   return employeeJobs(jobs,chosen,people);
 },[jobs,chosen,personId,people]);
 const start=startOfWeek(day);
 const first=useMemo(()=>{
   if(mode==="diena")return day;
   if(mode==="savaite")return start;
   return startOfWeek(day.slice(0,7)+"-01");
 },[day,mode,start]);
 const count=mode==="diena"?1:mode==="savaite"?7:42;
 const cells=Array.from({length:count},(_,i)=>addDays(first,i));
 const selected=sortJobs(jobsForDay(filteredJobs,day,today),today);
 const range=calendarRange(day,mode);
 const scheduled=jobsWithinRange(filteredJobs,range);
 const shift=(n:number)=>{
   if(mode==="diena")setDay(addDays(day,n));
   else if(mode==="savaite")setDay(addDays(day,7*n));
   else setDay(shiftCalendarMonth(day,n));
 };
 const print=async()=>{
   if(!chosen||mode==="diena"||printing)return;
   try{
     if(!isCloudMode())throw Error("Spausdinimas prieinamas tik prisijungus į įmonės sistemą");
     await currentAdminOrg(); // Require actual administrator membership for sensitive access codes.
     setPrinting(true); // Render paper-only content AFTER role verification, not while browsing.
   }catch(e){toast.error(e instanceof Error?e.message:"Nepavyko paruošti spausdinimo")}
 };
 useEffect(()=>{
   if(!printing)return;
   const clear=()=>setPrinting(false);
   window.addEventListener("afterprint",clear);
   const frame=window.requestAnimationFrame(()=>window.print());
   // iOS may omit afterprint; remove sensitive paper-only DOM on return.
   const timer=window.setTimeout(clear,30000);
   return()=>{window.cancelAnimationFrame(frame);window.clearTimeout(timer);window.removeEventListener("afterprint",clear)};
 },[printing]);
 return <div>
   <PageHeader title="Kalendorius" subtitle="Dienos, savaitės ir mėnesio valymo grafikas" actions={<Button onClick={()=>setCreate(true)}><Plus/> Pridėti darbą</Button>}/>
   <div className="card-surface mb-4 space-y-3 p-4">
     <label className="block text-sm font-semibold" htmlFor="schedule-worker"><Users className="mr-2 inline size-4"/>Darbuotojo grafikas</label>
     <select id="schedule-worker" className="w-full rounded-lg border bg-background p-3 text-sm" value={personId}
       onChange={e=>setPersonId(e.target.value)}>
       <option value="">Visų darbuotojų darbai</option>
       {workers.map(p=><option value={p.id} key={p.id}>{p.name}{p.status==="nebedirba"?" (archyvas)":""}</option>)}
     </select>
     {!workers.length&&<p className="text-xs text-muted-foreground">Darbuotojus pridėkite skiltyje „Darbuotojai“.</p>}
     {chosen&&<div className="space-y-2 rounded-lg border bg-muted/30 p-3">
       <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
         <span><strong>{chosen.name}</strong> · {scheduled.length} suplanuoti darbai šiame laikotarpyje</span>
         {mode==="diena"&&<span className="text-xs text-muted-foreground">Spausdinimui pasirinkite savaitę arba mėnesį</span>}
       </div>
       {mode!=="diena"&&<>
         <Button type="button" variant="outline" disabled={printing} onClick={()=>void print()}>
           <Printer className="size-4"/> {printing?"Ruošiama…":"Spausdinti grafiką (A4)"}
         </Button>
         <p className="text-xs font-medium text-muted-foreground">Administratoriaus spausdinime automatiškai įtraukiami objekto durų kodai. Spausdintą lapą perduokite tik įgaliotam darbuotojui.</p>
       </>}
       <p className="text-xs text-muted-foreground">Spausdinami pagal datą suplanuoti darbai. Vėluojantys darbai ekrane matomi šiandien, tačiau lape lieka jų pirminė data. Nuolatiniai grafikai generuojami artimiausioms 4 savaitėms.</p>
     </div>}
   </div>
   <div className="card-surface p-4">
     <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
       <div className="flex items-center gap-2">
         <Button variant="outline" size="icon" aria-label="Ankstesnis laikotarpis" onClick={()=>shift(-1)}><ChevronLeft/></Button>
         <Button variant="outline" size="icon" aria-label="Kitas laikotarpis" onClick={()=>shift(1)}><ChevronRight/></Button>
         <div className="font-bold">{mode==="menuo"?fmtMonth(day):fmtLong(day)}</div>
       </div>
       <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">{(["diena","savaite","menuo"] as CalendarMode[]).map(m=><button key={m}
          type="button" onClick={()=>setMode(m)} aria-pressed={mode===m}
          className={"rounded-md px-3 py-2 text-sm font-medium "+(mode===m?"bg-card shadow":"text-muted-foreground")}>
         {m==="diena"?"Diena":m==="savaite"?"Savaitė":"Mėnuo"}
       </button>)}<button type="button" onClick={()=>setDay(today)} className="rounded-md px-3 text-sm text-primary">Šiandien</button></div>
     </div>
     <div className={"grid gap-1 "+(mode==="diena"?"grid-cols-1":"grid-cols-7")}>
       {mode!=="diena"&&["Pr","An","Tr","Kt","Pn","Št","Sk"].map(d=><div className="py-1 text-center text-xs text-muted-foreground" key={d}>{d}</div>)}
       {cells.map(d=>{
         const list=jobsForDay(filteredJobs,d,today);
         const overdue=d===today?filteredJobs.filter(j=>j.status==="laukia"&&j.date<today).length:0;
         return <button key={d} type="button" onClick={()=>setDay(d)}
           aria-label={d+": "+list.length+" darbai"}
           className={"relative min-h-16 rounded-lg border p-2 text-left transition-colors hover:border-primary/40 "+(day===d?"border-primary bg-primary/10":"border-border bg-card")+
             (mode==="menuo"&&d.slice(0,7)!==day.slice(0,7)?" opacity-40":"")}>
           <span className="text-xs font-bold">{mode==="diena"?fmtLong(d):parseISO(d).getDate()}</span>
           <div className="mt-1 flex flex-wrap gap-1">
             {list.length>0&&<span className="rounded bg-primary/10 px-1 text-xs text-primary">{list.length}</span>}
             {overdue>0&&<span className="rounded bg-red-100 px-1 text-xs text-red-800">{overdue}!</span>}
           </div>
         </button>;
       })}
     </div>
   </div>
   <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-2">
     <h2 className="text-lg font-bold">{fmtLong(day)} · {selected.length} darbai</h2>
     {day===today&&<Pill tone="warning">Vėluojantys perkelti į šiandieną</Pill>}
   </div>
   <div className="space-y-2">{selected.length?selected.map(j=><JobRow key={j.id} job={j} showDate/>):
     <div className="card-surface p-7 text-center text-sm text-muted-foreground">Šiai dienai darbų nėra.</div>}</div>
   <JobFormDialog open={create} onOpenChange={setCreate} defaultDate={day}/>
   {printing&&chosen&&mode!=="diena"&&<EmployeeSchedulePrint
      person={chosen} jobs={filteredJobs} addresses={addresses} range={range}/>}
 </div>;
}
