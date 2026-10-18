export type AddressType = "laiptine" | "teritorija" | "abu";
export type JobType = "laiptine" | "teritorija" | "patikrinimas";
export type JobStatus = "laukia" | "atlikta";
export type PhotoTag = "pries" | "po" | "problema";
export type Inspection = "patikrinta" | "taisyti" | null;
export type Priority = "zema" | "vidutine" | "auksta";
export type PersonRole = "darbuotojas" | "vadybininkas" | "kandidatas";
export type PersonStatus = "aktyvus" | "atostogos" | "nebedirba" | "kandidatas";
export interface Person {
  id: string;
  name: string;
  role: PersonRole;
  status: PersonStatus;
  notes: string;
  createdAt: string;
}
export type ObjectStatus = "aktyvus" | "naujas" | "sustabdytas" | "nebeaptarnaujamas";
export const OBJECT_STATUS_LABEL: Record<ObjectStatus, string> = {
  aktyvus: "Aktyvus", naujas: "Naujas", sustabdytas: "Sustabdytas", nebeaptarnaujamas: "Nebeteikiamos paslaugos",
};


export interface Address {
  id: string;
  street: string;
  city: string;
  status?: ObjectStatus;
  serviceStartedAt?: string; // YYYY-MM-DD
  serviceEndedAt?: string; // YYYY-MM-DD

  type: AddressType;
  entrances: number;
  stairwellVisitsPerWeek?: number;
  territoryVisitsPerWeek?: number;
  instructions: string;
  accessCode: string;
  notes: string;
  createdAt: string;
}

export interface HistoryEntry {
  at: string;
  text: string;
}

export interface Comment {
  id: string;
  at: string;
  text: string;
}

export interface Job {
  id: string;
  addressId: string;
  type: JobType;
  worker: string;
  managerId?: string;
  date: string; // original scheduled date YYYY-MM-DD
  priority: Priority;
  instructions: string;
  status: JobStatus;
  inspection: Inspection;
  notes: string;
  completedAt?: string;
  createdAt: string;
  comments: Comment[];
  history: HistoryEntry[];
  parentJobId?: string;
}

export interface PhotoMeta {
  id: string;
  addressId: string;
  jobId?: string;
  createdAt: string;
  width: number;
  height: number;
  size: number;
  type: string;
  tag?: PhotoTag;
}

export const PHOTO_TAG_LABEL: Record<PhotoTag, string> = {
  pries: "Prieš",
  po: "Po",
  problema: "Problema",
};

export const ADDRESS_TYPE_LABEL: Record<AddressType, string> = {
  laiptine: "Laiptinė",
  teritorija: "Teritorija",
  abu: "Laiptinė + teritorija",
};
export const JOB_TYPE_LABEL: Record<JobType, string> = {
  laiptine: "Laiptinių valymas",
  teritorija: "Teritorijos valymas",
  patikrinimas: "Patikrinimas",
};
export const PRIORITY_LABEL: Record<Priority, string> = {
  zema: "Žemas",
  vidutine: "Vidutinis",
  auksta: "Aukštas",
};
export const STATUS_LABEL: Record<JobStatus, string> = {
  laukia: "Laukia",
  atlikta: "Atlikta",
};
export const INSPECTION_LABEL = {
  patikrinta: "Patikrinta",
  taisyti: "Reikia taisyti",
} as const;