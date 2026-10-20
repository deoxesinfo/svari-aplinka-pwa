import {useEffect,useState} from "react";
import {LoaderCircle,RefreshCw} from "lucide-react";
import {Button} from "@/components/ui/button";

/** Consistent green loading state; timed retry when a network request stalls. */
export function AppLoading({message,minHeight="70vh"}:{message:string;minHeight?:string}){
 const [slow,setSlow]=useState(false);
 useEffect(()=>{
  const timer=window.setTimeout(()=>setSlow(true),20000);
  return ()=>window.clearTimeout(timer);
 },[message]);
 return <div className="flex w-full flex-col items-center justify-center gap-3 px-5 py-10 text-center"
  style={{minHeight}} role="status" aria-live="polite" aria-label={message}>
  <LoaderCircle aria-hidden="true" className="size-10 animate-spin text-primary" strokeWidth={2.5}/>
  <p className="text-sm font-medium text-muted-foreground">{message}</p>
  {slow&&<div className="mt-2 space-y-3">
   <p className="text-xs text-muted-foreground">Užkrovimas trunka ilgiau nei įprastai. Patikrinkite ryšį.</p>
   <Button type="button" variant="outline" onClick={()=>window.location.reload()}>
    <RefreshCw className="size-4"/> Bandyti dar kartą
   </Button>
  </div>}
 </div>;
}
