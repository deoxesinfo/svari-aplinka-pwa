/**
 * Manual-only geocoding. Photon is primary; Nominatim (OSM) is fallback when
 * Photon fails or does not find an exact building number. No autocomplete,
 * batch geocoding, GPS sharing or persisted third-party data.
 */
export type AddressCandidate={
  name:string;lat:number;lon:number;exactHouse:boolean;source:"Photon"|"OpenStreetMap";
};
type PhotonFeature={geometry?:{coordinates?:unknown};properties?:Record<string,unknown>};
type NominatimPlace={lat?:string;lon?:string;display_name?:string;address?:Record<string,string>};
const cache=new Map<string,AddressCandidate[]>();
let lastNominatimRequest=0;

export function fullStreetName(street:string):string{
  return street.trim().replace(/\bg\.\s*(?=\d)/giu,"gatvė ").replace(/\s+/g," ");
}
export function requestedHouseNumber(street:string):string{
  return (street.match(/(?:^|\s)(\d+[a-zA-Z]?)(?:\s*)$/u)?.[1]||"").toLowerCase();
}
const exact=(requested:string,result:unknown)=>
  Boolean(requested&&typeof result==="string"&&result.trim().toLowerCase()===requested);
const valid=(lat:unknown,lon:unknown):lat is number=>
  typeof lat==="number"&&typeof lon==="number"&&Number.isFinite(lat)&&Number.isFinite(lon)
  &&lat>=-90&&lat<=90&&lon>=-180&&lon<=180;
function photonLabel(p:Record<string,unknown>):string{
 return [p.name,p.street,p.housenumber,p.city,p.state,p.country].filter(v=>typeof v==="string"&&v.trim()).join(", ");
}
async function photon(street:string,city:string):Promise<AddressCandidate[]>{
 const url=new URL("https://photon.komoot.io/api/");
 url.searchParams.set("q",[fullStreetName(street),city.trim(),"Lithuania"].join(", "));
 url.searchParams.set("lang","lt");url.searchParams.set("limit","5");
 const res=await fetch(url.toString(),{headers:{Accept:"application/json"},signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw Error("Photon nepasiekiamas");
 const data=await res.json() as {features?:PhotonFeature[]};
 const house=requestedHouseNumber(street);
 return (data.features||[]).flatMap(f=>{
   const pair=f.geometry?.coordinates;
   if(!Array.isArray(pair)||pair.length<2)return [];
   const lat=pair[1],lon=pair[0];
   if(typeof lat!=="number"||typeof lon!=="number"||!valid(lat,lon))return [];
   const p=f.properties||{};
   const resultCity=String(p.city||p.county||"");
   const cityMatches=!resultCity||resultCity.toLocaleLowerCase("lt").includes(city.toLocaleLowerCase("lt"));
   return [{name:photonLabel(p)||"Vieta žemėlapyje",lat,lon,
     exactHouse:cityMatches&&exact(house,p.housenumber),source:"Photon" as const}];
 });
}
async function nominatim(street:string,city:string):Promise<AddressCandidate[]>{
 // Public OSM endpoint: admin-triggered only, cached per address, max 1/s.
 const elapsed=Date.now()-lastNominatimRequest;
 if(elapsed<1200)await new Promise(resolve=>setTimeout(resolve,1200-elapsed));
 lastNominatimRequest=Date.now();
 const url=new URL("https://nominatim.openstreetmap.org/search");
 url.searchParams.set("q",[fullStreetName(street),city.trim(),"Lietuva"].join(", "));
 url.searchParams.set("format","jsonv2");url.searchParams.set("addressdetails","1");
 url.searchParams.set("limit","5");url.searchParams.set("countrycodes","lt");
 url.searchParams.set("accept-language","lt");
 const res=await fetch(url.toString(),{headers:{Accept:"application/json"},signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw Error("OpenStreetMap paieška nepasiekiama");
 const data=await res.json() as NominatimPlace[];
 const house=requestedHouseNumber(street);
 return (Array.isArray(data)?data:[]).flatMap(p=>{
   if(!p.lat||!p.lon)return [];
   const lat=Number(p.lat),lon=Number(p.lon);
   if(!valid(lat,lon))return [];
   const place=p.address||{};
   const label=p.display_name||"Vieta žemėlapyje";
   const cityMatch=label.toLocaleLowerCase("lt").includes(city.toLocaleLowerCase("lt"));
   return [{name:label,lat,lon,
     exactHouse:cityMatch&&exact(house,place.house_number),source:"OpenStreetMap" as const}];
 });
}
export async function findAddressCandidates(street:string,city:string):Promise<AddressCandidate[]>{
 const key=[street.trim().toLocaleLowerCase("lt"),city.trim().toLocaleLowerCase("lt")].join("|");
 if(cache.has(key))return cache.get(key)!;
 let first:AddressCandidate[]=[];
 let photonFailed=false;
 try{first=await photon(street,city)}catch{photonFailed=true}
 if(first.some(r=>r.exactHouse)){
   const sorted=[...first].sort((a,b)=>Number(b.exactHouse)-Number(a.exactHouse));
   cache.set(key,sorted);return sorted;
 }
 let second:AddressCandidate[]=[];
 let osmFailed=false;
 try{second=await nominatim(street,city)}catch{osmFailed=true}
 if(photonFailed&&osmFailed)throw Error("Adreso paieškos paslaugos nepasiekiamos. Pasirinkite vietą ranka žemėlapyje arba bandykite vėliau.");
 const seen=new Set<string>();
 const merged=[...second,...first].sort((a,b)=>Number(b.exactHouse)-Number(a.exactHouse))
   .filter(r=>{const key=r.lat.toFixed(5)+"|"+r.lon.toFixed(5);if(seen.has(key))return false;seen.add(key);return true});
 const result=merged.slice(0,7);
 cache.set(key,result);
 return result;
}
