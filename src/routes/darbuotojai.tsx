import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Plus, Search, Users, Pencil, Trash2, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Field, Pill, Confirm, EmptyState, inputCls, textareaCls } from "@/components/app/ui-bits";
import { useAppState, addPerson, updatePerson, deletePerson, type PersonInput } from "@/lib/store";
import type { Person, PersonRole, PersonStatus } from "@/lib/types";

export const Route = createFileRoute("/darbuotojai")({ component: PeoplePage });
const ROLES: Record<PersonRole,string>={darbuotojas:"Darbuotojas",vadybininkas:"Vadybininkas",kandidatas:"Kandidatas"};
const STATUSES: Record<PersonStatus,string>={aktyvus:"Aktyvus",atostogos:"Atostogos",nebedirba:"Nebedirba",kandidatas:"Kandidatas"};
const empty: PersonInput={name:"",role:"darbuotojas",status:"aktyvus",notes:""};

function PeoplePage() {
  const {people,jobs,addresses}=useAppState();
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("visi");
  const [editing,setEditing]=useState<Person | null>(null);
  const [opened,setOpened]=useState(false);
  const [deleting,setDeleting]=useState<Person | null>(null);
  const [draft,setDraft]=useState<PersonInput>(empty);
  const filtered=useMemo(()=>people.filter(p=>(filter==="visi" || p.role===filter) && (p.name+" "+p.notes).toLocaleLowerCase("lt").includes(search.toLocaleLowerCase("lt"))),[people,search,filter]);
  const active=people.filter(p=>p.status==="aktyvus").length;
  const openForm=(person?:Person)=>{setEditing(person ?? null);setDraft(person ? {name:person.name,role:person.role,status:person.status,notes:person.notes} : {...empty});setOpened(true)};
  const submit=(event:FormEvent)=>{
    event.preventDefault();
    const name=draft.name.trim();
    if(!name){toast.error("Įrašykite vardą");return}
    if(people.some(p=>p.id!==editing?.id && p.name.toLocaleLowerCase("lt")===name.toLocaleLowerCase("lt"))){toast.error("Toks asmuo jau yra sąraše");return}
    const val={...draft,name};
    if(editing)updatePerson(editing.id,val); else addPerson(val);
    toast.success(editing ? "Profilis atnaujintas" : "Asmuo pridėtas");
    setOpened(false);
  };
  return <div>
    <PageHeader title="Darbuotojai" subtitle="Administratoriaus personalo registras · tik DEMO" actions={<Button onClick={()=>openForm()}><Plus/> Pridėti asmenį</Button>}/>
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      {[["Iš viso",people.length],["Aktyvūs",active],["Vadybininkai",people.filter(p=>p.role==="vadybininkas").length]].map(([name,n])=>
      <div key={name} className="card-surface p-4"><div className="text-xs text-muted-foreground">{name}</div><div className="mt-1 text-2xl font-bold">{n}</div></div>)}
    </div>
    <div className="mb-4 grid gap-2 sm:grid-cols-[2fr_1fr]">
      <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><input className={inputCls+" pl-10"} placeholder="Ieškoti darbuotojo…" aria-label="Ieškoti darbuotojo" value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <select className={inputCls} aria-label="Personalo grupė" value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="visi">Visas personalas</option><option value="darbuotojas">Darbuotojai</option><option value="vadybininkas">Vadybininkai</option><option value="kandidatas">Kandidatai</option>
      </select>
    </div>
    <div className="space-y-2">
      {filtered.length?filtered.map(p=>{
        const workerJobs=jobs.filter(j=>p.role==="darbuotojas" && j.worker===p.name);
        const managerJobs=jobs.filter(j=>p.role==="vadybininkas" && j.managerId===p.id);
        const ownJobs=p.role==="darbuotojas"?workerJobs:managerJobs;
        const assignedBuildings=new Set(ownJobs.map(j=>j.addressId).filter(id=>addresses.some(a=>a.id===id))).size;
        return <article key={p.id} className="card-surface flex flex-wrap items-start gap-3 p-4">
          <span className="grid size-10 place-items-center rounded-full bg-primary/10"><UserRoundCheck className="size-5 text-primary"/></span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="font-semibold">{p.name}</div>
            <div className="flex flex-wrap items-center gap-2"><Pill>{ROLES[p.role]}</Pill><Pill tone={p.status==="aktyvus"?"success":p.status==="nebedirba"?"danger":"neutral"}>{STATUSES[p.status]}</Pill></div>
            <p className="text-xs text-muted-foreground">{ownJobs.length} priskirtų darbų · {assignedBuildings} objektai</p>
            {p.notes&&<p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.notes}</p>}
          </div>
          <div className="flex gap-1"><Button variant="outline" size="sm" onClick={()=>openForm(p)}><Pencil className="size-4"/> Redaguoti</Button><Button variant="ghost" size="icon" title="Ištrinti asmenį" onClick={()=>setDeleting(p)}><Trash2 className="size-4"/></Button></div>
        </article>;
      }):<EmptyState icon={<Users className="size-8"/>} title="Asmenų nerasta" text="Pridėkite darbuotoją arba pakeiskite filtrą."/>}
    </div>
    <Dialog open={opened} onOpenChange={setOpened}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>{editing?"Redaguoti profilį":"Naujas darbuotojas / vadybininkas"}</DialogTitle><DialogDescription>Tik demonstraciniai duomenys. Prisijungimai atsiras prijungus Supabase.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Vardas ir pavardė"><input className={inputCls} autoFocus value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}/></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pareigos"><select className={inputCls} value={draft.role} onChange={e=>{const role=e.target.value as PersonRole;setDraft(d=>({...d,role,status:role==="kandidatas"?"kandidatas":d.status==="kandidatas"?"aktyvus":d.status}))}}>
            {Object.entries(ROLES).map(([v,label])=><option key={v} value={v}>{label}</option>)}
          </select></Field>
          <Field label="Būsena"><select className={inputCls} value={draft.status} onChange={e=>setDraft(d=>({...d,status:e.target.value as PersonStatus}))}>
            {Object.entries(STATUSES).map(([v,label])=><option key={v} value={v}>{label}</option>)}
          </select></Field>
        </div>
        <Field label="Pastabos"><textarea className={textareaCls} value={draft.notes} onChange={e=>setDraft(d=>({...d,notes:e.target.value}))} placeholder="Kokius objektus prižiūri, papildomos pastabos…"/></Field>
        <DialogFooter><Button type="button" variant="outline" onClick={()=>setOpened(false)}>Atšaukti</Button><Button type="submit">Išsaugoti</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
    <Confirm open={!!deleting} onOpenChange={o=>!o&&setDeleting(null)} title="Ištrinti profilį?" text="Priskirtų darbų turintis asmuo negali būti ištrintas. Tokiam asmeniui pasirinkite būseną „Nebedirba“."
      onConfirm={()=>{if(deleting){if(deletePerson(deleting.id))toast.success("Asmuo ištrintas");else toast.error("Asmuo turi priskirtų darbų – pakeiskite jo būseną.")}setDeleting(null)}}/>
  </div>;
}
