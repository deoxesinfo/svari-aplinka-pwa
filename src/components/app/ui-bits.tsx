import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card-surface flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 text-muted-foreground">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {text && <p className="max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

type Tone = "neutral" | "primary" | "warning" | "success" | "danger";
const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary",
  warning: "bg-warning-soft text-warning-foreground",
  success: "bg-success-soft text-primary",
  danger: "bg-danger-soft text-destructive",
};
export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const textareaCls =
  "min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AccessCode({ code }: { code: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="rounded-md bg-muted px-2.5 py-1 font-mono text-sm tracking-wider">{show ? code || "—" : "••••••••"}</code>
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        aria-label={show ? "Slėpti kodą" : "Rodyti kodą"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
      <Pill tone="warning">DEMO kodas</Pill>
    </div>
  );
}

export function Confirm({
  open, onOpenChange, title, text, confirmLabel = "Ištrinti", onConfirm,
}: { open: boolean; onOpenChange: (o: boolean) => void; title: string; text?: string; confirmLabel?: string; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {text && <AlertDialogDescription>{text}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Atšaukti</AlertDialogCancel>
          <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "warning" | "success" | "primary" }) {
  return (
    <div className="card-surface p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-bold sm:text-3xl",
          tone === "warning" && "text-warning-foreground",
          tone === "success" && "text-primary",
        )}
      >
        {value}
      </div>
    </div>
  );
}