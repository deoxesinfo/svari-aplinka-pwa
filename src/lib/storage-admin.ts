import { supabase } from "./supabase-client";
import { R2_WORKER_URL } from "./r2-photos";

export type RetentionPeriod = "30d" | "6m" | "12m" | "24m";
export type StoragePhoto = {
  id: string; addressId: string; jobId?: string; createdAt: string;
  size: number; thumbSize?: number; uploadedBy?: string; trashedAt?: string;
  purgingAt?: string;
};
export type R2Usage = { r2Bytes: number; r2Objects: number; r2PhotoFolders: number;
  photoRecords: number; missingR2Files: number; unlinkedR2Files: number };
export type SupabaseUsage = { database_bytes: number; document_bytes: number; document_files: number };
export type StorageUsage = { r2: R2Usage | null; supabase: SupabaseUsage | null; errors: string[] };
const PERIODS: readonly RetentionPeriod[] = ["30d", "6m", "12m", "24m"];

export function cutoffDate(period: RetentionPeriod, now = new Date()): Date {
  if (!PERIODS.includes(period)) throw new Error("Netinkamas laikotarpis");
  if (period === "30d") return new Date(now.getTime() - 30 * 86400_000);
  const months = Number(period.slice(0, -1));
  const y = now.getUTCFullYear(), m = now.getUTCMonth() - months;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(now.getUTCDate(), last),
    now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds()));
}
export const olderThan = (createdAt: string, period: RetentionPeriod, now = new Date()) => {
  const timestamp = Date.parse(createdAt);
  return Number.isFinite(timestamp) && timestamp < cutoffDate(period, now).getTime();
};
export function bytesLabel(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Nežinoma";
  if (value < 1024) return value + " B";
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 4);
  return (value / 1024 ** unit).toLocaleString("lt-LT", { maximumFractionDigits: 2 }) + " " +
    ["B", "KB", "MB", "GB", "TB"][unit];
}
async function authHeaders(org: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Sesija negalioja");
  return {
    authorization: "Bearer " + data.session.access_token,
    "x-organization-id": org,
    "content-type": "application/json"
  };
}
async function workerRequest<T>(org: string, route: string, body?: object): Promise<T> {
  const result = await fetch(R2_WORKER_URL + route, {
    method: body ? "POST" : "GET", headers: await authHeaders(org),
    ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store"
  });
  const data: unknown = await result.json().catch(() => ({}));
  if (!result.ok) {
    const code = (data as { error?: string })?.error || "SERVER_ERROR";
    throw new Error("R2 valdymas (" + result.status + "): " + code);
  }
  return data as T;
}
export async function assertStorageAdmin(org: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Reikia prisijungti");
  const { data, error } = await supabase.from("sa_memberships").select("role")
    .eq("organization_id", org).eq("user_id", auth.user.id).eq("active", true).single();
  if (error || data?.role !== "admin") throw new Error("Saugyklą gali valdyti tik administratorius");
}
export async function listStoragePhotos(org: string): Promise<StoragePhoto[]> {
  await assertStorageAdmin(org);
  const all: StoragePhoto[] = [];
  for (let start = 0; start < 100000; start += 500) {
    const { data, error } = await supabase.from("sa_photo_metadata")
      .select("id,address_id,job_id,created_at,data")
      .eq("organization_id", org).order("id", { ascending: true }).range(start, start + 499);
    if (error) throw new Error("Nepavyko perskaityti nuotraukų sąrašo");
    for (const row of data || []) {
      const d = (row.data || {}) as Record<string, unknown>;
      all.push({
        id: row.id, addressId: row.address_id, jobId: row.job_id || undefined,
        createdAt: row.created_at, size: Number(d.size) || 0,
        thumbSize: typeof d.thumbSize === "number" ? d.thumbSize : undefined,
        uploadedBy: typeof d.uploadedBy === "string" ? d.uploadedBy : undefined,
        trashedAt: typeof d.trashedAt === "string" ? d.trashedAt : undefined,
        purgingAt: typeof d.purgingAt === "string" ? d.purgingAt : undefined,
      });
    }
    if ((data?.length || 0) < 500) return all;
  }
  throw new Error("Nuotraukų per daug – reikalingas papildomas puslapiavimas");
}
export async function getStorageUsage(org: string): Promise<StorageUsage> {
  await assertStorageAdmin(org);
  const [r2, database] = await Promise.allSettled([
    workerRequest<R2Usage>(org, "/v1/storage/usage"),
    supabase.rpc("sa_storage_usage", { p_org: org })
  ]);
  const errors: string[] = [];
  let r2Value: R2Usage | null = null;
  let dbValue: SupabaseUsage | null = null;
  if (r2.status === "fulfilled") r2Value = r2.value;
  else errors.push("R2: " + String(r2.reason));
  if (database.status === "fulfilled" && !database.value.error) {
    const result = database.value.data;
    dbValue = (Array.isArray(result) ? result[0] : result) as SupabaseUsage | null;
  } else errors.push("Supabase statistikai būtina administratoriaus RPC migracija");
  return { r2: r2Value, supabase: dbValue, errors };
}
export async function storageAction(
  org: string, action: "trash" | "restore" | "purge",
  ids: string[], period?: RetentionPeriod
) {
  if (ids.length === 0 || ids.length > 50 || new Set(ids).size !== ids.length)
    throw new Error("Vienu kartu pasirinkite 1–50 nuotraukų");
  if (action === "trash" && (!period || !PERIODS.includes(period)))
    throw new Error("Pasirinkite senumo laikotarpį");
  return workerRequest<{ ok: boolean; changed: number }>(org, "/v1/storage/" + action,
    { ids, ...(period ? { period } : {}), ...(action === "purge" ? { confirmation: "SALINTI VISAM LAIKUI" } : {}) });
}
