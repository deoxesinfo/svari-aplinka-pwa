import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store";
import { jobsForDay, sortJobs, summarize } from "@/lib/scheduling";
import { fmtLong, todayISO } from "@/lib/dates";
import { JobRow } from "@/components/app/JobRow";
import { JobFormDialog } from "@/components/app/forms";
import { EmptyState, PageHeader, Stat } from "@/components/app/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Apžvalga · Švari Aplinka" },
      { name: "description", content: "Šiandienos valymo darbų apžvalga (demo)." },
      { property: "og:title", content: "Apžvalga · Švari Aplinka" },
      { property: "og:description", content: "Šiandienos valymo darbų apžvalga (demo)." },
    ],
  }),
  component: Dashboard,
});

const TABS = [
  { k: "all", l: "Visi" },
  { k: "laiptine", l: "Laiptinių valymas" },
  { k: "teritorija", l: "Teritorijų valymas" },
] as const;

function Dashboard() {
  const { jobs } = useAppState();
  const today = todayISO();
  const [tab, setTab] = useState<(typeof TABS)[number]["k"]>("all");
  const [open, setOpen] = useState(false);
  const todays = useMemo(() => jobsForDay(jobs, today, today), [jobs, today]);
  const filtered = sortJobs(tab === "all" ? todays : todays.filter((j) => j.type === tab), today);
  const s = summarize(todays, today);
  const pct = s.all ? Math.round((s.done / s.all) * 100) : 0;

  return (
    <div>
      <PageHeader title="Apžvalga" subtitle={fmtLong(today)}
        actions={<Button onClick={() => setOpen(true)}><Plus /> Naujas darbas</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Visi šiandien" value={s.all} />
        <Stat label="Atlikti" value={s.done} tone="success" />
        <Stat label="Laukia" value={s.pending} />
        <Stat label="Vėluojantys" value={s.overdue} tone="warning" />
      </div>
      <div className="card-surface mt-3 p-4">
        <div className="mb-2 flex justify-between text-sm"><span className="font-medium">Dienos progresas</span><span className="text-muted-foreground">{s.done}/{s.all} · {pct}%</span></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-6 mb-3 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1" role="tablist">
        {TABS.map((t) => (
          <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)}
            className={cn("flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium", tab === t.k ? "bg-card shadow-sm" : "text-muted-foreground")}>
            {t.l}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.length ? filtered.map((j) => <JobRow key={j.id} job={j} />) : (
          <EmptyState icon={<ClipboardList className="size-8" />} title="Šiandien darbų nėra" text="Sukurkite naują darbą arba pasirinkite kitą filtrą." />
        )}
      </div>
      <JobFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}