import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store";
import { JobFormDialog } from "@/components/app/forms";
import { JobRow } from "@/components/app/JobRow";
import { PageHeader, Pill } from "@/components/app/ui-bits";
import { addDays, fmtLong, fmtMonth, fmtShort, fmtWeekdayShort, parseISO, startOfWeek, todayISO } from "@/lib/dates";
import { jobsForDay, sortJobs } from "@/lib/scheduling";
export const Route=createFileRoute("/kalendorius")({component:CalendarView});
type Mode="diena"|"savaite"|"menuo";
function CalendarView(){
 const {jobs}=useAppState();const today=todayISO();
 const [day,setDay]=useState(today),[mode,setMode]=useState<Mode>("savaite"),[create,setCreate]=useState(false);
 const start=startOfWeek(day);
 const first=useMemo(()=>{
  if(mode==="diena")return day;
  if(mode==="savaite")return start;
  const month=day.slice(0,7)+"-01";return startOfWeek(month);
 },[day,mode,start]);
 const count=mode==="diena"?1:mode==="savaite"?7:42;
 const cells=Array.from({length:count},(_,i)=>addDays(first,i));
 const selected=sortJobs(jobsForDay(jobs,day,today),today);
 const shift=(n:number)=>{
  if(mode==="diena")setDay(addDays(day,n));
  else if(mode==="savaite")setDay(addDays(day,7*n));
  else{const d=parseISO(day);d.setMonth(d.getMonth()+n);setDay([d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"));}
 };
 return <div>
  <PageHeader title="Kalendorius" subtitle="Dienos, savaitės ir mėnesio valymo grafikas" actions={<Button onClick={()=>setCreate(true)}><Plus/> Pridėti darbą</Button>}/>
  <div className="card-surface p-4">
   <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Ankstesnis laikotarpis" onClick={()=>shift(-1)}><ChevronLeft/></Button><Button variant="outline" size="icon" aria-label="Kitas laikotarpis" onClick={()=>shift(1)}><ChevronRight/></Button><div className="font-bold">{mode==="menuo"?fmtMonth(day):fmtLong(day)}</div></div>
    <div className="flex gap-1 rounded-lg bg-muted p-1">{(["diena","savaite","menuo"] as Mode[]).map(m=><button key={m} onClick={()=>setMode(m)} className={"rounded-md px-3 py-2 text-sm font-medium "+(mode===m?"bg-card shadow":"text-muted-foreground")}>{m==="diena"?"Diena":m==="savaite"?"Savaitė":"Mėnuo"}</button>)}<button onClick={()=>setDay(today)} className="rounded-md px-3 text-sm text-primary">Šiandien</button></div>
   </div>
   <div className={"grid gap-1 "+(mode==="diena"?"grid-cols-1":"grid-cols-7")}>
    {mode!=="diena"&&["Pr","An","Tr","Kt","Pn","Št","Sk"].map(d=><div className="py-1 text-center text-xs text-muted-foreground" key={d}>{d}</div>)}
    {cells.map(d=>{
      const list=jobsForDay(jobs,d,today),overdue=d===today?jobs.filter(j=>j.status==="laukia"&&j.date<today).length:0;
      return <button key={d} onClick={()=>setDay(d)} className={"relative min-h-16 rounded-lg border p-2 text-left transition-colors hover:border-primary/40 "+(day===d?"border-primary bg-primary/10":"border-border bg-card")+(mode==="menuo"&&d.slice(0,7)!==day.slice(0,7)?" opacity-40":"")}>
       <span className="text-xs font-bold">{mode==="diena"?fmtLong(d):parseISO(d).getDate()}</span>
       <div className="mt-1 flex flex-wrap gap-1">{list.length>0&&<span className="rounded bg-primary/10 px-1 text-xs text-primary">{list.length}</span>}{overdue>0&&<span className="rounded bg-red-100 px-1 text-xs text-red-800">{overdue}!</span>}</div>
      </button>;
    })}
   </div>
  </div>
  <div className="mt-6 mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{fmtLong(day)} · {selected.length} darbai</h2>{day===today&&<Pill tone="warning">Vėluojantys perkelti į šiandieną</Pill>}</div>
  <div className="space-y-2">{selected.length?selected.map(j=><JobRow key={j.id} job={j} showDate/>):<div className="card-surface p-7 text-center text-sm text-muted-foreground">Šiai dienai darbų nėra.</div>}</div>
  <JobFormDialog open={create} onOpenChange={setCreate} defaultDate={day}/>
 </div>;
}