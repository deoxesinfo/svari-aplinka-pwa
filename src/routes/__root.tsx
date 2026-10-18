import { createRootRoute, Outlet, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Toaster } from "sonner";
import { AccessPortal } from "@/components/app/AccessPortal";
export const Route = createRootRoute({
  component: () => <><AccessPortal mode="gate"><AppShell><Outlet/></AppShell></AccessPortal><Toaster richColors position="top-right"/></>,
  notFoundComponent: () => <div className="mx-auto max-w-xl p-10 text-center"><h1 className="text-2xl font-bold">Puslapis nerastas</h1><Link to="/" className="mt-4 inline-block text-primary underline">Grįžti į apžvalgą</Link></div>,
});
