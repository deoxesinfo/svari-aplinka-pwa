import { useRef, useState, type TouchEvent } from "react";
import { toast } from "sonner";
import { JobDetailDialog } from "./JobDetailDialog";
import { JobFormDialog } from "./forms";
import { Confirm,Pill } from "./ui-bits";
import { Check, Camera, MessageSquare, User, AlertTriangle, ChevronRight, Star, MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { archiveJob,restoreJob,deleteJob,useAppState } from "@/lib/store";
import { currentAdminOrg } from "@/lib/work-assignments";
import { isOverdue } from "@/lib/scheduling";
import { fmtShort, overdueLabel, todayISO } from "@/lib/dates";
import { JOB_TYPE_LABEL, type Job } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MapsLink } from "./MapsLink";

export function JobRow({ job, showDate }: { job: Job; showDate?: boolean }) {
  const { addresses, photos, people } = useAppState();
  const [detailsOpen,setDetailsOpen]=useState(false);
  const [editing,setEditing]=useState(false);
  const [actionsOpen,setActionsOpen]=useState(false);
  const [deleteOpen,setDeleteOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const touch=useRef<{x:number;y:number}|null>(null);
  const justSwiped=useRef(false);
  const today=todayISO();
  const address=addresses.find(a=>a.id===job.addressId);
  const done=job.status==="atlikta";
  const overdue=isOverdue(job,today);
  const count=photos.filter(p=>p.jobId===job.id).length;

  const startTouch=(e:TouchEvent<HTMLDivElement>)=>{
    const point=e.changedTouches[0];
    if(point)touch.current={x:point.clientX,y:point.clientY};
  };
  const endTouch=(e:TouchEvent<HTMLDivElement>)=>{
    const point=e.changedTouches[0],starting=touch.current;
    touch.current=null;
    if(!point||!starting)return;
    const dx=point.clientX-starting.x,dy=point.clientY-starting.y;
    if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.35){
      justSwiped.current=true;
      setActionsOpen(dx<0);
      window.setTimeout(()=>{justSwiped.current=false},250);
    }
  };
  const changeArchive=()=>{
    const ok=job.archivedAt?restoreJob(job.id):archiveJob(job.id);
    if(ok)toast.info(job.archivedAt?"Darbas grąžintas iš archyvo":"Darbas perkeltas į archyvą");
    else toast.error("Archyvuoti galima tik atliktus darbus");
    setActionsOpen(false);
  };
  const confirmDelete=async()=>{
    if(busy)return;
    setBusy(true);
    try{
      await currentAdminOrg();
      if(deleteJob(job.id))toast.info("Darbas pažymėtas ištrintu. Jo istorija saugoma.");
      else toast.error("Darbas jau pašalintas");
      setActionsOpen(false);
    }catch{toast.error("Šį veiksmą gali atlikti tik administratorius")}
    finally{setBusy(false)}
  };

  return <>
    <div className="relative overflow-hidden rounded-xl" onTouchStart={startTouch} onTouchEnd={endTouch}>
      <div className="absolute inset-y-0 right-0 flex w-[186px] items-stretch justify-end gap-px bg-muted/80 p-1">
        <button type="button" className="flex w-[61px] flex-col items-center justify-center gap-1 rounded-lg bg-card px-1 text-[11px] font-semibold text-primary disabled:opacity-40"
          disabled={!done&&!job.archivedAt} onClick={changeArchive} aria-label={job.archivedAt?"Atkurti darbą":"Archyvuoti atliktą darbą"}>
          {job.archivedAt?<ArchiveRestore className="size-5"/>:<Archive className="size-5"/>}
          {job.archivedAt?"Atkurti":"Archyvas"}
        </button>
        <button type="button" className="flex w-[61px] flex-col items-center justify-center gap-1 rounded-lg bg-card px-1 text-[11px] font-semibold text-primary"
          onClick={()=>{setEditing(true);setActionsOpen(false)}} aria-label="Redaguoti darbą">
          <Pencil className="size-5"/>Redaguoti
        </button>
        <button type="button" className="flex w-[61px] flex-col items-center justify-center gap-1 rounded-lg bg-destructive/10 px-1 text-[11px] font-semibold text-destructive"
          onClick={()=>{setDeleteOpen(true);setActionsOpen(false)}} aria-label="Ištrinti darbą (administratoriui)">
          <Trash2 className="size-5"/>Ištrinti
        </button>
      </div>
      <div className="relative min-w-0 bg-card transition-transform duration-200 ease-out"
        style={{transform:actionsOpen?"translateX(-186px)":"translateX(0)"}}>
        <button type="button" onClick={()=>{
          if(justSwiped.current){justSwiped.current=false;return}
          if(actionsOpen){setActionsOpen(false);return}
          setDetailsOpen(true);
        }} aria-label={"Atidaryti darbą: "+(address?.street??"Adresas ištrintas")}
          className={cn("card-surface group flex w-full items-start gap-3 p-3 pr-12 text-left transition-all hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-4 sm:pr-12",
            overdue&&"border-l-4 border-l-warning",done&&"bg-muted/30")}>
          <span aria-hidden="true" className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-2",
            done?"border-primary bg-primary text-primary-foreground":"border-input text-transparent")}>
            <Check className="size-4"/>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className={cn("break-words font-semibold text-foreground group-hover:text-primary",done&&"line-through decoration-muted-foreground/50")}>
                {address?.street??"Adresas ištrintas"}
              </span>
              <span className="text-sm text-muted-foreground">{address?.city}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Pill tone={job.type==="patikrinimas"?"neutral":"primary"}>{JOB_TYPE_LABEL[job.type]}</Pill>
              {overdue&&<Pill tone="warning"><AlertTriangle className="size-3"/>{overdueLabel(job.date,today)} · {fmtShort(job.date)}</Pill>}
              {showDate&&!overdue&&<Pill>{fmtShort(job.date)}</Pill>}
              {address?.isPriority&&<Pill tone="warning"><Star className="size-3"/>Prioritetinis objektas</Pill>}
              {job.priority==="auksta"&&!done&&<Pill tone="danger">Skubu</Pill>}
              {job.inspection==="patikrinta"&&<Pill tone="success">Patikrinta</Pill>}
              {job.inspection==="taisyti"&&<Pill tone="danger">Reikia taisyti</Pill>}
              {job.parentJobId&&<Pill tone="danger">Taisymas</Pill>}
              {job.archivedAt&&<Pill>Archyvuota</Pill>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><User className="size-3.5"/>{job.worker||"Nepriskirta"}</span>
              {job.managerId&&<span className="inline-flex items-center gap-1 text-primary"><User className="size-3.5"/>Vadyba: {people.find(p=>p.id===job.managerId)?.name||"Nežinoma"}</span>}
              <span className="inline-flex items-center gap-1"><Camera className="size-3.5"/>{count}/15</span>
              <span className="inline-flex items-center gap-1"><MessageSquare className="size-3.5"/>{job.comments.length}</span>
              {done&&<span className="inline-flex items-center gap-1 text-primary"><Check className="size-3.5"/>Atlikta</span>}
            </div>
          </div>
          <ChevronRight aria-hidden="true" className="mt-2 size-5 shrink-0 text-muted-foreground"/>
        </button>
        <button type="button" aria-label={actionsOpen?"Uždaryti darbo veiksmus":"Rodyti darbo veiksmus"} aria-expanded={actionsOpen}
          className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted/70"
          onClick={()=>setActionsOpen(v=>!v)}><MoreHorizontal className="size-5"/></button>
      </div>
    </div>
    {address&&<div className="-mt-1 mb-2 flex justify-end"><MapsLink street={address.street} city={address.city} compact/></div>}
    {detailsOpen&&<JobDetailDialog jobId={job.id} open={detailsOpen} onOpenChange={setDetailsOpen}/>}
    {editing&&<JobFormDialog job={job} open={editing} onOpenChange={setEditing}/>}
    <Confirm open={deleteOpen} onOpenChange={setDeleteOpen} title="Ištrinti darbą?"
      text="Tik administratoriui. Darbas bus paslėptas iš aktyvių sąrašų, tačiau istorija išsaugota auditui. Tai nėra fizinis duomenų ištrynimas."
      onConfirm={()=>void confirmDelete()}/>
  </>;
}
