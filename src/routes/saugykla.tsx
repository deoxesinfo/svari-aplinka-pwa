import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArchiveRestore, Database, HardDrive, Images, RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PhotoGrid } from "@/components/app/Photos";
import { Confirm, EmptyState, PageHeader, Stat, inputCls } from "@/components/app/ui-bits";
import { getCloudRole } from "@/lib/cloud-sync";
import { getCloudOrganizationId, isCloudMode, refreshCloudWorkspace, useAppState } from "@/lib/store";
import { bytesLabel, estimateStorageSelection, getStorageUsage, listStoragePhotos, olderThan, storageAction,
  type RetentionPeriod, type StorageEstimate, type StoragePhoto, type StorageUsage } from "@/lib/storage-admin";
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

const MIB = 1024 ** 2, GIB = 1024 ** 3;
function CapacityMeter({label, used, max, note}: {label: string; used?: number|null; max: number; note?: string}) {
  const percentage = typeof used === "number" && Number.isFinite(used) ?
    Math.max(0, Math.round((used / max) * 1000) / 10) : null;
  return <div className="rounded-lg border p-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
      <strong>{label}</strong>
      <span className="tabular-nums text-muted-foreground">{bytesLabel(used)}
        {" / "}{bytesLabel(max)}{percentage !== null ? " · " + percentage + "%" : ""}</span>
    </div>
    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar"
      aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage ?? undefined}>
      <div className="h-full rounded-full bg-primary" style={{width: (percentage === null ? 0 : Math.min(100,percentage)) + "%"}}/>
    </div>
    {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
  </div>;
}

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
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);
  const [verifiedSelection, setVerifiedSelection] = useState("");
  const [estimateError, setEstimateError] = useState("");
  const metadataOriginalBytes = rows.reduce((total,photo)=>total+(photo.size||0),0);
  const metadataTotalBytes = rows.reduce((total,photo)=>total+(photo.size||0)+(photo.thumbSize||0),0);
  const r2Exact = usage?.r2 !== null && usage?.r2 !== undefined;

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
  const approximateBytes = chosen.reduce((sum,p) => sum + p.size + (p.thumbSize || 0), 0);
  const estimateKey = chosen.map(p => p.id).sort().join(",");
  const exactBytes = estimate?.bytes;
  const estimateReady = !!estimate && verifiedSelection === estimateKey && estimate.photos === chosen.length &&
    (estimate.missing === 0 || (tab === "trash" && chosen.every(p => !!p.purgingAt)));
  useEffect(() => {
    setEstimate(null); setVerifiedSelection(""); setEstimateError("");
    if (!org || !admin || !estimateKey) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      void estimateStorageSelection(org, estimateKey.split(","))
        .then(result => { if(active) { setEstimate(result); setVerifiedSelection(estimateKey); } })
        .catch(e => { if(active) setEstimateError(e instanceof Error ? e.message : "R2 patikra nepavyko"); });
    }, 250);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [org, admin, estimateKey]);
  const olderCandidates = rows.filter(p => !p.trashedAt && (period === "all" || olderThan(p.createdAt,period)));
  const selectedAll = filtered.length > 0 && filtered.slice(0, 50).every(p => selected.includes(p.id));
  const preview: PhotoMeta[] = filtered.slice(0, visibleCount).filter(p => !p.trashedAt).map(p => ({
    id:p.id, addressId:p.addressId, jobId:p.jobId, createdAt:p.createdAt,
    size:p.size, width:0, height:0, type:"image/webp"
  }));
  async function perform(action: "trash" | "restore" | "purge") {
    if (!org || !admin || !chosen.length || !estimateReady) return;
    setBusy(true); setConfirm(null);
    try {
      await storageAction(org,action,chosen.map(p => p.id),action === "trash" ? (period === "all" ? "manual" : period) : undefined);
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
      <Stat label={r2Exact?"Cloudflare R2 (objektai)":"R2 originalai (pagal metaduomenis)"} value={bytesLabel(r2Exact?usage?.r2?.r2Bytes:metadataOriginalBytes)} />
      <Stat label="R2 objektų skaičius" value={usage?.r2 ? renderNum(usage.r2.r2Objects) : "—"}/>
    </div>
    <div className="grid gap-3 lg:grid-cols-3">
      <CapacityMeter label="Supabase duomenų bazė" used={usage?.supabase?.database_bytes} max={500*MIB}/>
      <CapacityMeter label="Supabase dokumentai" used={usage?.supabase?.document_bytes} max={GIB}/>
      <CapacityMeter label={r2Exact?"Cloudflare R2 nuotraukos":"R2 originalai (apytiksliai)"} used={r2Exact?usage?.r2?.r2Bytes:metadataOriginalBytes} max={10*GIB}
        note={r2Exact?"R2 tiksliai išmatuotas šios organizacijos objektų dydis; 10 GB-mėn. limitas skaičiuojamas visai Cloudflare paskyrai.":"Tik Supabase įrašų originalų dydžių suma (apie "+bytesLabel(metadataTotalBytes)+", jei metaduomenyse nurodyti miniatiūrų dydžiai). Tikras R2 dydis ir miniatiūros tikrinami po Worker API diegimo."}/>
    </div>
    <div className="card-surface space-y-2 p-4 text-sm">
      <div className="flex items-center gap-2 font-semibold"><Database className="size-4"/> Saugyklų limitai</div>
      <p className="text-muted-foreground">Supabase DB nemokamo plano riba: 500 MB; dokumentų saugykla: 1 GB.
        R2 nemokamo plano saugojimo apimtis: 10 GB-mėn. R2 limitas skaičiuojamas visos paskyros,
        todėl čia pateikiamas tik šio projekto R2 aplanko dydis.</p>
      <p className="text-muted-foreground">{renderNum(rows.filter(p => !p.trashedAt).length)} aktyvios nuotraukos,
        {renderNum(rows.filter(p => !!p.trashedAt).length)} šiukšlinėje.
        {usage?.supabase ? " Supabase dokumentų: " + renderNum(usage.supabase.document_files) + "." : ""}</p>
      {usage?.r2&&<p className={usage.r2.missingR2Files||usage.r2.unlinkedR2Files?"text-amber-700":"text-muted-foreground"}>
        R2–Supabase sutikrinimas: {usage.r2.photoRecords} metaduomenų įrašai,
        {usage.r2.missingR2Files} trūkstami R2 failai,
        {usage.r2.unlinkedR2Files} nesusieti R2 failai.
      </p>}
      <p className="text-muted-foreground">Perkėlus į šiukšlinę vieta dar neatlaisvinama.
        Ji atlaisvinama tik rankiniu būdu galutinai pašalinus failus iš R2.</p>
      {usage?.errors.map((e,i)=><p key={i} className="text-amber-700">
        {e.includes("UNKNOWN_ROUTE")?"R2 statistikos API dar neįdiegtas į Cloudflare Worker (404). Iki diegimo rodoma tik metaduomenų dydžių suma, o trynimo valdymas užrakintas.":"Statistika nepasiekiama: "+e}
      </p>)}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
    <section className="card-surface space-y-4 p-4">
      <div className="flex flex-wrap gap-2">
        <Button variant={tab === "active" ? "default" : "outline"} onClick={() => {setTab("active");setSelected([]);}}>
          <Images className="size-4"/> Senų nuotraukų atranka</Button>
        <Button variant={tab === "trash" ? "default" : "outline"} onClick={() => {setTab("trash");setSelected([]);}}>
          <Trash2 className="size-4"/> Šiukšlinė ({rows.filter(p => !!p.trashedAt).length})</Button>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <label className="block min-w-0 max-w-full text-xs">Nuo datos
          <input type="date" className={inputCls+" block min-w-0 max-w-full box-border"} style={{minWidth:0,maxWidth:"100%"}} value={fromDate} onChange={e=>{setFromDate(e.target.value);setSelected([]);}}/></label>
        <label className="block min-w-0 max-w-full text-xs">Iki datos
          <input type="date" className={inputCls+" block min-w-0 max-w-full box-border"} style={{minWidth:0,maxWidth:"100%"}} value={toDate} onChange={e=>{setToDate(e.target.value);setSelected([]);}}/></label>
      </div>
      {tab === "active" && <p className="text-sm text-muted-foreground">
        Iš viso pagal pasirinktą amžių: {olderCandidates.length}. Po filtrų: {filtered.length}.
        Jokie failai neištrinami automatiškai. Galite pasirinkti ir šiandien įkeltas nuotraukas. Galutinis pašalinimas galimas tik administratoriui atskirai patvirtinus.
      </p>}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted p-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={selectedAll} disabled={!filtered.length||busy}
            onChange={e=>setSelected(e.target.checked ? filtered.slice(0,50).map(p=>p.id):[])}/>
          Pažymėti iki 50 matomų nuotraukų</label>
        <span className="text-muted-foreground">Pasirinkta: {chosen.length} ·
          {" "}{estimateReady ? bytesLabel(exactBytes) + " (patikrinta R2)" : bytesLabel(approximateBytes) + " (apytiksliai)"}
        </span>
        {!!chosen.length && !estimateReady &&
          <span className="text-xs text-amber-700">
            {estimate?.missing ? "Trūksta R2 failų: " + estimate.missing :
              estimateError ? "R2 patikros klaida: " + estimateError : "Tikrinamas tikslus dydis…"}
          </span>}
        {tab==="active"?
          <Button disabled={!chosen.length||busy||!estimateReady} variant="outline" onClick={()=>setConfirm("trash")}>
            <Trash2 className="size-4"/> Perkelti į šiukšlinę</Button>
          :<Button disabled={!chosen.length||busy||!estimateReady} variant="outline" onClick={()=>setConfirm("restore")}>
            <ArchiveRestore className="size-4"/> Atkurti</Button>}
        <Button disabled={!chosen.length||busy||!estimateReady} variant="destructive" onClick={()=>{setPurgePhrase("");setConfirm("purge");}}>
          <Trash2 className="size-4"/> Ištrinti visam laikui</Button>
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
      title={"Perkelti " + chosen.length + " pasirinktų nuotraukų į šiukšlinę?"}
      text={"Jas bus galima atkurti. Net ir šiandien įkeltos nuotraukos šiame etape dar fiziškai nešalinamos. " +
        "Patikrintas pasirinktų R2 failų dydis: " + bytesLabel(exactBytes)}
      confirmLabel="Perkelti" onConfirm={()=>void perform("trash")}/>
    <Confirm open={confirm==="restore"} onOpenChange={o=>!o&&setConfirm(null)}
      title={"Atkurti " + chosen.length + " nuotraukas?"}
      text="Atkurti galima tik jei R2 failai vis dar egzistuoja." confirmLabel="Atkurti"
      onConfirm={()=>void perform("restore")}/>
    {confirm==="purge"&&<div role="dialog" aria-modal="true" aria-label="Galutinis šalinimas"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4">
      <div className="w-full max-w-md space-y-3 rounded-xl bg-background p-5 shadow-xl">
        <h2 className="text-lg font-bold">Negrįžtamai pašalinti {chosen.length} nuotraukų?</h2>
        <p className="text-sm">Tai panaikins TIK pasirinktas nuotraukas: originalus ir miniatiūras iš Cloudflare R2 bei jų metaduomenis iš Supabase.
          Atkūrimas po šio veiksmo neįmanomas. Galima ištrinti ir šiandien įkeltas nuotraukas. Joks trynimas nevyks automatiškai.</p>
        <label className="block text-xs">Įrašykite SALINTI VISAM LAIKUI
          <input className={inputCls} value={purgePhrase} onChange={e=>setPurgePhrase(e.target.value)}/>
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={()=>setConfirm(null)}>Atšaukti</Button>
          <Button variant="destructive" disabled={purgePhrase!=="SALINTI VISAM LAIKUI"||busy}
            onClick={()=>void perform("purge")}>Taip, ištrinti visam laikui</Button>
        </div>
      </div>
    </div>}
  </div>;
}
