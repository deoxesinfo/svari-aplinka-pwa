import { createFileRoute } from "@tanstack/react-router";
import { AccessPortal } from "@/components/app/AccessPortal";
export const Route=createFileRoute("/paskyra")({component:()=> <AccessPortal mode="account"/>});
