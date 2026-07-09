import Link from "next/link";
import type { V2HomeEvidenceSummary } from "@/lib/argus/v2/intelligence-viz";

type PulseChip = {
  href: string;
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  badge?: { text: string; tone: "violet" | "emerald" };
  icon: string;
  accent: string;
};

function PulseChipCard({ chip }: { chip: PulseChip }) {
  return (
    <Link
      href={chip.href}
      className={`group flex min-h-[4.25rem] flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3.5 py-3 transition hover:border-zinc-700 hover:bg-zinc-900 ${chip.accent}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-base opacity-70 transition group-hover:opacity-100" aria-hidden>
          {chip.icon}
        </span>
        {chip.badge ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
              chip.badge.tone === "violet"
                ? "bg-violet-500/20 text-violet-200 ring-violet-500/35"
                : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
            }`}
          >
            {chip.badge.text}
          </span>
        ) : chip.delta && chip.delta > 0 ? (
          <span className="shrink-0 text-[10px] font-medium text-emerald-400/90">
            +{chip.delta} {chip.deltaLabel ?? "wk"}
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none text-zinc-50 group-hover:text-white">
          {chip.value}
        </p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500 group-hover:text-zinc-400">
          {chip.label}
        </p>
      </div>
    </Link>
  );
}

/** KPI strip — HubSpot/Linear-style compact chips (not full stat cards, not plain text). */
export function V2HomePulse({ summary, inboxPending }: { summary: V2HomeEvidenceSummary; inboxPending: number }) {
  const chips: PulseChip[] = [
    {
      href: "/argus/journal",
      label: "Journal",
      value: summary.journal,
      delta: summary.journalWeek,
      deltaLabel: "this week",
      icon: "📓",
      accent: "hover:ring-1 hover:ring-violet-500/20",
    },
    {
      href: "/argus/v2/inbox",
      label: "Emails",
      value: summary.emails,
      delta: summary.emailWeek,
      deltaLabel: "this week",
      badge: inboxPending > 0 ? { text: `${inboxPending} pending`, tone: "violet" } : undefined,
      icon: "✉",
      accent: inboxPending > 0 ? "ring-1 ring-violet-500/25 hover:ring-violet-500/40" : "hover:ring-1 hover:ring-sky-500/20",
    },
    {
      href: "/argus/v2/browse/network",
      label: "People",
      value: summary.people,
      icon: "👤",
      accent: "hover:ring-1 hover:ring-violet-500/20",
    },
    {
      href: "/argus/v2/browse/organizations",
      label: "Orgs",
      value: summary.organizations,
      icon: "🏢",
      accent: "hover:ring-1 hover:ring-orange-500/20",
    },
    {
      href: "/argus/v2/browse/projects",
      label: "Projects",
      value: summary.projects,
      icon: "📁",
      accent: "hover:ring-1 hover:ring-amber-500/20",
    },
  ];

  return (
    <div
      className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
      role="list"
      aria-label="Evidence summary"
    >
      {chips.map((chip) => (
        <div key={chip.label} role="listitem">
          <PulseChipCard chip={chip} />
        </div>
      ))}
    </div>
  );
}
