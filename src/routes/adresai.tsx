import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Plus, Search, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AddressFormDialog } from "@/components/app/forms";
import { Confirm, EmptyState, PageHeader, Pill, inputCls } from "@/components/app/ui-bits";
import { useAppState, deleteAddress } from "@/lib/store";
import { ADDRESS_TYPE_LABEL, OBJECT_STATUS_LABEL, type Address } from "@/lib/types";
import { MapsLink } from "@/components/app/MapsLink";
export const Route = createFileRoute("/adresai")({ component: Addresses });
function Addresses() {
  const { addresses, jobs, photos } = useAppState();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Address | undefined>();
  const [remove, setRemove] = useState<Address | null>(null);
  const filtered = useMemo(() => addresses.filter(a => (a.street+" "+a.city).toLocaleLowerCase("lt").includes(term.toLocaleLowerCase("lt"))), [addresses,term]);
  return <div>
    <PageHeader title="Adresai" subtitle={"Objektų sąrašas · "+addresses.length} actions={<Button onClick={()=>{setEdit(undefined);setOpen(true)}}><Plus/> Pridėti adresą</Button>}/>
    <div className="relative mb-5"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><input aria-label="Ieškoti adresų" className={inputCls+" pl-10"} placeholder="Ieškoti pagal gatvę arba miestą…" value={term} onChange={e=>setTerm(e.target.value)}/></div>
    <div className="space-y-2">{filtered.length?filtered.map(a=><div className="card-surface flex flex-wrap items-center gap-3 p-4" key={a.id}>
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10"><Building2 className="size-5 text-primary"/></div>
      <div className="min-w-0 flex-1">
        <Link to="/adresai/$addressId" params={{addressId:a.id}} className="font-semibold hover:underline hover:text-primary">{a.street}</Link>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="inline-flex gap-1 items-center"><MapPin className="size-3"/>{a.city}</span><Pill>{ADDRESS_TYPE_LABEL[a.type]}</Pill><Pill tone={a.status==="nebeaptarnaujamas"?"danger":a.status==="naujas"?"success":"neutral"}>{OBJECT_STATUS_LABEL[a.status || "aktyvus"]}</Pill>{a.type !== "teritorija" && a.stairwellVisitsPerWeek != null && <span>Laiptinės: {a.stairwellVisitsPerWeek} k./sav.</span>}{a.type !== "laiptine" && a.territoryVisitsPerWeek != null && <span>Teritorija: {a.territoryVisitsPerWeek} k./sav.</span>}<span>{jobs.filter(j=>j.addressId===a.id).length} darbai</span><span>{photos.filter(p=>p.addressId===a.id).length} nuotr.</span></div>
      </div>
      <div className="flex items-center gap-1"><MapsLink street={a.street} city={a.city} compact /><Button size="icon" variant="ghost" title="Redaguoti" onClick={()=>{setEdit(a);setOpen(true)}}><Pencil className="size-4"/></Button><Button size="icon" variant="ghost" title="Ištrinti" onClick={()=>setRemove(a)}><Trash2 className="size-4"/></Button></div>
    </div>):<EmptyState icon={<Building2 className="size-8"/>} title="Adresų nerasta" text="Pabandykite kitą paiešką arba pridėkite adresą."/>}</div>
    <AddressFormDialog open={open} onOpenChange={setOpen} address={edit}/>
    <Confirm open={!!remove} onOpenChange={o=>!o&&setRemove(null)} title="Ištrinti adresą?" text="Bus ištrinti ir šio adreso darbai bei nuotraukos šiame įrenginyje." onConfirm={()=>{if(remove){deleteAddress(remove.id);toast.success("Adresas ištrintas")}setRemove(null)}}/>
  </div>;
}