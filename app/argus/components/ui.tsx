import Link from "next/link";
import type { EntryType } from "@/lib/argus/types";
import { ENTRY_STATUS_LABELS, ENTRY_TYPE_LABELS } from "@/lib/argus/labels";

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
          ← Back
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
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TypeBadge({ type }: { type: EntryType }) {
  const colors: Record<EntryType, string> = {
    observation: "bg-amber-600/20 text-amber-400",
    event: "bg-orange-600/20 text-orange-400",
    interaction: "bg-purple-600/20 text-purple-400",
    correspondence: "bg-blue-600/20 text-blue-400",
    meeting: "bg-cyan-600/20 text-cyan-400",
    networking: "bg-teal-600/20 text-teal-400",
    opportunity: "bg-emerald-600/20 text-emerald-400",
    recognition: "bg-yellow-600/20 text-yellow-400",
    follow_up: "bg-rose-600/20 text-rose-400",
    note: "bg-zinc-700/50 text-zinc-300",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[type]}`}>
      {ENTRY_TYPE_LABELS[type]}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-amber-600/20 text-amber-400",
    documented: "bg-blue-600/20 text-blue-400",
    resolved: "bg-emerald-600/20 text-emerald-400",
    follow_up: "bg-rose-600/20 text-rose-400",
    archived: "bg-zinc-600/20 text-zinc-400",
  };
  const label = ENTRY_STATUS_LABELS[status as keyof typeof ENTRY_STATUS_LABELS] ?? status;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-zinc-800 text-zinc-300"}`}>
      {label}
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
