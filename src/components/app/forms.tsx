import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addAddress, addJob, updateAddress, updateJob, useAppState, type AddressInput, type JobInput } from "@/lib/store";
import { todayISO } from "@/lib/dates";
import { ADDRESS_TYPE_LABEL, JOB_TYPE_LABEL, PRIORITY_LABEL, STATUS_LABEL, OBJECT_STATUS_LABEL, type Address, type Job } from "@/lib/types";
import { Field, inputCls, textareaCls } from "./ui-bits";

const emptyAddress: AddressInput = { street: "", city: "", type: "abu", status: "aktyvus", isPriority: false, entrances: 1, stairwellVisitsPerWeek: 1, territoryVisitsPerWeek: 1, instructions: "", accessCode: "DEMO-", notes: "" };

export function AddressFormDialog({
  open, onOpenChange, address, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; address?: Address; onSaved?: (a: Address) => void }) {
  const [v, setV] = useState<AddressInput>(emptyAddress);
  useEffect(() => {
    if (open) setV(address ? { ...address } : emptyAddress);
  }, [open, address]);
  const up = <K extends keyof AddressInput>(k: K, val: AddressInput[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.street.trim() || !v.city.trim()) return toast.error("Įveskite gatvę ir miestą");
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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{address ? "Redaguoti adresą" : "Naujas adresas"}</DialogTitle>
          <DialogDescription>Naudokite tik fiktyvius demo duomenis.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Gatvė, namo nr."><input className={inputCls} value={v.street} onChange={(e) => up("street", e.target.value)} placeholder="Pavyzdžio g. 12" autoFocus /></Field>
            <Field label="Miestas"><input className={inputCls} value={v.city} onChange={(e) => up("city", e.target.value)} placeholder="Kaunas" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
          <Field label="Valymo instrukcijos"><textarea className={textareaCls} value={v.instructions} onChange={(e) => up("instructions", e.target.value)} /></Field>
          <Field label="Patekimo kodas" hint="Tik DEMO – niekada neįveskite tikrų durų kodų.">
            <input className={inputCls} value={v.accessCode} onChange={(e) => up("accessCode", e.target.value)} />
          </Field>
          <Field label="Pastabos"><textarea className={textareaCls} value={v.notes} onChange={(e) => up("notes", e.target.value)} /></Field>
          <DialogFooter>
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
    const instructions = v.instructions.trim() || addresses.find((a) => a.id === v.addressId)?.instructions || "";
    if (job) {
      updateJob(job.id, { ...v, instructions });
      toast.success("Darbas išsaugotas");
      onSaved?.({ ...job, ...v });
    } else {
      const j = addJob({ ...v, instructions });
      toast.success("Darbas sukurtas");
      onSaved?.(j);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
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
          <Field label="Instrukcijos" hint="Palikus tuščią – naudojamos adreso instrukcijos.">
            <textarea className={textareaCls} value={v.instructions} onChange={(e) => up("instructions", e.target.value)} />
          </Field>
          <Field label="Pastabos"><textarea className={textareaCls} value={v.notes} onChange={(e) => up("notes", e.target.value)} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Atšaukti</Button>
            <Button type="submit">Išsaugoti</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}