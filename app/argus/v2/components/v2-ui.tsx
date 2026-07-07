import Link from "next/link";
import type { ReactNode } from "react";

export function V2Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function V2Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "purple" | "green" | "blue" | "orange" | "red" | "amber";
}) {
  const tones = {
    default: "bg-zinc-800 text-zinc-300",
    purple: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
    green: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
    blue: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
    orange: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30",
    red: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
    amber: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function V2SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-zinc-100">{children}</h2>
      {action}
    </div>
  );
}

export function V2BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-300">
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}

export function V2LockIcon({ protected: isProtected }: { protected?: boolean }) {
  if (!isProtected) return null;
  return (
    <span className="text-zinc-400" title="Protected">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    </span>
  );
}

export function formatV2Date(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}

export function groupTimelineByDate<T extends { date: string }>(entries: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const entry of entries) {
    const key = entry.date.slice(0, 10);
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}
