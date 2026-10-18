import { createRootRoute, Outlet, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Toaster } from "sonner";
export const Route = createRootRoute({
  component: () => <><AppShell><Outlet/></AppShell><Toaster richColors position="top-right"/></>,
  notFoundComponent: () => <div className="mx-auto max-w-xl p-10 text-center"><h1 className="text-2xl font-bold">Puslapis nerastas</h1><Link to="/" className="mt-4 inline-block text-primary underline">Grįžti į apžvalgą</Link></div>,
});
