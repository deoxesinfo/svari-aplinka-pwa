import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store";
import { sortJobs } from "@/lib/scheduling";
import { todayISO } from "@/lib/dates";
import { JOB_TYPE_LABEL } from "@/lib/types";
import { JobRow } from "@/components/app/JobRow";
import { JobFormDialog } from "@/components/app/forms";
import { EmptyState, PageHeader, inputCls } from "@/components/app/ui-bits";

export const Route = createFileRoute("/darbai")({
  head: () => ({ meta: [{ title: "Darbai · Švari Aplinka" }, { name: "description", content: "Visi valymo darbai." }, { property: "og:title", content: "Darbai · Švari Aplinka" }, { property: "og:description", content: "Visi valymo darbai." }] }),
  component: Jobs,
});

function Jobs() {
  const { jobs, addresses } = useAppState();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [showArchive,setShowArchive]=useState(false);
  const today = todayISO();
  const list = (showArchive
    ? [...jobs.filter(j=>j.archivedAt&&!j.deletedAt)].sort((a,b)=>(b.archivedAt||"").localeCompare(a.archivedAt||""))
    : sortJobs(jobs.filter((j) => {
    const a = addresses.find((x) => x.id === j.addressId);
    const hay = `${a?.street} ${a?.city} ${j.worker}`.toLowerCase();
    return hay.includes(q.toLowerCase()) && (!type || j.type === type) && (!status || j.status === status);
  }), today)).filter(j=>{
    const a=addresses.find(x=>x.id===j.addressId);
    const hay=[a?.street,a?.city,j.worker].join(" ").toLowerCase();
    return !showArchive||(hay.includes(q.toLowerCase())&&(!type||j.type===type)&&(!status||j.status===status));
  });
  return (
    <div>
      <PageHeader title="Darbai" subtitle={`Aktyvių: ${jobs.filter(j=>!j.archivedAt&&!j.deletedAt).length} · Archyve: ${jobs.filter(j=>j.archivedAt&&!j.deletedAt).length}`} actions={<Button onClick={() => setOpen(true)}><Plus /> Naujas darbas</Button>} />
      <div className="mb-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={showArchive?"outline":"default"} onClick={()=>setShowArchive(false)}>Aktyvūs darbai</Button>
        <Button type="button" size="sm" variant={showArchive?"default":"outline"} onClick={()=>setShowArchive(true)}>Archyvas</Button>
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
        <input className={inputCls} placeholder="Ieškoti pagal adresą ar darbuotoją…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Paieška" />
        <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipas">
          <option value="">Visi tipai</option>
          {Object.entries(JOB_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Būsena">
          <option value="">Visos būsenos</option><option value="laukia">Laukia</option><option value="atlikta">Atlikta</option>
        </select>
      </div>
      <div className="space-y-2">
        {list.length ? list.map((j) => <JobRow key={j.id} job={j} showDate />) : <EmptyState icon={<ClipboardList className="size-8" />} title="Darbų nerasta" />}
      </div>
      <JobFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}