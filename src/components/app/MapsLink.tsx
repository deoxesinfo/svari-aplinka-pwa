import { Navigation } from "lucide-react";
import { mapsDirectionsUrl } from "@/lib/maps";
export function MapsLink({ street, city, compact = false }: { street: string; city: string; compact?: boolean }) {
  return <a href={mapsDirectionsUrl(street, city)} target="_blank" rel="noopener noreferrer"
    aria-label={`Važiuoti į ${street}, ${city} – Google Maps`}
    className={compact ? "inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-2 text-xs font-semibold text-primary hover:bg-muted" : "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"}>
    <Navigation className="size-4"/> Važiuoti
  </a>;
}
