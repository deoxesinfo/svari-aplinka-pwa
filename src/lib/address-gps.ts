import type { Address } from "./types";
export type GeoTarget=Pick<Address,"street"|"city"|"latitude"|"longitude"|"gpsReference"|"gpsLocationConfirmed"|"gpsProtectionEnabled">;
export const addressReference=(street:string,city:string)=>[street,city].map(v=>v.trim().toLocaleLowerCase("lt-LT").replace(/\s+/g," ")).join("|");
export function hasConfirmedPin(a:Partial<GeoTarget>|undefined):boolean{
  return !!a?.gpsLocationConfirmed&&!!a?.street?.trim()&&!!a.city?.trim()
   &&a.gpsReference===addressReference(a.street,a.city)
   &&typeof a.latitude==="number"&&typeof a.longitude==="number"
   &&Number.isFinite(a.latitude)&&Number.isFinite(a.longitude)
   &&a.latitude>=-90&&a.latitude<=90&&a.longitude>=-180&&a.longitude<=180;
}
export function needsGpsForPhotos(a:Partial<GeoTarget>|undefined,jobRequiresGps=false):boolean{
  return Boolean(a?.gpsProtectionEnabled||jobRequiresGps);
}
