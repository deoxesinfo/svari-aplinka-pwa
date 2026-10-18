import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, LockKeyhole, ShieldCheck, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase, AUTH_ENFORCED } from "@/lib/supabase-client";
import { CloudReadStatus } from "@/components/app/CloudReadStatus";
import { enterCloudWorkspace,leaveCloudWorkspace,refreshCloudWorkspace } from "@/lib/store";

type Member={organization_id:string;role:"admin"|"manager"|"worker";active:boolean};
type Account={email:string;membership:Member|null};
const NAMES:Record<Member["role"],string>={admin:"Administratorius",manager:"Vadybininkas",worker:"Darbuotojas"};

export function AccessPortal({children,mode}:{children?:ReactNode;mode:"gate"|"account"}){
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [account,setAccount]=useState<Account|null>(null);
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [recovery,setRecovery]=useState(false);
 const [newPassword,setNewPassword]=useState("");
 const [workspaceReady,setWorkspaceReady]=useState(false);
 const [workspaceError,setWorkspaceError]=useState("");
 useEffect(()=>{
   if(new URLSearchParams(window.location.search).get("sa_auth")==="recovery")setRecovery(true);
   let alive=true;
   const read=async()=>{
     const {data:auth,error:authError}=await supabase.auth.getUser();
     if(!alive)return;
     if(authError||!auth.user){setAccount(null);setLoading(false);return}
     const {data:members,error:memberError}=await supabase.from("sa_memberships")
       .select("organization_id,role,active").eq("user_id",auth.user.id).eq("active",true).limit(1);
     if(!alive)return;
     if(memberError){setAccount({email:auth.user.email||"",membership:null});toast.error("Nepavyko patikrinti paskyros teisių");}
     else setAccount({email:auth.user.email||"",membership:(members?.[0]||null) as Member|null});
     setLoading(false);
   };
   void read();
   const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
     if(event==="PASSWORD_RECOVERY")setRecovery(true);
     if(event==="SIGNED_OUT"){leaveCloudWorkspace();setWorkspaceReady(false);}
     // Avoid querying Supabase synchronously inside the auth state callback.
     queueMicrotask(()=>{if(alive)void read();});
   });
   return ()=>{alive=false;subscription.unsubscribe()};
 },[]);
 useEffect(()=>{
   if(mode!=="gate"||!AUTH_ENFORCED||!account?.membership)return;
   let active=true;
   setWorkspaceReady(false);setWorkspaceError("");
   void enterCloudWorkspace(account.membership.organization_id)
     .then(()=>{if(active)setWorkspaceReady(true)})
     .catch(err=>{if(active)setWorkspaceError(err instanceof Error?err.message:"Klaida")});
   return()=>{active=false};
 },[mode,account?.membership?.organization_id]);
 useEffect(()=>{
   if(mode!=="gate"||!workspaceReady)return;
   const sync=()=>{if(document.visibilityState==="visible")void refreshCloudWorkspace().catch(()=>{});};
   const id=window.setInterval(sync,60000);
   window.addEventListener("focus",sync);
   return()=>{window.clearInterval(id);window.removeEventListener("focus",sync)};
 },[mode,workspaceReady]);
 const signIn=async(e:FormEvent)=>{
   e.preventDefault();
   if(!email.trim()||!password)return;
   setBusy(true);
   try{
     const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
     if(error)toast.error("Nepavyko prisijungti. Patikrinkite duomenis.");
     else {setPassword("");toast.success("Prisijungta");}
   }finally{setBusy(false)}
 };
 const reset=async()=>{
   if(!email.trim()){toast.error("Pirmiausia įrašykite el. paštą");return}
   setBusy(true);
   try{
     const redirectTo=window.location.origin+window.location.pathname+"?sa_auth=recovery";
     const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo});
     if(error)toast.error("Nepavyko išsiųsti slaptažodžio atkūrimo laiško.");
     else toast.success("Jei toks el. paštas egzistuoja, gausite atkūrimo laišką.");
   }finally{setBusy(false)}
 };
 const setNew=async(e:FormEvent)=>{
   e.preventDefault();
   if(newPassword.length<12){toast.error("Naujas slaptažodis turi būti bent 12 simbolių");return}
   setBusy(true);
   try{
     const {error}=await supabase.auth.updateUser({password:newPassword});
     if(error)toast.error("Nepavyko pakeisti slaptažodžio");
     else {toast.success("Slaptažodis pakeistas");setNewPassword("");setRecovery(false)}
   }finally{setBusy(false)}
 };
 const passwordForm=(heading:string)=><form onSubmit={setNew} className="card-surface space-y-3 p-4">
   <h2 className="text-sm font-semibold">{heading}</h2>
   <label className="block text-sm font-medium">Naujas slaptažodis
     <input className="mt-1 w-full rounded-lg border bg-background p-3" type="password"
       autoComplete="new-password" minLength={12} required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/>
   </label>
   <p className="text-xs text-muted-foreground">Bent 12 simbolių. Slaptažodžio niekam nesiųskite.</p>
   <Button disabled={busy} type="submit">Išsaugoti slaptažodį</Button>
 </form>;
 if(mode==="gate"&&!AUTH_ENFORCED)return <>{children}</>;
 if(loading)return <div className="grid min-h-[70vh] place-items-center p-6 text-sm text-muted-foreground">Tikrinama paskyra…</div>;
 if(recovery)return <section className="mx-auto max-w-md space-y-4 py-10">
   <h1 className="text-xl font-bold">Slaptažodžio atkūrimas</h1>
   {account?passwordForm("Nustatyti naują slaptažodį"):
     <p className="text-sm text-muted-foreground">Atidarykite patvirtintą slaptažodžio atkūrimo nuorodą iš savo el. pašto.</p>}
 </section>;
 if(account?.membership){
   if(mode==="gate"){
     if(workspaceError)return <div className="mx-auto max-w-xl p-8 text-center">
       <h2 className="font-semibold text-destructive">Debesijos duomenų nepavyko atverti</h2>
       <p className="mt-2 text-sm">{workspaceError}</p>
       <button onClick={()=>window.location.reload()} className="mt-4 text-primary underline">Bandyti dar kartą</button>
     </div>;
     if(!workspaceReady)return <div className="grid min-h-screen place-items-center text-muted-foreground">Kraunami įmonės duomenys…</div>;
     return <>{children}</>;
   }
   return <section className="mx-auto max-w-xl space-y-4 py-5">
     <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="size-6 text-primary"/> Mano paskyra</h1>
     <div className="card-surface space-y-3 p-5">
       <p className="text-sm"><strong>El. paštas:</strong> {account.email}</p>
       <p className="text-sm"><strong>Rolė:</strong> {NAMES[account.membership.role]}</p>
       <p className="text-xs text-muted-foreground">Šiame etape paruošti saugūs prisijungimai ir RLS. DEMO duomenys dar nėra perkeliami į bendrą duomenų bazę; sinchronizacija bus įjungta atskirai.</p>
       <CloudReadStatus organizationId={account.membership.organization_id}/>
       <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Pakeisti slaptažodį</summary>
         <div className="mt-3">{passwordForm("Naujas paskyros slaptažodis")}</div>
       </details>
       <div className="flex flex-wrap gap-2">
         <Button variant="outline" asChild><Link to="/">Grįžti į apžvalgą</Link></Button>
         <Button variant="outline" onClick={()=>void supabase.auth.signOut()}><LogOut className="size-4"/>Atsijungti</Button>
       </div>
     </div>
   </section>;
 }
 if(account&&!account.membership){
   return <section className="mx-auto max-w-md space-y-4 py-10">
     <h1 className="flex items-center gap-2 text-lg font-bold"><LockKeyhole className="size-5"/> Paskyrai nepriskirtos teisės</h1>
     <p className="text-sm text-muted-foreground">Prisijungta kaip {account.email}, tačiau paskyra dar nepriskirta „Švari Aplinka“ įmonei. Pakviestam administratoriui narystė priskiriama tik patvirtinus el. paštą.</p>
     {passwordForm("Susikurkite slaptažodį priėmę kvietimą")}
     <Button onClick={()=>void supabase.auth.signOut()} variant="outline"><LogOut className="size-4"/>Atsijungti</Button>
   </section>;
 }
 return <section className="mx-auto max-w-md space-y-4 py-8">
   <div className="text-center"><LockKeyhole className="mx-auto mb-3 size-10 text-primary"/><h1 className="text-xl font-bold">Švari Aplinka · Prisijungimas</h1>
   <p className="mt-2 text-sm text-muted-foreground">Tik pakviestiems darbuotojams. Viešos registracijos formos nėra.</p></div>
   <form onSubmit={signIn} className="card-surface space-y-4 p-5">
     <label className="block text-sm font-medium">El. paštas
       <input className="mt-1 w-full rounded-lg border bg-background p-3" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
     <label className="block text-sm font-medium">Slaptažodis
       <input className="mt-1 w-full rounded-lg border bg-background p-3" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
     <Button type="submit" disabled={busy} className="w-full"><LogIn className="size-4"/>Prisijungti</Button>
     <button type="button" disabled={busy} onClick={()=>void reset()} className="text-sm text-primary underline">Pamiršau slaptažodį</button>
   </form>
   <p className="text-center text-xs text-muted-foreground">Supabase autentifikacija. Duomenys prieinami tik paskyroms, turinčioms įmonės narystę.</p>
 </section>;
}
