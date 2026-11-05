import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, ChevronDown, ChevronUp, MailPlus, RefreshCcw, ShieldCheck, UserRound, Lock, Unlock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase-client";
import { SA_MODULES, type SAAccess, type SAPermissionMap } from "@/lib/sa-access";
import { accountDeletionConfirmed, accountStateLabel } from "@/lib/account-lifecycle";
import { defaultInvitePermissions, countInviteModules } from "@/lib/invite-presets";

type ManagedAccount = {
  userId:string;email:string;displayName:string;role:"admin"|"manager"|"worker";
  active:boolean;confirmed:boolean;createdAt:string;invitedAt:string|null;suspendedAt?:string|null;awaitingPassword?:boolean;
  permissions:SAPermissionMap;
};
type ApiResponse = {ok:boolean;error?:string;accounts?:ManagedAccount[]};
const LEVELS:{value:SAAccess;label:string}[]=[
  {value:"none",label:"Nėra prieigos"},
  {value:"view",label:"Peržiūrėti"},
  {value:"edit",label:"Redaguoti"}
];
const ROLE_LABEL:{[key:string]:string}={
  admin:"Administratorius",manager:"Vadybininkas",worker:"Darbuotojas"
};

export function AccountManagement({organizationId}:{organizationId:string}){
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [accounts,setAccounts]=useState<ManagedAccount[]>([]);
  const [expanded,setExpanded]=useState("");
  const [email,setEmail]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [role,setRole]=useState<"manager"|"worker">("manager");
  const [inviteExpanded,setInviteExpanded]=useState(false);
  const [invitePermissions,setInvitePermissions]=useState<SAPermissionMap>(()=>defaultInvitePermissions("manager"));
  const [drafts,setDrafts]=useState<Record<string,SAPermissionMap>>({});
  const [deleteTarget,setDeleteTarget]=useState<ManagedAccount|null>(null);
  const [deleteConfirmation,setDeleteConfirmation]=useState("");
  const invoke=useCallback(async(action:string,extra:Record<string,unknown>={}):Promise<ApiResponse>=>{
    const {data,error}=await supabase.functions.invoke<ApiResponse>("sa-account-admin",{
      body:{action,organizationId,...extra}
    });
    if(error){
      // Edge Functions return a structured Lithuanian error, but the SDK normally
      // shows only "non-2xx status code". Preserve the actual safe server message.
      const context=(error as typeof error & {context?:Response}).context;
      if(context && typeof context.clone==="function"){
        let apiMessage="";
        try {
          const result=await context.clone().json() as {error?:unknown};
          if(typeof result?.error==="string")apiMessage=result.error.trim();
        } catch {/* Use HTTP status if no JSON error was returned. */}
        if(apiMessage)throw new Error(apiMessage);
        throw new Error("Paskyrų serveris grąžino HTTP "+context.status+". Patikrinkite administratoriaus teises ir el. pašto nustatymus.");
      }
      throw new Error("Paskyrų valdymo ryšio klaida: "+error.message);
    }
    if(!data?.ok)throw new Error(data?.error||"Nepavyko atlikti veiksmo");
    return data;
  },[organizationId]);

  const reload=useCallback(async()=>{
    try{
      const data=await invoke("list");
      setAccounts(data.accounts||[]);
      setDrafts(Object.fromEntries((data.accounts||[]).map(a=>[a.userId,{...a.permissions}])));
    }catch(err){toast.error(err instanceof Error?err.message:"Nepavyko gauti paskyrų")}
    finally{setLoading(false)}
  },[invoke]);
  useEffect(()=>{void reload()},[reload]);

  const invite=async(e:FormEvent)=>{
    e.preventDefault();
    if(!email.trim())return;
    setBusy(true);
    try{
      await invoke("invite",{email:email.trim(),displayName:displayName.trim(),role,permissions:invitePermissions});
      toast.success("Kvietimas išsiųstas. Pradinės teisės išsaugotos; naudotojas jas gaus tik susikūręs slaptažodį.");
      setEmail("");setDisplayName("");setInvitePermissions(defaultInvitePermissions(role));await reload();
    }catch(err){toast.error(err instanceof Error?err.message:"Kvietimas nepavyko")}
    finally{setBusy(false)}
  };
  const save=async(account:ManagedAccount)=>{
    setBusy(true);
    try{
      await invoke("permissions",{userId:account.userId,permissions:drafts[account.userId]||{}});
      toast.success("Paskyros teisės išsaugotos. Pakeitimai galios po duomenų atnaujinimo.");
      await reload();
    }catch(err){toast.error(err instanceof Error?err.message:"Nepavyko išsaugoti teisių")}
    finally{setBusy(false)}
  };
  const toggle=async(account:ManagedAccount)=>{
    const message=account.active
      ? "Laikinai sustabdyti paskyrą? Žmogus nebegalės prisijungti ir neteks prieigos prie įmonės duomenų, bet vėliau galėsite ją atblokuoti."
      : "Atblokuoti paskyrą? Grįš anksčiau jai suteiktos funkcijų teisės.";
    if(!window.confirm(message))return;
    setBusy(true);
    try{
      await invoke(account.active?"suspend":"restore",{userId:account.userId});
      toast.success(account.active?"Paskyra laikinai sustabdyta":"Paskyra vėl aktyvi");
      await reload();
    }catch(err){toast.error(err instanceof Error?err.message:"Nepavyko pakeisti paskyros būsenos")}
    finally{setBusy(false)}
  };

  const deleteAccount=async()=>{
    const target=deleteTarget;
    if(!target)return;
    if(!accountDeletionConfirmed(target.email,deleteConfirmation)){
      toast.error("Patvirtinimui įrašykite tikslų paskyros el. paštą.");
      return;
    }
    setBusy(true);
    try{
      await invoke("delete",{userId:target.userId,confirmation:deleteConfirmation});
      toast.success("Prisijungimo paskyra negrįžtamai pašalinta. Darbų ir adresų istorija išsaugota.");
      setDeleteTarget(null);setDeleteConfirmation("");setExpanded("");await reload();
    }catch(err){toast.error(err instanceof Error?err.message:"Nepavyko ištrinti paskyros")}
    finally{setBusy(false)}
  };

  return <div className="space-y-5">
    <section className="card-surface space-y-4 p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><MailPlus className="size-5"/> Pakviesti naudotoją</h2>
      <p className="text-sm text-muted-foreground">Registracija nevieša. Pakviestas žmogus pirmiausia susikurs slaptažodį. Jūs galite nustatyti jo pradines teises prieš išsiunčiant kvietimą ir vėliau jas bet kada pakeisti.</p>
      <form onSubmit={invite} className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">El. paštas
          <input type="email" required className="w-full rounded-lg border bg-background p-3" value={email}
            onChange={e=>setEmail(e.target.value)} autoComplete="off" placeholder="darbuotojas@example.com"/>
        </label>
        <label className="space-y-1 text-sm font-medium">Vardas (neprivalomas)
          <input className="w-full rounded-lg border bg-background p-3" value={displayName}
            onChange={e=>setDisplayName(e.target.value)} maxLength={120} placeholder="Vardas Pavardė"/>
        </label>
        <label className="space-y-1 text-sm font-medium">Rolė
          <select value={role} onChange={e=>{const next=e.target.value as "manager"|"worker";setRole(next);setInvitePermissions(defaultInvitePermissions(next));}}
            className="w-full rounded-lg border bg-background p-3">
            <option value="manager">Vadybininkas</option>
            <option value="worker">Darbuotojas</option>
          </select>
        </label>
        <div className="sm:col-span-2 rounded-lg border">
          <button type="button" className="flex w-full items-center justify-between gap-3 p-3 text-left"
            aria-expanded={inviteExpanded} onClick={()=>setInviteExpanded(v=>!v)}>
            <span className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-primary"/> Pradinės prieigos teisės</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {countInviteModules(invitePermissions)} funkcijos
              {inviteExpanded?<ChevronUp className="size-4"/>:<ChevronDown className="size-4"/>}
            </span>
          </button>
          {inviteExpanded&&<div className="space-y-1 border-t p-3">
            {SA_MODULES.filter(module=>module.key!=="account").map(module=>
              <div key={module.key} className="grid grid-cols-[minmax(0,1fr)_minmax(136px,190px)] items-center gap-2 border-b py-2 last:border-0">
                <label htmlFor={"invite-"+module.key} className="text-sm font-medium">{module.name}</label>
                <select id={"invite-"+module.key} className="min-w-0 rounded-lg border bg-background px-2 py-2 text-sm"
                  value={invitePermissions[module.key]||"none"} disabled={busy}
                  onChange={event=>setInvitePermissions(p=>({...p,[module.key]:event.target.value as SAAccess}))}>
                  {LEVELS.map(level=><option key={level.value} value={level.value}>{level.label}</option>)}
                </select>
              </div>
            )}
          </div>}
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            „Nėra prieigos“ paslepia funkciją. Paskyra visada gali valdyti savo slaptažodį.
            Prieigos bus suteiktos tik po kvietimo patvirtinimo ir slaptažodžio sukūrimo.
          </p>
        </div>
        <div className="flex items-end sm:col-span-2">
          <Button className="w-full sm:w-auto" disabled={busy} type="submit"><MailPlus className="size-4"/> Siųsti kvietimą</Button>
        </div>
      </form>
      <p className="text-xs text-muted-foreground">Kvietimo pristatymas priklauso nuo Supabase Auth el. pašto nustatymų. Savo siuntėjo vardui ir adresui reikalingas patvirtintas SMTP domenas.</p>
    </section>

    <section className="card-surface space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Paskyros ir funkcijų teisės</h2>
        <Button disabled={loading||busy} variant="outline" size="sm" onClick={()=>void reload()}>
          <RefreshCcw className="size-4"/> Atnaujinti
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Leidimus galite bet kada papildyti arba sumažinti. „Nėra prieigos“ visiškai paslepia funkciją. Paskyrą galima laikinai sustabdyti arba pašalinti negrįžtamai. Darbų archyvavimas ir trynimas lieka administratoriui.</p>
      {loading?<p className="text-muted-foreground">Kraunamos paskyros…</p>:accounts.length===0?
        <p className="text-muted-foreground">Paskyrų nerasta.</p>:
        <div className="space-y-3">{accounts.map(a=><div key={a.userId} className="rounded-lg border">
          <button type="button" onClick={()=>setExpanded(v=>v===a.userId?"":a.userId)}
            aria-expanded={expanded===a.userId} className="flex w-full items-center justify-between gap-2 p-3 text-left">
            <span className="flex min-w-0 items-center gap-3">
              {a.role==="admin"?<ShieldCheck className="size-6 shrink-0 text-primary"/>:<UserRound className="size-6 shrink-0"/>}
              <span className="min-w-0">
                <span className="block truncate font-semibold">{a.displayName||a.email}</span>
                {a.displayName&&<span className="block truncate text-xs text-muted-foreground">{a.email}</span>}
                <span className="block text-xs text-muted-foreground">{ROLE_LABEL[a.role]} · {a.awaitingPassword?"Laukia slaptažodžio sukūrimo":accountStateLabel(a.active,a.confirmed)}</span>
              </span>
            </span>
            {expanded===a.userId?<ChevronUp className="size-5 shrink-0"/>:<ChevronDown className="size-5 shrink-0"/>}
          </button>
          {expanded===a.userId&&<div className="space-y-3 border-t p-3">
            {a.role==="admin"?<p className="text-sm">Administratoriaus teisės pilnos ir čia nekeičiamos.</p>:<>
              <div className="space-y-2">
                {SA_MODULES.filter(m=>m.key!=="account").map(m=><div key={m.key} className="grid grid-cols-[1fr_minmax(130px,180px)] items-center gap-3 rounded-md border-b py-2">
                  <label htmlFor={a.userId+"-"+m.key} className="text-sm font-medium">{m.name}</label>
                  <select id={a.userId+"-"+m.key} value={drafts[a.userId]?.[m.key]||"none"}
                    onChange={e=>setDrafts(d=>({...d,[a.userId]:{...(d[a.userId]||{}),[m.key]:e.target.value as SAAccess}}))}
                    className="min-w-0 rounded-lg border bg-background px-2 py-2 text-sm" disabled={busy}>
                    {LEVELS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>)}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={()=>void save(a)} disabled={busy}><Check className="size-4"/> Išsaugoti teises</Button>
                <Button variant="outline" disabled={busy} onClick={()=>void toggle(a)}>
                  {a.active?<Lock className="size-4"/>:<Unlock className="size-4"/>}
                  {a.active?"Sustabdyti paskyrą":"Atblokuoti paskyrą"}
                </Button>
                <Button variant="destructive" disabled={busy} onClick={()=>{setDeleteTarget(a);setDeleteConfirmation("");}}>
                  <Trash2 className="size-4"/> Ištrinti paskyrą
                </Button>
              </div>
            </>}
          </div>}
        </div>)}</div>}
    </section>

    <Dialog open={Boolean(deleteTarget)} onOpenChange={open=>{if(!open&&!busy){setDeleteTarget(null);setDeleteConfirmation("");}}}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-destructive">Negrįžtamai ištrinti paskyrą?</DialogTitle>
          <DialogDescription>
            Pašalinamas Supabase Auth prisijungimas ir visos prieigos teisės. Šios paskyros nebus galima atblokuoti.
            Istoriniai darbo, adreso ir nuotraukų įrašai nebus ištrinti.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm">Norėdami patvirtinti, įveskite visą el. pašto adresą: <strong>{deleteTarget?.email}</strong></p>
          <input type="email" autoComplete="off" aria-label="Patvirtinti ištrinimą el. paštu"
            value={deleteConfirmation} onChange={e=>setDeleteConfirmation(e.target.value)}
            className="w-full rounded-lg border border-input bg-background p-3" placeholder="Įveskite el. paštą"/>
          <p className="text-xs text-muted-foreground">Jeigu žmogui tik laikinai nereikia prieigos, rinkitės „Sustabdyti paskyrą“.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={()=>{setDeleteTarget(null);setDeleteConfirmation("");}} disabled={busy}>Atšaukti</Button>
          <Button variant="destructive" disabled={busy||!deleteTarget||!accountDeletionConfirmed(deleteTarget.email,deleteConfirmation)}
            onClick={()=>void deleteAccount()}>
            <Trash2 className="size-4"/> Visam laikui ištrinti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
