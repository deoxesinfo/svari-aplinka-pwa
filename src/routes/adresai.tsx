import { createFileRoute } from "@tanstack/react-router";
import { useMemo,useState } from "react";
import { Building2,Plus,Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AddressFormDialog } from "@/components/app/forms";
import { WorkAssignmentDialog } from "@/components/app/WorkAssignmentDialog";
import { AddressCard } from "@/components/app/AddressCard";
import { Confirm,EmptyState,PageHeader,inputCls } from "@/components/app/ui-bits";
import { useAppState,archiveAddress,restoreAddress,deleteAddress } from "@/lib/store";
import { currentAdminOrg } from "@/lib/work-assignments";
import type { Address } from "@/lib/types";
export const Route=createFileRoute("/adresai")({component:Addresses});
function Addresses(){
 const {addresses,jobs,photos}=useAppState();
 const [term,setTerm]=useState("");
 const [priorityOnly,setPriorityOnly]=useState(false);
 const [archived,setArchived]=useState(false);
 const [open,setOpen]=useState(false);
 const [edit,setEdit]=useState<Address|undefined>();
 const [remove,setRemove]=useState<Address|null>(null);
 const [archiveConfirm,setArchiveConfirm]=useState<Address|null>(null);
 const [assignTo,setAssignTo]=useState<Address|null>(null);
 const [busy,setBusy]=useState(false);
 const active=addresses.filter(a=>!a.archivedAt&&!a.deletedAt);
 const archivedAddresses=addresses.filter(a=>a.archivedAt&&!a.deletedAt);
 const filtered=useMemo(()=>addresses.filter(a=>!a.deletedAt&&Boolean(a.archivedAt)===archived
   &&(a.street+" "+a.city).toLocaleLowerCase("lt").includes(term.toLocaleLowerCase("lt"))
   &&(!priorityOnly||Boolean(a.isPriority)))
   .sort((a,b)=>Number(Boolean(b.isPriority))-Number(Boolean(a.isPriority))),[addresses,term,priorityOnly,archived]);
 const submitArchive=async()=>{
   const a=archiveConfirm;if(!a||busy)return;
   setBusy(true);
   try{
    await currentAdminOrg();
    const ok=a.archivedAt?restoreAddress(a.id):archiveAddress(a.id);
    if(!ok)throw Error("Adreso būsena jau pakeista");
    toast.success(a.archivedAt?"Adresas atkurtas":"Adresas archyvuotas, būsimi darbai sustabdyti");
    setArchiveConfirm(null);
   }catch(e){toast.error(e instanceof Error?e.message:"Veiksmas negalimas")}
   finally{setBusy(false)}
 };
 const submitDelete=async()=>{
   const a=remove;if(!a||busy)return;
   setBusy(true);
   try{
     await currentAdminOrg();
     if(!deleteAddress(a.id))throw Error("Adresas jau pašalintas");
     toast.success("Adresas pažymėtas ištrintu. Susiję duomenys išsaugoti.");
     setRemove(null);
   }catch(e){toast.error(e instanceof Error?e.message:"Tik administratorius gali ištrinti adresą")}
   finally{setBusy(false)}
 };
 return <div>
  <PageHeader title="Adresai" subtitle={"Objektai: "+active.length+" · Archyve: "+archivedAddresses.length}
   actions={<Button onClick={()=>{setEdit(undefined);setOpen(true)}}><Plus/>Pridėti adresą</Button>}/>
  <div className="relative mb-4"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/>
   <input aria-label="Ieškoti adresų" className={inputCls+" pl-10"} placeholder="Ieškoti pagal gatvę arba miestą…"
    value={term} onChange={e=>setTerm(e.target.value)}/></div>
  <div className="mb-3 flex flex-wrap gap-2">
   <Button type="button" size="sm" variant={archived?"outline":"default"} onClick={()=>setArchived(false)}>Aktyvūs ({active.length})</Button>
   <Button type="button" size="sm" variant={archived?"default":"outline"} onClick={()=>setArchived(true)}>Archyvas ({archivedAddresses.length})</Button>
  </div>
  <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
   <input type="checkbox" checked={priorityOnly} onChange={e=>setPriorityOnly(e.target.checked)} className="size-4 accent-amber-600"/>Tik prioritetiniai objektai
  </label>
  <div className="space-y-3">{filtered.length?filtered.map(a=><AddressCard key={a.id} address={a}
   jobCount={jobs.filter(j=>j.addressId===a.id&&!j.deletedAt).length}
   photoCount={photos.filter(p=>p.addressId===a.id).length}
   onAssign={()=>setAssignTo(a)} onEdit={()=>{setEdit(a);setOpen(true)}} onRemove={()=>setRemove(a)} onArchive={()=>setArchiveConfirm(a)}/>):
   <EmptyState icon={<Building2 className="size-8"/>} title={archived?"Archyvas tuščias":"Adresų nerasta"}
    text="Pabandykite pakeisti paiešką arba pridėti adresą."/>}</div>
  <AddressFormDialog open={open} onOpenChange={setOpen} address={edit}/>
  <WorkAssignmentDialog address={assignTo} open={Boolean(assignTo)} onOpenChange={v=>!v&&setAssignTo(null)}/>
  <Confirm open={Boolean(archiveConfirm)} onOpenChange={v=>!v&&setArchiveConfirm(null)}
   title={archiveConfirm?.archivedAt?"Atkurti adresą?":"Archyvuoti adresą?"}
   text={archiveConfirm?.archivedAt
    ?"Atkūrus adresą "+archiveConfirm.street+" bus galima tęsti grafikų generavimą."
    :"Archyvuoti "+(archiveConfirm?.street||"")+"? Naujų darbų generavimas bus sustabdytas, jau sukurti būsimi neatlikti darbai paslėpti. Istorija bei nuotraukos išliks."}
   confirmLabel={archiveConfirm?.archivedAt?"Atkurti":"Archyvuoti"} onConfirm={()=>void submitArchive()}/>
  <Confirm open={Boolean(remove)} onOpenChange={v=>!v&&setRemove(null)}
   title="Ištrinti adresą?"
   text={"Tik administratoriui. "+(remove?.street||"")+" bus paslėptas be atkūrimo mygtuko; darbų, grafikų ir nuotraukų įrašai išliks. Būsimi darbai sustabdomi. Patvirtinate?"}
   confirmLabel="Ištrinti" onConfirm={()=>void submitDelete()}/>
 </div>;
}
