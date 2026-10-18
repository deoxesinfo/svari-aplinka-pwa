import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, CalendarDays, ClipboardList, Building2, Images, ShieldCheck, Settings, Users, ChartNoAxesCombined,
  PanelLeftClose, PanelLeftOpen, Menu, Sparkles, X, History,
} from "lucide-react";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/", label: "Apžvalga", icon: LayoutDashboard },
  { to: "/kalendorius", label: "Kalendorius", icon: CalendarDays },
  { to: "/darbai", label: "Darbai", icon: ClipboardList },
  { to: "/adresai", label: "Adresai", icon: Building2 },
  { to: "/darbuotojai", label: "Darbuotojai", icon: Users },
  { to: "/analitika", label: "Analitika", icon: ChartNoAxesCombined },
  { to: "/nuotraukos", label: "Nuotraukos", icon: Images },
  { to: "/patikrinimai", label: "Patikrinimai", icon: ShieldCheck },
  { to: "/pakeitimai", label: "Pakeitimai", icon: History },
  { to: "/nustatymai", label: "Nustatymai", icon: Settings },
] as const;

function useActive() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (to: string) => (to === "/" ? path === "/" : path === to || path.startsWith(to + "/"));
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Sparkles className="size-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-bold text-sidebar-accent-foreground">Švari Aplinka</div>
          <div className="text-xs text-sidebar-foreground/70">Darbų valdymas</div>
        </div>
      )}
    </div>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-1" aria-label="Pagrindinė navigacija">
      {NAV.map((n) => (
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
  useEffect(() => setDrawer(false), [path]);

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 transition-[width] lg:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className={cn("mb-6 flex items-center px-1 pt-1", collapsed ? "justify-center" : "justify-between")}>
          <Brand compact={collapsed} />
        </div>
        <NavList collapsed={collapsed} />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent/60 justify-center"
          aria-label={collapsed ? "Išskleisti meniu" : "Suskleisti meniu"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /> Suskleisti</>}
        </button>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Meniu">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <Brand />
              <button onClick={() => setDrawer(false)} className="rounded-md p-2 text-sidebar-foreground" aria-label="Uždaryti meniu">
                <X className="size-5" />
              </button>
            </div>
            <NavList onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner />
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setDrawer(true)} className="-ml-2 rounded-md p-2" aria-label="Atidaryti meniu">
            <Menu className="size-5" />
          </button>
          <span className="text-sm font-bold">Švari Aplinka</span>
          <span className="text-sm text-muted-foreground">· Darbų valdymas</span>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
          {state.loaded ? children : (
            <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Kraunama…</div>
          )}
        </main>
        {/* Mobile bottom nav */}
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur lg:hidden" aria-label="Apatinė navigacija">
          <div className="grid grid-cols-5">
            {NAV.filter(n => ["/", "/kalendorius", "/darbai", "/adresai", "/nuotraukos"].includes(n.to)).map((n) => (
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