import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldAlert, RotateCcw, Database, Info, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Confirm, PageHeader } from "@/components/app/ui-bits";
import { resetDemo, useAppState, isCloudMode, refreshCloudWorkspace } from "@/lib/store";
import { downloadCloudBackup } from "@/lib/cloud-backup";
export const Route=createFileRoute("/nustatymai")({component:SettingsPage});
function SettingsPage(){
 const app=useAppState();const {jobs,addresses,photos}=app;const [confirm,setConfirm]=useState(false);
 return <div><PageHeader title="Nustatymai" subtitle={isCloudMode()?"Bendri įmonės duomenys – Supabase":"DEMO V1 – vietinė demonstracija"}/>
 <div className="grid gap-4 lg:grid-cols-2">
  <section className="card-surface p-5"><h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Database className="size-5 text-primary"/> {isCloudMode()?"Supabase saugykla":"Vietinė DEMO saugykla"}</h2><p className="text-sm text-muted-foreground">{isCloudMode()?"Adresai, darbai ir personalas saugomi Supabase. Perėjus į kitą įrenginį jie įkeliami prisijungus; galima atnaujinti rankiniu būdu. Nuotraukos lauks R2.":"Adresai, darbai ir pastabos saugomi tik vietinėje naršyklėje."}</p>{isCloudMode()&&<Button type="button" variant="outline" className="mt-3" onClick={()=>void refreshCloudWorkspace().then(()=>toast.success("Duomenys atnaujinti")).catch(()=>toast.error("Nepavyko atnaujinti"))}>Atnaujinti iš debesijos</Button>}<div className="mt-4 grid grid-cols-3 gap-2 text-center">{[[addresses.length,"Adresai"],[jobs.length,"Darbai"],[photos.length,"Nuotraukos"]].map(([n,label])=><div key={label} className="rounded-lg bg-muted p-3"><div className="text-2xl font-bold">{n}</div><div className="text-xs text-muted-foreground">{label}</div></div>)}</div></section>
  <section className="card-surface p-5"><h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><ShieldAlert className="size-5 text-amber-600"/> Saugumo pastaba</h2><p className="text-sm text-muted-foreground">Prisijungimas ir administratoriaus teisės tvarkomos per Supabase Auth bei RLS. Cloudflare R2 nuotraukoms dar neprijungta; darbuotojų paskyrų, push ir vietos patikros galutinis bandymas dar laukia.</p></section>
  <section className="card-surface p-5"><h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Info className="size-5 text-primary"/> Apie demonstraciją</h2><p className="text-sm text-muted-foreground">Vienas administratoriaus lygis. Galite kurti adresus, priskirti darbus, fotografuoti, pridėti pastabas, peržiūrėti istoriją ir kalendorių.</p></section>
  {isCloudMode()&&<section className="card-surface p-5">
    <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Download className="size-5 text-primary"/> Eksportuoti bendrus duomenis</h2>
    <p className="mb-3 text-xs text-muted-foreground">Atsisiųskite vietinę JSON kopiją su adresais, darbais ir personalu. Faile gali būti konfidencialūs duomenys, įskaitant durų kodus – saugokite privačiai. Nuotraukos neįtrauktos. Tai rankinis eksportas, ne automatinis atsarginių kopijų ar atkūrimo sprendimas.</p>
    <Button variant="outline" onClick={()=>{downloadCloudBackup(app);toast.success("JSON kopija paruošta")}}><Download/> Atsisiųsti JSON</Button>
  </section>}
  {!isCloudMode()&&<section className="card-surface p-5"><h2 className="mb-3 text-lg font-semibold">Atkurti pavyzdinius duomenis</h2><p className="mb-4 text-sm text-muted-foreground">Visi šiame įrenginyje įrašyti pakeitimai ir nuotraukos bus ištrinti. Bus sukurti nauji fiktyvūs DEMO objektai.</p><Button variant="destructive" onClick={()=>setConfirm(true)}><RotateCcw/> Atkurti DEMO</Button></section>}
 </div>
 <Confirm open={confirm} onOpenChange={setConfirm} title="Atkurti DEMO duomenis?" text="Šio įrenginio adresai, darbai ir nuotraukos bus ištrinti." confirmLabel="Atkurti" onConfirm={async()=>{await resetDemo();toast.success("Pavyzdiniai duomenys atkurti")}}/>
 </div>;
}