import {createFileRoute} from "@tanstack/react-router";
import {useCallback,useEffect,useMemo,useState,type FormEvent} from "react";
import {Send,Clock,MessageSquare} from "lucide-react";
import {Button} from "@/components/ui/button";
import {PageHeader,inputCls,textareaCls} from "@/components/app/ui-bits";
import {StaffInbox} from "@/components/app/StaffInbox";
import {getCloudRole} from "@/lib/cloud-sync";
import {getCloudOrganizationId,isCloudMode,useAppState} from "@/lib/store";
import {listSentStaffMessages,listStaffRecipients,sendStaffMessage,
 type StaffRecipient,type StaffMessage,type MessageReceipt,type MessageKind} from "@/lib/staff-messages";

export const Route=createFileRoute("/pranesimai")({component:MessagesPage});
const KINDS:Record<MessageKind,string>={
 info:"Informuoti",read:"Reikia patvirtinti, kad perskaitė",response:"Reikia atsakymo",
};
function MessagesPage(){
 useAppState();
 const org=getCloudOrganizationId();
 const admin=isCloudMode()&&getCloudRole()==="admin";
 const [recipients,setRecipients]=useState<StaffRecipient[]>([]);
 const [selected,setSelected]=useState<string[]>([]);
 const [title,setTitle]=useState("");
 const [body,setBody]=useState("");
 const [kind,setKind]=useState<MessageKind>("info");
 const [schedule,setSchedule]=useState("");
 const [scheduled,setScheduled]=useState(false);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [messages,setMessages]=useState<StaffMessage[]>([]);
 const [receipts,setReceipts]=useState<MessageReceipt[]>([]);
 const [tab,setTab]=useState<"gauti"|"kurti"|"issiusti">("gauti");
 const labels=useMemo(()=>new Map(recipients.map(p=>[p.userId,p.name])),[recipients]);
 const refresh=useCallback(async()=>{
  if(!org||!admin)return;
  try{
   const [people,outbox]=await Promise.all([listStaffRecipients(org),listSentStaffMessages(org)]);
   setRecipients(people);setMessages(outbox.messages);setReceipts(outbox.receipts);setError("");
  }catch(e){setError(e instanceof Error?e.message:"Duomenų nepavyko atnaujinti")}
 },[org,admin]);
 useEffect(()=>{void refresh();},[refresh]);
 const send=async(e:FormEvent)=>{
  e.preventDefault();
  if(!org||!admin||sending)return;
  let sendAt:string|undefined;
  if(scheduled){
   const parsed=new Date(schedule);
   if(!schedule||Number.isNaN(parsed.getTime())||parsed.getTime()<Date.now()-60000){
    setError("Pasirinkite būsimą siuntimo datą ir laiką");return;
   }
   sendAt=parsed.toISOString();
  }
  setSending(true);setError("");setSuccess("");
  try{
   await sendStaffMessage(org,{title,body,kind,recipients:selected,...(sendAt?{sendAt}:{})});
   setSuccess(scheduled?"Pranešimas suplanuotas":"Pranešimas įrašytas ir pasiekiamas gavėjams");
   setTitle("");setBody("");setSelected([]);setScheduled(false);setSchedule("");
   await refresh();
   setTab("issiusti");
  }catch(e){setError(e instanceof Error?e.message:"Pranešimo išsiųsti nepavyko")}
  finally{setSending(false)}
 };
 if(!isCloudMode()||!org)return <div className="p-4">Pranešimai prieinami tik prisijungus prie įmonės paskyros.</div>;
 return <div className="space-y-6">
  <PageHeader title="Pranešimai" subtitle={admin?"Asmeninės žinutės, planavimas ir gavėjų būsenos":"Gauti įmonės pranešimai"}/>
  {admin&&<>
   <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Pranešimų skiltys">
    {([["gauti","Gauti"],["kurti","Kurti"],["issiusti","Išsiųsti"]] as const).map(([key,label])=><button
     key={key} type="button" role="tab" aria-selected={tab===key} onClick={()=>{setTab(key);if(key==="issiusti")void refresh()}}
     className={"min-h-11 rounded-lg border px-2 text-sm font-semibold "+(tab===key?"border-primary bg-primary text-primary-foreground":"bg-card")}>{label}</button>)}
   </div>
   {tab==="gauti"&&<StaffInbox/>}
   {tab==="kurti"&&<section className="rounded-xl border bg-card p-4 sm:p-6">
    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Send className="size-5"/> Naujas pranešimas</h2>
    <form className="space-y-4" onSubmit={e=>void send(e)}>
     <div>
      <label className="mb-1 block text-sm font-medium">Gavėjai</label>
      {recipients.length===0?<p className="text-sm text-amber-700">Dar nėra aktyvių įmonės paskyrų. Gavėjas privalo turėti prisijungimą.</p>:
      <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
       {recipients.map(p=><label key={p.userId} className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={selected.includes(p.userId)} onChange={e=>
         setSelected(old=>e.target.checked?[...old,p.userId]:old.filter(id=>id!==p.userId))}/>
        <span>{p.name}</span>
       </label>)}
      </div>}
     </div>
     <label className="block text-sm font-medium">Pavadinimas
      <input required maxLength={120} className={inputCls+" mt-1"} value={title}
       onChange={e=>setTitle(e.target.value)} placeholder="Svarbi informacija"/>
     </label>
     <label className="block text-sm font-medium">Tekstas
      <textarea required maxLength={2000} rows={4} className={textareaCls+" mt-1"}
       value={body} onChange={e=>setBody(e.target.value)}/>
     </label>
     <label className="block text-sm font-medium">Pranešimo tipas
      <select className={inputCls+" mt-1"} value={kind} onChange={e=>setKind(e.target.value as MessageKind)}>
       {Object.entries(KINDS).map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
     </label>
     <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={scheduled} onChange={e=>setScheduled(e.target.checked)}/>
      Suplanuoti siuntimo laiką
     </label>
     {scheduled&&<label className="block text-sm font-medium">Siuntimo data ir laikas
      <input type="datetime-local" required className={inputCls+" mt-1"} value={schedule}
       onChange={e=>setSchedule(e.target.value)}/>
     </label>}
     {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
     {success&&<p role="status" className="text-sm text-primary">{success}</p>}
     <Button type="submit" disabled={sending||!selected.length||!title.trim()||!body.trim()}>
      {scheduled?<Clock className="size-4"/>:<Send className="size-4"/>}
      {sending?"Siunčiama…":scheduled?"Suplanuoti":"Išsiųsti"}
     </Button>
     <p className="text-xs text-muted-foreground">Kol Push neįjungtas, gavėjai žinutę matys programėlėje. Suplanuota žinutė iki nurodyto laiko jiems nerodoma.</p>
    </form>
   </section>}
   {tab==="issiusti"&&<section className="space-y-3">
    <h2 className="flex items-center gap-2 text-lg font-bold"><MessageSquare className="size-5"/> Išsiųsti ir suplanuoti</h2>
    {messages.length===0?<p className="rounded-xl border p-4 text-sm text-muted-foreground">Pranešimų istorija tuščia.</p>:
     messages.map(m=>{
      const own=receipts.filter(r=>r.message_id===m.id);
      const delivered=new Date(m.scheduled_for).getTime()<=Date.now();
      return <article key={m.id} className="rounded-xl border bg-card p-4">
       <div className="flex flex-wrap items-start justify-between gap-2">
        <strong>{m.title}</strong>
        <span className="rounded-full bg-muted px-2 py-1 text-xs">{delivered?"Išsiųsta programėlėje":"Suplanuota"}</span>
       </div>
       <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.body}</p>
       <p className="mt-2 text-xs text-muted-foreground">Laikas: {new Date(m.scheduled_for).toLocaleString("lt-LT")}</p>
       <div className="mt-3 space-y-1">
        {own.map(r=><p key={r.id} className="text-sm">
         {labels.get(r.recipient_id)||"Gavėjas"}: <strong>{r.response?r.response==="sutinku"?"Sutiko":"Nesutiko":r.read_at?"Perskaitė":delivered?"Neperskaitė":"Laukia siuntimo"}</strong>
         {r.responded_at?" · "+new Date(r.responded_at).toLocaleString("lt-LT"):r.read_at?" · "+new Date(r.read_at).toLocaleString("lt-LT"):""}
        </p>)}
       </div>
      </article>;
     })}
   </section>}
  </>}
  {!admin&&<StaffInbox/>}
 </div>;
}
