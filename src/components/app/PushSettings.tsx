import {useEffect,useState} from "react";
import {BellRing,BellOff,ShieldCheck} from "lucide-react";
import {Button} from "@/components/ui/button";
import {getCloudOrganizationId} from "@/lib/store";
import {disableDevicePush,enableDevicePush,getPushPublicKey,needsIosHomeScreen,supportsWebPush} from "@/lib/web-push";

export function PushSettings(){
 const org=getCloudOrganizationId();
 const [key,setKey]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [status,setStatus]=useState("");
 const [checking,setChecking]=useState(false);
 const checkKey=async()=>{
  if(!org||!supportsWebPush())return;
  setChecking(true);setError("");
  try{
   const found=await getPushPublicKey();
   setKey(found);
   if(!found)setError("Push aktyvavimas serveryje dar nepasiekiamas. Pabandykite vėliau.");
  }catch{setError("Nepavyko patikrinti Push siuntėjo. Pabandykite dar kartą.")}
  finally{setChecking(false)}
 };
 useEffect(()=>{
  if(!org||!supportsWebPush())return;
  let canceled=false;
  void getPushPublicKey().then(k=>{if(!canceled)setKey(k)}).catch(()=>{});
  return ()=>{canceled=true};
 },[org]);
 const enable=async()=>{
  if(!org||!key)return;
  setBusy(true);setError("");
  try{await enableDevicePush(org,key);setStatus("Šio įrenginio Push prenumerata įjungta. Tikras pristatymas priklauso nuo serverio siuntėjo ir įrenginio leidimo.")}
  catch(e){setError(e instanceof Error?e.message:"Nepavyko įjungti Push")}
  finally{setBusy(false)}
 };
 const disable=async()=>{
  if(!org)return;
  setBusy(true);setError("");
  try{await disableDevicePush(org);setStatus("Šiame įrenginyje Push išjungta")}
  catch(e){setError(e instanceof Error?e.message:"Nepavyko išjungti Push")}
  finally{setBusy(false)}
 };
 return <section className="rounded-xl border bg-card p-4" aria-label="Įrenginio Push nustatymai">
  <h2 className="mb-2 flex items-center gap-2 font-semibold"><BellRing className="size-5"/> Telefono ir kompiuterio pranešimai</h2>
  {!supportsWebPush()?
   <p className="text-sm text-muted-foreground">Ši naršyklė nepalaiko Push. Naudokite Safari / Chrome ir saugų HTTPS adresą.</p>:
   needsIosHomeScreen()?
    <p className="text-sm text-muted-foreground">iPhone: atidarykite programėlę Safari → Dalintis → Pridėti į pradžios ekraną. Tada atverkite įdiegtą PWA ir čia įjunkite pranešimus.</p>:
   !key?
    <div className="space-y-2">
     <p className="text-sm text-muted-foreground">Push raktai ruošiami serveryje. Jei mygtukas nepasirodo, patikrinkite aktyvavimą.</p>
     <Button type="button" variant="outline" disabled={checking} onClick={()=>void checkKey()}>
      {checking?"Tikrinama…":"Patikrinti Push aktyvavimą"}</Button>
    </div>:
    <div className="flex flex-wrap gap-2">
     <Button type="button" disabled={busy} onClick={()=>void enable()}><BellRing className="size-4"/> Įjungti Push šiame įrenginyje</Button>
     <Button type="button" variant="outline" disabled={busy} onClick={()=>void disable()}><BellOff className="size-4"/> Išjungti</Button>
    </div>}
  {error&&<p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  {status&&<p role="status" className="mt-2 flex gap-2 text-sm text-primary"><ShieldCheck className="size-4"/>{status}</p>}
  <p className="mt-2 text-xs text-muted-foreground">Leidimas prašomas tik paspaudus įjungimo mygtuką. Garso atkūrimas priklauso nuo telefono nustatymų.</p>
 </section>;
}
