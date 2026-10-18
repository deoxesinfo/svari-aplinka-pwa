import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft, Camera, CheckCircle2, Clock3, MapPin, MessageSquare,
  Pencil, RotateCcw, Save, ShieldCheck, AlertCircle, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { JobFormDialog } from "@/components/app/forms";
import { AccessCode, Confirm, Pill, textareaCls } from "@/components/app/ui-bits";
import { PhotoUploader, PhotoGrid } from "@/components/app/Photos";
import { useAppState, addComment, setJobStatus, setInspection, deleteJob } from "@/lib/store";
import { JOB_TYPE_LABEL, type Job } from "@/lib/types";
import { fmtDateTime, fmtLong, overdueLabel, todayISO } from "@/lib/dates";

type Props = { jobId: string; open: boolean; onOpenChange: (open: boolean) => void };

// This dialog deliberately does not navigate or reload the page. It works in a
// normal browser tab, iOS Safari/Chrome, Android, and when installed as a PWA.
export function JobDetailDialog({ jobId, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-screen h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-[min(92dvh,920px)] sm:max-w-4xl sm:rounded-2xl sm:border">
        <JobDialogContent jobId={jobId} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function JobDialogContent({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { jobs, addresses, photos } = useAppState();
  const job = jobs.find(j => j.id === jobId);
  const address = addresses.find(a => a.id === job?.addressId);
  const [draft, setDraft] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [fixOpen, setFixOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!job) {
    return <div className="p-5">
      <DialogTitle>Darbas nerastas</DialogTitle>
      <DialogDescription>Galbūt užduotis jau buvo ištrinta.</DialogDescription>
      <Button className="mt-5" onClick={onClose}>Grįžti</Button>
    </div>;
  }

  const related = photos.filter(p => p.jobId === job.id);
  const done = job.status === "atlikta";

  const save = () => {
    if (draft.trim()) {
      addComment(job.id, draft.trim());
      setDraft("");
      toast.success("Pastaba išsaugota šiame įrenginyje");
    } else {
      toast.info("Nuotraukos išsaugomos automatiškai; naujų pastabų nėra.");
    }
  };

  const complete = () => {
    if (draft.trim()) {
      addComment(job.id, draft.trim());
      setDraft("");
    }
    setJobStatus(job.id, "atlikta");
    toast.success("Darbas užbaigtas. Sąraše perkeltas į apačią.");
    onClose();
  };

  return <>
    <header className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-4 pr-12 sm:px-6">
      <button type="button" onClick={onClose} aria-label="Grįžti į darbų sąrašą"
        className="grid size-10 shrink-0 place-items-center rounded-lg hover:bg-muted">
        <ArrowLeft className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <DialogTitle className="truncate text-lg font-bold sm:text-xl">{address?.street ?? "Darbas"}</DialogTitle>
        <DialogDescription className="truncate text-xs sm:text-sm">
          {JOB_TYPE_LABEL[job.type]} · {address?.city ?? ""} · {fmtLong(job.date)}
        </DialogDescription>
      </div>
    </header>

    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-background p-4 pb-8 sm:p-6">
      <div className="flex flex-wrap gap-2">
        <Pill tone={done ? "success" : "warning"}>{done ? "Atlikta" : "Laukia atlikimo"}</Pill>
        {!done && job.date < todayISO() && <Pill tone="danger">{overdueLabel(job.date, todayISO())}</Pill>}
        <Pill>{job.worker || "Nepriskirta"}</Pill>
        {job.inspection === "patikrinta" && <Pill tone="success">Patikrinta</Pill>}
        {job.inspection === "taisyti" && <Pill tone="danger">Reikia taisyti</Pill>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-surface space-y-3 p-4 sm:p-5">
          <h3 className="text-base font-bold">Objekto informacija</h3>
          {address && <Link to="/adresai/$addressId" params={{ addressId: address.id }}
            onClick={onClose} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <MapPin className="size-4" />{address.street}, {address.city} →
          </Link>}
          {address && <div><p className="mb-1 text-xs text-muted-foreground">Patekimo kodas (tik DEMO)</p>
            <AccessCode code={address.accessCode} /></div>}
          <div><p className="text-xs text-muted-foreground">Laiptinių skaičius</p>
            <p className="font-medium">{address?.entrances ?? "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Valymo instrukcijos</p>
            <p className="whitespace-pre-wrap text-sm">{job.instructions || address?.instructions || "Instrukcijų nėra"}</p></div>
          <div><p className="text-xs text-muted-foreground">Atsakingas</p>
            <p className="font-medium">{job.worker || "Nepriskirta"}</p></div>
          {job.notes && <div><p className="text-xs text-muted-foreground">Papildoma informacija</p>
            <p className="whitespace-pre-wrap text-sm">{job.notes}</p></div>}
          <div className="inline-flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            <Clock3 className="size-4" />
            {done && job.completedAt ? "Užbaigta: " + fmtDateTime(job.completedAt) : "Suplanuota: " + fmtLong(job.date)}
          </div>
        </section>

        <section className="card-surface space-y-3 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-base font-bold"><Camera className="size-5 text-primary"/> Nuotraukos · {related.length}/12</h3>
          <p className="text-xs text-muted-foreground">Pasirinkite žymą „Prieš“, „Po“ arba „Problema“. Nuotraukos WebP formatu saugomos tik šio įrenginio naršyklėje.</p>
          {address && <PhotoUploader addressId={address.id} jobId={job.id} />}
          <PhotoGrid photos={related} empty="Nuotraukų dar nėra." />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-surface space-y-3 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-base font-bold"><MessageSquare className="size-5 text-primary" /> Pastabos apie darbą</h3>
          <label className="text-sm font-medium" htmlFor={"note-" + job.id}>Darbo komentaras</label>
          <textarea id={"note-" + job.id} className={textareaCls} rows={4} value={draft}
            onChange={e => setDraft(e.target.value)} placeholder="Įrašykite, ką reikia atlikti ar patikrinti…" />
          <Button variant="outline" disabled={!draft.trim()} onClick={save}><Save /> Išsaugoti pastabą</Button>
          <div className="space-y-2">{[...job.comments].reverse().map(c =>
            <div className="rounded-lg bg-muted p-3 text-sm" key={c.id}>
              <p className="mb-1 text-xs text-muted-foreground">{fmtDateTime(c.at)}</p>
              <p className="whitespace-pre-wrap">{c.text}</p>
            </div>
          )}</div>
        </section>

        <section className="card-surface space-y-3 p-4 sm:p-5">
          <h3 className="text-base font-bold">Patikrinimas ir istorija</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setInspection(job.id, "patikrinta"); toast.success("Darbas patikrintas"); }}>
              <ShieldCheck /> Patikrinta
            </Button>
            <Button variant="outline" disabled={job.inspection === "taisyti"} onClick={() => setFixOpen(true)}>
              <AlertCircle /> Reikia taisyti
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 border-b pb-3">
            <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}><Pencil /> Redaguoti darbą</Button>
            <Button size="sm" variant="ghost" onClick={() => setDeleteOpen(true)}><Trash2 /> Ištrinti</Button>
          </div>
          {[...job.history].reverse().map((h, i) =>
            <div className="border-l-2 border-primary/20 pl-3 text-sm" key={i}>
              <p className="text-xs text-muted-foreground">{fmtDateTime(h.at)}</p>{h.text}
            </div>
          )}
        </section>
      </div>
    </div>

    <footer className="z-10 flex shrink-0 flex-col gap-2 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <p className="hidden max-w-sm text-xs text-muted-foreground sm:block">
        Vien lango uždarymas neužbaigia darbo. Nuotraukos saugomos įkėlimo metu.
      </p>
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <Button variant="outline" className="min-h-11" onClick={save}><Save /> Išsaugoti</Button>
        {done
          ? <Button variant="outline" className="min-h-11" onClick={() => { setJobStatus(job.id, "laukia"); toast.success("Darbas atidarytas iš naujo"); }}>
              <RotateCcw /> Atidaryti iš naujo
            </Button>
          : <Button className="min-h-11" onClick={() => setFinishOpen(true)}>
              <CheckCircle2 /> Užbaigti
            </Button>}
      </div>
    </footer>

    <JobFormDialog open={editOpen} onOpenChange={setEditOpen} job={job} />
    <Confirm open={finishOpen} onOpenChange={setFinishOpen}
      title="Užbaigti darbą?" text="Darbas bus pažymėtas atliktu ir perkeltas į atliktų darbų sąrašo apačią. Jei yra neišsaugota pastaba, ji bus išsaugota."
      confirmLabel="Užbaigti darbą" onConfirm={complete} />
    <Confirm open={fixOpen} onOpenChange={setFixOpen} title="Sukurti taisymo darbą?"
      text="Bus sukurtas atskiras skubus darbas šiandienai." confirmLabel="Sukurti"
      onConfirm={() => { setInspection(job.id, "taisyti"); toast.success("Sukurtas taisymo darbas"); }} />
    <Confirm open={deleteOpen} onOpenChange={setDeleteOpen} title="Ištrinti darbą?"
      text="Darbas bus pašalintas iš naršyklės. Nuotraukos liks susietos su adresu."
      onConfirm={() => { deleteJob(job.id); toast.success("Darbas ištrintas"); onClose(); }} />
  </>;
}
