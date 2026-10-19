import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArchiveRestore, Database, HardDrive, Images, RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PhotoGrid } from "@/components/app/Photos";
import { Confirm, EmptyState, PageHeader, Stat, inputCls } from "@/components/app/ui-bits";
import { getCloudRole } from "@/lib/cloud-sync";
import { getCloudOrganizationId, isCloudMode, refreshCloudWorkspace, useAppState } from "@/lib/store";
import { bytesLabel, getStorageUsage, listStoragePhotos, olderThan, storageAction,
  type RetentionPeriod, type StoragePhoto, type StorageUsage } from "@/lib/storage-admin";
import type { PhotoMeta } from "@/lib/types";

export const Route = createFileRoute("/saugykla")({ component: StoragePage });
const periods: { value: RetentionPeriod; label: string }[] = [
  { value: "30d", label: "Senesnės nei 30 dienų" },
  { value: "6m", label: "Senesnės nei 6 mėn." },
  { value: "12m", label: "Senesnės nei 12 mėn." },
  { value: "24m", label: "Senesnės nei 24 mėn." },
];
const renderNum = (n: number) => n.toLocaleString("lt-LT");
const dateText = (s: string) => new Date(s).toLocaleDateString("lt-LT");

function StoragePage() {
  const { addresses, jobs } = useAppState();
  const org = getCloudOrganizationId();
  const admin = isCloudMode() && getCloudRole() === "admin" && !!org;
  const [rows, setRows] = useState<StoragePhoto[]>([]);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [job, setJob] = useState("");
  const [worker, setWorker] = useState("");
  const [period, setPeriod] = useState<RetentionPeriod | "all">("all");
  const [fromDate,setFromDate] = useState("");
  const [toDate,setToDate] = useState("");
  const [tab, setTab] = useState<"active" | "trash">("active");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<"trash" | "restore" | "purge" | null>(null);
  const [purgePhrase, setPurgePhrase] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);

  async function reload() {
    if (!org || !admin) return;
    setBusy(true); setError("");
    try {
      const [photoRows, storageUsage] = await Promise.all([
        listStoragePhotos(org), getStorageUsage(org)
      ]);
      setRows(photoRows); setUsage(storageUsage); setSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saugyklos duomenų nepavyko gauti");
    } finally { setBusy(false); }
  }
  useEffect(() => { if (admin) void reload(); }, [admin, org]);

  const addressName = useMemo(() => new Map(addresses.map(a =>
    [a.id, a.street + ", " + a.city])), [addresses]);
  const jobName = useMemo(() => new Map(jobs.map(j =>
    [j.id, j.type + " · " + j.date])), [jobs]);
  const workerName = useMemo(() => new Map(jobs.map(j =>
    [j.id, j.worker || "Nepriskirta"])), [jobs]);
  const workerValues = useMemo(() => Array.from(new Set(rows.map(p =>
    workerName.get(p.jobId || "") || p.uploadedBy || "Nepriskirta"))).sort(), [rows, workerName]);

  const filtered = useMemo(() => rows.filter(p =>
    (tab === "trash" ? !!p.trashedAt : !p.trashedAt) &&
    (!address || p.addressId === address) && (!job || p.jobId === job) &&
    (!worker || (workerName.get(p.jobId || "") || p.uploadedBy || "Nepriskirta") === worker) &&
    (tab === "trash" || period === "all" || olderThan(p.createdAt, period)) &&
    (!fromDate || p.createdAt.slice(0,10) >= fromDate) &&
    (!toDate || p.createdAt.slice(0,10) <= toDate)
  ).sort((a,b) => b.createdAt.localeCompare(a.createdAt)), [rows, tab, address, job, worker, period, fromDate, toDate, workerName]);

  const chosen = filtered.filter(p => selected.includes(p.id));
  const bytes = chosen.reduce((sum,p) => sum + p.size + (p.thumbSize || 0), 0);
  const olderCandidates = rows.filter(p => !p.trashedAt && (period === "all" || olderThan(p.createdAt,period)));
  const selectedAll = filtered.length > 0 && filtered.slice(0, 50).every(p => selected.includes(p.id));
  const preview: PhotoMeta[] = filtered.slice(0, visibleCount).filter(p => !p.trashedAt).map(p => ({
    id:p.id, addressId:p.addressId, jobId:p.jobId, createdAt:p.createdAt,
    size:p.size, width:0, height:0, type:"image/webp"
  }));
  async function perform(action: "trash" | "restore" | "purge") {
    if (!org || !admin || !chosen.length) return;
    setBusy(true); setConfirm(null);
    try {
      await storageAction(org,action,chosen.map(p => p.id),action === "trash" && period !== "all" ? period : undefined);
      toast.success(action === "trash" ? "Nuotraukos perkeltos į šiukšlinę" :
        action === "restore" ? "Nuotraukos atkurtos" : "Nuotraukos galutinai pašalintos");
      await refreshCloudWorkspace();
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko atlikti veiksmo");
      await Promise.allSettled([refreshCloudWorkspace(),reload()]); // A batch may have partially completed.
    } finally { setBusy(false); }
  }

  if (!admin) return <EmptyState icon={<HardDrive className="size-8"/>}
    title="Tik administratoriams" text="Saugyklos statistika ir valymas darbuotojams nepasiekiami."/>;
  return <div className="min-w-0 space-y-5">
    <PageHeader title="Saugykla" subtitle="V2.3.13 · administratoriaus valdymas; automatinis trynimas išjungtas"
      actions={<Button disabled={busy} variant="outline" onClick={() => void reload()}>
        <RefreshCcw className="size-4"/> Atnaujinti</Button>}/>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Supabase DB (visas projektas)" value={bytesLabel(usage?.supabase?.database_bytes)} />
      <Stat label="Supabase dokumentai" value={bytesLabel(usage?.supabase?.document_bytes)} />
      <Stat label="Cloudflare R2 (objektai)" value={bytesLabel(usage?.r2?.r2Bytes)} />
      <Stat label="R2 objektų skaičius" value={usage?.r2 ? renderNum(usage.r2.r2Objects) : "—"}/>
    </div>
    <div className="card-surface space-y-2 p-4 text-sm">
      <div className="flex items-center gap-2 font-semibold"><Database className="size-4"/> Saugyklų limitai</div>
      <p className="text-muted-foreground">Supabase DB nemokamo plano riba: 500 MB; dokumentų saugykla: 1 GB.
        R2 nemokamo plano saugojimo apimtis: 10 GB-mėn. R2 limitas skaičiuojamas visos paskyros,
        todėl čia pateikiamas tik šio projekto R2 aplanko dydis.</p>
      <p className="text-muted-foreground">{renderNum(rows.filter(p => !p.trashedAt).length)} aktyvios nuotraukos,
        {renderNum(rows.filter(p => !!p.trashedAt).length)} šiukšlinėje.
        {usage?.supabase ? " Supabase dokumentų: " + renderNum(usage.supabase.document_files) + "." : ""}</p>
      {usage?.errors.map((e,i)=><p key={i} className="text-amber-700">Statistika nepasiekiama: {e}</p>)}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
    <section className="card-surface space-y-4 p-4">
      <div className="flex flex-wrap gap-2">
        <Button variant={tab === "active" ? "default" : "outline"} onClick={() => {setTab("active");setSelected([]);}}>
          <Images className="size-4"/> Senų nuotraukų atranka</Button>
        <Button variant={tab === "trash" ? "default" : "outline"} onClick={() => {setTab("trash");setSelected([]);}}>
          <Trash2 className="size-4"/> Šiukšlinė ({rows.filter(p => !!p.trashedAt).length})</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs">Adresas
          <select className={inputCls} value={address} onChange={e => {setAddress(e.target.value);setSelected([]);}}>
            <option value="">Visi adresai</option>
            {addresses.map(a=><option key={a.id} value={a.id}>{addressName.get(a.id)}</option>)}
          </select></label>
        <label className="text-xs">Darbas
          <select className={inputCls} value={job} onChange={e => {setJob(e.target.value);setSelected([]);}}>
            <option value="">Visi darbai</option>
            {jobs.filter(j=>!address||j.addressId===address).map(j=>
              <option key={j.id} value={j.id}>{jobName.get(j.id)}</option>)}
          </select></label>
        <label className="text-xs">Darbuotojas
          <select className={inputCls} value={worker} onChange={e=>{setWorker(e.target.value);setSelected([]);}}>
            <option value="">Visi darbuotojai</option>{workerValues.map(w=><option key={w}>{w}</option>)}
          </select></label>
        <label className="text-xs">Nuotraukų amžius
          <select className={inputCls} value={period} onChange={e=>{setPeriod(e.target.value as RetentionPeriod | "all");setSelected([]);}}>
            <option value="all">Visos nuotraukos</option>
            {periods.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
          </select></label>
        <label className="text-xs">Nuo datos
          <input type="date" className={inputCls} value={fromDate} onChange={e=>{setFromDate(e.target.value);setSelected([]);}}/></label>
        <label className="text-xs">Iki datos
          <input type="date" className={inputCls} value={toDate} onChange={e=>{setToDate(e.target.value);setSelected([]);}}/></label>
      </div>
      {tab === "active" && <p className="text-sm text-muted-foreground">
        Iš viso pagal pasirinktą amžių: {olderCandidates.length}. Po filtrų: {filtered.length}.
        Jokie failai neištrinami automatiškai. Trinimui reikia pasirinkti konkretų senumo laikotarpį.
      </p>}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted p-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={selectedAll} disabled={!filtered.length||busy}
            onChange={e=>setSelected(e.target.checked ? filtered.slice(0,50).map(p=>p.id):[])}/>
          Pažymėti iki 50 matomų nuotraukų</label>
        <span className="text-muted-foreground">Pasirinkta: {chosen.length} · {bytesLabel(bytes)} (apytiksliai)</span>
        {tab==="active"?
          <Button disabled={!chosen.length||busy||period==="all"} variant="destructive" onClick={()=>setConfirm("trash")}>
            <Trash2 className="size-4"/> Perkelti į šiukšlinę</Button>
          :<>
            <Button disabled={!chosen.length||busy} variant="outline" onClick={()=>setConfirm("restore")}>
              <ArchiveRestore className="size-4"/> Atkurti</Button>
            <Button disabled={!chosen.length||busy} variant="destructive" onClick={()=>{setPurgePhrase("");setConfirm("purge");}}>
              <Trash2 className="size-4"/> Pašalinti galutinai</Button>
          </>}
      </div>
      {filtered.length ? <>
        <div className="max-h-[36rem] space-y-1 overflow-y-auto">
          {filtered.slice(0,visibleCount).map(p=><label key={p.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <input type="checkbox" className="mt-1" checked={selected.includes(p.id)} disabled={busy}
              onChange={e=>setSelected(s=>e.target.checked ? (s.length<50?[...s,p.id]:s):s.filter(id=>id!==p.id))}/>
            <span className="min-w-0 flex-1 break-words">
              <strong>{addressName.get(p.addressId)||"Nežinomas adresas"}</strong>
              <span className="block text-xs text-muted-foreground">
                {dateText(p.createdAt)} · {jobName.get(p.jobId||"")||"Be darbo"} ·
                {" "}{workerName.get(p.jobId||"")||p.uploadedBy||"Nepriskirta"} · {bytesLabel(p.size)}
              </span>
              {p.trashedAt&&<span className="block text-xs">Šiukšlinėje nuo {dateText(p.trashedAt)}</span>}
              {p.purgingAt&&<span className="block text-xs text-destructive">Galutinis šalinimas pradėtas – atkurti negalima</span>}
            </span></label>)}
        </div>
        {visibleCount<filtered.length && <Button variant="outline" onClick={()=>setVisibleCount(n=>n+50)}>Rodyti dar 50</Button>}
        {tab==="active"&&preview.length>0&&<div>
          <h2 className="mb-3 text-sm font-semibold">Atrinktų nuotraukų peržiūra</h2>
          <PhotoGrid photos={preview}/>
        </div>}
      </> : <EmptyState title={tab==="trash"?"Šiukšlinė tuščia":"Nuotraukų pagal filtrus nėra"}
        text="Pakeiskite laikotarpį ar filtrus."/>}
    </section>
    <Confirm open={confirm==="trash"} onOpenChange={o=>!o&&setConfirm(null)}
      title={"Perkelti " + chosen.length + " nuotraukas į šiukšlinę?"}
      text={"Jas bus galima atkurti. Supabase ir R2 failai kol kas fiziškai nešalinami. " +
        "Apytikslis pasirinktų failų dydis: " + bytesLabel(bytes)}
      confirmLabel="Perkelti" onConfirm={()=>void perform("trash")}/>
    <Confirm open={confirm==="restore"} onOpenChange={o=>!o&&setConfirm(null)}
      title={"Atkurti " + chosen.length + " nuotraukas?"}
      text="Atkurti galima tik jei R2 failai vis dar egzistuoja." confirmLabel="Atkurti"
      onConfirm={()=>void perform("restore")}/>
    {confirm==="purge"&&<div role="dialog" aria-modal="true" aria-label="Galutinis šalinimas"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4">
      <div className="w-full max-w-md space-y-3 rounded-xl bg-background p-5 shadow-xl">
        <h2 className="text-lg font-bold">Negrįžtamai pašalinti {chosen.length} nuotraukų?</h2>
        <p className="text-sm">Tai panaikins failus iš Cloudflare R2 ir jų metaduomenis.
          Atkūrimas po šio veiksmo neįmanomas. Joks trynimas nevyks automatiškai.</p>
        <label className="block text-xs">Įrašykite SALINTI VISAM LAIKUI
          <input className={inputCls} value={purgePhrase} onChange={e=>setPurgePhrase(e.target.value)}/>
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={()=>setConfirm(null)}>Atšaukti</Button>
          <Button variant="destructive" disabled={purgePhrase!=="SALINTI VISAM LAIKUI"||busy}
            onClick={()=>void perform("purge")}>Pašalinti negrįžtamai</Button>
        </div>
      </div>
    </div>}
  </div>;
}
