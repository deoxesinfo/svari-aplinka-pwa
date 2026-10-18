import { createRootRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Toaster } from "sonner";
import { AccessPortal } from "@/components/app/AccessPortal";

function RootLayout() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  return <>
    {pathname === "/paskyra" ? (
      <main className="flex min-h-screen w-full items-center justify-center bg-muted/20 px-4 py-8">
        <div className="w-full max-w-xl">
          <Outlet />
        </div>
      </main>
    ) : (
      <AccessPortal mode="gate"><AppShell><Outlet /></AppShell></AccessPortal>
    )}
    <Toaster richColors position="top-right" />
  </>;
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <div className="mx-auto max-w-xl p-10 text-center"><h1 className="text-2xl font-bold">Puslapis nerastas</h1><Link to="/" className="mt-4 inline-block text-primary underline">Grįžti į apžvalgą</Link></div>,
});
