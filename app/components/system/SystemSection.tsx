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
    <section
      id={id}
      className="scroll-mt-20 rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-sm"
    >
      <header className="border-b border-zinc-800 px-5 py-4">
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
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
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={`text-sm text-zinc-200 ${mono ? "break-all font-mono text-xs text-zinc-400" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

export function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        ok
          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
          : "bg-red-500/15 text-red-300 ring-1 ring-red-500/30"
      }`}
    >
      {ok ? "✓" : "✗"} {label ?? (ok ? "OK" : "Fail")}
    </span>
  );
}
