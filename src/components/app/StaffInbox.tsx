import {useCallback,useEffect,useState} from "react";
import {Check,Clock3,Inbox,RefreshCw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {getCloudOrganizationId} from "@/lib/store";
import {PushSettings} from "@/components/app/PushSettings";
import {acknowledgeStaffMessage,listStaffInbox,type InboxMessage} from "@/lib/staff-messages";

export function StaffInbox(){
 const org=getCloudOrganizationId();
 const [items,setItems]=useState<InboxMessage[]>([]);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const load=useCallback(async()=>{
  if(!org)return;
  try{setItems(await listStaffInbox(org));setError("")}
  catch(e){setError(e instanceof Error?e.message:"Pranešimų nepavyko įkelti")}
 },[org]);
 useEffect(()=>{
  void load();
  const refresh=()=>{if(document.visibilityState==="visible")void load()};
  const timer=window.setInterval(refresh,45000);
  window.addEventListener("focus",refresh);
  return()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh)};
 },[load]);
 const ack=async(item:InboxMessage,reply?: "sutinku"|"nesutinku")=>{
  if(!org)return;
  setBusy(item.receipt.id);
  try{await acknowledgeStaffMessage(org,item.receipt.id,reply);await load()}
  catch(e){setError(e instanceof Error?e.message:"Nepavyko atnaujinti pranešimo")}
  finally{setBusy("")}
 };
 return <section className="space-y-3">
  <PushSettings/>
  <div className="flex items-center justify-between gap-2">
   <h2 className="text-lg font-bold">Gauti pranešimai</h2>
   <Button type="button" size="sm" variant="outline" onClick={()=>void load()}><RefreshCw className="size-4"/> Atnaujinti</Button>
  </div>
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {items.length===0?<p className="rounded-xl border p-6 text-sm text-muted-foreground">Šiuo metu pranešimų nėra.</p>:
   items.map(({message,receipt})=><article key={receipt.id} className="rounded-xl border bg-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <h3 className="font-semibold">{message.title}</h3>
     <span className={"rounded-full px-2 py-1 text-xs "+(receipt.read_at?"bg-muted":"bg-primary/10 text-primary")}>
      {receipt.response?receipt.response==="sutinku"?"Sutiko":"Nesutiko":receipt.read_at?"Perskaityta":"Nauja"}
     </span>
    </div>
    <p className="mt-2 whitespace-pre-wrap break-words text-sm">{message.body}</p>
    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
     <Clock3 className="size-3"/>{new Date(message.scheduled_for).toLocaleString("lt-LT")}
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
     {!receipt.read_at&&<Button type="button" size="sm" variant="outline" disabled={!!busy}
      onClick={()=>void ack({message,receipt})}><Check className="size-4"/> Perskaičiau</Button>}
     {message.kind==="response"&&!receipt.response&&<>
      <Button type="button" size="sm" disabled={!!busy} onClick={()=>void ack({message,receipt},"sutinku")}>Sutinku</Button>
      <Button type="button" size="sm" variant="outline" disabled={!!busy}
       onClick={()=>void ack({message,receipt},"nesutinku")}>Nesutinku</Button>
     </>}
    </div>
    {receipt.read_at&&<p className="mt-2 text-xs text-muted-foreground">Perskaityta: {new Date(receipt.read_at).toLocaleString("lt-LT")}</p>}
    {receipt.responded_at&&<p className="text-xs text-muted-foreground">Atsakyta: {new Date(receipt.responded_at).toLocaleString("lt-LT")}</p>}
   </article>)
  }
 </section>;
}
