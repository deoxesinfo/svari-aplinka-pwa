export type AddressType = "laiptine" | "teritorija" | "abu";
export type JobType = "laiptine" | "teritorija" | "patikrinimas";
export type JobStatus = "laukia" | "atlikta";
export type PhotoTag = "pries" | "po" | "problema";
export type Inspection = "patikrinta" | "taisyti" | null;
export type Priority = "zema" | "vidutine" | "auksta";
export type PersonRole = "darbuotojas" | "vadybininkas" | "kandidatas";
export type PersonStatus = "aktyvus" | "atostogos" | "nebedirba" | "kandidatas";
/** Būsima prisijungimo rolė ir profesija saugomos atskirai. */
export type PersonPosition = "valytojas" | "kiemsargis" | "vadybininkas" | "kita";
export const PERSON_POSITION_LABEL: Record<PersonPosition, string> = {
  valytojas: "Valytojas (-a)",
  kiemsargis: "Kiemsargis (-ė)",
  vadybininkas: "Vadybininkas (-ė)",
  kita: "Kitos pareigos",
};
export const personPositionLabel = (p: Pick<Person, "position" | "positionTitle" | "role">): string =>
  p.positionTitle?.trim() || PERSON_POSITION_LABEL[p.position || (p.role === "vadybininkas" ? "vadybininkas" : "kita")];
import type { LocationResult, GpsRadius } from "./gps";
export type EmploymentPeriod = { startedAt?: string; endedAt?: string };
export interface Person {
  id: string;
  name: string;
  role: PersonRole;
  /** Actual job title; separate from account permissions. */
  position?: PersonPosition | undefined;
  /** Original job title, preserving exact wording from personnel records. */
  positionTitle?: string;
  /** Company employee number (text so leading zeroes remain intact). */
  employeeCode?: string;
  status: PersonStatus;
  notes: string;
  phone?: string | undefined; // optional staff contact, available only to authorized personnel
  avatarPhotoId?: string; // local DEMO IndexedDB only, never public URL
  createdAt: string; // when profile was entered, NOT the hire date
  startedAt?: string | undefined; // current/latest hire date
  endedAt?: string | undefined; // most recent departure
  employmentPeriods?: EmploymentPeriod[]; // preserved after employee returns
}
export type RecruitmentLink = { id: string; title: string; url: string; notes: string; createdAt: string };
export type ObjectStatus = "aktyvus" | "naujas" | "sustabdytas" | "nebeaptarnaujamas";
export const OBJECT_STATUS_LABEL: Record<ObjectStatus, string> = {
  aktyvus: "Aktyvus", naujas: "Naujas", sustabdytas: "Sustabdytas", nebeaptarnaujamas: "Nebeteikiamos paslaugos",
};


export interface Address {
  id: string;
  latitude?: number;
  longitude?: number;
  /** Set only after an administrator confirms a pin on the map. */
  gpsLocationConfirmed?: boolean;
  /** Normalized address when the location was approved. */
  gpsReference?: string;
  /** Opt-in location protection for the whole address (jobs and photos). */
  gpsProtectionEnabled?: boolean;
  street: string;
  city: string;
  status?: ObjectStatus;
  /** Archived addresses are recoverable; soft-deleted addresses are not in app. */
  archivedAt?: string;
  deletedAt?: string;
  preArchiveStatus?: ObjectStatus;
  /** Nuolatinis objekto prioritetas, nesusijęs su konkretaus darbo skubumu. */
  isPriority?: boolean;
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
  gpsRequired?: boolean;
  gpsRadiusMeters?: GpsRadius;
  gpsVerification?: LocationResult;
  gpsOverride?: {checkedAt:string;reason:string};
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
  /** Retain history while hiding archived work. */
  archivedAt?: string;
  /** Set only for future pending jobs suspended by an address archive. */
  archivedByAddressAt?: string;
  /** Tombstone prevents recurring generators from re-creating deleted dates. */
  deletedAt?: string;
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
  /** Server-checked GPS metadata; browser GPS is not an unforgeable proof. */
  proofMode?: "gps_live" | "admin_override";
  gpsVerifiedAt?: string;
  gpsDistanceMeters?: number;
  gpsAccuracyMeters?: number;
  gpsRadiusMeters?: number;
  gpsOverrideReason?: string;
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