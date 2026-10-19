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
   if(!value.street?.trim()||!value.city?.trim()){setError("Pirma įrašykite gatvę, namo numerį ir miestą.");return;}
   if(busy)return;
   const query=addressReference(value.street,value.city);
   currentQuery.current=query;
   setBusy(true);setError("");setCandidates([]);
   try{
     const found=await findAddressCandidates(value.street,value.city);
     if(currentQuery.current!==query)return;
     setCandidates(found);
     if(!found.length){
       setError("Adresas nerastas. Patikrinkite rašybą arba ranka pasirinkite namą žemėlapyje.");
     }else{
       const best=found[0];
       mapRef.current?.setView([best.lat,best.lon],best.exactHouse?18:16);
       // Only select an automatically returned pin if the number is explicitly matched;
       // even then a human must tap the confirmation button to enable GPS.
       if(found.length===1&&best.exactHouse)updatePin(best.lat,best.lon);
     }
   }catch(e){if(currentQuery.current===query)setError(e instanceof Error?e.message:"Paieškos klaida.");}
   finally{if(currentQuery.current===query)setBusy(false);}
 };
 return <section className="min-w-0 max-w-full rounded-xl border bg-muted/20 p-3 sm:p-4">
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
   <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
     <Button type="button" variant="outline" size="sm" onClick={()=>{
         if(!open&&value.street.trim()&&value.city.trim()&&!selected)void lookup();
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
     <p className="text-[11px] text-muted-foreground">Žemėlapis: © OpenStreetMap contributors. Adreso paieška: Photon (komoot), nemokamas bandomasis serveris be veikimo garantijos. Užklausos siunčiamos tik paspaudus paiešką.</p>
   </div>}
   {value.gpsProtectionEnabled&&!confirmed&&<p className="mt-3 flex items-start gap-2 text-xs text-amber-700">
     <ShieldAlert className="size-4 shrink-0"/>GPS apsauga aktyvuojama tik patvirtinus tikslų namo žymeklį.
   </p>}
 </section>;
}
