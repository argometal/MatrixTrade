"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { V2CreateEntityButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { V2Badge } from "../../../components/v2-ui";
import type {
  V2NetworkBrowseCard,
  V2NetworkBrowseInsight,
  V2NetworkBrowseStatus,
  V2NetworkBrowseSummary,
  V2NetworkSmartView,
} from "@/lib/argus/v2/network-browse-utils";
import {
  applyNetworkSmartView,
  smartViewCount,
} from "@/lib/argus/v2/network-browse-utils";

const PAGE_SIZE = 8;

function badgeTone(tone: V2NetworkBrowseCard["statusTone"]): "default" | "green" | "blue" | "amber" {
  return tone;
}

const STATUS_TABS: { key: V2NetworkBrowseStatus | "all"; label: string }[] = [
  { key: "all", label: "All People" },
  { key: "Active", label: "Active" },
  { key: "Dormant", label: "Dormant" },
  { key: "New", label: "New" },
  { key: "Lost", label: "Lost" },
];

const SMART_VIEWS: { key: V2NetworkSmartView; label: string; description: string }[] = [
  { key: "key-influencers", label: "Key influencers", description: "Strong ties with shared project history" },
  { key: "decision-makers", label: "Decision makers", description: "Roles and topics tied to authority" },
  { key: "technical-experts", label: "Technical experts", description: "Capability tags from evidence" },
  { key: "recent-activity", label: "Recent activity", description: "Active relationships right now" },
  { key: "high-value-network", label: "High value network", description: "Highest evidence-backed strength" },
  { key: "dormant", label: "Dormant relationships", description: "Worth revisiting when timing is right" },
];

function SummaryPill({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-50">{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-zinc-600">{sub}</p> : null}
    </div>
  );
}

function StatusDonut({ counts, total }: { counts: Record<V2NetworkBrowseStatus, number>; total: number }) {
  if (total === 0) {
    return (
      <div className="flex h-28 items-center justify-center text-xs text-zinc-600">No people yet</div>
    );
  }

  const segments: { status: V2NetworkBrowseStatus; color: string }[] = [
    { status: "Active", color: "#34d399" },
    { status: "Dormant", color: "#fbbf24" },
    { status: "New", color: "#38bdf8" },
    { status: "Lost", color: "#71717a" },
  ];

  let offset = 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 88 88" className="h-24 w-24 shrink-0" aria-hidden>
        <circle cx="44" cy="44" r={radius} fill="none" stroke="#27272a" strokeWidth="10" />
        {segments.map(({ status, color }) => {
          const value = counts[status];
          if (value === 0) return null;
          const dash = (value / total) * circumference;
          const el = (
            <circle
              key={status}
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 44 44)"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <ul className="space-y-1 text-xs text-zinc-500">
        {segments.map(({ status, color }) => (
          <li key={status} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {status} ({counts[status]})
          </li>
        ))}
      </ul>
    </div>
  );
}

function PersonCard({ card }: { card: V2NetworkBrowseCard }) {
  return (
    <Link
      href={card.href}
      className="group block rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 transition hover:border-violet-500/40 hover:bg-zinc-900/80"
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/50 to-zinc-800 text-sm font-bold text-violet-100 ring-2 ring-zinc-900">
          {card.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate font-bold text-zinc-50 group-hover:text-violet-100">{card.name}</h2>
              <p className="truncate text-sm text-zinc-400">{card.role}</p>
              {card.organization ? (
                <p className="truncate text-xs text-zinc-500">{card.organization}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-1 text-zinc-600">
              <span className="rounded-md p-1 hover:bg-zinc-800 hover:text-amber-300" aria-hidden>
                ★
              </span>
              <span className="rounded-md p-1 hover:bg-zinc-800" aria-hidden>
                ⋮
              </span>
            </div>
          </div>
          <div className="mt-2">
            <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
          </div>
        </div>
      </div>

      {card.expertise.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {card.expertise.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-200"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-[10px] text-zinc-600">Expertise will emerge from journal topics</p>
      )}

      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-zinc-600">Last interaction</span>
        <span className="text-zinc-400">{card.lastInteraction.timeLabel}</span>
      </div>
      <p className="mb-3 truncate text-xs text-zinc-500">{card.lastInteraction.label}</p>

      {card.strength >= 75 ? (
        <p className="mb-3 text-[11px] leading-snug text-amber-200/90">
          High-value contact — evidence-backed relationship worth maintaining.
        </p>
      ) : null}

      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-zinc-600">Relationship since</span>
        <span className="text-zinc-400">{card.relationshipSince}</span>
      </div>

      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-zinc-600">Strength</span>
        <span className="font-semibold tabular-nums text-violet-300">{card.strength}%</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
          style={{ width: `${card.strength}%` }}
        />
      </div>

      <div className="flex justify-around border-t border-zinc-800/80 pt-3 text-center text-xs text-zinc-500">
        <span>
          <span className="block font-semibold text-violet-300">{card.metrics.emails}</span>
          Emails
        </span>
        <span>
          <span className="block font-semibold text-violet-300">{card.metrics.journal}</span>
          Journal
        </span>
        <span>
          <span className="block font-semibold text-violet-300">{card.metrics.events}</span>
          Events
        </span>
      </div>
    </Link>
  );
}

function PersonListRow({ card }: { card: V2NetworkBrowseCard }) {
  return (
    <Link
      href={card.href}
      className="flex items-center gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 transition hover:border-violet-500/30 hover:bg-zinc-900/70"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-200">
        {card.initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-zinc-100">{card.name}</p>
          <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {card.role}
          {card.organization ? ` · ${card.organization}` : ""} · {card.lastInteraction.timeLabel}
        </p>
      </div>
      <span className="hidden shrink-0 text-sm font-semibold tabular-nums text-violet-300 sm:block">
        {card.strength}%
      </span>
    </Link>
  );
}

function NetworkInsightsSidebar({
  summary,
  insights,
}: {
  summary: V2NetworkBrowseSummary;
  insights: V2NetworkBrowseInsight;
}) {
  return (
    <aside className="hidden w-72 shrink-0 xl:block">
      <div className="sticky top-6 space-y-4">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Network at a glance</h2>
          <div className="mt-4">
            <StatusDonut counts={insights.statusCounts} total={summary.total} />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Top organizations</h2>
          {insights.topOrganizations.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-600">Link people to organizations to see clusters.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {insights.topOrganizations.map((row) => (
                <li key={row.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="truncate text-zinc-400">{row.name}</span>
                    <span className="tabular-nums text-zinc-600">{row.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-violet-500/70"
                      style={{
                        width: `${Math.round((row.count / Math.max(summary.total, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Relationship strength</h2>
          <p className="mt-2 text-3xl font-bold tabular-nums text-violet-300">{summary.averageStrength}%</p>
          <p className="mt-1 text-xs text-zinc-600">Average strength score from evidence — not entered manually</p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Recent interactions</h2>
          <ul className="mt-3 space-y-3">
            {insights.recentInteractions.map((item) => (
              <li key={`${item.personName}-${item.sortIso}`} className="text-xs">
                <p className="font-medium text-zinc-300">{item.personName}</p>
                <p className="truncate text-zinc-500">{item.label}</p>
                <p className="text-zinc-600">{item.timeLabel}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

export function V2NetworkBrowserShell({
  cards,
  summary,
  insights,
}: {
  cards: V2NetworkBrowseCard[];
  summary: V2NetworkBrowseSummary;
  insights: V2NetworkBrowseInsight;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [statusTab, setStatusTab] = useState<V2NetworkBrowseStatus | "all">("all");
  const [smartView, setSmartView] = useState<V2NetworkSmartView>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = cards;
    if (statusTab !== "all") rows = rows.filter((c) => c.status === statusTab);
    if (smartView !== "all") rows = applyNetworkSmartView(rows, smartView);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          (c.organization ?? "").toLowerCase().includes(q) ||
          c.expertise.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return rows;
  }, [cards, statusTab, smartView, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const tabCount = (key: V2NetworkBrowseStatus | "all") => {
    if (key === "all") return cards.length;
    return cards.filter((c) => c.status === key).length;
  };

  return (
    <div className="v2-browse-shell flex min-h-[calc(100vh-4rem)] flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8">
      <div className="flex min-h-0 flex-1 gap-8 px-4 py-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-lg ring-1 ring-violet-500/30">
                  ◉
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Network</h1>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                Your professional network · relationships that create opportunities.
              </p>
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
              <button
                type="button"
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              >
                Filters
              </button>
              <V2CreateEntityButton
                kind="person"
                label="+ Person"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
              />
            </div>
          </header>

          <div className="mb-5">
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search people, companies, roles, skills…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-2.5 pl-4 pr-4 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
            />
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusTab(tab.key);
                  setSmartView("all");
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  statusTab === tab.key && smartView === "all"
                    ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/40"
                    : "border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {tab.label} ({tabCount(tab.key)})
              </button>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <SummaryPill label="Total People" value={summary.total} />
            <SummaryPill label="Active Relationships" value={summary.active} sub={`${summary.activePercent}%`} />
            <SummaryPill label="Organizations" value={summary.organizations} />
            <SummaryPill label="Projects Together" value={summary.projectsTogether} />
            <SummaryPill label="Emails Exchanged" value={summary.emailsExchanged} />
            <SummaryPill label="Interactions Logged" value={summary.interactionsLogged} />
          </div>

          {cards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
              <p className="text-sm text-zinc-500">No people in your network yet.</p>
              <p className="mt-1 text-xs text-zinc-600">
                Add someone and link orgs, projects, topics, or events in one step.
              </p>
              <div className="mt-4">
                <V2CreateEntityButton
                  kind="person"
                  label="+ Person"
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                />
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
              <p className="text-sm text-zinc-500">No people match this view.</p>
              <p className="mt-1 text-xs text-zinc-600">Add a person or adjust filters.</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pageRows.map((card) => (
                <PersonCard key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {pageRows.map((card) => (
                <PersonListRow key={card.id} card={card} />
              ))}
            </div>
          )}

          {filtered.length > 0 ? (
            <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 pt-4 text-xs text-zinc-500">
              <p>
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} people
              </p>
              {totalPages > 1 ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-md border border-zinc-800 px-2 py-1 disabled:opacity-40"
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`rounded-md px-2.5 py-1 ${
                        n === currentPage ? "bg-violet-500/20 text-violet-200" : "border border-zinc-800"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-md border border-zinc-800 px-2 py-1 disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              ) : null}
            </footer>
          ) : null}
        </div>

        <NetworkInsightsSidebar summary={summary} insights={insights} />
      </div>

      <section className="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-800/90 bg-zinc-950/95 px-4 py-3 backdrop-blur-md lg:left-56 xl:left-60">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Smart filters (quick views)
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SMART_VIEWS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => {
                setSmartView(preset.key);
                setStatusTab("all");
                setPage(1);
              }}
              className={`min-w-[140px] shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                smartView === preset.key
                  ? "border-violet-500/40 bg-violet-500/10"
                  : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
              }`}
            >
              <p className="text-xs font-medium text-zinc-200">{preset.label}</p>
              <p className="text-[10px] tabular-nums text-violet-300">
                {smartViewCount(cards, preset.key)} people
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
