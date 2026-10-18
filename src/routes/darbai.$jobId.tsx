import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, MapPin, CheckCircle2, RotateCcw, Pencil, Trash2,
  Save, ShieldCheck, AlertCircle, Clock, Camera, MessageSquare, Star
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { JobFormDialog } from "@/components/app/forms";
import { AccessCode, Confirm, EmptyState, PageHeader, Pill, textareaCls } from "@/components/app/ui-bits";
import { PhotoUploader, PhotoGrid } from "@/components/app/Photos";
import { MapsLink } from "@/components/app/MapsLink";
import { useAppState, setJobStatus, addComment, setInspection, deleteJob } from "@/lib/store";
import { JOB_TYPE_LABEL } from "@/lib/types";
import { fmtLong, fmtDateTime, todayISO, overdueLabel } from "@/lib/dates";

export const Route = createFileRoute("/darbai/$jobId")({ component: JobDetail });

function JobDetail() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const { jobs, addresses, photos } = useAppState();
  const [draft, setDraft] = useState("");
  const [edit, setEdit] = useState(false);
  const [remove, setRemove] = useState(false);
  const [completeConfirm, setCompleteConfirm] = useState(false);
  const [fixConfirm, setFixConfirm] = useState(false);
  const job = jobs.find(j => j.id === jobId);

  if (!job) return <div className="space-y-5">
    <Link to="/darbai" className="text-sm text-primary underline">← Visi darbai</Link>
    <EmptyState title="Darbas nerastas" />
  </div>;

  const address = addresses.find(a => a.id === job.addressId);
  const related = photos.filter(p => p.jobId === job.id);
  const done = job.status === "atlikta";

  const saveNote = () => {
    if (!draft.trim()) {
      toast.info("Naujų pastabų nėra. Nuotraukos išsaugomos iškart po įkėlimo.");
      return;
    }
    addComment(job.id, draft.trim());
    setDraft("");
    toast.success("Pastaba išsaugota");
  };

  const finish = () => {
    // Save an unsent note as part of a single deliberate completion action.
    if (draft.trim()) {
      addComment(job.id, draft.trim());
      setDraft("");
    }
    setJobStatus(job.id, "atlikta");
    toast.success("Darbas užbaigtas ir perkeltas į atliktų darbų sąrašo apačią");
    navigate({ to: "/darbai" });
  };

  return <div className="pb-8">
    <Link to="/darbai" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
      <ArrowLeft className="size-4" /> Atgal į visus darbus
    </Link>

    <PageHeader title={address?.street || "Darbas"}
      subtitle={JOB_TYPE_LABEL[job.type] + " · " + fmtLong(job.date)}
      actions={<>
        <Button variant="outline" onClick={() => setEdit(true)}><Pencil /> Redaguoti</Button>
        <Button variant="outline" onClick={() => setRemove(true)}><Trash2 /> Ištrinti</Button>
      </>}
    />

    <div className="mb-4 flex flex-wrap items-center gap-2">
      {address?.isPriority && <Pill tone="warning"><Star className="size-3"/> Prioritetinis objektas</Pill>}
      <Pill tone={done ? "success" : "warning"}>{done ? "Atlikta" : "Laukia atlikimo"}</Pill>
      {!done && job.date < todayISO() && <Pill tone="danger">{overdueLabel(job.date, todayISO())}</Pill>}
      <Pill>{job.worker || "Nepriskirta"}</Pill>
      {job.inspection && <Pill tone={job.inspection === "patikrinta" ? "success" : "danger"}>
        {job.inspection === "patikrinta" ? "Patikrinta" : "Reikia taisyti"}
      </Pill>}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card-surface space-y-4 p-5">
        <h2 className="text-lg font-semibold">Darbo informacija</h2>
        {address && <Link to="/adresai/$addressId" params={{ addressId: address.id }}
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <MapPin className="size-4" />{address.street}, {address.city} →
        </Link>}
        {address && <MapsLink street={address.street} city={address.city} />}
        {address && <div>
          <div className="mb-2 text-xs text-muted-foreground">Durų kodas (tik DEMO)</div>
          <AccessCode code={address.accessCode} />
        </div>}
        {address && <div><div className="text-xs text-muted-foreground">Laiptinių skaičius</div>
          <div className="font-medium">{address.entrances}</div></div>}
        <div><div className="text-xs text-muted-foreground">Valymo instrukcijos</div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{job.instructions || address?.instructions || "Instrukcijų nėra"}</p></div>
        <div><div className="text-xs text-muted-foreground">Atsakingas darbuotojas</div>
          <div className="font-medium">{job.worker || "Nepriskirta"}</div></div>
        {job.notes && <div><div className="text-xs text-muted-foreground">Papildomos instrukcijos / pastabos</div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{job.notes}</p></div>}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          <Clock className="size-4" />
          {done && job.completedAt ? "Užbaigta: " + fmtDateTime(job.completedAt) : "Suplanuota: " + fmtLong(job.date)}
        </div>
      </section>

      <section className="card-surface space-y-4 p-5">
        <h2 className="text-lg font-semibold">Darbo nuotraukos</h2>
        <p className="text-sm text-muted-foreground">Pasirinkite „Prieš“, „Po“ arba „Problema“ ir fotografuokite arba įkelkite iš galerijos.</p>
        {address && <PhotoUploader addressId={address.id} jobId={job.id} />}
        <PhotoGrid photos={related} empty="Kol kas nuotraukų nėra. Fotografuokite arba įkelkite pirmąją." />
      </section>
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <section className="card-surface space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><MessageSquare className="size-5 text-primary" /> Darbo pastabos</h2>
        <p className="text-sm text-muted-foreground">Pastabas galima išsaugoti net jei darbas dar neatliktas.</p>
        <label htmlFor="job-note" className="text-sm font-medium">Nauja pastaba / pranešimas</label>
        <textarea id="job-note" className={textareaCls} value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Pvz., sugedusi spyna, papildomas valymas…" rows={4} />
        <Button variant="outline" onClick={saveNote} disabled={!draft.trim()}>
          <Save /> Išsaugoti pastabą
        </Button>
        {job.comments.length > 0 && <div className="space-y-2 border-t pt-3">
          <h3 className="text-sm font-semibold">Ankstesnės pastabos</h3>
          {[...job.comments].reverse().map(c => <div key={c.id} className="rounded-lg bg-muted p-3">
            <div className="mb-1 text-xs text-muted-foreground">{fmtDateTime(c.at)}</div>
            <p className="whitespace-pre-wrap text-sm">{c.text}</p>
          </div>)}
        </div>}
      </section>
      <section className="card-surface space-y-3 p-5">
        <h2 className="text-lg font-semibold">Vadovo patikrinimas</h2>
        <p className="text-sm text-muted-foreground">Darbo užbaigimas ir kokybės patikrinimas – atskiri veiksmai.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setInspection(job.id, "patikrinta"); toast.success("Patikrinimas įrašytas"); }}>
            <ShieldCheck /> Patikrinta
          </Button>
          <Button variant="outline" disabled={job.inspection === "taisyti"} onClick={() => setFixConfirm(true)}>
            <AlertCircle /> Reikia taisyti
          </Button>
        </div>
        <h3 className="border-t pt-3 text-sm font-semibold">Veiksmų istorija</h3>
        <div className="space-y-2">
          {[...job.history].reverse().map((h, i) => <div className="border-l-2 border-primary/20 pl-3 text-sm" key={i}>
            <div className="text-xs text-muted-foreground">{fmtDateTime(h.at)}</div>{h.text}
          </div>)}
        </div>
      </section>
    </div>

    <div className="sticky bottom-20 z-10 mt-5 flex flex-col gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-3">
      <p className="text-xs text-muted-foreground">
        Nuotraukos išsaugomos iškart. „Išsaugoti“ neužbaigia darbo; lango uždarymas taip pat nekeičia būsenos.
      </p>
      <div className="flex shrink-0 gap-2">
        {done ? <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => {
          setJobStatus(job.id, "laukia"); toast.success("Darbas atidarytas iš naujo");
        }}><RotateCcw /> Atidaryti iš naujo</Button> : <>
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={saveNote}>
            <Save /> Išsaugoti
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={() => setCompleteConfirm(true)}>
            <CheckCircle2 /> Užbaigti darbą
          </Button>
        </>}
      </div>
    </div>

    <JobFormDialog open={edit} onOpenChange={setEdit} job={job} />
    <Confirm open={completeConfirm} onOpenChange={setCompleteConfirm}
      title="Užbaigti darbą?" text="Bus išsaugotos visos pridėtos nuotraukos ir pastaba (jei parašyta). Darbas bus perkeltas į atliktų darbų sąrašo apačią."
      confirmLabel="Užbaigti darbą" onConfirm={finish} />
    <Confirm open={remove} onOpenChange={setRemove}
      title="Ištrinti darbą?" text="Nuotraukos liks susietos su adresu."
      onConfirm={() => { deleteJob(job.id); toast.success("Darbas ištrintas"); navigate({ to: "/darbai" }); }} />
    <Confirm open={fixConfirm} onOpenChange={setFixConfirm}
      title="Sukurti taisymo darbą?" text="Bus pridėtas atskiras skubus darbas šiandienai."
      confirmLabel="Sukurti" onConfirm={() => { setInspection(job.id, "taisyti"); toast.success("Sukurtas taisymo darbas"); }} />
  </div>;
}
