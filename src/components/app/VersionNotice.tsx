import { useEffect,useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// A versioned manifest is generated after each successful GitHub Pages build.
// Never automatically reload a form with unsaved changes.
const release=import.meta.env.VITE_SA_RELEASE_SHA||"";
export function VersionNotice(){
 const [next,setNext]=useState("");
 useEffect(()=>{
  if(!/^[a-f\d]{40}$/i.test(release))return;
  let cancelled=false;
  const check=async()=>{
   if(document.visibilityState==="hidden")return;
   try{
    const url=import.meta.env.BASE_URL+"version.json?t="+Date.now();
    const res=await fetch(url,{cache:"no-store"});
    if(!res.ok)return;
    const data=await res.json() as {sha?:unknown};
    if(!cancelled&&typeof data.sha==="string"&&/^[a-f\d]{40}$/i.test(data.sha)
      &&data.sha!==release)setNext(data.sha);
   }catch{/* Offline must not interrupt the app. */}
  };
  void check();
  const timer=window.setInterval(()=>void check(),60_000);
  const onFocus=()=>void check();
  window.addEventListener("focus",onFocus);
  document.addEventListener("visibilitychange",onFocus);
  return ()=>{cancelled=true;window.clearInterval(timer);window.removeEventListener("focus",onFocus);document.removeEventListener("visibilitychange",onFocus);};
 },[]);
 if(!next)return null;
 const reload=()=>{
  const url=new URL(window.location.href);
  url.searchParams.set("sa-release",next.slice(0,12));
  window.location.assign(url.toString());
 };
 return <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-950">
  <span>Yra nauja „Švari Aplinka“ programėlės versija. Prieš atnaujindami išsaugokite pradėtą darbą.</span>
  <Button type="button" size="sm" variant="outline" onClick={reload}><RefreshCw className="size-4"/> Atnaujinti programėlę</Button>
 </div>;
}
