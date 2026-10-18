import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LogIn, LogOut, LockKeyhole, ShieldCheck, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase, AUTH_ENFORCED } from "@/lib/supabase-client";
import { CloudReadStatus } from "@/components/app/CloudReadStatus";

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
 useEffect(()=>{
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
     // Avoid querying Supabase synchronously inside the auth state callback.
     queueMicrotask(()=>{if(alive)void read();});
   });
   return ()=>{alive=false;subscription.unsubscribe()};
 },[]);
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
     const redirectTo=window.location.origin+window.location.pathname;
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
 if(mode==="gate"&&!AUTH_ENFORCED)return <>{children}</>;
 if(loading)return <div className="grid min-h-[70vh] place-items-center p-6 text-sm text-muted-foreground">Tikrinama paskyra…</div>;
 if(account?.membership){
   if(mode==="gate")return <>{children}</>;
   return <section className="mx-auto max-w-xl space-y-4 py-5">
     <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="size-6 text-primary"/> Mano paskyra</h1>
     <div className="card-surface space-y-3 p-5">
       <p className="text-sm"><strong>El. paštas:</strong> {account.email}</p>
       <p className="text-sm"><strong>Rolė:</strong> {NAMES[account.membership.role]}</p>
       <p className="text-xs text-muted-foreground">Šiame etape paruošti saugūs prisijungimai ir RLS. DEMO duomenys dar nėra perkeliami į bendrą duomenų bazę; sinchronizacija bus įjungta atskirai.</p>
       <CloudReadStatus organizationId={account.membership.organization_id}/>
       <Button variant="outline" onClick={()=>void supabase.auth.signOut()}><LogOut className="size-4"/>Atsijungti</Button>
     </div>
   </section>;
 }
 if(account&&!account.membership){
   return <section className="mx-auto max-w-md space-y-4 py-10">
     <h1 className="flex items-center gap-2 text-lg font-bold"><LockKeyhole className="size-5"/> Paskyrai nepriskirtos teisės</h1>
     <p className="text-sm text-muted-foreground">Prisijungta kaip {account.email}, tačiau paskyra dar nepriskirta „Švari Aplinka“ įmonei. Pasirinkus administratorių, tai atliksime saugiai Supabase.</p>
     <Button onClick={()=>void supabase.auth.signOut()} variant="outline"><LogOut className="size-4"/>Atsijungti</Button>
   </section>;
 }
 return <section className="mx-auto max-w-md space-y-4 py-8">
   <div className="text-center"><LockKeyhole className="mx-auto mb-3 size-10 text-primary"/><h1 className="text-xl font-bold">Švari Aplinka · Prisijungimas</h1>
   <p className="mt-2 text-sm text-muted-foreground">Tik pakviestiems darbuotojams. Viešos registracijos formos nėra.</p></div>
   {recovery?<form onSubmit={setNew} className="card-surface space-y-3 p-5">
     <label className="block text-sm font-medium">Naujas slaptažodis
       <input className="mt-1 w-full rounded-lg border bg-background p-3" type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>
     <Button disabled={busy} type="submit">Pakeisti slaptažodį</Button>
   </form>:<form onSubmit={signIn} className="card-surface space-y-4 p-5">
     <label className="block text-sm font-medium">El. paštas
       <input className="mt-1 w-full rounded-lg border bg-background p-3" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
     <label className="block text-sm font-medium">Slaptažodis
       <input className="mt-1 w-full rounded-lg border bg-background p-3" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
     <Button type="submit" disabled={busy} className="w-full"><LogIn className="size-4"/>Prisijungti</Button>
     <button type="button" disabled={busy} onClick={()=>void reset()} className="text-sm text-primary underline">Pamiršau slaptažodį</button>
   </form>}
   <p className="text-center text-xs text-muted-foreground">Supabase autentifikacija. Duomenys prieinami tik paskyroms, turinčioms įmonės narystę.</p>
 </section>;
}
