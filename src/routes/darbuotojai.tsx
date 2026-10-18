import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Archive, BriefcaseBusiness, CalendarDays, ExternalLink, History, Pencil, Plus, RotateCcw, Search, Trash2, UserRoundCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Field, Pill, Confirm, EmptyState, inputCls, textareaCls } from "@/components/app/ui-bits";
import { useAppState, addPerson, updatePerson, archivePerson, addRecruitmentLink, removeRecruitmentLink, type PersonInput } from "@/lib/store";
import { todayISO } from "@/lib/dates";
import { PERSON_POSITION_LABEL, type Person, type PersonRole, type PersonStatus, type PersonPosition } from "@/lib/types";

export const Route = createFileRoute("/darbuotojai")({ component: PeoplePage });
const ROLES: Record<PersonRole,string>={
  darbuotojas:"Darbuotojas (-a)", vadybininkas:"Vadybininkas (-ė)", kandidatas:"Kandidatas (-ė)"
};
const STATUSES: Record<PersonStatus,string>={
  aktyvus:"Aktyvus", atostogos:"Atostogauja", nebedirba:"Nebedirba", kandidatas:"Kandidatas"
};
type Tab = "personalas" | "archyvas" | "skelbimai";
const newPerson=():PersonInput=>({
  name:"",role:"darbuotojas",position:"valytojas",status:"aktyvus",
  startedAt:todayISO(),endedAt:undefined,notes:""
});
function PeoplePage(){
  const {people,jobs,addresses,recruitmentLinks}=useAppState();
  const [tab,setTab]=useState<Tab>("personalas");
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("visi");
  const [editing,setEditing]=useState<Person|null>(null);
  const [opened,setOpened]=useState(false);
  const [archiving,setArchiving]=useState<Person|null>(null);
  const [archiveDate,setArchiveDate]=useState(todayISO());
  const [draft,setDraft]=useState<PersonInput>(newPerson);
  const [adTitle,setAdTitle]=useState("");
  const [adUrl,setAdUrl]=useState("");
  const [adNotes,setAdNotes]=useState("");
  const [removeLinkId,setRemoveLinkId]=useState<string|null>(null);

  const filtered=useMemo(()=>people.filter(p=>{
    const inTab=tab==="archyvas" ? p.status==="nebedirba" : p.status!=="nebedirba";
    return inTab && (filter==="visi"||p.role===filter) &&
      (p.name+" "+p.notes+" "+(PERSON_POSITION_LABEL[p.position || "kita"])).toLocaleLowerCase("lt").includes(search.toLocaleLowerCase("lt"));
  }),[people,search,filter,tab]);
  const archived=people.filter(p=>p.status==="nebedirba").length;
  const active=people.filter(p=>p.status==="aktyvus").length;
  const totalHires=people.reduce((sum,p)=>sum+(p.employmentPeriods?.length ?? (p.startedAt?1:0)),0);
  const openForm=(p?:Person)=>{
    setEditing(p||null);
    setDraft(p?{
      name:p.name,role:p.role,position:p.position||(p.role==="vadybininkas"?"vadybininkas":"kita"),
      status:p.status,notes:p.notes,startedAt:p.startedAt,endedAt:p.endedAt,
    }:newPerson());
    setOpened(true);
  };
  const changeRole=(role:PersonRole)=>{
    setDraft(d=>({
      ...d,role,
      position:role==="vadybininkas"?"vadybininkas":d.position==="vadybininkas"?"valytojas":d.position,
      status:role==="kandidatas"?"kandidatas":d.status==="kandidatas"?"aktyvus":d.status,
      startedAt:role==="kandidatas"?d.startedAt||undefined:d.startedAt||todayISO()
    }));
  };
  const changeStatus=(status:PersonStatus)=>{
    setDraft(d=>({
      ...d,status,
      startedAt:(status==="aktyvus"||status==="atostogos") && editing?.status==="nebedirba" ? todayISO() : d.startedAt,
      endedAt:status==="nebedirba"?d.endedAt||todayISO():(status==="aktyvus"||status==="atostogos")?undefined:d.endedAt,
    }));
  };
  const submit=(event:FormEvent)=>{
    event.preventDefault();
    const name=draft.name.trim();
    if(!name){toast.error("Įrašykite vardą");return}
    if(people.some(p=>p.id!==editing?.id&&p.name.toLocaleLowerCase("lt")===name.toLocaleLowerCase("lt"))){
      toast.error("Toks asmuo jau yra – atidarykite jo ankstesnį profilį ir pasirinkite „Grįžo“.");
      return;
    }
    const working=draft.status==="aktyvus"||draft.status==="atostogos";
    if(working && !draft.startedAt){toast.error("Nurodykite darbo pradžios datą");return}
    if(draft.status==="nebedirba"&&!draft.endedAt){toast.error("Nurodykite darbo pabaigos datą");return}
    if(draft.startedAt&&draft.endedAt&&draft.status==="nebedirba"&&draft.endedAt<draft.startedAt){
      toast.error("Darbo pabaiga negali būti ankstesnė už pradžią");return;
    }
    if(editing?.status==="nebedirba" && working && editing.endedAt && draft.startedAt && draft.startedAt <= editing.endedAt){
      toast.error("Naujas darbo laikotarpis turi prasidėti po ankstesnio pabaigos");return;
    }
    const input={...draft,name};
    if(editing)updatePerson(editing.id,input);else addPerson(input);
    toast.success(editing?"Darbuotojo istorija išsaugota":"Asmuo įtrauktas į registrą");
    setOpened(false);
  };
  const addAd=(event:FormEvent)=>{
    event.preventDefault();
    let url:URL;
    try{url=new URL(adUrl.trim())}catch{toast.error("Įveskite pilną HTTPS nuorodą");return}
    if(url.protocol!=="https:"){toast.error("Naudokite tik HTTPS nuorodas");return}
    if(!adTitle.trim()){toast.error("Įveskite skelbimo pavadinimą");return}
    addRecruitmentLink(adTitle.trim(),url.href,adNotes.trim());
    setAdTitle("");setAdUrl("");setAdNotes("");
    toast.success("Skelbimo nuoroda išsaugota šiame įrenginyje");
  };
  const startRehire=(p:Person)=>{
    setTab("archyvas");setEditing(p);
    setDraft({
      name:p.name,role:p.role,position:p.position||(p.role==="vadybininkas"?"vadybininkas":"valytojas"),
      status:"aktyvus",notes:p.notes,startedAt:todayISO(),endedAt:undefined
    });
    setOpened(true);
  };

  return <div>
    <PageHeader title="Darbuotojai" subtitle="Personalo apskaita, darbo laikotarpių istorija ir įdarbinimo nuorodos · DEMO"
      actions={<Button onClick={()=>openForm()}><Plus/> Pridėti asmenį</Button>}/>
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        ["Dirbantys",active],["Archyve",archived],["Vadybininkai",people.filter(p=>p.role==="vadybininkas"&&p.status!=="nebedirba").length],["Darbo laikotarpiai",totalHires]
      ].map(([label,value])=><div className="card-surface p-3" key={label}>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      </div>)}
    </div>
    <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
      {([["personalas","Personalas",Users],["archyvas","Archyvas",Archive],["skelbimai","Skelbimai",BriefcaseBusiness]] as const).map(([v,l,Icon])=>
        <button type="button" key={v} onClick={()=>setTab(v)}
          className={"flex min-w-0 items-center justify-center gap-1 rounded-md p-3 text-xs font-semibold sm:text-sm "+(tab===v?"bg-card shadow":"text-muted-foreground")}>
          <Icon className="size-4 shrink-0"/>{l}
        </button>)}
    </div>
    {tab==="skelbimai"?<>
      <div className="card-surface mb-4 p-4">
        <h2 className="mb-2 font-semibold">Darbo skelbimų nuorodos</h2>
        <p className="mb-4 text-sm text-muted-foreground">Įrašykite jau turimą skelbimo nuorodą. Mygtukas „Atidaryti“ vienu paspaudimu nukreips į skelbimo redagavimo ar paskelbimo puslapį. Skelbimai automatiškai nebus talpinami.</p>
        <form onSubmit={addAd} className="grid gap-3">
          <Field label="Skelbimo pavadinimas"><input className={inputCls} value={adTitle} onChange={e=>setAdTitle(e.target.value)} placeholder="Pvz., Ieškome valytojo (-os)"/></Field>
          <Field label="Skelbimo HTTPS nuoroda"><input type="url" className={inputCls} value={adUrl} onChange={e=>setAdUrl(e.target.value)} placeholder="https://..." /></Field>
          <Field label="Pastabos / prisijungimo svetainė"><textarea className={textareaCls} rows={2} value={adNotes} onChange={e=>setAdNotes(e.target.value)} placeholder="Pastabos apie platformą ar paskelbimo datą (be slaptažodžių)"/></Field>
          <div><Button type="submit"><Plus/> Pridėti nuorodą</Button></div>
        </form>
      </div>
      {recruitmentLinks.length ? <div className="space-y-2">
        {recruitmentLinks.map(link=><article key={link.id} className="card-surface flex flex-wrap items-start gap-3 p-4">
          <div className="min-w-0 flex-1"><p className="font-semibold">{link.title}</p>
            <p className="truncate text-xs text-muted-foreground">{link.url}</p>
            {link.notes&&<p className="mt-1 whitespace-pre-wrap text-sm">{link.notes}</p>}
          </div>
          <a className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground" href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4"/> Atidaryti</a>
          <Button size="icon" variant="ghost" title="Pašalinti nuorodą" onClick={()=>setRemoveLinkId(link.id)}><Trash2 className="size-4"/></Button>
        </article>)}
      </div>:<EmptyState icon={<BriefcaseBusiness className="size-8"/>} title="Skelbimų nuorodų dar nėra" text="Pridėkite naudojamos skelbimų platformos nuorodą."/>}
      <p className="mt-4 text-xs text-muted-foreground">Nuorodos laikomos tik šio įrenginio naršyklėje. Nepateikite slaptažodžių.</p>
    </>:<>
      <div className="mb-4 grid gap-2 sm:grid-cols-[2fr_1fr]">
        <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/>
          <input className={inputCls+" pl-10"} placeholder="Ieškoti darbuotojo…" aria-label="Ieškoti darbuotojo" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select className={inputCls} aria-label="Personalo grupė" value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="visi">Visas personalas</option>
          <option value="darbuotojas">Darbuotojai</option>
          <option value="vadybininkas">Vadybininkai</option>
          <option value="kandidatas">Kandidatai</option>
        </select>
      </div>
      {tab==="archyvas"&&<p className="mb-3 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        Išėję darbuotojai saugomi archyve su darbo laikotarpiais. Sugrįžus spaudžiama „Grįžo“ – neprarandama ankstesnė istorija.
      </p>}
      <div className="space-y-2">{filtered.length?filtered.map(p=>{
        const workerJobs=jobs.filter(j=>p.role==="darbuotojas"&&j.worker===p.name);
        const managerJobs=jobs.filter(j=>p.role==="vadybininkas"&&j.managerId===p.id);
        const assigned=p.role==="darbuotojas"?workerJobs:managerJobs;
        const buildingCount=new Set(assigned.map(j=>j.addressId).filter(id=>addresses.some(a=>a.id===id))).size;
        const periods=p.employmentPeriods||[];
        return <article className="card-surface p-4" key={p.id}>
          <div className="flex flex-wrap items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10"><UserRoundCheck className="size-5 text-primary"/></span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-semibold">{p.name}</p>
              <div className="flex flex-wrap gap-1.5">
                <Pill>{PERSON_POSITION_LABEL[p.position||(p.role==="vadybininkas"?"vadybininkas":"kita")]}</Pill>
                <Pill>{ROLES[p.role]}</Pill>
                <Pill tone={p.status==="aktyvus"?"success":p.status==="nebedirba"?"danger":"neutral"}>{STATUSES[p.status]}</Pill>
              </div>
              <p className="text-xs text-muted-foreground">{assigned.length} darbai · {buildingCount} objektai</p>
              <p className="text-xs text-muted-foreground">Pradėtas profilis: {p.createdAt.slice(0,10)} · Dirba nuo: {p.startedAt||"Nežinoma"} {p.endedAt&&p.status==="nebedirba"?" · Baigė: "+p.endedAt:""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tab==="archyvas"?<Button variant="outline" size="sm" onClick={()=>startRehire(p)}><RotateCcw className="size-4"/> Grįžo</Button>
                :<Button variant="outline" size="sm" onClick={()=>{setArchiving(p);setArchiveDate(todayISO())}}><Archive className="size-4"/> Į archyvą</Button>}
              <Button variant="ghost" size="sm" onClick={()=>openForm(p)}><Pencil className="size-4"/> Redaguoti</Button>
            </div>
          </div>
          {p.notes&&<p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{p.notes}</p>}
          <details className="mt-3 rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-semibold"><History className="mr-2 inline size-4"/>Darbo laikotarpių istorija ({periods.length})</summary>
            <div className="mt-2 space-y-1 text-sm">
              {periods.length?periods.map((item,i)=><p key={i} className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground"/>{item.startedAt} → {item.endedAt||"Dirba dabar"}</p>)
                :<p className="text-muted-foreground">Istorinio įdarbinimo pradžios duomenų nėra – įveskite rankiniu būdu, kad jie nebūtų išgalvoti.</p>}
            </div>
          </details>
        </article>;
      }):<EmptyState icon={<Users className="size-8"/>} title={tab==="archyvas"?"Archyvas tuščias":"Asmenų nerasta"} text="Pabandykite pakeisti paiešką ar filtrą."/>}</div>
    </>}
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{editing?"Redaguoti personalo profilį":"Naujas personalo profilis"}</DialogTitle>
          <DialogDescription>DEMO – duomenys išsaugomi tik šioje naršyklėje. Vartotojų prisijungimų kol kas nėra.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Vardas ir pavardė"><input className={inputCls} value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="Tik fiktyvus DEMO vardas"/></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Personalo grupė"><select className={inputCls} value={draft.role} onChange={e=>changeRole(e.target.value as PersonRole)}>
              {Object.entries(ROLES).map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select></Field>
            <Field label="Pareigos"><select className={inputCls} value={draft.position||"kita"} onChange={e=>setDraft(d=>({...d,position:e.target.value as PersonPosition}))}>
              {Object.entries(PERSON_POSITION_LABEL).map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select></Field>
          </div>
          <Field label="Būsena"><select className={inputCls} value={draft.status} onChange={e=>changeStatus(e.target.value as PersonStatus)}>
            {Object.entries(STATUSES).map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={editing?.status==="nebedirba"&&draft.status==="aktyvus"?"Naujo darbo laikotarpio pradžia":"Dirba nuo (data)"}>
              <input type="date" className={inputCls} value={draft.startedAt||""} onChange={e=>setDraft(d=>({...d,startedAt:e.target.value||undefined}))}/></Field>
            <Field label="Darbo pabaigos data">
              <input type="date" className={inputCls} disabled={draft.status!=="nebedirba"} value={draft.status==="nebedirba"?draft.endedAt||"":""} onChange={e=>setDraft(d=>({...d,endedAt:e.target.value||undefined}))}/></Field>
          </div>
          {editing&&<p className="text-xs text-muted-foreground">Profilis sukurtas: {editing.createdAt.slice(0,10)}. Šios datos keisti negalima. Ankstesni darbo laikotarpiai lieka istorijoje.</p>}
          <Field label="Pastabos"><textarea className={textareaCls} rows={3} value={draft.notes} onChange={e=>setDraft(d=>({...d,notes:e.target.value}))} placeholder="Tik DEMO pastabos, be asmens duomenų"/></Field>
          <DialogFooter><Button type="button" variant="outline" onClick={()=>setOpened(false)}>Atšaukti</Button><Button type="submit">Išsaugoti</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Confirm open={!!archiving} onOpenChange={o=>!o&&setArchiving(null)} title="Perkelti darbuotoją į archyvą?"
      text="Profilis nebus ištrintas. Išliks darbo laikotarpiai ir ankstesni darbai. Pabaigos data bus šiandienos."
      confirmLabel="Archyvuoti" onConfirm={()=>{
        if(archiving){const date=archiving.startedAt&&archiveDate<archiving.startedAt?archiving.startedAt:archiveDate;
          if(archivePerson(archiving.id,date))toast.success("Perkelta į archyvą");else toast.error("Nepavyko archyvuoti");}
        setArchiving(null);
      }}/>
    <Confirm open={!!removeLinkId} onOpenChange={o=>!o&&setRemoveLinkId(null)} title="Pašalinti skelbimo nuorodą?"
      text="Bus pašalinta tik iš šios demonstracinės naršyklės saugyklos. Skelbimo svetainėje niekas nebus ištrinta."
      onConfirm={()=>{if(removeLinkId)removeRecruitmentLink(removeLinkId);setRemoveLinkId(null);toast.success("Nuoroda pašalinta")}}/>
  </div>;
}
