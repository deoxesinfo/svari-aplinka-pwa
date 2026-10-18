import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, MapPin, CheckCircle2, RotateCcw, Pencil, Trash2, Send, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { JobFormDialog } from "@/components/app/forms";
import { AccessCode, Confirm, EmptyState, PageHeader, Pill, textareaCls } from "@/components/app/ui-bits";
import { PhotoUploader, PhotoGrid } from "@/components/app/Photos";
import { useAppState, setJobStatus, addComment, setInspection, deleteJob } from "@/lib/store";
import { JOB_TYPE_LABEL } from "@/lib/types";
import { fmtLong, fmtDateTime, todayISO, overdueLabel } from "@/lib/dates";
export const Route=createFileRoute("/darbai/$jobId")({component:JobDetail});
function JobDetail(){
  const {jobId}=Route.useParams(),navigate=useNavigate();
  const {jobs,addresses,photos}=useAppState();
  const [comment,setComment]=useState(""),[edit,setEdit]=useState(false),[remove,setRemove]=useState(false),[fix,setFix]=useState(false),[fixNote,setFixNote]=useState("");
  const job=jobs.find(j=>j.id===jobId);
  if(!job)return <div><Link to="/darbai" className="text-primary underline">← Visi darbai</Link><EmptyState title="Darbas nerastas"/></div>;
  const a=addresses.find(x=>x.id===job.addressId);
  const related=photos.filter(p=>p.jobId===job.id);
  const done=job.status==="atlikta";
  return <div>
    <Link to="/darbai" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4"/> Visi darbai</Link>
    <PageHeader title={a?.street||"Darbas"} subtitle={JOB_TYPE_LABEL[job.type]+" · "+fmtLong(job.date)} actions={<><Button variant="outline" onClick={()=>setEdit(true)}><Pencil/> Redaguoti</Button><Button variant="outline" onClick={()=>setRemove(true)}><Trash2/> Ištrinti</Button></>}/>
    <div className="mb-4 flex flex-wrap items-center gap-2"><Pill tone={done?"success":"warning"}>{done?"Atlikta":"Laukia"}</Pill>{!done&&job.date<todayISO()&&<Pill tone="danger">{overdueLabel(job.date,todayISO())}</Pill>}<Pill>{job.worker}</Pill>{job.inspection&&<Pill tone={job.inspection==="patikrinta"?"success":"danger"}>{job.inspection==="patikrinta"?"Patikrinta":"Reikia taisyti"}</Pill>}</div>
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <section className="card-surface space-y-4 p-5">
        <h2 className="text-lg font-semibold">Darbo informacija</h2>
        {a&&<Link to="/adresai/$addressId" params={{addressId:a.id}} className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><MapPin className="size-4"/>{a.street}, {a.city} →</Link>}
        {a&&<div><div className="mb-2 text-xs text-muted-foreground">Durų kodas – DEMO</div><AccessCode code={a.accessCode}/></div>}
        <div><div className="text-xs text-muted-foreground">Instrukcijos</div><p className="mt-1 whitespace-pre-wrap text-sm">{job.instructions||a?.instructions||"Instrukcijų nėra"}</p></div>
        <div><div className="text-xs text-muted-foreground">Darbuotojas</div><div className="font-medium">{job.worker}</div></div>
        {job.notes&&<div><div className="text-xs text-muted-foreground">Pastabos</div><p className="whitespace-pre-wrap text-sm">{job.notes}</p></div>}
        <Button size="lg" className="h-12 w-full" onClick={()=>{setJobStatus(job.id,done?"laukia":"atlikta");toast.success(done?"Darbas atidarytas iš naujo":"Darbas užbaigtas")}}>{done?<><RotateCcw/> Atidaryti iš naujo</>:<><CheckCircle2/> Užbaigti darbą</>}</Button>
      </section>
      <section className="card-surface space-y-4 p-5"><h2 className="text-lg font-semibold">Darbo nuotraukos · {related.length}</h2>{a&&<PhotoUploader addressId={a.id} jobId={job.id}/>}<PhotoGrid photos={related} empty="Nuotraukos dar nepridėtos."/></section>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
      <section className="card-surface space-y-3 p-5"><h2 className="text-lg font-semibold">Pastabos ir pranešimai</h2><textarea className={textareaCls} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Parašykite pastabą apie atliktą darbą…"/><Button disabled={!comment.trim()} onClick={()=>{addComment(job.id,comment.trim());setComment("");toast.success("Pastaba išsaugota")}}><Send/> Pridėti pastabą</Button><div className="space-y-2">{[...job.comments].reverse().map(c=><div className="rounded-lg bg-muted p-3" key={c.id}><div className="text-xs text-muted-foreground">{fmtDateTime(c.at)}</div><p className="mt-1 whitespace-pre-wrap text-sm">{c.text}</p></div>)}</div></section>
      <section className="card-surface space-y-3 p-5"><h2 className="text-lg font-semibold">Vadovo patikrinimas</h2><p className="text-sm text-muted-foreground">Darbo užbaigimas ir patikrinimas yra atskiri veiksmai.</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>{setInspection(job.id,"patikrinta");toast.success("Patikrinimas įrašytas")}}><ShieldCheck/> Patikrinta</Button><Button variant="outline" disabled={job.inspection==="taisyti"} onClick={()=>setFix(true)}><AlertCircle/> Reikia taisyti</Button></div><h3 className="pt-2 text-sm font-semibold">Veiksmų istorija</h3><div className="space-y-2">{[...job.history].reverse().map((h,i)=><div className="border-l-2 border-primary/20 pl-3 text-sm" key={i}><div className="text-xs text-muted-foreground">{fmtDateTime(h.at)}</div>{h.text}</div>)}</div></section>
    </div>
    <JobFormDialog open={edit} onOpenChange={setEdit} job={job}/>
    <Confirm open={remove} onOpenChange={setRemove} title="Ištrinti darbą?" text="Nuotraukos liks susietos su adresu." onConfirm={()=>{deleteJob(job.id);toast.success("Darbas ištrintas");navigate({to:"/darbai"})}}/>
    <Confirm open={fix} onOpenChange={setFix} title="Sukurti taisymo darbą?" text="Bus pridėtas atskiras skubus darbas šiandienai." confirmLabel="Sukurti" onConfirm={()=>{setInspection(job.id,"taisyti",fixNote);setFixNote("");toast.success("Sukurtas taisymo darbas")}}/>
  </div>;
}