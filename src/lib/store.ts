import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { buildSeed, WORKERS } from "./seed";
import { clearPhotoBlobs, deletePhotoBlobs } from "./photos";
import { todayISO } from "./dates";
import type { Address, Inspection, Job, JobStatus, PhotoMeta, Person, RecruitmentLink, EmploymentPeriod } from "./types";
import { INSPECTION_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "./types";
import { loadCloudState,cloudMutations,saveCloudMutations } from "./cloud-sync";
import { gpsResult,validGpsForCompletion } from "./gps";
import type { GpsRadius } from "./gps";
import { hasConfirmedPin } from "./address-gps";

const KEY = "svari-aplinka-demo-v1";
let backend:"demo"|"loading"|"cloud"="demo";
let company:string|null=null;
let saveQueue:Promise<void>=Promise.resolve();
let saveError:string|null=null;
export const isCloudMode=()=>backend!=="demo";
export const getCloudSaveError=()=>saveError;
export function leaveCloudWorkspace(){
  backend="loading";company=null;saveError=null;state=EMPTY;listeners.forEach(l=>l());
}
export async function enterCloudWorkspace(org:string){
  if(backend==="cloud"&&company===org&&state.loaded)return;
  backend="loading";company=null;state=EMPTY;listeners.forEach(l=>l());
  const fresh=await loadCloudState(org);
  backend="cloud";company=org;saveQueue=Promise.resolve();saveError=null;
  state={loaded:true,...fresh};listeners.forEach(l=>l());
}
export async function refreshCloudWorkspace(){
  if(!company||backend!=="cloud"||saveError)return;
  const org=company;await saveQueue;
  const fresh=await loadCloudState(org);
  if(company===org){state={loaded:true,...fresh};listeners.forEach(l=>l());}
}

export interface AppState {
  loaded: boolean;
  addresses: Address[];
  jobs: Job[];
  photos: PhotoMeta[];
  workers: string[];
  people: Person[];
  recruitmentLinks: RecruitmentLink[];
}

const seedPeople = (): Person[] => [
  ...WORKERS.map((name, i) => ({ id: "worker-" + (i+1), name, role: "darbuotojas" as const, status: "aktyvus" as const, notes: "", createdAt: new Date().toISOString() })),
  { id: "manager-1", name: "Vadybininkas A (DEMO)", role: "vadybininkas", status: "aktyvus", notes: "", createdAt: new Date().toISOString() },
  { id: "manager-2", name: "Vadybininkas B (DEMO)", role: "vadybininkas", status: "aktyvus", notes: "", createdAt: new Date().toISOString() },
];
const activeWorkerNames = (people: Person[]) => Array.from(new Set(people.filter(p=>p.role === "darbuotojas" && (p.status === "aktyvus" || p.status === "atostogos")).map(p=>p.name)));
const EMPTY: AppState = { loaded: false, addresses: [], jobs: [], photos: [], workers: WORKERS, people: [], recruitmentLinks: [] };
let state: AppState = EMPTY;
const listeners = new Set<() => void>();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const people: Person[] = Array.isArray(p.people) ? p.people : seedPeople();
      state = { loaded: true, addresses: p.addresses ?? [], jobs: p.jobs ?? [], photos: p.photos ?? [], people, recruitmentLinks: Array.isArray(p.recruitmentLinks) ? p.recruitmentLinks : [], workers: activeWorkerNames(people) };
      return;
    }
  } catch {
    /* corrupted – reseed */
  }
  const s = buildSeed();
  state = { loaded: true, ...s, photos: [], people: seedPeople(), recruitmentLinks: [], workers: WORKERS };
  persist();
}

function persist() {
  if(backend!=="demo")return;
  try {
    const { addresses, jobs, photos, people, recruitmentLinks } = state;
    localStorage.setItem(KEY, JSON.stringify({ addresses, jobs, photos, people, recruitmentLinks }));
  } catch {
    toast.error("Nepavyko išsaugoti – įrenginio atmintis pilna.");
  }
}

function set(fn: (s: AppState) => Partial<AppState>) {
  if(backend==="cloud"&&saveError){
    toast.error("Išsaugojimas debesyje sustabdytas. Patikrinkite ryšį.");return;
  }
  const before=state,after={...before,...fn(before)};
  if(backend==="cloud"&&company){
    const org=company;
    let changes;
    try {changes=cloudMutations(before,after,org)}catch(err){
      toast.error(err instanceof Error?err.message:"Netinkami duomenys");return;
    }
    if(changes.length){
      saveQueue=saveQueue.then(()=>saveCloudMutations(org,changes)).catch(err=>{
        saveError=err instanceof Error?err.message:"Nežinoma klaida";
        toast.error("Supabase neišsaugojo pakeitimo. Neatnaujinkite puslapio, kol klaida neišspręsta.");
        listeners.forEach(l=>l());
      });
    }
  }
  state=after;persist();listeners.forEach(l=>l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => {
  if (!state.loaded && backend==="demo" && typeof window !== "undefined") load();
  return state;
};
const getServerSnapshot = () => EMPTY;

export function useAppState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const uid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

// ---------- Personnel ----------
// An old profile with no employment start is NOT silently assigned a false hire date.
// The createdAt timestamp still shows when the record was entered.
export type PersonInput = Omit<Person, "id" | "createdAt" | "employmentPeriods">;
const working = (status: Person["status"]) => status === "aktyvus" || status === "atostogos";
export function deriveEmploymentPeriods(previous: Person | null, input: PersonInput): EmploymentPeriod[] {
  const periods: EmploymentPeriod[] = previous?.employmentPeriods?.map(p=>({...p}))
    ?? (previous?.startedAt ? [{startedAt:previous.startedAt, endedAt:previous.endedAt}] : []);
  if (input.role === "kandidatas") return periods;
  const wasWorking = previous ? working(previous.status) : false;
  const nowWorking = working(input.status);
  const start = input.startedAt || "";
  if (nowWorking && !wasWorking) {
    if (start) periods.push({startedAt:start});
  } else if (nowWorking && wasWorking) {
    const last = periods.at(-1);
    if (last && !last.endedAt && start) last.startedAt = start;
    else if (!last && start) periods.push({startedAt:start});
  } else if (!nowWorking && wasWorking) {
    const last = periods.at(-1);
    if (last && !last.endedAt) last.endedAt = input.endedAt;
    else if (!last) periods.push({startedAt:start||undefined,endedAt:input.endedAt});
  } else if (!nowWorking && input.endedAt && periods.length) {
    const last = periods.at(-1);
    if (last) last.endedAt = input.endedAt;
  }
  return periods;
}
export function addPerson(input: PersonInput): Person {
  const person: Person = { ...input, id: uid(), createdAt: nowIso(), employmentPeriods:deriveEmploymentPeriods(null,input) };
  set(s=>({people: [...s.people, person], workers: activeWorkerNames([...s.people, person])}));
  return person;
}
export function updatePerson(id: string, input: PersonInput) {
  const original = state.people.find(p=>p.id===id);
  if (!original) return;
  // Rehire is always the SAME profile and therefore preserves history.
  const revised: Person={...original,...input,employmentPeriods:deriveEmploymentPeriods(original,input)};
  const people = state.people.map(p=>p.id===id?revised:p);
  set(s=>({people,workers:activeWorkerNames(people),
    jobs: original.role === "darbuotojas" && original.name !== input.name
      ? s.jobs.map(j=>j.worker === original.name ? {...j,worker:input.name}:j):s.jobs}));
}
export function archivePerson(id: string, endedAt: string): boolean {
  const person = state.people.find(p=>p.id===id);
  if (!person || person.status==="nebedirba" || !endedAt) return false;
  updatePerson(id, {name:person.name,role:person.role,position:person.position,status:"nebedirba",
    notes:person.notes,startedAt:person.startedAt,endedAt});
  return true;
}
// Older consumers cannot hard-delete personnel. Archive instead.
export function deletePerson(_id: string): boolean { return false; }

/** Store just an IndexedDB photo identifier, never a base64 image in localStorage. */
export function setPersonAvatar(id: string, avatarPhotoId?: string) {
  if (!state.people.some(p=>p.id===id)) return;
  set(s=>({people:s.people.map(p=>p.id===id?{...p,avatarPhotoId}:p)}));
}

// ---------- Recruitment links (DEMO only, not connected to job boards) ----------
export function addRecruitmentLink(title: string, url: string, notes: string): RecruitmentLink {
  const link={id:uid(),title,url,notes,createdAt:nowIso()};
  set(s=>({recruitmentLinks:[...s.recruitmentLinks,link]}));
  return link;
}
export function removeRecruitmentLink(id: string) {
  set(s=>({recruitmentLinks:s.recruitmentLinks.filter(l=>l.id!==id)}));
}

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
export type JobInput = Pick<Job, "addressId" | "type" | "worker" | "date" | "priority" | "instructions" | "status" | "notes"> & { managerId?: string;gpsRequired?:boolean;gpsRadiusMeters?:GpsRadius };

function hist(job: Job, text: string): Job {
  return { ...job, history: [...job.history, { at: nowIso(), text }] };
}

export function addJob(input: JobInput, extra: Partial<Job> = {}): Job {
  const target=state.addresses.find(a=>a.id===input.addressId);
  if(target?.gpsProtectionEnabled)input={...input,gpsRequired:true};
  if(input.gpsRequired&&!hasConfirmedPin(target)){
    toast.error("Reikalingas patvirtintas GPS žymeklis");return null as unknown as Job;
  }
  if(input.gpsRequired&&input.status==="atlikta"){
    input={...input,status:"laukia"};
    toast.info("GPS patikros reikalaujamas darbas kuriamas neužbaigtas.");
  }
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
  const previous=state.jobs.find(j=>j.id===id);
  const address=state.addresses.find(a=>a.id===input.addressId);
  if(address?.gpsProtectionEnabled)input={...input,gpsRequired:true};
  if(input.gpsRequired&&!hasConfirmedPin(address)){toast.error("Pirmiausia patvirtinkite objekto GPS vietą");return}
  const changed=previous?.addressId!==input.addressId||previous?.gpsRadiusMeters!==input.gpsRadiusMeters||previous?.gpsRequired!==input.gpsRequired;
  const verified=changed?undefined:previous?.gpsVerification;
  const override=changed?undefined:previous?.gpsOverride;
  if(input.gpsRequired&&input.status==="atlikta"&&previous?.status!=="atlikta"
    &&!validGpsForCompletion(verified,address||{})&&!override){toast.error("Prieš užbaigdami atlikite GPS patikrą");return}
  set((s) => ({
    jobs: s.jobs.map((j) => {
      if (j.id !== id) return j;
      let n: Job = { ...j, ...input,gpsVerification:verified,gpsOverride:override };
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

export function setJobStatus(id: string, status: JobStatus):boolean {
  const job=state.jobs.find(j=>j.id===id);
  const target=state.addresses.find(a=>a.id===job?.addressId);
  if(!job)return false;
  if(status==="atlikta"&&(job.gpsRequired||target?.gpsProtectionEnabled)
    &&!validGpsForCompletion(job.gpsVerification,target||{})&&!job.gpsOverride){
      toast.error("Reikalinga galiojanti GPS patikra arba administratoriaus išimtis");return false;
  }
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
  return true;
}

function validObjectCoordinates(address:Address|undefined):boolean {
  return address?.latitude!==undefined&&address?.longitude!==undefined
    &&Number.isFinite(address.latitude)&&Number.isFinite(address.longitude)
    &&Math.abs(address.latitude)<=90&&Math.abs(address.longitude)<=180;
}
export async function verifyJobGPS(id:string):Promise<boolean>{
  const job=state.jobs.find(j=>j.id===id);
  const target=state.addresses.find(a=>a.id===job?.addressId);
  if(!(job?.gpsRequired||target?.gpsProtectionEnabled)||!target||!hasConfirmedPin(target)){
    toast.error("GPS patikrai reikia įjungto jungiklio ir objekto koordinačių");return false;
  }
  if(!navigator.geolocation){toast.error("Šiame įrenginyje GPS nepasiekiamas");return false}
  try{
    const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(
      resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
    const result=gpsResult({
      latitude:position.coords.latitude,longitude:position.coords.longitude,
      accuracy:position.coords.accuracy,targetLatitude:target.latitude!,
      targetLongitude:target.longitude!,radius:job.gpsRadiusMeters||50
    });
    set(s=>({jobs:s.jobs.map(j=>j.id===id?hist({...j,gpsVerification:result,gpsOverride:undefined},
      result.passed?"GPS patikra patvirtinta":"GPS patikra nepraėjo"):j)}));
    if(!result.passed)toast.warning(result.reason||"GPS patikra nepraėjo");
    return result.passed;
  }catch{
    toast.error("Nepavyko gauti GPS vietos. Patikrinkite leidimus ir bandykite dar kartą.");return false;
  }
}
export function overrideJobGPS(id:string,note:string):boolean{
  if(note.trim().length<15){toast.error("Nurodykite išimties priežastį (bent 15 simbolių)");return false}
  const job=state.jobs.find(j=>j.id===id);
  const target=state.addresses.find(a=>a.id===job?.addressId);
  if(!(job?.gpsRequired||target?.gpsProtectionEnabled))return false;
  const checkedAt=new Date().toISOString();
  set(s=>({jobs:s.jobs.map(j=>j.id===id?hist({...j,gpsOverride:{checkedAt,reason:note.trim()}},
    "Administratoriaus GPS išimtis: "+note.trim()):j)}));
  return true;
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

export function archiveJob(id:string):boolean {
  const job=state.jobs.find(j=>j.id===id);
  if(!job||job.deletedAt||job.archivedAt||job.status!=="atlikta")return false;
  set(s=>({jobs:s.jobs.map(j=>j.id===id?hist({...j,archivedAt:nowIso()},"Darbas perkeltas į archyvą"):j)}));
  return true;
}
export function restoreJob(id:string):boolean {
  const job=state.jobs.find(j=>j.id===id);
  if(!job||!job.archivedAt||job.deletedAt)return false;
  set(s=>({jobs:s.jobs.map(j=>j.id===id?hist({...j,archivedAt:undefined},"Darbas grąžintas iš archyvo"):j)}));
  return true;
}
/** Keep a tombstone instead of hard-deleting: recurring generation must not recreate this job. */
export function deleteJob(id:string):boolean {
  const job=state.jobs.find(j=>j.id===id);
  if(!job||job.deletedAt)return false;
  set(s=>({jobs:s.jobs.map(j=>j.id===id?hist({...j,deletedAt:nowIso()},"Administratoriaus sprendimu darbas pašalintas iš aktyvių įrašų"):j)}));
  return true;
}

// ---------- Photos ----------
export function setPhotoTag(id: string, tag: PhotoMeta["tag"]) {
  set((s) => ({ photos: s.photos.map((p) => p.id === id ? { ...p, tag } : p) }));
}

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
  if(backend!=="demo")throw new Error("Debesijos duomenų valymo funkcija uždrausta");
  await clearPhotoBlobs().catch(() => {});
  localStorage.removeItem(KEY);
  state = EMPTY;
  load();
  listeners.forEach((l) => l());
}