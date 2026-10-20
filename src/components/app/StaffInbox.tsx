import {useCallback,useEffect,useRef,useState,type TouchEvent} from "react";
import {Check,Clock3,RefreshCw,Trash2,Undo2,MessageCircle,Inbox} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Confirm} from "@/components/app/ui-bits";
import {getCloudOrganizationId} from "@/lib/store";
import {PushSettings} from "@/components/app/PushSettings";
import {acknowledgeStaffMessage,hideStaffMessage,listStaffInbox,purgeOwnStaffMessage,replyToStaffMessage,type InboxMessage} from "@/lib/staff-messages";

export function StaffInbox(){
 const org=getCloudOrganizationId();
 const [items,setItems]=useState<InboxMessage[]>([]);
 const [view,setView]=useState<"gauti"|"trash">("gauti");
 const [marked,setMarked]=useState<string[]>([]);
 const [purgeConfirm,setPurgeConfirm]=useState(false);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [replyTexts,setReplyTexts]=useState<Record<string,string>>({});
 const [replyOpen,setReplyOpen]=useState<string|null>(null);
 const [swiped,setSwiped]=useState<string|null>(null);
 const [toHide,setToHide]=useState<InboxMessage|null>(null);
 const [undo,setUndo]=useState<{id:string;title:string}|null>(null);
 const touch=useRef<{id:string;x:number;y:number}|null>(null);
 const load=useCallback(async()=>{
  if(!org)return;
  try{setItems(await listStaffInbox(org,view));setError("")}
  catch(e){setError(e instanceof Error?e.message:"Pranešimų nepavyko įkelti")}
 },[org,view]);
 useEffect(()=>{
  void load();
  const refresh=()=>{if(document.visibilityState==="visible")void load()};
  const timer=window.setInterval(refresh,45000);
  window.addEventListener("focus",refresh);
  return()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh)};
 },[load]);
 const refreshed=async()=>{await load();window.dispatchEvent(new Event("sa-message-updated"))};
 const ack=async(item:InboxMessage,reply?: "sutinku"|"nesutinku")=>{
  if(!org||busy)return;
  setBusy(item.receipt.id);setError("");
  try{await acknowledgeStaffMessage(org,item.receipt.id,reply);await refreshed()}
  catch(e){setError(e instanceof Error?e.message:"Nepavyko atnaujinti pranešimo")}
  finally{setBusy("")}
 };
 const reply=async(item:InboxMessage)=>{
  if(!org||busy)return;
  const text=(replyTexts[item.receipt.id]||"").trim();
  if(!text||text.length>300){setError("Įveskite atsakymą iki 300 simbolių");return}
  setBusy(item.receipt.id);setError("");
  try{
   await replyToStaffMessage(org,item.receipt.id,text);
   setReplyOpen(null);await refreshed();
  }catch(e){setError(e instanceof Error?e.message:"Nepavyko atsakyti")}
  finally{setBusy("")}
 };
 const hide=async()=>{
  if(!org||!toHide||busy)return;
  const entry=toHide;setBusy(entry.receipt.id);setError("");
  try{
   await hideStaffMessage(org,entry.receipt.id);
   setToHide(null);setSwiped(null);
   setUndo({id:entry.receipt.id,title:entry.message.title});
   await refreshed();
  }catch(e){setError(e instanceof Error?e.message:"Nepavyko pašalinti iš sąrašo")}
  finally{setBusy("")}
 };
 const restore=async()=>{
  if(!org||!undo||busy)return;
  const target=undo;setBusy(target.id);
  try{await hideStaffMessage(org,target.id,false);setUndo(null);await refreshed()}
  catch(e){setError(e instanceof Error?e.message:"Nepavyko atkurti")}
  finally{setBusy("")}
 };
 const changeView=(next:"gauti"|"trash")=>{
  setView(next);setMarked([]);setSwiped(null);setUndo(null);setError("");
 };
 const permanentlyRemove=async()=>{
  if(!org||busy||!marked.length)return;
  const ids=[...marked];setBusy("purging");setError("");
  let removed=0;
  try{
   for(const id of ids){await purgeOwnStaffMessage(org,id);removed++;}
   setMarked([]);setPurgeConfirm(false);await refreshed();
  }catch(e){
   setPurgeConfirm(false);setMarked([]);
   setError((e instanceof Error?e.message:"Trinti nepavyko")+
    (removed?" ("+removed+" iš "+ids.length+" pašalinta)":""));
   await refreshed();
  }finally{setBusy("")}
 };
 const onStart=(e:TouchEvent<HTMLDivElement>,id:string)=>{
  const point=e.changedTouches[0];if(point)touch.current={id,x:point.clientX,y:point.clientY};
 };
 const onEnd=(e:TouchEvent<HTMLDivElement>,id:string)=>{
  const t=touch.current;const point=e.changedTouches[0];touch.current=null;
  if(!t||!point||t.id!==id)return;
  const dx=point.clientX-t.x,dy=point.clientY-t.y;
  if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.3)setSwiped(dx<0?id:null);
 };
 return <section className="space-y-3">
  <PushSettings/>
  <div className="flex items-center justify-between gap-2">
   <h2 className="text-lg font-bold">{view==="trash"?"Pranešimų šiukšlinė":"Gauti pranešimai"}</h2>
   <div className="flex items-center gap-2">
    <Button type="button" size="sm" variant="outline"
     aria-label={view==="trash"?"Grįžti į gautus pranešimus":"Atidaryti pranešimų šiukšlinę"}
     onClick={()=>changeView(view==="trash"?"gauti":"trash")}>
     {view==="trash"?<><Inbox className="size-4"/> Gauti</>:<Trash2 className="size-4"/>}
    </Button>
    <Button type="button" size="sm" variant="outline" onClick={()=>void load()}><RefreshCw className="size-4"/> Atnaujinti</Button>
   </div>
  </div>
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {view==="gauti"&&undo&&<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/50 p-3 text-sm" role="status">
   <span>Pranešimas „{undo.title}“ paslėptas tik tavo sąraše.</span>
   <Button variant="outline" size="sm" disabled={!!busy} onClick={()=>void restore()}><Undo2 className="size-4"/> Atkurti</Button>
  </div>}
  {view==="trash"&&items.length>0&&<div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
   <label className="flex items-center gap-2 text-sm">
    <input type="checkbox" checked={marked.length===items.length}
     onChange={e=>setMarked(e.target.checked?items.map(x=>x.receipt.id):[])}/>
    Pažymėti visus ({items.length})
   </label>
   <Button size="sm" variant="destructive" disabled={!!busy||!marked.length} onClick={()=>setPurgeConfirm(true)}>
    <Trash2 className="size-4"/> Ištrinti pažymėtus visam laikui ({marked.length})
   </Button>
  </div>}
  {items.length===0?<p className="rounded-xl border p-6 text-sm text-muted-foreground">{view==="trash"?"Šiukšlinė tuščia.":"Šiuo metu pranešimų nėra."}</p>:
   items.map(({message,receipt})=><div key={receipt.id} className="relative overflow-hidden rounded-xl"
    onTouchStart={e=>{if(view==="gauti")onStart(e,receipt.id)}}
    onTouchEnd={e=>{if(view==="gauti")onEnd(e,receipt.id)}}>
    {view==="gauti"&&<div className="absolute inset-y-0 right-0 flex w-28 items-stretch bg-destructive/10 p-1">
     <button type="button" disabled={!!busy} aria-label={"Paslėpti pranešimą "+message.title}
      tabIndex={swiped===receipt.id?0:-1} onClick={()=>setToHide({message,receipt})}
      className="flex w-full items-center justify-center gap-1 rounded-lg bg-destructive text-sm font-semibold text-destructive-foreground">
      <Trash2 className="size-4"/> Į šiukšlinę</button>
    </div>}
    <article className="relative rounded-xl border bg-card p-4 transition-transform duration-200 ease-out"
      style={{transform:view==="gauti"&&swiped===receipt.id?"translateX(-112px)":"translateX(0)"}}>
     <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
       {view==="trash"&&<input type="checkbox" aria-label={"Pažymėti "+message.title}
        checked={marked.includes(receipt.id)} onChange={e=>setMarked(prev=>e.target.checked?[...prev,receipt.id]:prev.filter(x=>x!==receipt.id))}/>}
       <h3 className="font-semibold">{message.title}</h3>
      </div>
      <span className={"rounded-full px-2 py-1 text-xs "+(receipt.read_at?"bg-muted":"bg-primary/10 text-primary")}>
       {receipt.response?receipt.response==="sutinku"?"Sutiko":"Nesutiko":receipt.read_at?"Perskaityta":"Nauja"}
      </span>
     </div>
     <p className="mt-2 whitespace-pre-wrap break-words text-sm">{message.body}</p>
     <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
      <Clock3 className="size-3"/>{new Date(message.scheduled_for).toLocaleString("lt-LT")}
     </div>
     {view==="trash"?<div className="mt-3 flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={!!busy}
       onClick={()=>void (async()=>{
        if(!org)return;setBusy(receipt.id);setError("");
        try{await hideStaffMessage(org,receipt.id,false);setMarked(old=>old.filter(x=>x!==receipt.id));await refreshed()}
        catch(e){setError(e instanceof Error?e.message:"Nepavyko atkurti")}
        finally{setBusy("")}
       })()}><Undo2 className="size-4"/> Atkurti</Button>
      <Button size="sm" variant="destructive" disabled={!!busy}
       onClick={()=>{setMarked([receipt.id]);setPurgeConfirm(true)}}>
       <Trash2 className="size-4"/> Ištrinti visam laikui
      </Button>
     </div>:<div className="mt-3 flex flex-wrap gap-2">
      {!receipt.read_at&&<Button type="button" size="sm" variant="outline" disabled={!!busy}
       onClick={()=>void ack({message,receipt})}><Check className="size-4"/> Perskaičiau</Button>}
      {message.kind==="response"&&!receipt.response&&<>
       <Button type="button" size="sm" disabled={!!busy} onClick={()=>void ack({message,receipt},"sutinku")}>Sutinku</Button>
       <Button type="button" size="sm" variant="outline" disabled={!!busy}
        onClick={()=>void ack({message,receipt},"nesutinku")}>Nesutinku</Button>
      </>}
      {!receipt.reply_text&&<Button type="button" size="sm" variant="outline" disabled={!!busy}
       onClick={()=>setReplyOpen(replyOpen===receipt.id?null:receipt.id)}><MessageCircle className="size-4"/> Atsakyti</Button>}
      <Button type="button" size="sm" variant="ghost" className="sm:hidden"
       onClick={()=>setToHide({message,receipt})}><Trash2 className="size-4"/> Į šiukšlinę</Button>
     </div>}
     {view==="gauti"&&replyOpen===receipt.id&&!receipt.reply_text&&<div className="mt-3 space-y-2">
      <label className="block text-sm font-medium" htmlFor={"sa-reply-"+receipt.id}>Trumpas atsakymas (iki 300 simbolių)</label>
      <textarea id={"sa-reply-"+receipt.id} value={replyTexts[receipt.id]||""} maxLength={300} rows={2}
       className="w-full rounded-lg border bg-card p-3 text-base" placeholder="Pvz., atlikau, nespėsiu…" onChange={e=>setReplyTexts(p=>({...p,[receipt.id]:e.target.value}))}/>
      <Button size="sm" disabled={!!busy||!(replyTexts[receipt.id]||"").trim()} onClick={()=>void reply({message,receipt})}>Siųsti atsakymą</Button>
     </div>}
     {receipt.reply_text&&<p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
      <strong>Mano atsakymas:</strong> {receipt.reply_text}
      {receipt.replied_at&&<span className="block text-xs text-muted-foreground">{new Date(receipt.replied_at).toLocaleString("lt-LT")}</span>}
     </p>}
     {receipt.read_at&&<p className="mt-2 text-xs text-muted-foreground">Perskaityta: {new Date(receipt.read_at).toLocaleString("lt-LT")}</p>}
     {receipt.responded_at&&<p className="text-xs text-muted-foreground">Atsakyta: {new Date(receipt.responded_at).toLocaleString("lt-LT")}</p>}
    </article>
   </div>)
  }
  <Confirm open={!!toHide} onOpenChange={open=>{if(!open)setToHide(null)}} title="Perkelti pranešimą į šiukšlinę?"
   text="Pranešimas liks jūsų šiukšlinėje ir jį galėsite atkurti. Kitų gavėjų žinutės nekeičiamos."
   confirmLabel="Į šiukšlinę" onConfirm={()=>void hide()}/>
  <Confirm open={purgeConfirm} onOpenChange={setPurgeConfirm} title={"Galutinai ištrinti "+marked.length+" pranešimų?"}
   text="Šių asmeninių pranešimų kopijų atkurti nebegalėsite. Supabase pašalins jūsų gavėjo įrašus ir atsakymų tekstus. Siuntėjo originalai, kitų gavėjų pranešimai ir minimalus administratoriaus įvykių auditas liks."
   confirmLabel="Taip, ištrinti visam laikui" onConfirm={()=>void permanentlyRemove()}/>
 </section>;
}
