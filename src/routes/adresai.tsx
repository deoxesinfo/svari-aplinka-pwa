import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Plus, Search, MapPin, Pencil, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AddressFormDialog } from "@/components/app/forms";
import { WorkAssignmentDialog } from "@/components/app/WorkAssignmentDialog";
import { Confirm, EmptyState, PageHeader, Pill, inputCls } from "@/components/app/ui-bits";
import { useAppState, deleteAddress } from "@/lib/store";
import { ADDRESS_TYPE_LABEL, OBJECT_STATUS_LABEL, type Address } from "@/lib/types";
import { MapsLink, MapPinLink } from "@/components/app/MapsLink";
export const Route = createFileRoute("/adresai")({ component: Addresses });
function Addresses() {
  const { addresses, jobs, photos } = useAppState();
  const [term, setTerm] = useState("");
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Address | undefined>();
  const [remove, setRemove] = useState<Address | null>(null);
  const [assignTo,setAssignTo]=useState<Address|null>(null);
  const filtered = useMemo(() => addresses.filter(a => (a.street+" "+a.city).toLocaleLowerCase("lt").includes(term.toLocaleLowerCase("lt")) && (!priorityOnly || Boolean(a.isPriority))).sort((a,b)=>Number(Boolean(b.isPriority))-Number(Boolean(a.isPriority))), [addresses,term,priorityOnly]);
  return <div>
    <PageHeader title="Adresai" subtitle={"Objektų sąrašas · "+addresses.length} actions={<Button onClick={()=>{setEdit(undefined);setOpen(true)}}><Plus/> Pridėti adresą</Button>}/>
    <div className="relative mb-5"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><input aria-label="Ieškoti adresų" className={inputCls+" pl-10"} placeholder="Ieškoti pagal gatvę arba miestą…" value={term} onChange={e=>setTerm(e.target.value)}/></div>
    <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
      <input type="checkbox" checked={priorityOnly} onChange={e=>setPriorityOnly(e.target.checked)} className="size-4 accent-amber-600"/> Tik prioritetiniai objektai
    </label>
    <div className="space-y-3">{filtered.length?filtered.map(a=><article className="card-surface min-w-0 overflow-hidden p-4 sm:p-5" key={a.id}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="hidden size-11 shrink-0 place-items-center rounded-xl bg-primary/10 sm:grid">
          <Building2 className="size-5 text-primary"/>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <Link to="/adresai/$addressId" params={{addressId:a.id}}
              className="block break-words text-base font-semibold leading-tight text-foreground hover:text-primary hover:underline">{a.street}</Link>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0"/>{a.city}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Pill>{ADDRESS_TYPE_LABEL[a.type]}</Pill>
            {a.isPriority&&<Pill tone="warning"><Star className="size-3"/> Prioritetinis objektas</Pill>}
            <Pill tone={a.status==="nebeaptarnaujamas"?"danger":a.status==="naujas"?"success":"neutral"}>
              {OBJECT_STATUS_LABEL[a.status||"aktyvus"]}
            </Pill>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {a.type!=="teritorija"&&a.stairwellVisitsPerWeek!=null&&<span>Laiptinės: {a.stairwellVisitsPerWeek} k./sav.</span>}
            {a.type!=="laiptine"&&a.territoryVisitsPerWeek!=null&&<span>Teritorija: {a.territoryVisitsPerWeek} k./sav.</span>}
            <span>{jobs.filter(j=>j.addressId===a.id).length} darbai</span>
            <span>{photos.filter(p=>p.addressId===a.id).length} nuotr.</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
        <Button size="sm" className="mr-auto min-h-10" onClick={()=>setAssignTo(a)}><Plus className="size-4"/> Sukurti darbą</Button>
        <MapPinLink street={a.street} city={a.city} latitude={a.latitude} longitude={a.longitude} confirmed={Boolean(a.gpsLocationConfirmed)}/>
        <MapsLink street={a.street} city={a.city} latitude={a.latitude} longitude={a.longitude} confirmed={Boolean(a.gpsLocationConfirmed)} compact/>
        <Button size="icon" variant="outline" title="Redaguoti" aria-label={"Redaguoti "+a.street} onClick={()=>{setEdit(a);setOpen(true)}}><Pencil className="size-4"/></Button>
        <Button size="icon" variant="ghost" title="Ištrinti" aria-label={"Ištrinti "+a.street} onClick={()=>setRemove(a)}><Trash2 className="size-4"/></Button>
      </div>
    </article>):<EmptyState icon={<Building2 className="size-8"/>} title="Adresų nerasta" text="Pabandykite kitą paiešką arba pridėkite adresą."/>}</div>
    <AddressFormDialog open={open} onOpenChange={setOpen} address={edit}/>
    <WorkAssignmentDialog address={assignTo} open={Boolean(assignTo)} onOpenChange={opened=>!opened&&setAssignTo(null)}/>
    <Confirm open={!!remove} onOpenChange={o=>!o&&setRemove(null)} title="Ištrinti adresą?" text="Bus ištrinti ir šio adreso darbai bei nuotraukos šiame įrenginyje." onConfirm={()=>{if(remove){deleteAddress(remove.id);toast.success("Adresas ištrintas")}setRemove(null)}}/>
  </div>;
}