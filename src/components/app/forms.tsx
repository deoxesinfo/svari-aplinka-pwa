import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addAddress, addJob, updateAddress, updateJob, useAppState, type AddressInput, type JobInput } from "@/lib/store";
import { todayISO } from "@/lib/dates";
import { ADDRESS_TYPE_LABEL, JOB_TYPE_LABEL, PRIORITY_LABEL, STATUS_LABEL, OBJECT_STATUS_LABEL, type Address, type Job } from "@/lib/types";
import { Field, inputCls, textareaCls } from "./ui-bits";
import { AddressLocationPicker } from "./AddressLocationPicker";
import { hasConfirmedPin } from "@/lib/address-gps";

const emptyAddress: AddressInput = { street: "", city: "", gpsProtectionEnabled:false, type: "abu", status: "aktyvus", isPriority: false, entrances: 1, stairwellVisitsPerWeek: 1, territoryVisitsPerWeek: 1, instructions: "", accessCode: "", notes: "" };

export function AddressFormDialog({
  open, onOpenChange, address, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; address?: Address; onSaved?: (a: Address) => void }) {
  const [v, setV] = useState<AddressInput>(emptyAddress);
  useEffect(() => {
    if (open) setV(address ? { ...address } : emptyAddress);
  }, [open, address]);
  const up = <K extends keyof AddressInput>(k: K, val: AddressInput[K]) => setV((s) => ({
    ...s,[k]:val,
    ...(k==="street"||k==="city"?{gpsLocationConfirmed:false,gpsReference:undefined}:{}),
  }));
  const patchGps=(patch:Partial<AddressInput>)=>setV(s=>({...s,...patch}));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.street.trim() || !v.city.trim()) return toast.error("Įveskite gatvę ir miestą");
    if(v.gpsProtectionEnabled&&!hasConfirmedPin(v))return toast.error("GPS apsaugai patvirtinkite tikslią objekto vietą žemėlapyje");
    const saved: AddressInput = { ...v,
      stairwellVisitsPerWeek: v.type === "teritorija" ? undefined : v.stairwellVisitsPerWeek,
      territoryVisitsPerWeek: v.type === "laiptine" ? undefined : v.territoryVisitsPerWeek
    };
    if (saved.status === "nebeaptarnaujamas" && !saved.serviceEndedAt) return toast.error("Nurodykite aptarnavimo pabaigos datą");
    if (address) {
      updateAddress(address.id, saved);
      toast.success("Adresas išsaugotas");
      onSaved?.({ ...address, ...saved });
    } else {
      const a = addAddress(saved);
      toast.success("Adresas sukurtas");
      onSaved?.(a);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.25rem)] max-w-lg overflow-y-auto px-4 pb-6 pt-6 sm:p-6">
        <DialogHeader>
          <DialogTitle>{address ? "Redaguoti adresą" : "Naujas adresas"}</DialogTitle>
          <DialogDescription>Adresai išsaugomi prisijungusios įmonės Supabase saugykloje.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid min-w-0 w-full max-w-full grid-cols-1 gap-4">
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Gatvė, namo nr."><input className={inputCls} value={v.street} onChange={(e) => up("street", e.target.value)} placeholder="Pavyzdžio g. 12" autoFocus /></Field>
            <Field label="Miestas"><input className={inputCls} value={v.city} onChange={(e) => up("city", e.target.value)} placeholder="Kaunas" /></Field>
          </div>
          <div className="grid min-w-0 w-full grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Valymo tipas">
              <select className={inputCls} value={v.type} onChange={(e) => up("type", e.target.value as AddressInput["type"])}>
                {Object.entries(ADDRESS_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Laiptinių skaičius"><input type="number" min={0} className={inputCls} value={v.entrances} onChange={(e) => up("entrances", Math.max(0, Number(e.target.value)))} /></Field>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-300 bg-amber-50/60 p-3">
            <input type="checkbox" className="mt-1 size-5 accent-amber-600" checked={Boolean(v.isPriority)} onChange={e=>up("isPriority",e.target.checked)}/>
            <span><span className="block text-sm font-semibold text-amber-900">Prioritetinis objektas</span>
            <span className="block text-xs text-amber-800">Išskiriamas adresų ir darbų sąrašuose. Atskiro darbo skubumas nekeičiamas.</span></span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Objekto būsena">
              <select className={inputCls} value={v.status ?? "aktyvus"} onChange={e=>up("status",e.target.value as AddressInput["status"])}>
                {Object.entries(OBJECT_STATUS_LABEL).map(([key,label])=><option key={key} value={key}>{label}</option>)}
              </select>
            </Field>
            <Field label="Aptarnavimo pradžia"><input type="date" className={inputCls} value={v.serviceStartedAt ?? ""} onChange={e=>up("serviceStartedAt",e.target.value || undefined)}/></Field>
            <Field label="Aptarnavimo pabaiga"><input type="date" className={inputCls} value={v.serviceEndedAt ?? ""} onChange={e=>up("serviceEndedAt",e.target.value || undefined)}/></Field>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
  <p className="mb-3 text-sm font-semibold">Valymo kartai per savaitę</p>
  <div className="grid gap-3 sm:grid-cols-2">
    {v.type !== "teritorija" && <Field label="Laiptinių valymas">
      <select className={inputCls} aria-label="Laiptinių valymo dažnumas" value={v.stairwellVisitsPerWeek ?? ""} onChange={e=>up("stairwellVisitsPerWeek", e.target.value ? Number(e.target.value) : undefined)}>
        <option value="">Nenurodyta</option>{Array.from({length:7},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} k. per savaitę</option>)}
      </select>
    </Field>}
    {v.type !== "laiptine" && <Field label="Teritorijos valymas">
      <select className={inputCls} aria-label="Teritorijos valymo dažnumas" value={v.territoryVisitsPerWeek ?? ""} onChange={e=>up("territoryVisitsPerWeek", e.target.value ? Number(e.target.value) : undefined)}>
        <option value="">Nenurodyta</option>{Array.from({length:7},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} k. per savaitę</option>)}
      </select>
    </Field>}
  </div>
  <p className="mt-2 text-xs text-muted-foreground">Tik informacinis dažnumas – automatinio darbų grafiko dar nesukuria.</p>
</div>
          <AddressLocationPicker value={v} onChange={patchGps}/>
          <Field label="Valymo instrukcijos"><textarea className={textareaCls} value={v.instructions} onChange={(e) => up("instructions", e.target.value)} /></Field>
          <Field label="Patekimo kodas" hint="Neskelbkite prieigos kodų neįgaliotiems darbuotojams.">
            <input className={inputCls} value={v.accessCode} onChange={(e) => up("accessCode", e.target.value)} />
          </Field>
          <Field label="Pastabos"><textarea className={textareaCls} value={v.notes} onChange={(e) => up("notes", e.target.value)} /></Field>
          <DialogFooter className="mt-3 flex flex-col-reverse gap-4 border-t pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:gap-4 sm:space-x-0 [&>button]:min-h-11">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Atšaukti</Button>
            <Button type="submit">Išsaugoti</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function JobFormDialog({
  open, onOpenChange, job, defaultAddressId, defaultDate, defaultType, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; job?: Job; defaultAddressId?: string; defaultDate?: string; defaultType?: JobInput["type"]; onSaved?: (j: Job) => void;
}) {
  const { addresses, people } = useAppState();
  const workerChoices=people.filter(p=>p.role==="darbuotojas" && p.status!=="nebedirba" && p.status!=="kandidatas").map(p=>p.name);
  if(job?.worker && !workerChoices.includes(job.worker)) workerChoices.push(job.worker);
  const managers=people.filter(p=>p.role==="vadybininkas" && p.status!=="nebedirba");
  const blank = (): JobInput => ({
    addressId: defaultAddressId ?? addresses[0]?.id ?? "",
    type: defaultType ?? "laiptine",
    worker: workerChoices[0] ?? "",
    managerId: "",
    date: defaultDate ?? todayISO(),
    priority: "vidutine",
    instructions: "",
    status: "laukia",
    notes: "",
    gpsRequired:false,
    gpsRadiusMeters:50
  });
  const [v, setV] = useState<JobInput>(blank);
  useEffect(() => {
    if (open) setV(job ? { ...job } : blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job]);
  const up = <K extends keyof JobInput>(k: K, val: JobInput[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.addressId) return toast.error("Pirmiausia sukurkite adresą");
    if (!v.date) return toast.error("Pasirinkite datą");
    const location=addresses.find(a=>a.id===v.addressId);
    if(v.gpsRequired&&(!Number.isFinite(location?.latitude)||!Number.isFinite(location?.longitude)))
      return toast.error("Įjunkite GPS tik objektui, kuriam nurodytos koordinatės");
    if((v.gpsRequired||location?.gpsProtectionEnabled)&&!hasConfirmedPin(location)){
      return toast.error("GPS darbui reikia patvirtintos tikslios objekto vietos");
    }
    const instructions = v.instructions.trim() || addresses.find((a) => a.id === v.addressId)?.instructions || "";
    const savedJob={...v, gpsRequired:Boolean(v.gpsRequired||location?.gpsProtectionEnabled),instructions};
    if (job) {
      updateJob(job.id, savedJob);
      toast.success("Darbas išsaugotas");
      onSaved?.({ ...job, ...v });
    } else {
      const j = addJob(savedJob);
      toast.success("Darbas sukurtas");
      onSaved?.(j);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sa-job-dialog max-h-[90dvh] min-w-0 overflow-x-hidden overflow-y-auto overscroll-x-none px-4 py-6 sm:px-6">
        <DialogHeader className="min-w-0">
          <DialogTitle>{job ? "Redaguoti darbą" : "Naujas darbas"}</DialogTitle>
          <DialogDescription>Neužbaigti darbai automatiškai perkeliami į šiandieną.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Adresas">
            <select className={inputCls} value={v.addressId} onChange={(e) => up("addressId", e.target.value)}>
              {addresses.length === 0 && <option value="">Nėra adresų</option>}
              {addresses.map((a) => <option key={a.id} value={a.id}>{a.street}, {a.city}</option>)}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipas">
              <select className={inputCls} value={v.type} onChange={(e) => up("type", e.target.value as JobInput["type"])}>
                {Object.entries(JOB_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Valymo darbuotojas">
              <select className={inputCls} value={v.worker} onChange={(e) => up("worker", e.target.value)}>
                <option value="">Nepriskirtas</option>
                {workerChoices.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </Field>
            <Field label="Atsakingas vadybininkas">
              <select className={inputCls} value={v.managerId ?? ""} onChange={e=>up("managerId",e.target.value || undefined)}>
                <option value="">Nepriskirta</option>
                {managers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Suplanuota data"><input type="date" className={inputCls} value={v.date} onChange={(e) => up("date", e.target.value)} /></Field>
            <Field label="Prioritetas">
              <select className={inputCls} value={v.priority} onChange={(e) => up("priority", e.target.value as JobInput["priority"])}>
                {Object.entries(PRIORITY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Būsena">
              <select className={inputCls} value={v.status} onChange={(e) => up("status", e.target.value as JobInput["status"])}>
                {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
          </div>
          <div className="rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="size-4 accent-primary"
                checked={Boolean(v.gpsRequired||addresses.find(a=>a.id===v.addressId)?.gpsProtectionEnabled)}
                disabled={Boolean(addresses.find(a=>a.id===v.addressId)?.gpsProtectionEnabled)}
                onChange={e=>up("gpsRequired",e.target.checked)}/>
              Patikrinti GPS vietą užbaigiant darbą
            </label>
            {(v.gpsRequired||addresses.find(a=>a.id===v.addressId)?.gpsProtectionEnabled)&&<label className="mt-3 block text-xs font-semibold">Leistinas atstumas nuo objekto
              <select className={inputCls+" mt-1"} value={v.gpsRadiusMeters||50}
                onChange={e=>up("gpsRadiusMeters",Number(e.target.value) as 30|50|100)}>
                <option value={30}>30 m</option><option value={50}>50 m</option><option value={100}>100 m</option>
              </select>
            </label>}
            <p className="mt-2 text-xs text-muted-foreground">Pagal nutylėjimą išjungta. Jeigu adresui įjungta GPS apsauga, darbas ją paveldi automatiškai. GPS tikrinama tik paspaudus mygtuką.</p>
          </div>
          <Field label="Instrukcijos" hint="Palikus tuščią – naudojamos adreso instrukcijos.">
            <textarea className={textareaCls} value={v.instructions} onChange={(e) => up("instructions", e.target.value)} />
          </Field>
          <Field label="Pastabos"><textarea className={textareaCls} value={v.notes} onChange={(e) => up("notes", e.target.value)} /></Field>
          <DialogFooter className="mt-3 border-t pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Atšaukti</Button>
            <Button type="submit">Išsaugoti</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}