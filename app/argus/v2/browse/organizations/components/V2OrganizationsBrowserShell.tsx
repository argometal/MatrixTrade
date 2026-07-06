"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { V2CreateEntityButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { V2BrowseStatusFilter } from "@/app/argus/v2/components/V2BrowseStatusFilter";
import { V2RelationshipChart } from "@/app/argus/v2/components/V2RelationshipChart";
import { V2Badge } from "../../../components/v2-ui";
import type {
  V2OrganizationBrowseCard,
  V2OrganizationBrowseStatus,
  V2OrganizationBrowseSummary,
} from "@/lib/argus/v2/organization-browse-utils";

function badgeTone(tone: V2OrganizationBrowseCard["statusTone"]): "default" | "green" | "blue" | "amber" {
  return tone;
}

const METRIC_ICONS = {
  projects: "📁",
  people: "👤",
  journal: "📓",
  emails: "✉",
  files: "📎",
  topics: "🏷",
} as const;

function SummaryPill({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon?: string;
  tone?: "default" | "green" | "amber" | "blue";
}) {
  const valueTone =
    tone === "green"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "blue"
          ? "text-sky-300"
          : "text-zinc-50";

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
        {icon ? <span aria-hidden>{icon}</span> : null}
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueTone}`}>{value}</p>
    </div>
  );
}

function orgInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function OrganizationCard({ card }: { card: V2OrganizationBrowseCard }) {
  return (
    <Link
      href={card.href}
      className="group block rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 transition hover:border-violet-500/40 hover:bg-zinc-900/80"
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-zinc-800 text-sm font-bold text-violet-100 ring-1 ring-violet-500/20">
          {orgInitials(card.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-bold text-zinc-50 group-hover:text-violet-100">{card.name}</h2>
            <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
          </div>
        </div>
        <span className="shrink-0 text-xs text-zinc-600 group-hover:text-violet-400">Open →</span>
      </div>

      <p className="line-clamp-2 text-sm leading-relaxed text-zinc-400">{card.description}</p>

      <div className="mt-4 grid grid-cols-6 gap-1">
        {(Object.keys(METRIC_ICONS) as (keyof typeof METRIC_ICONS)[]).map((key) => (
          <div key={key} className="text-center">
            <div className="text-sm" aria-hidden>
              {METRIC_ICONS[key]}
            </div>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-violet-300">{card.metrics[key]}</p>
            <p className="text-[8px] capitalize text-zinc-600">{key}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 text-xs">
        <div className="flex items-start justify-between gap-2">
          <span className="text-zinc-600">Last contact</span>
          <span className="text-right text-zinc-500">{card.lastContact.timeLabel}</span>
        </div>
        <p className="truncate text-sm text-zinc-300">{card.lastContact.label}</p>
        <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2">
          <span className="text-zinc-600">Relationship age</span>
          <span className="font-medium tabular-nums text-violet-300">{card.relationshipAge}</span>
        </div>
      </div>

      <div className="mt-3">
        <V2RelationshipChart
          points={card.trend}
          startYear={card.trendStartYear}
          endYear={card.trendEndYear}
        />
      </div>
    </Link>
  );
}

function OrganizationListRow({ card }: { card: V2OrganizationBrowseCard }) {
  return (
    <Link
      href={card.href}
      className="flex items-center gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 transition hover:border-violet-500/30 hover:bg-zinc-900/70"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-bold text-violet-200">
        {orgInitials(card.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-zinc-100">{card.name}</p>
          <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {card.lastContact.label} · {card.lastContact.timeLabel} · {card.relationshipAge} history
        </p>
      </div>
      <div className="hidden shrink-0 gap-4 text-center sm:flex">
        <span className="text-xs text-zinc-500">
          <span className="block font-semibold text-violet-300">{card.metrics.projects}</span>
          Projects
        </span>
        <span className="text-xs text-zinc-500">
          <span className="block font-semibold text-violet-300">{card.metrics.people}</span>
          People
        </span>
        <span className="text-xs text-zinc-500">
          <span className="block font-semibold text-violet-300">{card.metrics.emails}</span>
          Emails
        </span>
      </div>
    </Link>
  );
}

function HowToReadSidebar() {
  const items = [
    {
      title: "Organization overview",
      body: "Name, status, and a short description — the health and context of the relationship at a glance.",
    },
    {
      title: "Quick metrics",
      body: "Projects, people, journal, emails, files, and topics — volume of activity and evidence tied to this institution.",
    },
    {
      title: "Last contact",
      body: "When the last interaction happened and what form it took — email or journal.",
    },
    {
      title: "Relationship age",
      body: "How long this organization has existed in your knowledge base — maturity of the relationship.",
    },
    {
      title: "Activity trend",
      body: "A visual trend of communication and notes over the last year — not financial, but relationship activity.",
    },
    {
      title: "Actionable selection",
      body: "Open the organization that needs attention — the detail page holds everything across years.",
    },
  ];

  return (
    <aside className="hidden w-72 shrink-0 xl:block">
      <div className="sticky top-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-200">How to read this page</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Long-term memory — not a CRM. Which organization do you want to analyze?
        </p>
        <ul className="mt-4 space-y-4">
          {items.map((item) => (
            <li key={item.title}>
              <p className="text-xs font-medium text-violet-300">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
          <p className="text-xs leading-relaxed text-amber-200/90">
            Tip: use Filters to narrow by status when your portfolio grows.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function V2OrganizationsBrowserShell({
  cards,
  summary,
}: {
  cards: V2OrganizationBrowseCard[];
  summary: V2OrganizationBrowseSummary;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<V2OrganizationBrowseStatus | "all">("all");
  const sorted = useMemo(() => cards, [cards]);
  const filtered = useMemo(
    () => (statusFilter === "all" ? sorted : sorted.filter((c) => c.status === statusFilter)),
    [sorted, statusFilter]
  );

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="flex gap-8">
        <div className="min-w-0 flex-1">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-lg ring-1 ring-violet-500/30">
                  🏢
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Organizations</h1>
              </div>
              <p className="mt-1 text-sm text-zinc-500">All organizations in your knowledge base.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    view === "grid" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  aria-label="Grid view"
                >
                  ▦
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    view === "list" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  aria-label="List view"
                >
                  ☰
                </button>
              </div>
              <V2BrowseStatusFilter
                label="Filters"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "Prospect", label: "Prospect" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                  { value: "Archived", label: "Archived" },
                ]}
              />
              <V2CreateEntityButton
                kind="organization"
                label="+ Organization"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
              />
            </div>
          </header>

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <SummaryPill label="Total Organizations" value={summary.total} />
            <SummaryPill label="Active" value={summary.active} icon="✓" tone="green" />
            <SummaryPill label="Inactive" value={summary.inactive} icon="◷" tone="amber" />
            <SummaryPill label="Archived" value={summary.archived} icon="▣" tone="default" />
            <SummaryPill label="Total Projects" value={summary.totalProjects} icon="📁" tone="blue" />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
              <p className="text-sm text-zinc-500">No organizations yet.</p>
              <p className="mt-1 text-xs text-zinc-600">
                Create one to start building institutional memory across years.
              </p>
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((card) => (
                <OrganizationCard key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((card) => (
                <OrganizationListRow key={card.id} card={card} />
              ))}
            </div>
          )}

          {filtered.length > 0 ? (
            <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 pt-4 text-xs text-zinc-500">
              <p>
                Showing 1 to {filtered.length} of {filtered.length} organization
                {filtered.length === 1 ? "" : "s"}
              </p>
            </footer>
          ) : null}
        </div>

        <HowToReadSidebar />
      </div>
    </div>
  );
}
