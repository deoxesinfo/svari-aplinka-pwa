import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Images, Search } from "lucide-react";
import { useAppState,isCloudMode } from "@/lib/store";
import { PhotoGrid } from "@/components/app/Photos";
import { EmptyState, PageHeader, inputCls } from "@/components/app/ui-bits";
export const Route=createFileRoute("/nuotraukos")({component:PhotosPage});
function PhotosPage(){
 const {addresses,photos}=useAppState();const [search,setSearch]=useState("");
 const groups=addresses.map(a=>({address:a,photos:photos.filter(p=>p.addressId===a.id)})).filter(x=>x.photos.length &&(x.address.street+" "+x.address.city).toLocaleLowerCase("lt").includes(search.toLocaleLowerCase("lt")));
 return <div><PageHeader title="Nuotraukos" subtitle={isCloudMode()?"Privačioje Cloudflare R2 saugykloje: "+photos.length+" nuotraukų":"Pridėta šiame įrenginyje: "+photos.length+" · DEMO"}/>
 <div className="relative mb-5"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><input className={inputCls+" pl-10"} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtruoti pagal adresą…" aria-label="Ieškoti nuotraukų"/></div>
 {groups.length?groups.map(g=><section key={g.address.id} className="card-surface mb-4 p-4"><div className="mb-3 flex flex-wrap items-center justify-between"><Link to="/adresai/$addressId" params={{addressId:g.address.id}} className="font-semibold text-primary hover:underline">{g.address.street}, {g.address.city}</Link><span className="text-xs text-muted-foreground">{g.photos.length} nuotraukų</span></div><PhotoGrid photos={g.photos}/></section>):<EmptyState icon={<Images className="size-8"/>} title="Nuotraukų nerasta" text="Atidarykite adresą arba darbą ir pridėkite nuotraukas."/>}
 </div>;
}