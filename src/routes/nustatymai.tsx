import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldAlert, RotateCcw, Database, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Confirm, PageHeader } from "@/components/app/ui-bits";
import { resetDemo, useAppState } from "@/lib/store";
export const Route=createFileRoute("/nustatymai")({component:SettingsPage});
function SettingsPage(){
 const {jobs,addresses,photos}=useAppState();const [confirm,setConfirm]=useState(false);
 return <div><PageHeader title="Nustatymai" subtitle="DEMO V1 – tik vietinė administravimo demonstracija"/>
 <div className="grid gap-4 lg:grid-cols-2">
  <section className="card-surface p-5"><h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Database className="size-5 text-primary"/> Vietinė saugykla</h2><p className="text-sm text-muted-foreground">Adresai, darbai ir pastabos saugomi šios naršyklės atmintyje. Nuotraukos saugomos IndexedDB. Duomenys tarp telefono ir kompiuterio nesinchronizuojami.</p><div className="mt-4 grid grid-cols-3 gap-2 text-center">{[[addresses.length,"Adresai"],[jobs.length,"Darbai"],[photos.length,"Nuotraukos"]].map(([n,label])=><div key={label} className="rounded-lg bg-muted p-3"><div className="text-2xl font-bold">{n}</div><div className="text-xs text-muted-foreground">{label}</div></div>)}</div></section>
  <section className="card-surface p-5"><h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><ShieldAlert className="size-5 text-amber-600"/> Saugumo pastaba</h2><p className="text-sm text-muted-foreground">Ši versija neturi prisijungimų. Nenaudokite tikrų durų kodų, klientų ar darbuotojų asmens duomenų. Prisijungimai ir Cloudflare R2 bus diegiami tik po atskiro patvirtinimo.</p></section>
  <section className="card-surface p-5"><h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Info className="size-5 text-primary"/> Apie demonstraciją</h2><p className="text-sm text-muted-foreground">Vienas administratoriaus lygis. Galite kurti adresus, priskirti darbus, fotografuoti, pridėti pastabas, peržiūrėti istoriją ir kalendorių.</p></section>
  <section className="card-surface p-5"><h2 className="mb-3 text-lg font-semibold">Atkurti pavyzdinius duomenis</h2><p className="mb-4 text-sm text-muted-foreground">Visi šiame įrenginyje įrašyti pakeitimai ir nuotraukos bus ištrinti. Bus sukurti nauji fiktyvūs DEMO objektai.</p><Button variant="destructive" onClick={()=>setConfirm(true)}><RotateCcw/> Atkurti DEMO</Button></section>
 </div>
 <Confirm open={confirm} onOpenChange={setConfirm} title="Atkurti DEMO duomenis?" text="Šio įrenginio adresai, darbai ir nuotraukos bus ištrinti." confirmLabel="Atkurti" onConfirm={async()=>{await resetDemo();toast.success("Pavyzdiniai duomenys atkurti")}}/>
 </div>;
}