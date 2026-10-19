import type { PhotoMeta } from "./types";

/** Consistent newest-first order across all galleries (ties are deterministic). */
export function newestPhotosFirst<T extends Pick<PhotoMeta,"createdAt"|"id">>(photos: readonly T[]): T[] {
  return [...photos].sort((a,b)=>{
    const aTime=Date.parse(a.createdAt);
    const bTime=Date.parse(b.createdAt);
    const diff=(Number.isFinite(bTime)?bTime:0)-(Number.isFinite(aTime)?aTime:0);
    return diff || b.id.localeCompare(a.id);
  });
}
