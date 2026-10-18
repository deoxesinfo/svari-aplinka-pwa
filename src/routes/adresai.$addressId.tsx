import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, MapPin, Pencil, Trash2, ClipboardList, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AddressFormDialog, JobFormDialog } from "@/components/app/forms";
import { WorkAssignmentDialog } from "@/components/app/WorkAssignmentDialog";
import { AssignedSchedules } from "@/components/app/AssignedSchedules";
import { AccessCode, Confirm, EmptyState, PageHeader, Pill } from "@/components/app/ui-bits";
import { PhotoUploader, PhotoGrid } from "@/components/app/Photos";
import { MapsLink, MapPinLink } from "@/components/app/MapsLink";
import { JobRow } from "@/components/app/JobRow";
import { useAppState, deleteAddress } from "@/lib/store";
import { currentAdminOrg } from "@/lib/work-assignments";
import { ADDRESS_TYPE_LABEL } from "@/lib/types";
import { sortJobs } from "@/lib/scheduling";
import { todayISO } from "@/lib/dates";
export const Route = createFileRoute("/adresai/$addressId")({component: AddressDetail});
function AddressDetail(){
  const {addressId}=Route.useParams();
  const navigate=useNavigate();
  const {addresses,jobs,photos}=useAppState();
  const [edit,setEdit]=useState(false),[newJob,setNewJob]=useState(false),[remove,setRemove]=useState(false);
  const [assign,setAssign]=useState(false),[assignmentRefresh,setAssignmentRefresh]=useState(0);
  const a=addresses.find(x=>x.id===addressId&&!x.deletedAt);
  if(!a)return <div className="space-y-4"><Link to="/adresai" className="text-primary underline">← Atgal į adresus</Link><EmptyState title="Adresas nerastas"/></div>;
  const related=sortJobs(jobs.filter(j=>j.addressId===a.id&&!j.archivedAt&&!j.deletedAt),todayISO());
  const pictures=photos.filter(p=>p.addressId===a.id);
  return <div>
    <Link to="/adresai" className="mb-4 inline-flex gap-2 items-center text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4"/> Visi adresai</Link>
    <PageHeader title={a.street} subtitle={<span className="inline-flex items-center gap-1"><MapPin className="size-4"/>{a.city} · {ADDRESS_TYPE_LABEL[a.type]} {a.isPriority&&<Pill tone="warning"><Star className="size-3"/> Prioritetinis objektas</Pill>}</span>} actions={<><div className="flex items-center gap-2"><MapPinLink street={a.street} city={a.city} latitude={a.latitude} longitude={a.longitude} confirmed={Boolean(a.gpsLocationConfirmed)}/><MapsLink street={a.street} city={a.city} latitude={a.latitude} longitude={a.longitude} confirmed={Boolean(a.gpsLocationConfirmed)}/></div><Button variant="outline" onClick={()=>setEdit(true)}><Pencil/> Redaguoti</Button><Button variant="outline" onClick={()=>setRemove(true)}><Trash2/> Ištrinti</Button></>}/>
    <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
      <section className="card-surface space-y-4 p-5"><h2 className="text-lg font-semibold">Objekto informacija</h2><div><div className="text-xs text-muted-foreground">Laiptinių skaičius</div><div className="font-semibold">{a.entrances}</div></div><div className="rounded-lg bg-muted/50 p-3"><div className="mb-1 text-xs font-medium text-muted-foreground">Valymo kartai per savaitę</div>
{a.type !== "teritorija" && <p className="text-sm">Laiptinės: <strong>{a.stairwellVisitsPerWeek != null ? a.stairwellVisitsPerWeek+" k." : "Nenurodyta"}</strong></p>}
{a.type !== "laiptine" && <p className="text-sm">Teritorija: <strong>{a.territoryVisitsPerWeek != null ? a.territoryVisitsPerWeek+" k." : "Nenurodyta"}</strong></p>}</div><div><div className="mb-2 text-xs text-muted-foreground">Durų kodas (tik demonstracinis)</div><AccessCode code={a.accessCode}/></div><div><div className="text-xs text-muted-foreground">Valymo instrukcijos</div><p className="mt-1 whitespace-pre-wrap text-sm">{a.instructions||"Instrukcijų dar nėra."}</p></div><div><div className="text-xs text-muted-foreground">Objekto pastabos</div><p className="mt-1 whitespace-pre-wrap text-sm">{a.notes||"Pastabų nėra."}</p></div></section>
      <section className="card-surface space-y-4 p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Nuotraukų istorija</h2><Pill>{pictures.length} nuotr.</Pill></div><PhotoUploader addressId={a.id}/><PhotoGrid photos={pictures} empty="Šiam adresui nuotraukų dar neįkelta."/></section>
    </div>
    <AssignedSchedules addressId={a.id} refreshToken={assignmentRefresh}/>
    <section className="mt-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Darbų istorija</h2><div className="flex flex-wrap gap-2">{!a.archivedAt&&<><Button onClick={()=>setAssign(true)}><Plus/> Sukurti darbą</Button><Button variant="outline" onClick={()=>setNewJob(true)}>Vienas darbas (sena forma)</Button></>}</div></div><div className="space-y-2">{related.length?related.map(j=><JobRow key={j.id} job={j} showDate/>):<EmptyState icon={<ClipboardList className="size-8"/>} title="Šiam adresui darbų dar nėra"/>}</div></section>
    <WorkAssignmentDialog address={a} open={assign} onOpenChange={setAssign} onSaved={()=>setAssignmentRefresh(x=>x+1)}/>
    <AddressFormDialog open={edit} onOpenChange={setEdit} address={a}/><JobFormDialog open={newJob} onOpenChange={setNewJob} defaultAddressId={a.id}/>
    <Confirm open={remove} onOpenChange={setRemove} title="Ištrinti visą objektą?" text="Tik administratoriui. Objektas bus paslėptas, tačiau jo darbai, grafikai, istorija ir nuotraukos liks išsaugoti. Būsimų darbų kūrimas bus sustabdytas." onConfirm={()=>{void currentAdminOrg().then(()=>{if(deleteAddress(a.id)){toast.info("Adresas pažymėtas ištrintu");navigate({to:"/adresai"})}}).catch(()=>toast.error("Tik administratorius gali ištrinti adresą"));}}/>
  </div>;
}