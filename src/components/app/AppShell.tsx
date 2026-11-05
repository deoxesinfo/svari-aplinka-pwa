import { Link, useRouterState } from "@tanstack/react-router";
import { SA_LAST_ROUTE_KEY } from "@/lib/navigation-persistence";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, CalendarDays, ClipboardList, Building2, Images, ShieldCheck, Settings, Users, ChartNoAxesCombined,
  PanelLeftClose, PanelLeftOpen, Menu, Sparkles, X, History, UserCircle, ScrollText, HardDrive, MessageSquare,
} from "lucide-react";
import { useAppState,isCloudMode,getCloudSaveError } from "@/lib/store";
import { canView,canEdit,moduleForPath,useSAAccess,SA_MODULES } from "@/lib/sa-access";
import { cn } from "@/lib/utils";
import {AppLoading} from "@/components/app/AppLoading";
import {VersionNotice} from "@/components/app/VersionNotice";
import {supabase} from "@/lib/supabase-client";

export const NAV = [
  { to: "/", label: "Apžvalga", icon: LayoutDashboard },
  { to: "/kalendorius", label: "Kalendorius", icon: CalendarDays },
  { to: "/darbai", label: "Darbai", icon: ClipboardList },
  { to: "/adresai", label: "Adresai", icon: Building2 },
  { to: "/darbuotojai", label: "Darbuotojai", icon: Users },
  { to: "/pranesimai", label: "Pranešimai", icon: MessageSquare },
  { to: "/analitika", label: "Analitika", icon: ChartNoAxesCombined },
  { to: "/nuotraukos", label: "Nuotraukos", icon: Images },
  { to: "/saugykla", label: "Saugykla", icon: HardDrive },
  { to: "/patikrinimai", label: "Patikrinimai", icon: ShieldCheck },
  { to: "/pakeitimai", label: "Pakeitimai", icon: History },
  { to: "/istorija", label: "Istorija", icon: ScrollText },
  { to: "/paskyra", label: "Paskyra", icon: UserCircle },
  { to: "/nustatymai", label: "Nustatymai", icon: Settings },
] as const;

function useActive() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (to: string) => (to === "/" ? path === "/" : path === to || path.startsWith(to + "/"));
}

function Brand({ compact }: { compact?: boolean }) {
  const [email,setEmail]=useState("");
  useEffect(()=>{
    let alive=true;
    void supabase.auth.getSession().then(({data})=>{
      if(alive)setEmail(data.session?.user.email||"");
    }).catch(()=>{});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(alive)setEmail(session?.user.email||"");
    });
    return ()=>{alive=false;subscription.unsubscribe()};
  },[]);
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Sparkles className="size-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-bold text-sidebar-accent-foreground">Švari Aplinka</div>
          <div className="text-xs text-sidebar-foreground/70">Darbų valdymas</div>
          {email&&<div className="mt-1 max-w-[186px] truncate text-[11px] text-sidebar-foreground/65" title={"Prisijungta: "+email} aria-label={"Prisijungta: "+email}>{email}</div>}
        </div>
      )}
    </div>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const isActive = useActive();
  useSAAccess();
  const allowed=new Set(SA_MODULES.filter(m=>canView(m.key)).map(m=>m.path));
  return (
    <nav className="flex flex-col gap-1" aria-label="Pagrindinė navigacija">
      {NAV.filter(n=>!isCloudMode()||allowed.has(n.to)).map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={onNavigate}
          title={collapsed ? n.label : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            isActive(n.to)
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <n.icon className={cn("size-[18px] shrink-0", isActive(n.to) && "text-sidebar-primary")} />
          {!collapsed && n.label}
        </Link>
      ))}
    </nav>
  );
}

export function DemoBanner() {
  return (
    <div className="bg-warning-soft px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-warning-foreground">
      DEMO · duomenys saugomi tik šiame įrenginyje
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const state = useAppState();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const isActive = useActive();
  const path = useRouterState({ select: (r) => r.location.pathname });
  useSAAccess();
  const module=moduleForPath(path);
  const blocked=Boolean(isCloudMode() && module && !canView(module));
  const readOnly=Boolean(isCloudMode() && module && canView(module) && !canEdit(module));
  const firstAllowed=SA_MODULES.find(m=>canView(m.key));
  useEffect(() => setDrawer(false), [path]);
  useEffect(()=>{
    try{
      const routed=window.location.hash.startsWith("#/")?window.location.hash.slice(1):path;
      sessionStorage.setItem(SA_LAST_ROUTE_KEY,routed);
    }catch{/* Non-essential navigation memory */}
  },[path]);

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar p-3 transition-[width] lg:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className={cn("mb-3 shrink-0 flex items-center px-1 pt-1", collapsed ? "justify-center" : "justify-between")}>
          <Brand compact={collapsed} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
          <NavList collapsed={collapsed} />
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="mt-2 shrink-0 flex items-center justify-center gap-2 rounded-lg border-t border-sidebar-border px-3 py-3 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
          aria-label={collapsed ? "Išskleisti meniu" : "Suskleisti meniu"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /> Suskleisti</>}
        </button>
        {!collapsed&&<p className="mt-1 shrink-0 text-center text-[10px] text-sidebar-foreground/50" title="Publikuotos PWA versijos identifikatorius">
          Versija {import.meta.env.VITE_SA_BUILD_SHA?.slice(0,7)||"vietinė"}
        </p>}
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Meniu">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex h-dvh w-72 flex-col overflow-hidden bg-sidebar p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <Brand />
              <button onClick={() => setDrawer(false)} className="rounded-md p-2 text-sidebar-foreground" aria-label="Uždaryti meniu">
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6"><NavList onNavigate={() => setDrawer(false)} /></div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {isCloudMode()?<div className="bg-primary/10 px-4 py-1.5 text-center text-xs font-semibold text-primary">
          Supabase · bendri įmonės duomenys{getCloudSaveError()?" · NEIŠSAUGOTA: "+getCloudSaveError():""}
        </div>:<DemoBanner />}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setDrawer(true)} className="-ml-2 rounded-md p-2" aria-label="Atidaryti meniu">
            <Menu className="size-5" />
          </button>
          <span className="text-sm font-bold">Švari Aplinka</span>
          <span className="text-sm text-muted-foreground">· Darbų valdymas</span>
        </header>
        <VersionNotice />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
          {blocked ? <section className="card-surface mx-auto max-w-xl space-y-3 p-6" role="alert">
            <h1 className="text-xl font-semibold">Šiai funkcijai prieiga nesuteikta</h1>
            <p className="text-sm text-muted-foreground">Administratorius gali pakeisti tavo paskyros leidimus. Šis puslapis ir jo duomenys nepasiekiami.</p>
            {firstAllowed&&<Link className="text-primary underline" to={firstAllowed.path}>Atidaryti leidžiamą skiltį</Link>}
          </section> : state.loaded ? (
            readOnly ? <div className="min-w-0">
              <p role="status" className="mb-3 text-sm font-medium text-muted-foreground">
                Tik peržiūra – galima naudotis navigacija, filtrais ir peržiūros langais. Keitimo veiksmai priklauso nuo konkrečiai funkcijai suteiktų teisių.
              </p>
              {children}
            </div> : children
          ) : <AppLoading message="Kraunami duomenys…" minHeight="50vh"/>}
        </main>
        {/* Mobile bottom nav */}
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur lg:hidden" aria-label="Apatinė navigacija">
          <div className="grid grid-cols-5">
            {NAV.filter(n => ["/","/kalendorius","/darbai","/adresai","/nuotraukos"].includes(n.to) && (!isCloudMode() || canView(moduleForPath(n.to) || "overview"))).map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] font-medium",
                  isActive(n.to) ? "text-primary" : "text-muted-foreground",
                )}
              >
                <n.icon className="size-5" />
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}