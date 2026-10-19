import {supabase} from "./supabase-client";

export function supportsWebPush():boolean{
 return typeof window!=="undefined" && window.isSecureContext &&
  "serviceWorker"in navigator && "PushManager"in window && "Notification"in window;
}
export function needsIosHomeScreen():boolean{
 if(typeof navigator==="undefined"||typeof window==="undefined")return false;
 const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent);
 const standalone=window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as Navigator&{standalone?:boolean}).standalone===true;
 return ios&&!standalone;
}
export function vapidToBytes(value:string):Uint8Array<ArrayBuffer>{
 const padded=(value+"=".repeat((4-value.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/");
 const result=atob(padded);
 return Uint8Array.from(result,c=>c.charCodeAt(0));
}
export async function getPushPublicKey():Promise<string|null>{
 const {data,error}=await supabase.functions.invoke("sa-push-dispatch",{body:{action:"config"}});
 if(error||!data?.enabled||typeof data.publicKey!=="string")return null;
 return data.publicKey;
}
export async function enableDevicePush(org:string,key:string):Promise<void>{
 if(!supportsWebPush())throw new Error("Ši naršyklė nepalaiko Web Push. iPhone naudokite iš pradžios ekrano įdiegtą programėlę.");
 if(needsIosHomeScreen())throw new Error("iPhone: atidarykite per Safari, pasirinkite „Pridėti į pradžios ekraną“ ir įjunkite iš įdiegtos programėlės.");
 // This is called DIRECTLY from a user click. Permission MUST be requested before asynchronous tasks.
 const permission=await Notification.requestPermission();
 if(permission!=="granted")throw new Error("Pranešimams nesuteiktas leidimas telefono/naršyklės nustatymuose.");
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)throw new Error("Pirmiausia prisijunkite prie įmonės paskyros");
 const scope=import.meta.env.BASE_URL||"/svari-aplinka-pwa/";
 const registration=await navigator.serviceWorker.register(scope+"push-sw.js",{scope});
 const active=await registration.pushManager.getSubscription();
 const sub=active||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidToBytes(key)});
 const serialized=sub.toJSON();
 if(!sub.endpoint||!serialized.keys?.['p256dh']||!serialized.keys['auth'])throw new Error("Naršyklė negrąžino pilnos Push prenumeratos");
 const {error}=await supabase.from("sa_push_subscriptions").upsert({
  organization_id:org,user_id:user.id,endpoint:sub.endpoint,
  p256dh:serialized.keys['p256dh'],auth:serialized.keys.auth,updated_at:new Date().toISOString()
 },{onConflict:"endpoint"});
 if(error)throw new Error("Nepavyko išsaugoti įrenginio prenumeratos: "+error.message);
}
export async function disableDevicePush(org:string):Promise<void>{
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)throw new Error("Reikia prisijungti");
 const scope=import.meta.env.BASE_URL||"/svari-aplinka-pwa/";
 const reg=await navigator.serviceWorker.getRegistration(scope);
 const sub=await reg?.pushManager.getSubscription();
 if(!sub)return;
 const endpoint=sub.endpoint;
 const {error}=await supabase.from("sa_push_subscriptions").delete()
  .eq("organization_id",org).eq("user_id",user.id).eq("endpoint",endpoint);
 if(error)throw new Error("Nepavyko pašalinti serverinės prenumeratos");
 await sub.unsubscribe();
}
