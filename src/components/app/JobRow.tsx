import { useState } from "react";
import { JobDetailDialog } from "./JobDetailDialog";
import { Check, Camera, MessageSquare, User, AlertTriangle, ChevronRight } from "lucide-react";
import { useAppState } from "@/lib/store";
import { isOverdue } from "@/lib/scheduling";
import { fmtShort, overdueLabel, todayISO } from "@/lib/dates";
import { JOB_TYPE_LABEL, type Job } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Pill } from "./ui-bits";

export function JobRow({ job, showDate }: { job: Job; showDate?: boolean }) {
  const { addresses, photos } = useAppState();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const today = todayISO();
  const address = addresses.find(a => a.id === job.addressId);
  const done = job.status === "atlikta";
  const overdue = isOverdue(job, today);
  const count = photos.filter(p => p.jobId === job.id).length;

  // Entire card is one accessible link. A completed state can only be changed
  // on the detail page, so mobile taps cannot accidentally finish a job.
  return (
    <>
    <button
      type="button"
      onClick={() => setDetailsOpen(true)}
      aria-label={"Atidaryti darbą: " + (address?.street ?? "Adresas ištrintas")}
      className={cn(
        "card-surface group flex w-full items-start gap-3 p-3 text-left transition-all hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-4",
        overdue && "border-l-4 border-l-warning",
        done && "bg-muted/30",
      )}
    >
      <span aria-hidden="true" className={cn(
        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-2",
        done ? "border-primary bg-primary text-primary-foreground" : "border-input text-transparent",
      )}>
        <Check className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={cn("font-semibold text-foreground group-hover:text-primary", done && "line-through decoration-muted-foreground/50")}>
            {address?.street ?? "Adresas ištrintas"}
          </span>
          <span className="text-sm text-muted-foreground">{address?.city}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Pill tone={job.type === "patikrinimas" ? "neutral" : "primary"}>{JOB_TYPE_LABEL[job.type]}</Pill>
          {overdue && <Pill tone="warning"><AlertTriangle className="size-3" /> {overdueLabel(job.date, today)} · {fmtShort(job.date)}</Pill>}
          {showDate && !overdue && <Pill>{fmtShort(job.date)}</Pill>}
          {job.priority === "auksta" && !done && <Pill tone="danger">Skubu</Pill>}
          {job.inspection === "patikrinta" && <Pill tone="success">Patikrinta</Pill>}
          {job.inspection === "taisyti" && <Pill tone="danger">Reikia taisyti</Pill>}
          {job.parentJobId && <Pill tone="danger">Taisymas</Pill>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><User className="size-3.5" />{job.worker || "Nepriskirta"}</span>
          <span className="inline-flex items-center gap-1"><Camera className="size-3.5" />{count}/12</span>
          <span className="inline-flex items-center gap-1"><MessageSquare className="size-3.5" />{job.comments.length}</span>
          {done && <span className="inline-flex items-center gap-1 text-primary"><Check className="size-3.5" />Atlikta</span>}
        </div>
      </div>
      <ChevronRight aria-hidden="true" className="mt-2 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </button>
    {detailsOpen && <JobDetailDialog jobId={job.id} open={detailsOpen} onOpenChange={setDetailsOpen} />}
    </>
  );
}
