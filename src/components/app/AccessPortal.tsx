import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, LockKeyhole, ShieldCheck, UserCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase, AUTH_ENFORCED, SA_AUTH_LINK_INVITE,SA_AUTH_LINK_RECOVERY } from "@/lib/supabase-client";
import { CloudReadStatus } from "@/components/app/CloudReadStatus";
import {AppLoading} from "@/components/app/AppLoading";
import {AccountManagement} from "@/components/app/AccountManagement";
import { enterCloudWorkspace,leaveCloudWorkspace,refreshCloudWorkspace } from "@/lib/store";

type Member={organization_id:string;role:"admin"|"manager"|"worker";active:boolean};
type Account={email:string;membership:Member|null;suspended:boolean};
const NAMES:Record<Member["role"],string>={admin:"Administratorius",manager:"Vadybininkas",worker:"Darbuotojas"};

function PasswordInput({value,onChange,autoComplete,minLength}:{value:string;onChange:(v:string)=>void;autoComplete:string;minLength?:number}){
 const [visible,setVisible]=useState(false);
 return <div className="relative mt-1">
   <input className="w-full rounded-lg border bg-background py-3 pl-3 pr-12" type={visible?"text":"password"}
     autoComplete={autoComplete} minLength={minLength} required value={value} onChange={e=>onChange(e.target.value)}/>
   <button type="button" aria-label={visible?"Paslėpti slaptažodį":"Rodyti slaptažodį"}
     aria-pressed={visible} title={visible?"Paslėpti slaptažodį":"Rodyti slaptažodį"}
     onClick={()=>setVisible(v=>!v)}
     className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-lg text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">
     {visible?<EyeOff className="size-5"/>:<Eye className="size-5"/>}
   </button>
 </div>;
}


export function AccessPortal({children,mode}:{children?:ReactNode;mode:"gate"|"account"}){
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [account,setAccount]=useState<Account|null>(null);
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [recovery,setRecovery]=useState(false);
 const [newPassword,setNewPassword]=useState("");
 const [oldPassword,setOldPassword]=useState("");
 const [repeatPassword,setRepeatPassword]=useState("");
 const [tab,setTab]=useState<"mine"|"manage">("mine");
 const [inviteSetup,setInviteSetup]=useState(false);
 const [workspaceReady,setWorkspaceReady]=useState(false);
 const [workspaceError,setWorkspaceError]=useState("");
 useEffect(()=>{
   if(SA_AUTH_LINK_INVITE)setInviteSetup(true);
   if(SA_AUTH_LINK_RECOVERY)setRecovery(true);
   let alive=true;
   const read=async()=>{
     const {data:auth,error:authError}=await supabase.auth.getUser();
     if(!alive)return;
     if(authError||!auth.user){setAccount(null);setLoading(false);return}
     const {data:members,error:memberError}=await supabase.from("sa_memberships")
       .select("organization_id,role,active").eq("user_id",auth.user.id).limit(1);
     if(!alive)return;
     if(memberError){setAccount({email:auth.user.email||"",membership:null,suspended:false});toast.error("Nepavyko patikrinti paskyros teisių");}
     else {
       const member=(members?.[0]||null) as Member|null;
       if(member?.active&&member.role!=="admin"){
         const {data:activation,error:activationError}=await supabase.from("sa_account_directory")
           .select("activation_required,activation_completed_at")
           .eq("organization_id",member.organization_id).eq("user_id",auth.user.id).maybeSingle();
         if(!alive)return;
         // Fail closed if invitation activation cannot be read.
         setInviteSetup(Boolean(activationError || (activation?.activation_required&&!activation.activation_completed_at) || SA_AUTH_LINK_INVITE));
       }
       setAccount({email:auth.user.email||"",membership:member?.active?member:null,suspended:Boolean(member&&!member.active)});
     }
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
   if(mode!=="gate"||!AUTH_ENFORCED||!account?.membership||inviteSetup||recovery)return;
   let active=true;
   setWorkspaceReady(false);setWorkspaceError("");
   void enterCloudWorkspace(account.membership.organization_id)
     .then(()=>{if(active)setWorkspaceReady(true)})
     .catch(err=>{if(active)setWorkspaceError(err instanceof Error?err.message:"Klaida")});
   return()=>{active=false};
 },[mode,account?.membership?.organization_id,inviteSetup,recovery]);
 useEffect(()=>{
   if(mode!=="gate"||!workspaceReady)return;
   const sync=()=>{if(document.visibilityState==="visible")void refreshCloudWorkspace().catch(()=>{});};
   const id=window.setInterval(sync,60000);
   window.addEventListener("focus",sync);
   return()=>{window.clearInterval(id);window.removeEventListener("focus",sync)};
 },[mode,workspaceReady]);
 // Re-check membership even for an already-signed-in user. Supabase JWTs may
 // remain valid until expiry; the database authorization is the final gate.
 useEffect(()=>{
   if(mode!=="gate"||!AUTH_ENFORCED||!account?.membership)return;
   const org=account.membership.organization_id;
   let alive=true;
   const verify=async()=>{
     try{
       const {data:auth}=await supabase.auth.getUser();
       if(!alive)return;
       if(!auth.user){leaveCloudWorkspace();setWorkspaceReady(false);setAccount(null);return}
       const {data:member,error}=await supabase.from("sa_memberships")
         .select("active").eq("organization_id",org).eq("user_id",auth.user.id).maybeSingle();
       if(!alive||error)return; // transient network error must not masquerade as a suspension
       if(!member?.active){
         leaveCloudWorkspace();setWorkspaceReady(false);
         setAccount(previous=>previous?{...previous,membership:null,suspended:true}:null);
       }
     }catch{/* RLS prevents access even if a temporary network error occurs. */}
   };
   const onFocus=()=>void verify();
   const interval=window.setInterval(onFocus,25000);
   window.addEventListener("focus",onFocus);
   window.addEventListener("pageshow",onFocus);
   return()=>{alive=false;window.clearInterval(interval);
     window.removeEventListener("focus",onFocus);window.removeEventListener("pageshow",onFocus)};
 },[mode,account?.membership?.organization_id]);

 const signIn=async(e:FormEvent)=>{
   e.preventDefault();
   if(!email.trim()||!password)return;
   setBusy(true);
   try{
     const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
     if(error){
       const detail=String(error.message||"").toLowerCase();
       if(detail.includes("banned")||detail.includes("suspended")||detail.includes("disabled")){
         toast.error("Jūsų paskyra laikinai sustabdyta. Susisiekite su Švari Aplinka administratoriumi.");
       }else toast.error("Nepavyko prisijungti. Patikrinkite duomenis.");
     }
     else {setPassword("");toast.success("Prisijungta");}
   }finally{setBusy(false)}
 };
 const sendReset=async(targetEmail:string)=>{
   if(!targetEmail.trim()){toast.error("Pirmiausia įrašykite el. paštą");return}
   setBusy(true);
   try{
     const redirectTo=window.location.origin+import.meta.env.BASE_URL+"?sa_auth=recovery";
     const {error}=await supabase.auth.resetPasswordForEmail(targetEmail.trim(),{redirectTo});
     if(error)toast.error("Nepavyko išsiųsti slaptažodžio atkūrimo laiško.");
     else toast.success("Jei toks el. paštas egzistuoja, gausite slaptažodžio atkūrimo nuorodą.");
   }finally{setBusy(false)}
 };
 const setNew=async(e:FormEvent)=>{
   e.preventDefault();
   if(newPassword.length<12){toast.error("Naujas slaptažodis turi būti bent 12 simbolių");return;}
   if(newPassword!==repeatPassword){toast.error("Nauji slaptažodžiai nesutampa");return;}
   if(!account?.email){toast.error("Pirmiausia prisijunkite");return;}
   if(!recovery&&!inviteSetup&&!oldPassword){toast.error("Įveskite dabartinį slaptažodį");return;}
   setBusy(true);
   try{
     if(!recovery&&!inviteSetup){
       const {data:check,error:checkError}=await supabase.auth.signInWithPassword({email:account.email,password:oldPassword});
       if(checkError||!check.user){toast.error("Senas slaptažodis neteisingas");return;}
     }
     const {error}=await supabase.auth.updateUser({password:newPassword});
     if(error)toast.error("Nepavyko pakeisti slaptažodžio: "+error.message);
     else{
       if(inviteSetup){
         const {data:finished,error:finishError}=await supabase.rpc("sa_finish_invite_activation");
         if(finishError||!finished){
           toast.error("Slaptažodis išsaugotas, tačiau paskyros aktyvavimas nebaigtas. Bandykite dar kartą.");
           return;
         }
       }
       toast.success(inviteSetup?"Paskyra aktyvuota":"Slaptažodis pakeistas");
       setNewPassword("");setRepeatPassword("");setOldPassword("");
       setRecovery(false);setInviteSetup(false);
       if(inviteSetup||recovery){
         window.location.replace(window.location.origin+import.meta.env.BASE_URL);
         return;
       }
       window.history.replaceState(null,"",window.location.pathname);
     }
   }finally{setBusy(false)}
 };
 const passwordForm=(heading:string)=><form onSubmit={setNew} className="card-surface space-y-3 p-4">
   <h2 className="text-sm font-semibold">{heading}</h2>
   {!recovery&&!inviteSetup&&<label className="block text-sm font-medium">Senas slaptažodis
     <PasswordInput value={oldPassword} onChange={setOldPassword} autoComplete="current-password"/>
   </label>}
   <label className="block text-sm font-medium">Naujas slaptažodis
     <PasswordInput value={newPassword} onChange={setNewPassword} autoComplete="new-password" minLength={12}/>
   </label>
   <label className="block text-sm font-medium">Pakartokite naują slaptažodį
     <PasswordInput value={repeatPassword} onChange={setRepeatPassword} autoComplete="new-password" minLength={12}/>
   </label>
   <p className="text-xs text-muted-foreground">Bent 12 simbolių. Slaptažodžio niekam nesiųskite.</p>
   {!recovery&&!inviteSetup&&<button type="button" disabled={busy}
     onClick={()=>void sendReset(account?.email||"")} className="text-sm text-primary underline">
     Pamiršau seną slaptažodį – gauti atkūrimo nuorodą el. paštu
   </button>}
   <Button disabled={busy} type="submit">Išsaugoti slaptažodį</Button>
 </form>;
 if(mode==="gate"&&!AUTH_ENFORCED)return <>{children}</>;
 if(loading)return <AppLoading message="Tikrinama paskyra…"/>;
 if(recovery||inviteSetup)return <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-10">
   <section className="w-full max-w-lg space-y-5">
     <div className="text-center">
       <ShieldCheck className="mx-auto mb-2 size-10 text-primary"/>
       <h1 className="text-2xl font-bold">Švari Aplinka</h1>
       <p className="mt-1 text-sm text-muted-foreground">Darbų valdymo sistema</p>
     </div>
     <div className="card-surface space-y-4 p-5">
       <h2 className="text-xl font-semibold">{inviteSetup?"Aktyvuokite savo paskyrą":"Atkurkite slaptažodį"}</h2>
       <p className="text-sm text-muted-foreground">{inviteSetup
         ?"Prieš pradėdami naudotis sistema, susikurkite asmeninį slaptažodį. Seno slaptažodžio nereikia."
         :"Nustatykite naują slaptažodį, kurį naudosite prisijungdami."}</p>
       {account?passwordForm(inviteSetup?"Sukurti pirmąjį slaptažodį":"Nustatyti naują slaptažodį"):
         <p className="text-sm text-muted-foreground">Norėdami tęsti, atidarykite galiojančią nuorodą iš savo el. pašto.</p>}
     </div>
   </section>
 </main>;
 if(account?.suspended)return <section className="mx-auto max-w-md space-y-4 py-10">
   <div className="card-surface space-y-3 border-l-4 border-destructive p-5" role="alert">
     <h1 className="text-xl font-bold">Jūsų paskyra laikinai sustabdyta</h1>
     <p className="text-sm text-muted-foreground">
       Administratoriaus sprendimu prieiga prie „Švari Aplinka“ programėlės šiuo metu išjungta.
       Dėl atblokavimo susisiekite su „Švari Aplinka“ administratoriumi.
     </p>
     <Button variant="outline" onClick={()=>void supabase.auth.signOut()}>
       <LogOut className="size-4"/> Atsijungti
     </Button>
   </div>
 </section>;
 if(account?.membership){
   if(mode==="gate"){
     if(workspaceError)return <div className="mx-auto max-w-xl p-8 text-center">
       <h2 className="font-semibold text-destructive">Debesijos duomenų nepavyko atverti</h2>
       <p className="mt-2 text-sm">{workspaceError}</p>
       <button onClick={()=>window.location.reload()} className="mt-4 text-primary underline">Bandyti dar kartą</button>
     </div>;
     if(!workspaceReady)return <AppLoading message="Kraunami įmonės duomenys…" minHeight="100dvh"/>;
     return <>{children}</>;
   }
   return <section className="mx-auto max-w-5xl space-y-4 py-5">
     <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="size-6 text-primary"/> Paskyra</h1>
     {account.membership.role==="admin"&&<div className="flex flex-wrap gap-2 border-b pb-3" role="tablist">
       <Button role="tab" aria-selected={tab==="mine"} variant={tab==="mine"?"default":"outline"} onClick={()=>setTab("mine")}>Mano paskyra</Button>
       <Button role="tab" aria-selected={tab==="manage"} variant={tab==="manage"?"default":"outline"} onClick={()=>setTab("manage")}>Paskyrų valdymas</Button>
     </div>}
     {tab==="manage"&&account.membership.role==="admin"?
       <AccountManagement organizationId={account.membership.organization_id}/>:
       <div className="card-surface space-y-3 p-5">
         <p className="text-sm"><strong>El. paštas:</strong> {account.email}</p>
         <p className="text-sm"><strong>Rolė:</strong> {NAMES[account.membership.role]}</p>
         <p className="text-xs text-muted-foreground">Duomenys naudojami per saugų Supabase ryšį. Kiekviena paskyra turi individualias įmonės funkcijų teises.</p>
         {account.membership.role==="admin"&&<CloudReadStatus organizationId={account.membership.organization_id}/>}
         <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Pakeisti slaptažodį</summary>
           <div className="mt-3">{passwordForm("Pakeisti paskyros slaptažodį")}</div>
         </details>
         <div className="flex flex-wrap gap-2">
           <Button variant="outline" asChild><Link to="/">Grįžti į apžvalgą</Link></Button>
           <Button variant="outline" onClick={()=>void supabase.auth.signOut()}><LogOut className="size-4"/>Atsijungti</Button>
         </div>
       </div>}
   </section>;
 }
 if(account&&!account.membership){
   return <section className="mx-auto max-w-md space-y-4 py-10">
     <h1 className="flex items-center gap-2 text-lg font-bold"><LockKeyhole className="size-5"/> Paskyrai nepriskirtos teisės</h1>
     <p className="text-sm text-muted-foreground">Prisijungta kaip {account.email}, tačiau paskyra dar nepriskirta „Švari Aplinka“ įmonei. Pakviestam administratoriui narystė priskiriama tik patvirtinus el. paštą.</p>
     <p className="text-sm">Jei gavote aktyvavimo laišką, atidarykite jame pateiktą nuorodą.</p>
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
       <PasswordInput value={password} onChange={setPassword} autoComplete="current-password"/></label>
     <Button type="submit" disabled={busy} className="w-full"><LogIn className="size-4"/>Prisijungti</Button>
     <button type="button" disabled={busy} onClick={()=>void sendReset(email)} className="text-sm text-primary underline">Pamiršau slaptažodį</button>
   </form>
   <p className="text-center text-xs text-muted-foreground">Supabase autentifikacija. Duomenys prieinami tik paskyroms, turinčioms įmonės narystę.</p>
 </section>;
}
