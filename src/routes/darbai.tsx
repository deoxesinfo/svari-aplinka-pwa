import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store";
import { sortJobs } from "@/lib/scheduling";
import { addDays, startOfWeek, todayISO } from "@/lib/dates";
import { JOB_TYPE_LABEL } from "@/lib/types";
import { JobRow } from "@/components/app/JobRow";
import { JobFormDialog } from "@/components/app/forms";
import { EmptyState, PageHeader, inputCls } from "@/components/app/ui-bits";

export const Route = createFileRoute("/darbai")({
  head: () => ({ meta: [{ title: "Darbai · Švari Aplinka" }, { name: "description", content: "Šiandienos, atlikti ir visi valymo darbai." }] }),
  component: Jobs,
});
type View = "today" | "done" | "all" | "archive";
type DateRange = "today" | "yesterday" | "week" | "custom" | "all";
export function finishedInRange(completedAt: string | undefined, range: DateRange, today: string, from: string, to: string): boolean {
  if (!completedAt) return range === "all";
  const iso = new Date(completedAt);
  if (Number.isNaN(iso.getTime())) return range === "all";
  const day = [iso.getFullYear(),String(iso.getMonth()+1).padStart(2,"0"),String(iso.getDate()).padStart(2,"0")].join("-");
  if (range === "today") return day === today;
  if (range === "yesterday") return day === addDays(today,-1);
  if (range === "week") return day >= startOfWeek(today) && day <= today;
  if (range === "custom") return (!from || day >= from) && (!to || day <= to);
  return true;
}
function Jobs() {
  const { jobs, addresses } = useAppState();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [view, setView] = useState<View>("today");
  const [doneRange, setDoneRange] = useState<DateRange>("today");
  const [from,setFrom] = useState("");
  const [to,setTo] = useState("");
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const active = jobs.filter(j => !j.archivedAt && !j.deletedAt);
  const pending = active.filter(j => j.status !== "atlikta" && j.date <= today);
  const done = active.filter(j => j.status === "atlikta");
  const tabs: {id:View; title:string; count:number}[] = [
    {id:"today",title:"Šiandien",count:pending.length},
    {id:"done",title:"Atlikti",count:done.length},
    {id:"all",title:"Visi darbai",count:active.length},
  ];
  const filtered = jobs.filter(j => {
    if (j.deletedAt) return false;
    if (view === "archive") { if(!j.archivedAt) return false; }
    else if (j.archivedAt) return false;
    if (view === "today" && !(j.status === "laukia" && j.date <= today)) return false;
    if (view === "done" && !(j.status === "atlikta" && finishedInRange(j.completedAt,doneRange,today,from,to))) return false;
    const a = addresses.find(x => x.id === j.addressId);
    const hay = [a?.street,a?.city,j.worker].join(" ").toLocaleLowerCase("lt");
    return hay.includes(q.toLocaleLowerCase("lt")) && (!type || j.type === type);
  });
  const list = view === "archive"
    ? filtered.sort((a,b)=>(b.archivedAt||"").localeCompare(a.archivedAt||""))
    : sortJobs(filtered,today);
  return <div>
    <PageHeader title="Darbai" subtitle={`Šiandien liko: ${pending.length} · Atlikta: ${done.length}`}
      actions={<Button onClick={() => setOpen(true)}><Plus /> Naujas darbas</Button>}/>
    <div className="mb-4 grid grid-cols-3 gap-2" role="tablist" aria-label="Darbų sąrašai">
      {tabs.map(t=><button key={t.id} type="button" role="tab" aria-selected={view===t.id}
        onClick={()=>setView(t.id)}
        className={`min-h-14 rounded-lg border px-1.5 py-2 text-center text-xs font-semibold sm:text-sm ${view===t.id?"border-primary bg-primary text-primary-foreground":"border-input bg-card text-foreground"}`}>
        <span className="block">{t.title}</span><span className="block text-xs font-normal opacity-85">{t.count}</span>
      </button>)}
    </div>
    {view==="done"&&<div className="mb-3 space-y-2">
      <label htmlFor="sa-completed-range" className="block text-sm font-medium">Užbaigimo data</label>
      <select id="sa-completed-range" className={inputCls} value={doneRange} onChange={e=>setDoneRange(e.target.value as DateRange)}>
        <option value="today">Šiandien</option><option value="yesterday">Vakar</option>
        <option value="week">Ši savaitė</option><option value="custom">Pasirinktos datos</option>
        <option value="all">Visi atlikti</option>
      </select>
      {doneRange==="custom"&&<div className="grid grid-cols-2 gap-2">
        <label className="text-xs">Nuo<input className={inputCls} type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label>
        <label className="text-xs">Iki<input className={inputCls} type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label>
      </div>}
    </div>}
    <div className="mb-4 grid gap-2 sm:grid-cols-[2fr_1fr]">
      <input className={inputCls} placeholder="Ieškoti pagal adresą ar darbuotoją…" value={q} onChange={e=>setQ(e.target.value)} aria-label="Paieška" />
      <select className={inputCls} value={type} onChange={e=>setType(e.target.value)} aria-label="Tipas">
        <option value="">Visi tipai</option>
        {Object.entries(JOB_TYPE_LABEL).map(([k,label]) => <option key={k} value={k}>{label}</option>)}
      </select>
    </div>
    <div className="space-y-2">
      {list.length ? list.map(j=><JobRow key={j.id} job={j} showDate/>)
       : <EmptyState icon={<ClipboardList className="size-8"/>}
           title={view==="today"?"Šiandien neatliktų darbų nėra":view==="done"?"Atliktų darbų pagal filtrą nėra":"Darbų nerasta"}/>}
    </div>
    <button type="button" className="mt-5 text-sm text-muted-foreground underline" onClick={()=>setView(view==="archive"?"all":"archive")}>
      {view==="archive"?"Grįžti į visus darbus":`Archyvas (${jobs.filter(j=>j.archivedAt&&!j.deletedAt).length})`}
    </button>
    <JobFormDialog open={open} onOpenChange={setOpen}/>
  </div>;
}
