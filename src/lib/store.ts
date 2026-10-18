import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { buildSeed, WORKERS } from "./seed";
import { clearPhotoBlobs, deletePhotoBlobs } from "./photos";
import { todayISO } from "./dates";
import type { Address, Inspection, Job, JobStatus, PhotoMeta } from "./types";
import { INSPECTION_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "./types";

const KEY = "svari-aplinka-demo-v1";

export interface AppState {
  loaded: boolean;
  addresses: Address[];
  jobs: Job[];
  photos: PhotoMeta[];
  workers: string[];
}

const EMPTY: AppState = { loaded: false, addresses: [], jobs: [], photos: [], workers: WORKERS };
let state: AppState = EMPTY;
const listeners = new Set<() => void>();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      state = { loaded: true, addresses: p.addresses ?? [], jobs: p.jobs ?? [], photos: p.photos ?? [], workers: WORKERS };
      return;
    }
  } catch {
    /* corrupted – reseed */
  }
  const s = buildSeed();
  state = { loaded: true, ...s, photos: [], workers: WORKERS };
  persist();
}

function persist() {
  try {
    const { addresses, jobs, photos } = state;
    localStorage.setItem(KEY, JSON.stringify({ addresses, jobs, photos }));
  } catch {
    toast.error("Nepavyko išsaugoti – įrenginio atmintis pilna.");
  }
}

function set(fn: (s: AppState) => Partial<AppState>) {
  state = { ...state, ...fn(state) };
  persist();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => {
  if (!state.loaded && typeof window !== "undefined") load();
  return state;
};
const getServerSnapshot = () => EMPTY;

export function useAppState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const uid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

// ---------- Addresses ----------
export type AddressInput = Omit<Address, "id" | "createdAt">;
export function addAddress(input: AddressInput): Address {
  const a: Address = { ...input, id: uid(), createdAt: nowIso() };
  set((s) => ({ addresses: [a, ...s.addresses] }));
  return a;
}
export function updateAddress(id: string, input: AddressInput) {
  set((s) => ({ addresses: s.addresses.map((a) => (a.id === id ? { ...a, ...input } : a)) }));
}
export function deleteAddress(id: string) {
  const photoIds = state.photos.filter((p) => p.addressId === id).map((p) => p.id);
  photoIds.forEach((pid) => deletePhotoBlobs(pid).catch(() => {}));
  set((s) => ({
    addresses: s.addresses.filter((a) => a.id !== id),
    jobs: s.jobs.filter((j) => j.addressId !== id),
    photos: s.photos.filter((p) => p.addressId !== id),
  }));
}

// ---------- Jobs ----------
export type JobInput = Pick<Job, "addressId" | "type" | "worker" | "date" | "priority" | "instructions" | "status" | "notes">;

function hist(job: Job, text: string): Job {
  return { ...job, history: [...job.history, { at: nowIso(), text }] };
}

export function addJob(input: JobInput, extra: Partial<Job> = {}): Job {
  const j: Job = {
    ...input,
    id: uid(),
    inspection: null,
    createdAt: nowIso(),
    completedAt: input.status === "atlikta" ? nowIso() : undefined,
    comments: [],
    history: [{ at: nowIso(), text: "Darbas sukurtas" }],
    ...extra,
  };
  set((s) => ({ jobs: [j, ...s.jobs] }));
  return j;
}

export function updateJob(id: string, input: JobInput) {
  set((s) => ({
    jobs: s.jobs.map((j) => {
      if (j.id !== id) return j;
      let n: Job = { ...j, ...input };
      const changes: string[] = [];
      if (j.status !== input.status) {
        n.completedAt = input.status === "atlikta" ? nowIso() : undefined;
        changes.push(`būsena: ${STATUS_LABEL[input.status]}`);
      }
      if (j.date !== input.date) changes.push(`data: ${input.date}`);
      if (j.worker !== input.worker) changes.push(`darbuotojas: ${input.worker}`);
      if (j.priority !== input.priority) changes.push(`prioritetas: ${PRIORITY_LABEL[input.priority]}`);
      n = hist(n, changes.length ? `Redaguota (${changes.join(", ")})` : "Redaguota");
      return n;
    }),
  }));
}

export function setJobStatus(id: string, status: JobStatus) {
  set((s) => ({
    jobs: s.jobs.map((j) =>
      j.id === id
        ? hist(
            { ...j, status, completedAt: status === "atlikta" ? nowIso() : undefined, inspection: status === "laukia" ? null : j.inspection },
            status === "atlikta" ? "Darbas užbaigtas" : "Darbas atidarytas iš naujo",
          )
        : j,
    ),
  }));
}

export function setInspection(id: string, inspection: Exclude<Inspection, null>, followupNote?: string) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return;
  set((s) => ({
    jobs: s.jobs.map((j) => (j.id === id ? hist({ ...j, inspection }, `Patikrinimas: ${INSPECTION_LABEL[inspection]}`) : j)),
  }));
  if (inspection === "taisyti") {
    const f = addJob(
      {
        addressId: job.addressId,
        type: job.type === "patikrinimas" ? "laiptine" : job.type,
        worker: job.worker,
        date: todayISO(),
        priority: "auksta",
        instructions: `Taisymas po patikrinimo. ${followupNote ?? ""}\n\nPradinės instrukcijos: ${job.instructions}`.trim(),
        status: "laukia",
        notes: "",
      },
      { parentJobId: job.id, history: [{ at: nowIso(), text: "Sukurtas taisymo darbas po patikrinimo" }] },
    );
    return f;
  }
}

export function addComment(id: string, text: string) {
  set((s) => ({
    jobs: s.jobs.map((j) =>
      j.id === id ? hist({ ...j, comments: [...j.comments, { id: uid(), at: nowIso(), text }] }, "Pridėtas komentaras") : j,
    ),
  }));
}

export function deleteJob(id: string) {
  set((s) => ({
    jobs: s.jobs.filter((j) => j.id !== id),
    photos: s.photos.map((p) => (p.jobId === id ? { ...p, jobId: undefined } : p)),
  }));
}

// ---------- Photos ----------
export function addPhotoMeta(meta: PhotoMeta) {
  set((s) => ({
    photos: [meta, ...s.photos],
    jobs: meta.jobId ? s.jobs.map((j) => (j.id === meta.jobId ? hist(j, "Įkelta nuotrauka") : j)) : s.jobs,
  }));
}
export async function removePhoto(id: string) {
  await deletePhotoBlobs(id).catch(() => {});
  set((s) => ({ photos: s.photos.filter((p) => p.id !== id) }));
}

// ---------- Demo ----------
export async function resetDemo() {
  await clearPhotoBlobs().catch(() => {});
  localStorage.removeItem(KEY);
  state = EMPTY;
  load();
  listeners.forEach((l) => l());
}