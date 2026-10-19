import React, {useEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {supabase} from "./lib/supabase-client";
import {processImage} from "./lib/photos";
import {uploadR2Photo, downloadR2Photo} from "./lib/r2-photos";
import "./styles.css";

const PILOT=import.meta.env.VITE_SA_R2_PILOT==="admin-one-photo";
const JOB_ID=import.meta.env.VITE_SA_R2_PILOT_JOB_ID||"";
const ORG_ID=import.meta.env.VITE_SA_R2_PILOT_ORG_ID||"";
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ALLOWED=PILOT&&UUID.test(JOB_ID)&&UUID.test(ORG_ID)
  &&window.location.pathname.startsWith("/svari-aplinka-r2-pilot/");
const MAIN="https://deoxesinfo.github.io/svari-aplinka-pwa/";
type JobScope={addressId:string;organizationId:string};

function Pilot(){
 const [checking,setChecking]=useState(true);
 const [scope,setScope]=useState<JobScope|null>(null);
 const [message,setMessage]=useState("");
 const [working,setWorking]=useState(false);
 const [finished,setFinished]=useState(false);
 const [thumb,setThumb]=useState<string|null>(null);
 const once=useRef(false);

 useEffect(()=>{
   let live=true;
   (async()=>{
     if(!ALLOWED){if(live)setMessage("Testo nustatymai nepatvirtinti. Nieko nekelkite.");return}
     const {data:auth,error}=await supabase.auth.getUser();
     if(error||!auth.user){if(live)setMessage("Prisijunkite prie pagrindinės Švari Aplinka programėlės toje pačioje naršyklėje, tuomet grįžkite čia.");return}
     const {data:members,error:memberError}=await supabase.from("sa_memberships")
       .select("role,active").eq("organization_id",ORG_ID).eq("user_id",auth.user.id)
       .eq("active",true).eq("role","admin").limit(1);
     if(memberError||members?.length!==1){if(live)setMessage("Paskyra neturi patvirtintų administratoriaus teisių.");return}
     const {data:jobs,error:jobError}=await supabase.from("sa_jobs")
       .select("id,address_id,data").eq("organization_id",ORG_ID).eq("id",JOB_ID).limit(1);
     const job=jobs?.[0];
     if(jobError||!job||job.data?.gpsRequired||job.data?.deletedAt||job.data?.archivedAt){if(live)setMessage("Pasirinktas darbas nepasiekiamas arba apsaugotas GPS.");return}
     const {data:addresses,error:addressError}=await supabase.from("sa_addresses")
       .select("id,data").eq("organization_id",ORG_ID).eq("id",job.address_id).limit(1);
     const addr=addresses?.[0];
     if(addressError||!addr||addr.data?.gpsProtectionEnabled||addr.data?.deletedAt||addr.data?.archivedAt){
       if(live)setMessage("Darbo adresas nepasiekiamas arba apsaugotas GPS.");return;
     }
     if(live){setScope({addressId:addr.id,organizationId:ORG_ID});setMessage("Bandomasis darbas patikrintas. Įkėlimas lieka išjungtas, kol atskirai patvirtinsime Cloudflare pilotą.");}
   })().catch(()=>{if(live)setMessage("Nepavyko patikrinti prisijungimo ir darbo prieigos.")})
   .finally(()=>{if(live)setChecking(false)});
   return()=>{live=false};
 },[]);

 useEffect(()=>()=>{if(thumb)URL.revokeObjectURL(thumb)},[thumb]);

 async function send(file:File|undefined){
   if(!file||working||once.current||!scope)return;
   if(!file.type.startsWith("image/")){setMessage("Pasirinkite vieną nuotrauką.");return}
   once.current=true;
   setWorking(true);
   setMessage("Ruošiama viena bandomoji nuotrauka…");
   try{
     const data=await processImage(file);
     const reply=await uploadR2Photo(scope.organizationId,scope.addressId,JOB_ID,"po",data.full,data.thumb,data.width,data.height);
     const image=await downloadR2Photo(scope.organizationId,reply.id,"thumb");
     setThumb(URL.createObjectURL(image));
     setFinished(true);
     setMessage("Pavyko: viena nuotrauka išsaugota privačiame R2 ir perskaityta naudojant prisijungimą.");
   }catch(e){
     // No retry: the Worker claim may have been consumed before a partial write failed.
     setFinished(true);
     const detail=e instanceof Error?e.message:"Nežinoma API klaida";
     setMessage("Bandymas sustabdytas. NEBANDYKITE antrą kartą. "+detail);
   }finally{setWorking(false)}
 }
 return <main className="mx-auto min-h-screen max-w-md space-y-5 px-4 py-8">
   <div className="rounded-2xl border bg-card p-5 shadow-sm">
     <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Izoliuotas R2 pilotas · tik administratoriui</p>
     <h1 className="mt-2 text-2xl font-semibold">Vienos nuotraukos bandymas</h1>
     <p className="mt-2 text-sm text-muted-foreground">Ne pagrindinė programėlė. Failas nepaviešinamas. Įkėlimo įjungimas reikalauja atskiro patvirtinimo.</p>
     <p role="status" className="mt-4 rounded-lg border bg-muted/60 p-3 text-sm">{checking?"Tikrinama paskyra…":message}</p>
     {scope&&!finished&&<label className="mt-4 block">
       <span className="mb-2 block text-sm font-semibold">Pasirinkite tik vieną bandomąją nuotrauką</span>
       <input aria-label="Pasirinkti bandomąją nuotrauką" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
         disabled={working} className="block w-full rounded-lg border p-3 text-sm"
         onChange={(e)=>void send(e.currentTarget.files?.[0])}/>
     </label>}
     {thumb&&<img className="mt-4 w-full rounded-lg" src={thumb} alt="Saugiai perskaityta bandomoji nuotrauka"/>}
     <a className="mt-5 inline-block text-sm font-medium text-primary underline" href={MAIN}>Atidaryti pagrindinę programėlę</a>
   </div>
   <p className="text-center text-xs text-muted-foreground">Viena užklausa. Jokio automatinio kartojimo. Įkėlimą riboja Cloudflare ir privatus R2.</p>
 </main>;
}

const root=document.getElementById("root");
if(root)createRoot(root).render(<React.StrictMode><Pilot/></React.StrictMode>);
