import { useEffect, useRef, useState } from "react";
import { ExternalLink, LoaderCircle, MapPinned, LocateFixed, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mapsPlaceUrl } from "@/lib/maps";
import { addressReference,hasConfirmedPin } from "@/lib/address-gps";
import type { AddressInput } from "@/lib/store";
import "leaflet/dist/leaflet.css";

type Result={name:string;lat:number;lon:number};
type PhotonFeature={geometry?:{coordinates?:unknown};properties?:Record<string,unknown>};
const cache=new Map<string,Result[]>();
let lastSearchAt=0;
function label(feature:PhotonFeature){
 const p=feature.properties||{};
 return [p.name,p.street,p.housenumber,p.city,p.state,p.country].filter(x=>typeof x==="string"&&x).join(", ");
}
async function findPlaces(street:string,city:string):Promise<Result[]>{
 const key=addressReference(street,city);
 if(cache.has(key))return cache.get(key)!;
 // Only one admin-initiated lookup per second; no autocomplete or bulk searches.
 if(Date.now()-lastSearchAt<1200)throw Error("Palaukite sekundę ir bandykite dar kartą.");
 lastSearchAt=Date.now();
 const request=new URL("https://photon.komoot.io/api/");
 request.searchParams.set("q",[street,city,"Lithuania"].join(", "));
 request.searchParams.set("lang","lt");
 request.searchParams.set("limit","5");
 const response=await fetch(request.toString(),{headers:{Accept:"application/json"}});
 if(!response.ok)throw Error("Žemėlapio paieškos paslauga dabar nepasiekiama.");
 const payload=await response.json() as {features?:PhotonFeature[]};
 const results=(payload.features||[]).flatMap(feature=>{
   const pair=feature.geometry?.coordinates;
   if(!Array.isArray(pair)||pair.length<2)return [];
   const [lon,lat]=pair;
   if(typeof lat!=="number"||typeof lon!=="number"||!Number.isFinite(lat)||!Number.isFinite(lon))return [];
   return [{lat,lon,name:label(feature)}];
 });
 cache.set(key,results);
 return results;
}

export function AddressLocationPicker({value,onChange}:{value:AddressInput;onChange:(patch:Partial<AddressInput>)=>void}){
 const node=useRef<HTMLDivElement>(null);
 const mapRef=useRef<import("leaflet").Map|null>(null);
 const markerRef=useRef<import("leaflet").Marker|null>(null);
 const markerSetRef=useRef<((lat:number,lon:number)=>void)|null>(null);
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [candidates,setCandidates]=useState<Result[]>([]);
 const [error,setError]=useState("");
 const selected=value.latitude!==undefined&&value.longitude!==undefined;
 const confirmed=hasConfirmedPin(value);
 const updatePin=(lat:number,lon:number)=>{
   onChange({latitude:+lat.toFixed(7),longitude:+lon.toFixed(7),gpsLocationConfirmed:false,gpsReference:undefined});
   markerSetRef.current?.(lat,lon);
 };
 useEffect(()=>{
   if(!open||!node.current)return;
   let active=true;
   let map:import("leaflet").Map|undefined;
   void import("leaflet").then(L=>{
     if(!active||!node.current)return;
     const loc:[number,number]=selected?[value.latitude!,value.longitude!]:[54.8985,23.9036];
     map=L.map(node.current,{scrollWheelZoom:false}).setView(loc,selected?18:12);
     mapRef.current=map;
     L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
       attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
       maxZoom:19
     }).addTo(map);
     const pinIcon=L.divIcon({className:"",html:'<div style="display:grid;place-items:center;width:28px;height:34px;font-size:25px;text-shadow:0 1px 4px #fff">📍</div>',iconSize:[28,34],iconAnchor:[14,32]});
     const setMarker=(lat:number,lon:number)=>{
       if(markerRef.current)markerRef.current.setLatLng([lat,lon]);
       else{
         markerRef.current=L.marker([lat,lon],{draggable:true,icon:pinIcon}).addTo(map!);
         markerRef.current.on("dragend",()=>{
           const pos=markerRef.current!.getLatLng();updatePin(pos.lat,pos.lng);
         });
       }
     };
     markerSetRef.current=setMarker;
     if(selected)setMarker(value.latitude!,value.longitude!);
     map.on("click",(e:import("leaflet").LeafletMouseEvent)=>{setMarker(e.latlng.lat,e.latlng.lng);updatePin(e.latlng.lat,e.latlng.lng)});
     requestAnimationFrame(()=>{if(active)map?.invalidateSize()});
   }).catch(()=>setError("Nepavyko atidaryti žemėlapio."));
   return()=>{active=false;markerRef.current=null;markerSetRef.current=null;mapRef.current=null;map?.remove()};
 // Initialize on opening; pin is updated without tearing down the map.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[open]);
 useEffect(()=>{
   if(open&&mapRef.current&&selected){
     mapRef.current.setView([value.latitude!,value.longitude!],17);
     markerSetRef.current?.(value.latitude!,value.longitude!);
   }
 },[open,selected,value.latitude,value.longitude]);
 const lookup=async()=>{
   if(!value.street?.trim()||!value.city?.trim()){setError("Pirmiausia įrašykite gatvę, namo numerį ir miestą.");return}
   setBusy(true);setError("");setCandidates([]);
   try{
     const found=await findPlaces(value.street,value.city);
     if(!found.length)setError("Vieta nerasta. Patikslinkite adresą arba žemėlapyje pažymėkite namą ranka.");
     setCandidates(found);
     if(found.length===1)updatePin(found[0].lat,found[0].lon);
   }catch(e){setError(e instanceof Error?e.message:"Paieškos klaida.")}
   finally{setBusy(false)}
 };
 return <section className="rounded-xl border bg-muted/20 p-3 sm:p-4">
   <label className="flex cursor-pointer items-start gap-3">
     <input type="checkbox" className="mt-1 size-5 shrink-0 accent-primary"
       checked={Boolean(value.gpsProtectionEnabled)} onChange={e=>{
         onChange({gpsProtectionEnabled:e.target.checked});
         if(e.target.checked){
           setOpen(true);
           if(value.street.trim()&&value.city.trim())void lookup();
         }
       }}/>
     <span><strong className="text-sm">Apsaugoti nuotraukas ir darbus pagal GPS</strong>
       <span className="mt-1 block text-xs text-muted-foreground">Pagal nutylėjimą išjungta. Įjungus reikia patvirtinti tikslų namo žymeklį.</span>
     </span>
   </label>
   <div className="mt-3 flex flex-wrap items-center gap-2">
     <Button type="button" variant="outline" size="sm" onClick={()=>{
         if(!open&&value.street.trim()&&value.city.trim()&&!selected)void lookup();
         setOpen(x=>!x);
       }}>
       <MapPinned className="size-4"/>{open?"Uždaryti žemėlapį":"Pasirinkti tikslią vietą"}
     </Button>
     {confirmed&&<span className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><CheckCircle2 className="size-4"/>Vieta patvirtinta</span>}
   </div>
   {open&&<div className="mt-3 space-y-3">
     <Button type="button" variant="outline" disabled={busy} onClick={()=>void lookup()} className="w-full">
       {busy?<LoaderCircle className="size-4 animate-spin"/>:<LocateFixed className="size-4"/>}
       Ieškoti pagal adresą
     </Button>
     {candidates.length>0&&<div className="space-y-1 rounded-lg border bg-card p-2">
       <p className="text-xs font-semibold">Pasirinkite tinkamiausią rezultatą, tada patikslinkite žymeklį:</p>
       {candidates.map((candidate,i)=><button key={i} type="button" onClick={()=>updatePin(candidate.lat,candidate.lon)}
         className="block w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted">{candidate.name||"Vieta "+(i+1)}</button>)}
     </div>}
     {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
     <div ref={node} className="z-0 h-64 w-full overflow-hidden rounded-lg border bg-muted" aria-label="Žemėlapis – palieskite tikslų namą arba perkelkite žymeklį"/>
     <p className="text-xs text-muted-foreground">Žemėlapyje bakstelėkite ant namo arba nutempkite žymeklį. Tai svarbu, nes automatinė paieška gali parodyti tik gatvę.</p>
     {selected&&<div className="flex flex-wrap gap-2">
       <Button type="button" size="sm" onClick={()=>onChange({gpsLocationConfirmed:true,gpsReference:addressReference(value.street,value.city)})}>
         <CheckCircle2 className="size-4"/>Patvirtinti namo vietą
       </Button>
       <a className="inline-flex items-center gap-1 text-xs font-medium text-primary underline" target="_blank" rel="noopener noreferrer"
         href={mapsPlaceUrl(value.street,value.city,value.latitude,value.longitude,true)}>
         <ExternalLink className="size-4"/>Patikrinti Google Maps
       </a>
     </div>}
     <p className="text-[11px] text-muted-foreground">Žemėlapis: © OpenStreetMap contributors. Adreso paieška: Photon (komoot), nemokamas bandomasis serveris be veikimo garantijos. Užklausos siunčiamos tik paspaudus paiešką.</p>
   </div>}
   {value.gpsProtectionEnabled&&!confirmed&&<p className="mt-3 flex items-start gap-2 text-xs text-amber-700">
     <ShieldAlert className="size-4 shrink-0"/>GPS apsauga aktyvuojama tik patvirtinus tikslų namo žymeklį.
   </p>}
 </section>;
}
