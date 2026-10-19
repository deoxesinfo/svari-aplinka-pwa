import { useEffect,useRef,useState } from "react";
import { Bell, Check, CircleAlert } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase-client";
import {getCloudOrganizationId} from "@/lib/store";
import {listStaffInbox} from "@/lib/staff-messages";

type Notice={id:string;title:string;body:string|null;kind:string;related_job_id:string|null;read_at:string|null;created_at:string};
export function NotificationBell(){
 const [notices,setNotices]=useState<Notice[]>([]);
 const [expanded,setExpanded]=useState(false);
 const rootRef=useRef<HTMLDivElement>(null);
 const path=useRouterState({select:s=>s.location.pathname});
 const [error,setError]=useState("");
 const [manualUnread,setManualUnread]=useState(0);
 const fetchNotices=async()=>{
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user)return;
  const {data,error:queryError}=await supabase.from("sa_notifications")
   .select("id,title,body,kind,related_job_id,read_at,created_at")
   .eq("recipient_id",auth.user.id).order("created_at",{ascending:false}).limit(30);
  if(queryError){setError("Nepavyko atnaujinti pranešimų");return}
  setError("");setNotices((data||[]) as Notice[]);
  const org=getCloudOrganizationId();
  if(org){
   try{const inbox=await listStaffInbox(org);setManualUnread(inbox.filter(x=>!x.receipt.read_at).length)}
   catch{setManualUnread(0)}
  }
 };
 useEffect(()=>{
  void fetchNotices();
  const refresh=()=>{if(document.visibilityState==="visible")void fetchNotices()};
  const timer=window.setInterval(refresh,45000);
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
  const {error:err}=await supabase.from("sa_notifications").update({read_at:now})
   .eq("id",notice.id).is("read_at",null);
  if(err){setError("Nepavyko pažymėti pranešimo");return}
  setNotices(items=>items.map(item=>item.id===notice.id?{...item,read_at:now}:item));
 };
 const unread=notices.filter(n=>!n.read_at).length+manualUnread;
 return <div ref={rootRef} className="relative">
  <button type="button" onClick={()=>{setExpanded(o=>!o);void fetchNotices()}}
    aria-expanded={expanded} aria-label={"Pranešimai, neperskaitytų: "+unread}
    className="relative flex min-h-10 items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:bg-muted">
    <Bell className="size-4"/> Pranešimai
    {unread>0&&<span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-xs text-primary-foreground">{unread}</span>}
  </button>
  {expanded&&<div role="region" aria-label="Nauji pranešimai" className="absolute right-0 top-full z-50 mt-2 max-h-[65vh] w-[min(88vw,370px)] overflow-auto rounded-xl border bg-card p-3 shadow-xl">
    <div className="mb-3 flex items-center justify-between gap-2"><strong className="text-sm">Pranešimų istorija</strong><button className="text-xs text-primary underline" onClick={()=>setExpanded(false)}>Uždaryti</button></div>
    <Link to="/pranesimai" onClick={()=>setExpanded(false)} className="mb-3 block rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm font-semibold text-primary">
      Asmeniniai pranešimai {manualUnread>0?"("+manualUnread+" nauji)":""} →
    </Link>
    {error&&<p className="mb-2 flex gap-1 text-xs text-destructive"><CircleAlert className="size-3"/>{error}</p>}
    {notices.length?notices.map(notice=><article key={notice.id} className={"border-b p-2 text-sm "+(!notice.read_at?"bg-primary/5":"")}>
      <p className="font-semibold">{notice.title}</p>
      {notice.body&&<p className="mt-1 text-xs text-muted-foreground">{notice.body}</p>}
      <p className="mt-1 text-xs text-muted-foreground">{new Date(notice.created_at).toLocaleString("lt-LT")}</p>
      <div className="mt-2 flex flex-wrap gap-3">
       {notice.related_job_id&&<Link to="/darbai/$jobId" params={{jobId:notice.related_job_id}}
         onClick={()=>{void markRead(notice);setExpanded(false)}} className="text-xs font-medium text-primary underline">Atidaryti darbą</Link>}
       {!notice.read_at&&<button className="flex items-center gap-1 text-xs text-primary" onClick={()=>void markRead(notice)}><Check className="size-3"/>Pažymėti perskaitytu</button>}
      </div>
     </article>):<p className="text-sm text-muted-foreground">Pranešimų kol kas nėra.</p>}
    <p className="mt-3 text-xs text-muted-foreground">Pranešimai saugomi Supabase paskyroje. Telefonų Push dar neįjungti.</p>
  </div>}
 </div>;
}
