import Link from "next/link";
import type { RecordType } from "@/lib/health-vault/types";
import { RECORD_TYPE_LABELS } from "@/lib/health-vault/labels";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-zinc-800 bg-zinc-900 p-4 ${className}`}>{children}</div>;
}

export function Button({
  children,
  href,
  variant = "primary",
  fullWidth = false,
  className = "",
}: {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  className?: string;
}) {
  const base = "inline-flex items-center justify-center rounded-xl px-5 py-3.5 text-base font-semibold transition";
  const variants = {
    primary: "bg-teal-600 text-white hover:bg-teal-500",
    secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700",
  };
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}>
      {children}
    </Link>
  );
}

export function PageHeader({ title, subtitle, backHref }: { title: string; subtitle?: string; backHref?: string }) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link href={backHref} className="mb-2 inline-block text-sm text-zinc-400 hover:text-zinc-200">
          ← Volver
        </Link>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-zinc-50">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
    </div>
  );
}

export function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: "teal" | "amber" }) {
  const colors = { teal: "text-teal-400", amber: "text-amber-400" };
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent ? colors[accent] : "text-zinc-50"}`}>{value}</p>
    </Card>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Card className="py-8 text-center">
      <p className="text-zinc-400">{message}</p>
    </Card>
  );
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TypeBadge({ type }: { type: RecordType }) {
  const colors: Record<RecordType, string> = {
    queja: "bg-red-600/20 text-red-400",
    incidente: "bg-orange-600/20 text-orange-400",
    comportamiento: "bg-purple-600/20 text-purple-400",
    correspondencia: "bg-blue-600/20 text-blue-400",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[type]}`}>
      {RECORD_TYPE_LABELS[type]}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    abierto: "bg-amber-600/20 text-amber-400",
    documentado: "bg-blue-600/20 text-blue-400",
    resuelto: "bg-emerald-600/20 text-emerald-400",
    escalado: "bg-red-600/20 text-red-400",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-zinc-800 text-zinc-300"}`}>
      {status}
    </span>
  );
}

export const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";

export const textareaClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 min-h-[120px] resize-y";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-300">{label}</label>
      {children}
    </div>
  );
}
