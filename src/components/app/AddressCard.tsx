import { useRef,useState,type TouchEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Archive,ArchiveRestore,MapPin,MoreHorizontal,Pencil,Plus,Star,Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "./ui-bits";
import { MapsLink,MapPinLink } from "./MapsLink";
import { ADDRESS_TYPE_LABEL,OBJECT_STATUS_LABEL,type Address } from "@/lib/types";

export function AddressCard({address:a,jobCount,photoCount,onAssign,onEdit,onRemove,onArchive}:{
 address:Address;jobCount:number;photoCount:number;
 onAssign:()=>void;onEdit:()=>void;onRemove:()=>void;onArchive:()=>void;
}){
 const [shown,setShown]=useState(false);
 const touch=useRef<{x:number;y:number}|null>(null);
 const justSwiped=useRef(false);
 const start=(e:TouchEvent<HTMLElement>)=>{const p=e.changedTouches[0];if(p)touch.current={x:p.clientX,y:p.clientY}};
 const end=(e:TouchEvent<HTMLElement>)=>{
  const p=e.changedTouches[0],from=touch.current;touch.current=null;
  if(!p||!from)return;
  const dx=p.clientX-from.x,dy=p.clientY-from.y;
  if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.35){
   justSwiped.current=true;setShown(dx<0);
   window.setTimeout(()=>{justSwiped.current=false},250);
  }
 };
 return <article className="relative min-w-0 overflow-hidden rounded-xl" onTouchStart={start} onTouchEnd={end}>
  <div aria-hidden={!shown} className="absolute inset-y-0 right-0 flex w-[186px] items-stretch justify-end gap-px bg-muted/80 p-1">
   <button type="button" tabIndex={shown?0:-1} onClick={()=>{onArchive();setShown(false)}}
     className="flex w-[61px] flex-col items-center justify-center gap-1 rounded-lg bg-card px-1 text-[11px] font-semibold text-primary"
     aria-label={a.archivedAt?"Atkurti adresą":"Archyvuoti adresą"}>
     {a.archivedAt?<ArchiveRestore className="size-5"/>:<Archive className="size-5"/>}{a.archivedAt?"Atkurti":"Archyvas"}
   </button>
   <button type="button" tabIndex={shown?0:-1} onClick={()=>{onEdit();setShown(false)}}
    className="flex w-[61px] flex-col items-center justify-center gap-1 rounded-lg bg-card px-1 text-[11px] font-semibold text-primary"
    aria-label={"Redaguoti "+a.street}><Pencil className="size-5"/>Redaguoti</button>
   <button type="button" tabIndex={shown?0:-1} onClick={()=>{onRemove();setShown(false)}}
     className="flex w-[61px] flex-col items-center justify-center gap-1 rounded-lg bg-destructive/10 px-1 text-[11px] font-semibold text-destructive"
     aria-label={"Ištrinti "+a.street}><Trash2 className="size-5"/>Ištrinti</button>
  </div>
  <div className="relative min-w-0 bg-card transition-transform duration-200 ease-out"
   style={{transform:shown?"translateX(-186px)":"translateX(0)"}}>
   <div className="card-surface min-w-0 p-4 sm:p-5">
    <div className="min-w-0 space-y-3">
      <div className="pr-9">
       <Link to="/adresai/$addressId" params={{addressId:a.id}}
         className="block break-words text-base font-semibold text-foreground hover:text-primary hover:underline">{a.street}</Link>
       <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0"/>{a.city}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
       <Pill>{ADDRESS_TYPE_LABEL[a.type]}</Pill>
       {a.isPriority&&<Pill tone="warning"><Star className="size-3"/>Prioritetinis objektas</Pill>}
       {a.archivedAt?<Pill tone="warning">Archyvuotas</Pill>:<Pill tone={a.status==="nebeaptarnaujamas"?"danger":a.status==="naujas"?"success":"neutral"}>
        {OBJECT_STATUS_LABEL[a.status||"aktyvus"]}</Pill>}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
       {a.type!=="teritorija"&&a.stairwellVisitsPerWeek!=null&&<span>Laiptinės: {a.stairwellVisitsPerWeek} k./sav.</span>}
       {a.type!=="laiptine"&&a.territoryVisitsPerWeek!=null&&<span>Teritorija: {a.territoryVisitsPerWeek} k./sav.</span>}
       <span>{jobCount} darbai</span><span>{photoCount} nuotr.</span>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
     {!a.archivedAt&&<Button size="sm" className="mr-auto min-h-10" onClick={onAssign}><Plus className="size-4"/>Sukurti darbą</Button>}
     <MapPinLink street={a.street} city={a.city} latitude={a.latitude} longitude={a.longitude} confirmed={Boolean(a.gpsLocationConfirmed)}/>
     <MapsLink street={a.street} city={a.city} latitude={a.latitude} longitude={a.longitude} confirmed={Boolean(a.gpsLocationConfirmed)} compact/>
     <Button size="icon" variant="outline" title="Redaguoti" aria-label={"Redaguoti "+a.street} onClick={onEdit}><Pencil className="size-4"/></Button>
    </div>
   </div>
   <button type="button" className="absolute right-2 top-2 grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
    aria-label={shown?"Uždaryti adreso veiksmus":"Rodyti adreso veiksmus"} aria-expanded={shown}
    onClick={()=>setShown(v=>!v)}><MoreHorizontal className="size-5"/></button>
  </div>
 </article>;
}
