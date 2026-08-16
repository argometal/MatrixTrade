"use client";

import Link from "next/link";
import { useState } from "react";

type DetailTab = "chronicle" | "runbooks" | "links" | "tags";
type StatusFilter = "all" | "Active" | "Quiet" | "Orphans" | "Archived";
type ViewMode = "grid" | "list" | "board";

const SAMPLE = {
  name: "AI for Drilling Optimization",
  category: "Technology",
  description:
    "Cross-org thread on applying ML to drilling parameters — handover notes, vendor emails, and field events.",
  metrics: { evidence: 12, notes: 8, emails: 4, events: 3, links: 2, trackers: 1 },
  patterns: ["handover", "planning", "vendor", "field", "ml", "drilling", "safety", "ops"],
  events: [
    { name: "Vendor kickoff", when: "2d ago", notes: 4 },
    { name: "Field trial review", when: "5d ago", notes: 2 },
    { name: "Handover sync", when: "12d ago", notes: 1 },
  ],
  evidence: [
    { kind: "Note", title: "Parameter baseline", who: "VA", when: "Today", tags: ["handover"] },
    { kind: "Email", title: "Re: trial schedule", who: "Vendor", when: "Yesterday", tags: ["planning"] },
    { kind: "Note", title: "Sensor noise notes", who: "VA", when: "3d ago", tags: ["field"] },
  ],
};

const STATUS_COUNTS: Record<StatusFilter, number> = {
  all: 12,
  Active: 6,
  Quiet: 3,
  Orphans: 2,
  Archived: 1,
};

/**
 * topic001 — draft-only Topic UI density proposal.
 * Not wired into live A06. Approve here, then substitute.
 */
export function Topic001Draft() {
  const [mode, setMode] = useState<"after" | "before">("after");
  const [tab, setTab] = useState<DetailTab>("chronicle");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [menuOpen, setMenuOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(true);
  const [directOpen, setDirectOpen] = useState(false);

  const visiblePatterns = SAMPLE.patterns.slice(0, 5);
  const patternOverflow = SAMPLE.patterns.length - visiblePatterns.length;

  return (
    <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="mx-auto max-w-5xl space-y-8 px-4 py-5 lg:px-6">
          {/* Access / framing */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/25 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
                  Draft · topic001
                </p>
                <h1 className="mt-0.5 text-lg font-bold text-zinc-50">Topic UI simplification</h1>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">
                  Evaluate density only — not wired into live A06. Slice A = Topic detail chrome. Slice B =
                  browse toolbar. Chronicle / Runbooks content unchanged. Approve → then substitute.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/argus/v2/browse/topics"
                  className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:border-zinc-500"
                >
                  Open live A06
                </Link>
                <div className="flex rounded-lg border border-zinc-700 bg-zinc-900/80 p-0.5">
                  {(
                    [
                      ["after", "After"],
                      ["before", "Before"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMode(id)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                        mode === id ? "bg-violet-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                      aria-pressed={mode === id}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Slice B — browse toolbar */}
          <section aria-labelledby="topic001-browse">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 id="topic001-browse" className="text-sm font-semibold text-zinc-200">
                Slice B · Topics browse toolbar
              </h2>
              <p className="text-[10px] text-zinc-600">Replaces five Summary Pills</p>
            </div>
            {mode === "before" ? <BrowseBefore /> : (
              <BrowseAfter
                status={status}
                onStatus={setStatus}
                view={view}
                onView={setView}
              />
            )}
          </section>

          {/* Slice A — detail */}
          <section aria-labelledby="topic001-detail">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 id="topic001-detail" className="text-sm font-semibold text-zinc-200">
                Slice A · Topic detail chrome
              </h2>
              <p className="text-[10px] text-zinc-600">Target: ~30–40% more viewport before Chronicle</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 shadow-xl shadow-black/40">
              {mode === "before" ? (
                <DetailBefore
                  tab={tab}
                  onTab={setTab}
                  patterns={SAMPLE.patterns}
                />
              ) : (
                <DetailAfter
                  tab={tab}
                  onTab={setTab}
                  menuOpen={menuOpen}
                  onMenuOpen={setMenuOpen}
                  visiblePatterns={visiblePatterns}
                  patternOverflow={patternOverflow}
                  eventsOpen={eventsOpen}
                  onEventsOpen={setEventsOpen}
                  directOpen={directOpen}
                  onDirectOpen={setDirectOpen}
                />
              )}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-xs text-zinc-500">
            <p className="font-semibold text-zinc-400">Out of scope for topic001</p>
            <p className="mt-1">
              Loaders · ontology · Runbooks internals · Chronicle grouping · neighborhood graph · Slice C
              naming (Notes / Attachments) — later, after this density pass is approved.
            </p>
            <p className="mt-2 text-[11px]">
              Access:{" "}
              <code className="rounded bg-zinc-950 px-1.5 py-0.5 text-violet-300">
                /argus/v2/drafts/topic001
              </code>
              {" · "}
              <Link href="/argus/v2/help" className="text-violet-400 hover:text-violet-300">
                Help
              </Link>
              {" · "}
              <Link href="/argus/v2/diagnostics" className="text-violet-400 hover:text-violet-300">
                Diagnostics
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function BrowseBefore() {
  const pills = [
    ["Total", 12],
    ["Active", 6],
    ["Quiet", 3],
    ["Orphans", 2],
    ["Archived", 1],
  ] as const;
  return (
    <div className="space-y-3 rounded-2xl border border-rose-500/20 bg-zinc-950/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-zinc-50">Topics</h3>
        <div className="flex gap-2">
          <span className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-500">▦ ☰ ▥</span>
          <span className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white">+ Topic</span>
        </div>
      </div>
      <input
        readOnly
        value=""
        placeholder="Search topics…"
        className="w-full max-w-xl rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400"
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {pills.map(([label, n]) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-50">{n}</p>
          </div>
        ))}
      </div>
      <button type="button" className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[11px] text-zinc-400">
        Filters
      </button>
    </div>
  );
}

function BrowseAfter({
  status,
  onStatus,
  view,
  onView,
}: {
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
  view: ViewMode;
  onView: (v: ViewMode) => void;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-emerald-500/25 bg-zinc-950/60 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="shrink-0 text-base font-bold text-zinc-50">Topics</h3>
        <input
          readOnly
          defaultValue=""
          placeholder="Search topics…"
          className="min-w-[10rem] flex-1 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600"
        />
        <button
          type="button"
          className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400"
        >
          Filters ▾
        </button>
        <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
          {(
            [
              ["grid", "▦"],
              ["list", "☰"],
              ["board", "▥"],
            ] as const
          ).map(([id, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => onView(id)}
              className={`rounded-md px-2 py-1 text-xs ${
                view === id ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"
              }`}
              aria-label={id}
              aria-pressed={view === id}
            >
              {icon}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11px] font-semibold text-white"
        >
          + Topic
        </button>
      </div>
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Status">
        {(Object.keys(STATUS_COUNTS) as StatusFilter[]).map((id) => {
          const label = id === "all" ? "All" : id;
          const active = status === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onStatus(id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums ${
                active
                  ? "bg-violet-600/25 text-violet-200 ring-1 ring-violet-500/40"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              }`}
            >
              {label} {STATUS_COUNTS[id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailBefore({
  tab,
  onTab,
  patterns,
}: {
  tab: DetailTab;
  onTab: (t: DetailTab) => void;
  patterns: string[];
}) {
  return (
    <div>
      <div className="border-b border-zinc-800 px-4 py-3">
        <button type="button" className="text-sm text-violet-400">
          ← Topics
        </button>
      </div>
      <div className="space-y-4 border-b border-zinc-800 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold text-zinc-50">{SAMPLE.name}</h3>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300 ring-1 ring-amber-500/25">
                {SAMPLE.category}
              </span>
              <span className="text-zinc-600">···</span>
            </div>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">{SAMPLE.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">+ Deliver</span>
            <span className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs text-violet-300">
              Link
            </span>
            <span className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">+ Create</span>
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Patterns</p>
          <div className="flex flex-col gap-1.5">
            {patterns.slice(0, 5).map((tag) => (
              <div
                key={tag}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-xs text-violet-200">
                  #
                </span>
                <span className="text-sm font-semibold text-zinc-100">#{tag}</span>
              </div>
            ))}
            <p className="text-[11px] text-violet-400">View all (8)</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            ["📓", "Notes", 12],
            ["✉", "Emails", 8],
            ["📅", "Events", 3],
            ["🔗", "Links", 5],
          ].map(([icon, label, n]) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-2 py-3 text-center">
              <p className="text-lg">{icon}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-zinc-50">{n}</p>
              <p className="text-[9px] uppercase text-zinc-600">{label}</p>
            </div>
          ))}
        </div>
        <TabRow tab={tab} onTab={onTab} />
      </div>
      <div className="p-4 text-xs text-zinc-600">
        Content starts here — after ~half the viewport of chrome.
      </div>
    </div>
  );
}

function DetailAfter({
  tab,
  onTab,
  menuOpen,
  onMenuOpen,
  visiblePatterns,
  patternOverflow,
  eventsOpen,
  onEventsOpen,
  directOpen,
  onDirectOpen,
}: {
  tab: DetailTab;
  onTab: (t: DetailTab) => void;
  menuOpen: boolean;
  onMenuOpen: (v: boolean) => void;
  visiblePatterns: string[];
  patternOverflow: number;
  eventsOpen: boolean;
  onEventsOpen: (v: boolean) => void;
  directOpen: boolean;
  onDirectOpen: (v: boolean) => void;
}) {
  return (
    <div>
      {/* Compact title row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-zinc-800/80 px-3 py-2.5 sm:px-4">
        <button type="button" className="shrink-0 text-[13px] font-medium text-violet-400 hover:text-violet-300">
          ← Topics
        </button>
        <h3 className="min-w-0 flex-1 truncate text-base font-bold text-zinc-50 sm:text-lg">
          {SAMPLE.name}
        </h3>
        <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300 ring-1 ring-amber-500/25">
          {SAMPLE.category}
        </span>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => onMenuOpen(!menuOpen)}
            className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
            aria-expanded={menuOpen}
            aria-label="More actions"
          >
            ···
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-1 min-w-[9rem] rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
              {["Deliver", "Link", "Create", "Rename", "Archive"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-[12px] text-zinc-300 hover:bg-zinc-800"
                  onClick={() => onMenuOpen(false)}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabs immediately under title */}
      <div className="border-b border-zinc-800/80 px-3 sm:px-4">
        <TabRow tab={tab} onTab={onTab} />
      </div>

      {/* One-line metrics + inline patterns */}
      <div className="space-y-1.5 border-b border-zinc-800/80 px-3 py-2 sm:px-4">
        <p className="text-[11px] tabular-nums text-zinc-500">
          <span className="text-zinc-300">{SAMPLE.metrics.evidence} evidence</span>
          {" · "}
          {SAMPLE.metrics.notes} notes
          {" · "}
          {SAMPLE.metrics.emails} emails
          {" · "}
          {SAMPLE.metrics.events} events
          {" · "}
          {SAMPLE.metrics.links} links
          {" · "}
          <span className="text-amber-200/90">⚑ {SAMPLE.metrics.trackers}</span>
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {visiblePatterns.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-violet-950/50 px-1.5 py-0.5 text-[10px] font-medium text-violet-200 ring-1 ring-violet-500/30"
            >
              #{tag}
            </span>
          ))}
          {patternOverflow > 0 ? (
            <span className="text-[10px] text-zinc-500">+{patternOverflow}</span>
          ) : null}
        </div>
      </div>

      {/* Content — Chronicle mock (unchanged structure, just visible earlier) */}
      <div className="p-3 sm:p-4">
        {tab === "chronicle" ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,14rem)_1fr]">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onEventsOpen(!eventsOpen)}
                className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400"
              >
                <span>Linked Events ({SAMPLE.events.length})</span>
                <span>{eventsOpen ? "▾" : "▸"}</span>
              </button>
              {eventsOpen ? (
                <ul className="space-y-1 pl-1">
                  {SAMPLE.events.map((ev) => (
                    <li key={ev.name}>
                      <button
                        type="button"
                        className="w-full rounded-lg px-2 py-1.5 text-left text-[12px] text-zinc-300 hover:bg-zinc-900"
                      >
                        <span className="block truncate font-medium">{ev.name}</span>
                        <span className="text-[10px] text-zinc-600">
                          {ev.when} · {ev.notes} notes
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                onClick={() => onDirectOpen(!directOpen)}
                className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400"
              >
                <span>Direct Topic evidence ({SAMPLE.metrics.evidence})</span>
                <span>{directOpen ? "▾" : "▸"}</span>
              </button>
            </div>
            <div className="space-y-2">
              {SAMPLE.evidence.map((row) => (
                <div
                  key={row.title}
                  className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase text-zinc-600">{row.kind}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
                      {row.title}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {row.who} · {row.when}
                    </span>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    {row.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            {tab === "runbooks"
              ? "Runbooks panel unchanged — placeholder for density check."
              : tab === "links"
                ? "Links panel unchanged — placeholder."
                : "Tags panel unchanged — placeholder."}
          </p>
        )}
      </div>
    </div>
  );
}

function TabRow({ tab, onTab }: { tab: DetailTab; onTab: (t: DetailTab) => void }) {
  const tabs: { id: DetailTab; label: string }[] = [
    { id: "chronicle", label: "Chronicle" },
    { id: "runbooks", label: "Runbooks" },
    { id: "links", label: "Links" },
    { id: "tags", label: "Tags" },
  ];
  return (
    <div className="flex gap-1 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onTab(t.id)}
          className={`shrink-0 border-b-2 px-3 py-2 text-xs font-medium ${
            tab === t.id
              ? "border-violet-500 text-violet-300"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
