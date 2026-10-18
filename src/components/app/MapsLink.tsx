import { MapPin, Navigation } from "lucide-react";
import { mapsDirectionsToPoint, mapsPlaceUrl } from "@/lib/maps";
type MapsProps={street:string;city:string;compact?:boolean;latitude?:number;longitude?:number;confirmed?:boolean};
export function MapsLink({street,city,compact=false,latitude,longitude,confirmed=false}:MapsProps){
 const destination=mapsDirectionsToPoint(street,city,latitude,longitude,confirmed);
 return <a href={destination} target="_blank" rel="noopener noreferrer"
  aria-label={`Važiuoti į ${street}, ${city} – Google Maps`}
  className={compact?"inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border bg-card px-3 py-2 text-xs font-semibold text-primary hover:bg-muted":"inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"}>
  <Navigation className="size-4 shrink-0"/> Važiuoti
 </a>;
}
export function MapPinLink({street,city,latitude,longitude,confirmed=false}:Omit<MapsProps,"compact">){
 return <a href={mapsPlaceUrl(street,city,latitude,longitude,confirmed)} target="_blank" rel="noopener noreferrer"
  aria-label={confirmed?`Rodyti tikslią ${street} vietą žemėlapyje`:`Ieškoti ${street} žemėlapyje (vieta dar nepatvirtinta)`}
  title={confirmed?"Patvirtintas žymeklis Google Maps":"Adreso paieška Google Maps – vieta dar nepatvirtinta"}
  className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card text-primary hover:bg-muted">
  <MapPin className="size-4"/>
 </a>;
}
