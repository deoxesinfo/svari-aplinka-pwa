import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, History, ListTodo, Search } from "lucide-react";
import { PageHeader } from "@/components/app/ui-bits";
import { CHANGELOG, ROADMAP, type ChangeEntry } from "@/lib/changelog";

export const Route=createFileRoute("/pakeitimai")({component:ChangeLogPage});
const categories: Record<ChangeEntry["category"], string>={
  funkcija:"Nauja funkcija", taisymas:"Pataisa", infrastruktūra:"Infrastruktūra", planas:"Koncepcija"
};
function ChangeLogPage(){
  const [view,setView]=useState<"istorija"|"planas">("istorija");
  const [q,setQ]=useState("");
  const filtered=useMemo(()=>CHANGELOG.filter(c=>(c.title+" "+c.version+" "+c.details.join(" ")).toLocaleLowerCase("lt").includes(q.toLocaleLowerCase("lt"))),[q]);
  return <div className="pb-12">
    <PageHeader title="Pakeitimų žurnalas" subtitle="Visa Švari Aplinka PWA kūrimo istorija ir būsimi darbai"/>
    <div className="card-surface mb-5 space-y-2 border-l-4 border-l-primary p-4">
      <h2 className="font-semibold">Projekto istorija nuo pradžios</h2>
      <p className="text-sm text-muted-foreground">Žurnalas kuriamas lietuviškai, saugomas kartu su GitHub kodu ir atnaujinamas po kiekvieno patvirtinto kūrimo etapo. Istorijoje nurodytos faktinės GitHub pakeitimų nuorodos; ankstyvos idėjos atskirtos nuo įgyvendintų funkcijų.</p>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{CHANGELOG.length} etapų</span><span>·</span><span>{ROADMAP.length} ateities darbai</span><span>·</span><span>Pradžia: 2026-10-14 (koncepcija)</span>
      </div>
    </div>
    <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1" role="tablist" aria-label="Pakeitimai ir ateities darbai">
      <button type="button" role="tab" aria-selected={view==="istorija"} onClick={()=>setView("istorija")} className={"flex items-center justify-center gap-2 rounded-lg p-3 text-sm font-semibold "+(view==="istorija"?"bg-card shadow-sm":"text-muted-foreground")}>
        <History className="size-4"/> Pakeitimų istorija
      </button>
      <button type="button" role="tab" aria-selected={view==="planas"} onClick={()=>setView("planas")} className={"flex items-center justify-center gap-2 rounded-lg p-3 text-sm font-semibold "+(view==="planas"?"bg-card shadow-sm":"text-muted-foreground")}>
        <ListTodo className="size-4"/> Būsimi darbai
      </button>
    </div>
    {view==="istorija"?<>
      <div className="relative mb-5"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><input className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm" aria-label="Ieškoti pakeitimų" placeholder="Ieškoti versijos ar pakeitimo…" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <div className="space-y-3">
        {filtered.map(item=><article key={item.version} className="card-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{item.version}</span>
            <span className="text-xs text-muted-foreground">{item.date}</span>
            <span className="rounded-md bg-muted px-2 py-1 text-xs">{categories[item.category]}</span>
          </div>
          <h2 className="mt-2 text-lg font-bold">{item.title}</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/80">{item.details.map((line,i)=><li key={i}>{line}</li>)}</ul>
          {item.commits?.length? <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-xs text-muted-foreground">GitHub įrašai:</span>
            {item.commits.map(sha=><a key={sha} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs text-primary hover:bg-muted" href={"https://github.com/deoxesinfo/svari-aplinka-pwa/commit/"+sha} target="_blank" rel="noopener noreferrer">{sha}<ExternalLink className="size-3"/></a>)}
          </div>:<p className="mt-3 text-xs text-muted-foreground">Pradinė idėja, ne GitHub pakeitimas.</p>}
        </article>)}
        {!filtered.length&&<div className="card-surface p-8 text-center text-sm text-muted-foreground">Pagal paiešką įrašų nerasta.</div>}
      </div>
    </>:<div className="space-y-3">
      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">Planuojama ≠ atlikta. Darbams būtinas naujas patvirtinimas; Supabase neprijungta.</div>
      {ROADMAP.map((p,i)=><article className="card-surface p-4 sm:p-5" key={p.title}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-muted-foreground">{String(i+1).padStart(2,"0")}</span>
          <span className="rounded-md bg-muted px-2 py-1">{p.stage}</span>
          <span className="inline-flex items-center gap-1 text-amber-700"><Clock3 className="size-3"/>{p.status}</span>
        </div>
        <h2 className="mt-2 text-base font-semibold">{p.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.summary}</p>
      </article>)}
    </div>}
    <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
      <CheckCircle2 className="size-4 text-primary"/> Šis žurnalas aprašo programėlės pakeitimus, o ne kasdienius darbuotojų darbo įrašus.
    </div>
  </div>;
}
