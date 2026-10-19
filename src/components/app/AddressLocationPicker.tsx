import { useEffect, useRef, useState } from "react";
import { ExternalLink, LoaderCircle, MapPinned, LocateFixed, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mapsPlaceUrl } from "@/lib/maps";
import { addressReference,hasConfirmedPin } from "@/lib/address-gps";
import { findAddressCandidates,type AddressCandidate } from "@/lib/geocode-address";
import type { AddressInput } from "@/lib/store";
import "leaflet/dist/leaflet.css";

export function AddressLocationPicker({value,onChange}:{value:AddressInput;onChange:(patch:Partial<AddressInput>)=>void}){
 const node=useRef<HTMLDivElement>(null);
 const mapRef=useRef<import("leaflet").Map|null>(null);
 const markerRef=useRef<import("leaflet").Marker|null>(null);
 const markerSetRef=useRef<((lat:number,lon:number)=>void)|null>(null);
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [candidates,setCandidates]=useState<AddressCandidate[]>([]);
 const [error,setError]=useState("");
 const [locating,setLocating]=useState(false);
 const [accuracy,setAccuracy]=useState<number|null>(null);
 const [locationError,setLocationError]=useState("");
 const currentQuery=useRef(addressReference(value.street,value.city));
 const lookupRequest=useRef(0);
 const locationRequest=useRef(0);
 // Invalidate pending third-party responses when the address changes or the dialog unmounts.
 useEffect(()=>{
   const next=addressReference(value.street,value.city);
   if(next===currentQuery.current)return;
   currentQuery.current=next;
   lookupRequest.current++;
   locationRequest.current++;
   setBusy(false);setLocating(false);setError("");setLocationError("");
   setCandidates([]);setAccuracy(null);
 },[value.street,value.city]);
 useEffect(()=>()=>{lookupRequest.current++;locationRequest.current++},[]);
 const selected=value.latitude!==undefined&&value.longitude!==undefined;
 const confirmed=hasConfirmedPin(value);
 const updatePin=(lat:number,lon:number,deviceAccuracy:number|null=null)=>{
   // A map click, search result, or phone location only proposes a pin; never confirms it.
   onChange({latitude:+lat.toFixed(7),longitude:+lon.toFixed(7),gpsLocationConfirmed:false,gpsReference:""});
   setAccuracy(deviceAccuracy);
   markerSetRef.current?.(lat,lon);
   mapRef.current?.setView([lat,lon],18);
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
   if(!value.street?.trim()||!value.city?.trim()){setError("Pirma įrašykite gatvę, namo numerį ir miestą.");return;}
   if(busy)return;
   const query=addressReference(value.street,value.city);
   currentQuery.current=query;
   const request=++lookupRequest.current;
   setBusy(true);setError("");setCandidates([]);
   try{
     const found=await findAddressCandidates(value.street,value.city);
     if(currentQuery.current!==query||request!==lookupRequest.current)return;
     setCandidates(found);
     if(!found.length){
       setError("Adresas nerastas. Patikrinkite rašybą arba ranka pasirinkite namą žemėlapyje.");
     }else{
       const best=found[0];
       if(!best)return;
       mapRef.current?.setView([best.lat,best.lon],best.exactHouse?18:16);
       // Only select an automatically returned pin if the number is explicitly matched;
       // even then a human must tap the confirmation button to enable GPS.
       if(found.length===1&&best.exactHouse)updatePin(best.lat,best.lon);
     }
   }catch(e){if(currentQuery.current===query&&request===lookupRequest.current)setError(e instanceof Error?e.message:"Paieškos klaida.");}
   finally{if(currentQuery.current===query&&request===lookupRequest.current)setBusy(false);}
 };
 const locateOnPhone=()=>{
   setLocationError("");
   if(typeof navigator==="undefined"||!navigator.geolocation){
     setLocationError("Šiame įrenginyje GPS vieta nepasiekiama. Galite pažymėti namą žemėlapyje.");return;
   }
   const request=++locationRequest.current;
   const query=addressReference(value.street,value.city);
   setLocating(true);
   // No background tracking: one-time reading ONLY after a direct user tap.
   navigator.geolocation.getCurrentPosition(
     position=>{
       if(locationRequest.current!==request||query!==currentQuery.current)return;
       setLocating(false);
       const {latitude,longitude,accuracy:meters}=position.coords;
       if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||!Number.isFinite(meters)){
         setLocationError("Telefono GPS grąžino netinkamą vietą. Pasirinkite namą ranka.");return;
       }
       updatePin(latitude,longitude,Math.max(0,meters));
       setError("");
     },
     geoError=>{
       if(locationRequest.current!==request||query!==currentQuery.current)return;
       setLocating(false);
       const message=geoError.code===1
         ?"Vietos leidimas nesuteiktas. Leiskite vietos prieigą naršyklėje arba pažymėkite namą žemėlapyje."
         :geoError.code===3
         ?"Nepavyko laiku nustatyti vietos. Bandykite lauke arba pažymėkite namą žemėlapyje."
         :"Telefono vieta laikinai nepasiekiama. Pažymėkite namą žemėlapyje.";
       setLocationError(message);
     },
     {enableHighAccuracy:true,maximumAge:0,timeout:15000}
   );
 };
 return <section className="min-w-0 max-w-full rounded-xl border bg-muted/20 p-3 sm:p-4">
   <label className="flex cursor-pointer items-start gap-3">
     <input type="checkbox" className="mt-1 size-5 shrink-0 accent-primary"
       checked={Boolean(value.gpsProtectionEnabled)} onChange={e=>{
         onChange({gpsProtectionEnabled:e.target.checked});
         if(e.target.checked)setOpen(true);
       }}/>
     <span><strong className="text-sm">Apsaugoti nuotraukas ir darbus pagal GPS</strong>
       <span className="mt-1 block text-xs text-muted-foreground">Pagal nutylėjimą išjungta. Įjungus reikia patvirtinti tikslų namo žymeklį.</span>
     </span>
   </label>
   <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
     <Button type="button" variant="outline" size="sm" onClick={()=>{
         setError("");setLocationError("");
         setOpen(x=>!x);
       }}>
       <MapPinned className="size-4"/>{open?"Uždaryti žemėlapį":"Pasirinkti tikslią vietą"}
     </Button>
     {confirmed&&<span className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><CheckCircle2 className="size-4"/>Vieta patvirtinta</span>}
   </div>
   {open&&<div className="mt-3 min-w-0 space-y-3">
     <Button type="button" variant="outline" disabled={busy} onClick={()=>void lookup()} className="w-full">
       {busy?<LoaderCircle className="size-4 animate-spin"/>:<LocateFixed className="size-4"/>}
       Ieškoti pagal adresą
     </Button>
     <Button type="button" variant="outline" disabled={locating} onClick={locateOnPhone} className="min-h-11 w-full">
       {locating?<LoaderCircle className="size-4 animate-spin"/>:<LocateFixed className="size-4"/>}
       {locating?"Nustatoma telefono vieta…":"Naudoti mano GPS vietą"}
     </Button>
     {locationError&&<p role="alert" className="text-xs text-destructive">{locationError}</p>}
     {accuracy!==null&&selected&&<p aria-live="polite" className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
       Telefono GPS tikslumas: apie {Math.round(accuracy)} m.
       {accuracy>50?" Vieta gali būti netiksli – pataisykite žymeklį ant tikrojo namo.":" Patikrinkite žymeklį žemėlapyje prieš patvirtindami."}
       GPS apsauga dar nepatvirtinta.
     </p>}
     {candidates.length>0&&<div className="min-w-0 space-y-1 rounded-lg border bg-card p-2">
       <p className="text-xs font-semibold">Pasirinkite tikslų namą. Apytikslis gatvės rezultatas GPS apsaugos nepatvirtina:</p>
       {candidates.map((candidate,i)=><button key={i} type="button" onClick={()=>updatePin(candidate.lat,candidate.lon)}
         className="block w-full min-w-0 rounded-md border border-transparent px-2 py-2 text-left text-xs hover:border-primary/30 hover:bg-muted">
           <span className="block break-words font-medium">{candidate.name||"Vieta "+(i+1)}</span>
           <span className={candidate.exactHouse?"text-primary":"text-amber-700"}>{candidate.exactHouse?"Atitinka namo numerį":"Apytikslė vieta – patikslinkite žymeklį"} · {candidate.source}</span>
         </button>)}
     </div>}
     {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
     <div ref={node} className="relative z-0 h-72 w-full min-w-0 max-w-full overflow-hidden rounded-lg border bg-muted sm:h-80" aria-label="Žemėlapis – palieskite tikslų namą arba perkelkite žymeklį"/>
     <p className="text-xs text-muted-foreground">Žemėlapyje bakstelėkite ant namo arba nutempkite žymeklį. Tai svarbu, nes automatinė paieška gali parodyti tik gatvę.</p>
     {selected&&<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
       <Button type="button" size="sm" className="min-h-11 w-full sm:w-auto" onClick={()=>onChange({gpsLocationConfirmed:true,gpsReference:addressReference(value.street,value.city)})}>
         <CheckCircle2 className="size-4"/>Patvirtinti namo vietą
       </Button>
       <a className="inline-flex min-h-11 items-center justify-center gap-1 text-xs font-medium text-primary underline" target="_blank" rel="noopener noreferrer"
         href={mapsPlaceUrl(value.street,value.city,value.latitude,value.longitude,true)}>
         <ExternalLink className="size-4"/>Patikrinti Google Maps
       </a>
     </div>}
     <p className="text-[11px] text-muted-foreground">Žemėlapis: © OpenStreetMap contributors. Adreso paieška: Photon (komoot) ir atsarginė OpenStreetMap Nominatim. Paslaugos gali būti laikinai nepasiekiamos. Užklausos siunčiamos tik paspaudus paiešką.</p>
   </div>}
   {value.gpsProtectionEnabled&&!confirmed&&<p className="mt-3 flex items-start gap-2 text-xs text-amber-700">
     <ShieldAlert className="size-4 shrink-0"/>GPS apsauga aktyvuojama tik patvirtinus tikslų namo žymeklį.
   </p>}
 </section>;
}
