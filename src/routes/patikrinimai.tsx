import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store";
import { JobRow } from "@/components/app/JobRow";
import { JobFormDialog } from "@/components/app/forms";
import { EmptyState, PageHeader, Pill } from "@/components/app/ui-bits";
import { sortJobs } from "@/lib/scheduling";
import { todayISO } from "@/lib/dates";
export const Route=createFileRoute("/patikrinimai")({component:Inspections});
function Inspections(){
 const {jobs}=useAppState();const [create,setCreate]=useState(false);
 const list=sortJobs(jobs.filter(j=>j.type==="patikrinimas"||j.inspection!==null),todayISO());
 return <div><PageHeader title="Patikrinimai" subtitle="Darbų kokybės vertinimas ir papildomos patikros" actions={<Button onClick={()=>setCreate(true)}><Plus/> Naujas patikrinimas</Button>}/>
 <div className="mb-4 flex flex-wrap gap-2"><Pill tone="success">{jobs.filter(j=>j.inspection==="patikrinta").length} patikrinta</Pill><Pill tone="danger">{jobs.filter(j=>j.inspection==="taisyti").length} reikia taisyti</Pill></div>
 <div className="space-y-2">{list.length?list.map(j=><JobRow key={j.id} job={j} showDate/>):<EmptyState icon={<ClipboardCheck className="size-8"/>} title="Patikrinimų dar nėra" text="Atidarykite darbą ir pasirinkite „Patikrinta“ arba „Reikia taisyti“."/ >}</div>
 <JobFormDialog open={create} onOpenChange={setCreate} defaultType="patikrinimas"/>
 </div>;
}