import {useEffect,useState} from "react";
import {RefreshCw} from "lucide-react";
import {Button} from "@/components/ui/button";

/** Checks the independently published release marker, never silently discards form state. */
export function VersionNotice(){
 const release=import.meta.env.VITE_SA_BUILD_SHA||"";
 const [next,setNext]=useState("");
 useEffect(()=>{
  if(!/^[a-f0-9]{40}$/i.test(release))return;
  let cancelled=false;
  const check=async()=>{
   if(document.visibilityState!=="visible")return;
   try{
    const path=import.meta.env.BASE_URL+"version.json?ts="+Date.now();
    const response=await fetch(path,{cache:"no-store"});
    if(!response.ok)return;
    const data=await response.json() as {sha?:unknown};
    if(!cancelled&&typeof data.sha==="string"&&/^[a-f0-9]{40}$/i.test(data.sha)
       &&data.sha!==release)setNext(data.sha);
   }catch{/* Offline state should not interrupt active work. */}
  };
  void check();
  const timer=window.setInterval(()=>void check(),60_000);
  window.addEventListener("focus",check);
  document.addEventListener("visibilitychange",check);
  return ()=>{
    cancelled=true;window.clearInterval(timer);
    window.removeEventListener("focus",check);
    document.removeEventListener("visibilitychange",check);
  };
 },[release]);
 if(!next)return null;
 return <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950">
  <span>Yra nauja „Švari Aplinka“ versija. Išsaugokite pradėtus pakeitimus ir atnaujinkite.</span>
  <Button type="button" size="sm" variant="outline" onClick={()=>{
    const url=new URL(window.location.href);
    url.searchParams.set("sa-release",next.slice(0,12));
    window.location.assign(url.toString());
  }}>
   <RefreshCw className="size-4"/> Atnaujinti programėlę
  </Button>
 </div>;
}
