import { useEffect, useState } from "react";
import { Cloud, ShieldCheck } from "lucide-react";
import { previewCloudWorkspace, type CloudPreview } from "@/lib/cloud-read";
const labels={
 sa_addresses:"Adresai",sa_jobs:"Darbai",sa_people:"Personalas",
 sa_photo_metadata:"Nuotraukų įrašai",sa_recruitment_links:"Skelbimai",
 sa_activity_log:"Veiksmų istorija",sa_notifications:"Pranešimai"
};
export function CloudReadStatus({organizationId}:{organizationId:string}){
 const [preview,setPreview]=useState<CloudPreview|null>(null);
 const [error,setError]=useState("");
 useEffect(()=>{
   let alive=true;
   void previewCloudWorkspace(organizationId).then(v=>{if(alive)setPreview(v)})
    .catch(()=>{if(alive)setError("Nepavyko patikrinti debesijos lentelių. Patikrinkite savo prieigą.")});
   return ()=>{alive=false};
 },[organizationId]);
 return <section className="rounded-lg border p-3">
   <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Cloud className="size-4"/> Supabase duomenys · tik skaitymas</h2>
   {error?<p className="text-sm text-destructive">{error}</p>:
     !preview?<p className="text-sm text-muted-foreground">Tikrinami bendri įmonės duomenys…</p>:
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
       {Object.entries(preview.counts).map(([table,count])=><div key={table} className="rounded-lg bg-muted/50 p-2">
         <p className="text-xs text-muted-foreground">{labels[table as keyof typeof labels]}</p>
         <p className="text-lg font-semibold tabular-nums">{count}</p>
       </div>)}
     </div>}
   <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0"/>Ši peržiūra NIEKO nekeičia. Duomenys iš naršyklės dar neperkelti. Nuotraukų failai bus prijungti per Cloudflare R2.</p>
 </section>;
}
