import { useEffect,useRef,useState } from "react";
import { Bell, Check, CircleAlert } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import {toast} from "sonner";
import { supabase } from "@/lib/supabase-client";
import {getCloudOrganizationId} from "@/lib/store";
import {listStaffInbox,listStaffParticipants,type InboxMessage} from "@/lib/staff-messages";

type Notice={id:string;title:string;body:string|null;kind:string;related_job_id:string|null;related_message_id:string|null;actor_user_id:string|null;read_at:string|null;created_at:string};
export function NotificationBell(){
 const [notices,setNotices]=useState<Notice[]>([]);
 const [expanded,setExpanded]=useState(false);
 const rootRef=useRef<HTMLDivElement>(null);
 const path=useRouterState({select:s=>s.location.pathname});
 const [error,setError]=useState("");
 const [manualMessages,setManualMessages]=useState<InboxMessage[]>([]);
 const [participantNames,setParticipantNames]=useState<Map<string,string>>(new Map());
 // Only announce newly received messages during the current open PWA session.
 // The first poll establishes a baseline so old unread messages do not create a toast storm.
 const seenRef=useRef<{identity:string;ids:Set<string>}|null>(null);
 const fetchNotices=async()=>{
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user)return;
  const org=getCloudOrganizationId();
  if(!org){setNotices([]);setManualMessages([]);return}
  // A failure to fetch general notifications must not hide staff inbox messages.
  const {data,error:queryError}=await supabase.from("sa_notifications")
   .select("id,title,body,kind,related_job_id,related_message_id,actor_user_id,read_at,created_at")
   .eq("organization_id",org).eq("recipient_id",auth.user.id).order("created_at",{ascending:false}).limit(30);
  if(queryError)setError("Nepavyko atnaujinti sistemos pranešimų");
  else {setError("");setNotices((data||[]) as Notice[]);}
  try{
   const [inbox,names]=await Promise.all([
    listStaffInbox(org),
    listStaffParticipants(org).catch(()=>[]),
   ]);
   setParticipantNames(new Map(names.map(x=>[x.userId,x.name])));
   const identity=org+":"+auth.user.id;
   const ids=new Set(inbox.map(item=>item.receipt.id));
   const previous=seenRef.current;
   if(previous?.identity===identity){
     const fresh=inbox.filter(item=>!item.receipt.read_at&&!previous.ids.has(item.receipt.id));
     const latest=fresh[0];
     if(latest && document.visibilityState==="visible"){
       const newest=latest.message;
       toast.info(fresh.length===1?"Nauja žinutė: "+newest.title:
         "Gauta naujų žinučių: "+fresh.length,{
         description:newest.body.slice(0,160),
         duration:8000
       });
     }
   }
   seenRef.current={identity,ids};
   setManualMessages(inbox);
  }catch(err){
   setError(err instanceof Error?"Nepavyko gauti asmeninių žinučių: "+err.message:
     "Nepavyko gauti asmeninių žinučių");
  }
 };
 useEffect(()=>{
  void fetchNotices();
  const refresh=()=>{if(document.visibilityState==="visible")void fetchNotices()};
  const timer=window.setInterval(refresh,15000);
  window.addEventListener("focus",refresh);
  window.addEventListener("sa-message-updated",refresh);
  return()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh);window.removeEventListener("sa-message-updated",refresh)};
 },[]);
 // Close the panel on navigation, backdrop taps, drawer opening and Escape.
 // Outside pointer presses should NOT block the original click/navigation.
 useEffect(()=>{setExpanded(false)},[path]);
 useEffect(()=>{
  if(!expanded)return;
  const onOutside=(event:PointerEvent)=>{
   const root=rootRef.current;
   if(root&&!root.contains(event.target as Node))setExpanded(false);
  };
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==="Escape")setExpanded(false);
  };
  document.addEventListener("pointerdown",onOutside,true);
  document.addEventListener("keydown",onKey);
  return()=>{
   document.removeEventListener("pointerdown",onOutside,true);
   document.removeEventListener("keydown",onKey);
  };
 },[expanded]);
 const markRead=async(notice:Notice)=>{
  if(notice.read_at)return;
  const now=new Date().toISOString();
  const org=getCloudOrganizationId();
  if(!org)return;
  const {data,error:err}=await supabase.rpc("sa_mark_own_notification_read",{p_org:org,p_notice:notice.id});
  if(err||data!==true){setError("Nepavyko pažymėti pranešimo");return}
  setNotices(items=>items.map(item=>item.id===notice.id?{...item,read_at:now}:item));
  window.dispatchEvent(new Event("sa-message-updated"));
 };
 const manualUnread=manualMessages.filter(item=>!item.receipt.read_at).length;
 const replyUnread=notices.filter(n=>n.kind==="staff_reply"&&!n.read_at).length;
 const otherUnread=notices.filter(n=>n.kind!=="staff_reply"&&!n.read_at).length;
 const unread=manualUnread+replyUnread+otherUnread;
 return <div ref={rootRef} className="relative">
  <button type="button" onClick={()=>{setExpanded(o=>!o);void fetchNotices()}}
    aria-expanded={expanded} aria-label={"Pranešimai, neperskaitytų: "+unread}
    className="relative flex min-h-10 items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:bg-muted">
    <Bell className="size-4"/> Pranešimai
    {unread>0&&<span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-xs text-primary-foreground">{unread}</span>}
  </button>
  {expanded&&<div role="region" aria-label="Nauji pranešimai" className="absolute right-0 top-full z-50 mt-2 max-h-[65vh] w-[min(88vw,370px)] overflow-auto rounded-xl border bg-card p-3 shadow-xl">
    <div className="mb-2 flex items-center justify-between gap-2"><strong className="text-sm">Pranešimų istorija</strong><button className="text-xs text-primary underline" onClick={()=>setExpanded(false)}>Uždaryti</button></div>
    <p className="mb-3 text-xs text-muted-foreground" role="status">Žinutės: {manualUnread} · Atsakymai: {replyUnread}{otherUnread>0?" · Kiti: "+otherUnread:""}</p>
    <Link to="/pranesimai" search={{tab:"gauti"}} onClick={()=>setExpanded(false)} className="mb-3 block rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm font-semibold text-primary">
      Asmeniniai pranešimai {manualUnread>0?"("+manualUnread+" nauji)":""} →
    </Link>
    {manualMessages.slice(0,5).map(({message,receipt})=><Link
      key={receipt.id} to="/pranesimai" search={{tab:"gauti",message:message.id}} onClick={()=>setExpanded(false)}
      className={"mb-2 block rounded-lg border p-3 text-sm hover:bg-muted "+(!receipt.read_at?"border-primary/30 bg-primary/5":"bg-card")}>
      <div className="flex items-center justify-between gap-2">
        <strong className="break-words">{message.title}</strong>
        {!receipt.read_at&&<span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Nauja</span>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Žinutė · Nuo: {participantNames.get(message.sender_id)||"Įmonės paskyra"}</p>
      <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">{message.body}</p>
      <p className="mt-1 text-xs text-muted-foreground">{new Date(message.scheduled_for).toLocaleString("lt-LT")}</p>
    </Link>)}
    {error&&<p className="mb-2 flex gap-1 text-xs text-destructive"><CircleAlert className="size-3"/>{error}</p>}
    {notices.length?notices.map(notice=><article key={notice.id} className={"border-b p-2 text-sm "+(!notice.read_at?"bg-primary/5":"")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
       <p className="font-semibold">{notice.title}</p>
       {!notice.read_at&&<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Naujas</span>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
       {notice.kind==="staff_reply"?"Atsakymas":"Sistemos pranešimas"}
       {notice.actor_user_id?" · Nuo: "+(participantNames.get(notice.actor_user_id)||"Įmonės paskyra"):""}
      </p>
      {notice.body&&<p className="mt-1 text-xs text-muted-foreground">{notice.body}</p>}
      <p className="mt-1 text-xs text-muted-foreground">{new Date(notice.created_at).toLocaleString("lt-LT")}</p>
      <div className="mt-2 flex flex-wrap gap-3">
       {notice.kind==="staff_reply"&&<Link to="/pranesimai" search={{tab:"issiusti",...(notice.related_message_id?{message:notice.related_message_id}:{})}}
        onClick={()=>{void markRead(notice);setExpanded(false)}} className="text-xs font-medium text-primary underline">
         {notice.related_message_id?"Atidaryti pokalbį":"Atidaryti išsiųstus pranešimus"}</Link>}
       {notice.related_job_id&&<Link to="/darbai/$jobId" params={{jobId:notice.related_job_id}}
         onClick={()=>{void markRead(notice);setExpanded(false)}} className="text-xs font-medium text-primary underline">Atidaryti darbą</Link>}
       {!notice.read_at&&<button className="flex items-center gap-1 text-xs text-primary" onClick={()=>void markRead(notice)}><Check className="size-3"/>Pažymėti perskaitytu</button>}
      </div>
     </article>):<p className="text-sm text-muted-foreground">Pranešimų kol kas nėra.</p>}
    <p className="mt-3 text-xs text-muted-foreground">Vidiniai pranešimai atnaujinami kas 15 sekundžių, kai programėlė aktyvi. Telefono Push įjungiamas Nustatymuose ir reikalauja įrenginio leidimo.</p>
  </div>}
 </div>;
}
