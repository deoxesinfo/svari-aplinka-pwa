import { Link } from "@tanstack/react-router";
import { Check, Camera, MessageSquare, RotateCcw, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { setJobStatus, useAppState } from "@/lib/store";
import { isOverdue } from "@/lib/scheduling";
import { fmtShort, overdueLabel, todayISO } from "@/lib/dates";
import { JOB_TYPE_LABEL, type Job } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Pill } from "./ui-bits";

export function JobRow({ job, showDate }: { job: Job; showDate?: boolean }) {
  const { addresses, photos } = useAppState();
  const today = todayISO();
  const adr = addresses.find((a) => a.id === job.addressId);
  const done = job.status === "atlikta";
  const overdue = isOverdue(job, today);
  const photoCount = photos.filter((p) => p.jobId === job.id).length;

  const toggle = () => {
    setJobStatus(job.id, done ? "laukia" : "atlikta");
    toast.success(done ? "Darbas atidarytas iš naujo" : "Darbas pažymėtas kaip atliktas");
  };

  return (
    <div
      className={cn(
        "card-surface flex items-start gap-3 p-3 sm:p-4",
        overdue && "border-l-4 border-l-warning",
        done && "opacity-70",
      )}
    >
      <button
        onClick={toggle}
        aria-label={done ? "Atidaryti iš naujo" : "Pažymėti atliktu"}
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors",
          done ? "border-primary bg-primary text-primary-foreground" : "border-input hover:border-primary hover:text-primary text-transparent",
        )}
      >
        {done ? <Check className="size-4" /> : <Check className="size-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            to="/darbai/$jobId"
            params={{ jobId: job.id }}
            className={cn("font-semibold hover:text-primary hover:underline", done && "line-through decoration-muted-foreground/50")}
          >
            {adr ? adr.street : "Adresas ištrintas"}
          </Link>
          {adr && (
            <Link to="/adresai/$addressId" params={{ addressId: adr.id }} className="text-sm text-muted-foreground hover:underline">
              {adr.city}
            </Link>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Pill tone={job.type === "patikrinimas" ? "neutral" : "primary"}>{JOB_TYPE_LABEL[job.type]}</Pill>
          {overdue && (
            <Pill tone="warning">
              <AlertTriangle className="size-3" /> {overdueLabel(job.date, today)} · {fmtShort(job.date)}
            </Pill>
          )}
          {showDate && !overdue && <Pill>{fmtShort(job.date)}</Pill>}
          {job.priority === "auksta" && !done && <Pill tone="danger">Skubu</Pill>}
          {job.inspection === "patikrinta" && <Pill tone="success">Patikrinta</Pill>}
          {job.inspection === "taisyti" && <Pill tone="danger">Reikia taisyti</Pill>}
          {job.parentJobId && <Pill tone="danger">Taisymas</Pill>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><User className="size-3.5" />{job.worker || "Nepriskirta"}</span>
          <span className="inline-flex items-center gap-1"><Camera className="size-3.5" />{photoCount}</span>
          <span className="inline-flex items-center gap-1"><MessageSquare className="size-3.5" />{job.comments.length}</span>
          {done && <span className="inline-flex items-center gap-1 text-primary"><Check className="size-3.5" />Atlikta</span>}
        </div>
      </div>
      {done && (
        <button onClick={toggle} className="hidden rounded-md p-2 text-muted-foreground hover:bg-muted sm:block" aria-label="Atidaryti iš naujo" title="Atidaryti iš naujo">
          <RotateCcw className="size-4" />
        </button>
      )}
    </div>
  );
}