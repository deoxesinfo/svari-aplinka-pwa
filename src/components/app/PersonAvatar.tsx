import { useRef, useState } from "react";
import { Camera, ImageOff, LoaderCircle, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { processImage, putPhotoBlobs, deletePhotoBlobs, isQuotaError, usePhotoUrl } from "@/lib/photos";
import { setPersonAvatar,isCloudMode } from "@/lib/store";
import type { Person } from "@/lib/types";

export function PersonAvatar({person,size="md"}: {person:Person,size?:"md"|"lg"}) {
  const {url}=usePhotoUrl(person.avatarPhotoId ?? "no-avatar", "thumb");
  return <span aria-label={"Profilio nuotrauka: "+person.name}
    className={"grid shrink-0 place-items-center overflow-hidden rounded-full border bg-primary/10 text-primary "+(size==="lg"?"size-20":"size-11")}>
    {person.avatarPhotoId && url
      ? <img src={url} alt={"Profilio nuotrauka: "+person.name} className="size-full object-cover"/>
      : <UserRound className={size==="lg"?"size-10":"size-5"}/>}
  </span>;
}

export function PersonAvatarEditor({person}:{person:Person}) {
  const ref=useRef<HTMLInputElement>(null);
  const [busy,setBusy]=useState(false);
  const upload=async(file?:File)=>{
    if(!file)return;
    if(!file.type.startsWith("image/"))return toast.error("Pasirinkite nuotraukos failą");
    if(file.size>12*1024*1024)return toast.error("Nuotrauka per didelė (daugiausia 12 MB)");
    setBusy(true);
    const id=crypto.randomUUID();
    try {
      const processed=await processImage(file);
      await putPhotoBlobs(id,processed.full,processed.thumb);
      const previous=person.avatarPhotoId;
      setPersonAvatar(person.id,id);
      if(previous) await deletePhotoBlobs(previous).catch(()=>{});
      toast.success("Profilio nuotrauka išsaugota šiame įrenginyje");
    }catch(error){
      await deletePhotoBlobs(id).catch(()=>{});
      toast.error(isQuotaError(error)?"Trūksta naršyklės atminties":"Nepavyko išsaugoti nuotraukos");
    }finally{setBusy(false);if(ref.current)ref.current.value="";}
  };
  const remove=async()=>{
    if(!person.avatarPhotoId)return;
    const old=person.avatarPhotoId;
    setPersonAvatar(person.id,undefined);
    await deletePhotoBlobs(old).catch(()=>{});
    toast.success("Profilio nuotrauka pašalinta");
  };
  if(isCloudMode())return <p className="text-xs text-muted-foreground">Darbuotojo nuotraukų įkėlimas bus įjungtas prijungus privačią Cloudflare R2 saugyklą.</p>;
  return <div className="flex flex-wrap items-center gap-3">
    <PersonAvatar key={person.avatarPhotoId||"none"} person={person} size="lg"/>
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>ref.current?.click()}>
          {busy?<LoaderCircle className="size-4 animate-spin"/>:<Camera className="size-4"/>}
          {person.avatarPhotoId?"Pakeisti nuotrauką":"Pridėti nuotrauką"}
        </Button>
        {person.avatarPhotoId && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={remove}><Trash2 className="size-4"/>Pašalinti</Button>}
      </div>
      <p className="max-w-64 text-xs text-muted-foreground">DEMO: nuotrauka sumažinama į WebP/JPEG ir laikoma tik šioje naršyklėje. Nenaudokite tikrų darbuotojų nuotraukų, kol nėra saugios prieigos.</p>
    </div>
    <input type="file" ref={ref} accept="image/*" className="hidden" aria-label="Įkelti darbuotojo nuotrauką" onChange={e=>upload(e.target.files?.[0])}/>
  </div>;
}
