import type { ReactNode } from "react";

export function SystemSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-lg border border-zinc-200 bg-white shadow-sm">
      <header className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function SystemRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className={`text-sm text-zinc-800 ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

export function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
      }`}
    >
      {ok ? "✓" : "✗"} {label ?? (ok ? "OK" : "Fail")}
    </span>
  );
}
