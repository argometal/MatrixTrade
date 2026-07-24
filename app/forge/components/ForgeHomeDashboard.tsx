"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  deckHref,
  emptyOrSeedRepo,
  formatRelativeAgo,
  homeOverview,
} from "@/lib/argusforge/af03-repo-store";
import { listVaultPreps } from "@/lib/argusforge/af03-vault-prep-store";
import type { Af03ChaosDeck, Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";

type HomeTab = "overview" | "recent";

type AttentionChip = {
  href: string;
  label: string;
  value: number;
  detail: string;
  tone: "amber" | "sky" | "emerald";
};

/**
 * AF03 Home — Argus-inspired pulse + browse + tabs.
 * Visual grammar only. No Argus ontology, violet brand, or Alexandria.
 */
export function ForgeHomeDashboard() {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [vaultAwaiting, setVaultAwaiting] = useState(0);
  const [tab, setTab] = useState<HomeTab>("overview");

  useEffect(() => {
    setState(emptyOrSeedRepo());
    setVaultAwaiting(listVaultPreps().filter((p) => p.status === "awaiting_review").length);
  }, []);

  const o = useMemo(() => (state ? homeOverview(state) : null), [state]);

  const attention = useMemo((): AttentionChip[] => {
    if (!o) return [];
    const chips: AttentionChip[] = [];
    if (vaultAwaiting > 0) {
      chips.push({
        href: "/forge/vault",
        label: "Vault review",
        value: vaultAwaiting,
        detail: "Selected Chaos packages awaiting human review",
        tone: "amber",
      });
    }
    if (o.markedLater > 0) {
      chips.push({
        href: "/forge/active",
        label: "Marked later",
        value: o.markedLater,
        detail: "Items flagged for later processing",
        tone: "sky",
      });
    }
    if (o.stubs > 0) {
      chips.push({
        href: "/forge/active",
        label: "Stubs",
        value: o.stubs,
        detail: "File/PDF references without binary payload",
        tone: "emerald",
      });
    }
    return chips;
  }, [o, vaultAwaiting]);

  if (!state || !o) {
    return <p className="text-sm text-zinc-500">Loading overview…</p>;
  }

  const mix = [
    { key: "text", label: "Text", value: o.text, color: "bg-sky-500" },
    { key: "links", label: "Links", value: o.links, color: "bg-rose-500" },
    { key: "images", label: "Images", value: o.images, color: "bg-amber-500" },
    { key: "stubs", label: "Stubs", value: o.stubs, color: "bg-zinc-500" },
    { key: "later", label: "Later", value: o.markedLater, color: "bg-emerald-500" },
    { key: "recent", label: "<7d", value: o.recentItems, color: "bg-cyan-400" },
  ];
  const maxBar = Math.max(1, ...mix.map((m) => m.value));

  return (
    <div className="space-y-6">
      <Af03RepoDisclosure />

      {/* Header + attention pulse (Argus V2HomePulse pattern, AF signals) */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-50">Overview</h2>
          <p className="text-xs text-zinc-500">
            Dashboard — not another Active/Focus list. Filters stay interim (DEBT-AF03-01).
          </p>
        </div>
        <AttentionPulse chips={attention} />
      </header>

      {/* Hero */}
      <section aria-labelledby="items-hero" className="space-y-1">
        <p id="items-hero" className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Content items
        </p>
        <p className="text-5xl font-bold tabular-nums tracking-tight text-zinc-50">{o.items}</p>
        <p className="text-xs text-zinc-600">
          Updated {formatRelativeAgo(o.lastModified)} · browser-local only
        </p>
      </section>

      {/* Browse quick links (Argus BrowseQuickLinks pattern, Forge destinations) */}
      <section aria-labelledby="browse-heading" className="space-y-2">
        <h3 id="browse-heading" className="text-base font-semibold text-zinc-100">
          Browse
        </h3>
        <p className="text-xs text-zinc-500">Where to go next — not Argus entity browsers.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <BrowseLink
            href="/forge/focus"
            title="Focus"
            hint="View · first · blocked until signals"
            icon="library"
          />
          <BrowseLink
            href="/forge/active"
            title="Active"
            hint="Working operational set"
            icon="capture"
          />
          <BrowseLink
            href="/forge/archive"
            title="Archive"
            hint={`${o.archivedDecks} preserved · not deletion`}
            icon="archive"
          />
          <BrowseLink
            href="/forge/vault"
            title="Output · Vault"
            hint={
              vaultAwaiting > 0
                ? `${vaultAwaiting} awaiting human review`
                : "Prep queue · Alexandria via Output"
            }
            icon="vault"
          />
        </div>
      </section>

      {/* Tabs Overview | Recent */}
      <div
        className="flex rounded-lg border border-zinc-800 p-0.5 text-sm"
        role="tablist"
        aria-label="Home view"
      >
        <TabBtn id="overview" label="Overview" active={tab === "overview"} onSelect={setTab} />
        <TabBtn id="recent" label="Recent" active={tab === "recent"} onSelect={setTab} />
      </div>

      {tab === "overview" ? (
        <div className="space-y-6">
          <section aria-labelledby="library-heading" className="space-y-3">
            <h3 id="library-heading" className="text-base font-semibold text-zinc-100">
              Library
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Chaos Decks" value={String(o.decks)} href="/forge/active" />
              <StatTile label="Folders" value={String(o.folders)} href="/forge/active" />
              <StatTile label="Active decks" value={String(o.activeDecks)} href="/forge/active" tone="sky" />
              <StatTile
                label="Archived decks"
                value={String(o.archivedDecks)}
                href="/forge/archive"
                tone="zinc"
              />
            </div>
          </section>

          <section aria-labelledby="activity-heading" className="space-y-3">
            <h3 id="activity-heading" className="text-base font-semibold text-zinc-100">
              Activity
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="New (7d)" value={String(o.recentItems)} />
              <StatTile label="Marked later" value={String(o.markedLater)} />
              <StatTile
                label="Vault review"
                value={String(vaultAwaiting)}
                href="/forge/vault"
                tone={vaultAwaiting > 0 ? "amber" : "zinc"}
              />
              <StatTile label="File/PDF stubs" value={String(o.stubs)} />
            </div>
            <p className="text-[11px] text-zinc-600">
              Not Cards Due · not grades · not FSRS · not Alexandria.
            </p>
          </section>

          <section aria-labelledby="mix-heading" className="space-y-3">
            <h3 id="mix-heading" className="text-base font-semibold text-zinc-100">
              Content mix
            </h3>
            <div className="flex items-end justify-between gap-1.5 border-b border-zinc-800 pb-2 pt-1">
              {mix.map((m) => {
                const heightPct =
                  m.value === 0 ? 0 : Math.max(8, Math.round((m.value / maxBar) * 100));
                return (
                  <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <span className="text-[11px] font-semibold tabular-nums text-zinc-200">
                      {m.value > 0 ? m.value : ""}
                    </span>
                    <div className="flex h-20 w-full items-end justify-center">
                      {m.value > 0 ? (
                        <div
                          className={`w-[70%] max-w-8 rounded-sm ${m.color}`}
                          style={{ height: `${heightPct}%` }}
                          title={`${m.label}: ${m.value}`}
                        />
                      ) : (
                        <div className={`h-0.5 w-[70%] max-w-8 rounded-full ${m.color} opacity-40`} />
                      )}
                    </div>
                    <span className="truncate text-[10px] text-zinc-500">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="filters-heading" className="space-y-2">
            <h3 id="filters-heading" className="text-base font-semibold text-zinc-100">
              Destinations
            </h3>
            <p className="text-[11px] text-zinc-600">
              Use bottom <strong className="font-medium text-zinc-500">View</strong> (Focus → Active →
              Archive). Create is a global action (births Active). Dual-tree debt: DEBT-AF03-01.
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterChip href="/forge/focus" label="Focus" count={null} />
              <FilterChip href="/forge/active" label="Active" count={o.activeDecks} />
              <FilterChip href="/forge/archive" label="Archive" count={o.archivedDecks} />
            </div>
          </section>
        </div>
      ) : (
        <RecentRail decks={o.recentDecks} />
      )}
    </div>
  );
}

function AttentionPulse({ chips }: { chips: AttentionChip[] }) {
  if (chips.length === 0) {
    return (
      <p className="text-right text-xs text-zinc-600 sm:max-w-[14rem]">
        Nothing needs attention —{" "}
        <Link href="/forge/active" className="text-sky-400 hover:text-sky-300">
          Library
        </Link>{" "}
        or{" "}
        <Link href="/forge/vault" className="text-sky-400 hover:text-sky-300">
          Vault
        </Link>
      </p>
    );
  }

  const toneClass: Record<AttentionChip["tone"], string> = {
    amber: "border-amber-500/40 bg-amber-600/15 text-amber-100",
    sky: "border-sky-500/40 bg-sky-600/15 text-sky-100",
    emerald: "border-emerald-500/40 bg-emerald-600/15 text-emerald-100",
  };

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-2"
      role="list"
      aria-label="Items needing attention"
    >
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          role="listitem"
          title={chip.detail}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${toneClass[chip.tone]}`}
        >
          <span>{chip.label}</span>
          <span className="tabular-nums font-bold text-zinc-50">{chip.value}</span>
        </Link>
      ))}
    </div>
  );
}

function BrowseLink({
  href,
  title,
  hint,
  icon,
}: {
  href: string;
  title: string;
  hint: string;
  icon: "library" | "archive" | "vault" | "capture";
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 transition hover:border-sky-500/30 hover:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-sky-400"
        aria-hidden
      >
        <BrowseIcon kind={icon} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-zinc-100">{title}</span>
        <span className="block text-xs text-zinc-500">{hint}</span>
      </span>
    </Link>
  );
}

function BrowseIcon({ kind }: { kind: "library" | "archive" | "vault" | "capture" }) {
  if (kind === "library") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M4 5h4v14H4V5zm6 0h4v14h-4V5zm6 0h4v14h-4V5z" />
      </svg>
    );
  }
  if (kind === "archive") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M3 5h18v3H3V5zm2 5h14v9H5v-9zm4 2v2h6v-2H9z" />
      </svg>
    );
  }
  if (kind === "vault") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2a5 5 0 0 1 5 5v2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v2h6V7a3 3 0 0 0-3-3z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TabBtn({
  id,
  label,
  active,
  onSelect,
}: {
  id: HomeTab;
  label: string;
  active: boolean;
  onSelect: (id: HomeTab) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`min-h-10 flex-1 rounded-md px-3 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
        active ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
      }`}
      onClick={() => onSelect(id)}
    >
      {label}
    </button>
  );
}

function RecentRail({ decks }: { decks: Af03ChaosDeck[] }) {
  return (
    <section aria-labelledby="recent-rail-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="recent-rail-heading" className="text-base font-semibold text-zinc-100">
          Recent Chaos Decks
        </h3>
        <Link href="/forge/library" className="text-xs font-semibold text-sky-400 hover:text-sky-300">
          Open library ›
        </Link>
      </div>
      {decks.length === 0 ? (
        <p className="text-sm text-zinc-600">No decks yet.</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950/50">
          {decks.map((d) => (
            <li key={d.id} className="border-b border-zinc-800/80 last:border-b-0">
              <Link
                href={deckHref(d.id)}
                className="flex items-center gap-3 px-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    d.view === "archive"
                      ? "bg-zinc-800 text-zinc-400"
                      : "bg-sky-500/15 text-sky-300"
                  }`}
                  aria-hidden
                >
                  ▦
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-zinc-100">{d.title}</span>
                  <span className="text-[11px] text-zinc-500">
                    {d.contentCount} items · {formatRelativeAgo(d.updatedAt)} ·{" "}
                    {d.view === "archive" ? "archived" : "active"}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    d.view === "archive" ? "bg-zinc-800 text-zinc-400" : "bg-emerald-700 text-white"
                  }`}
                >
                  {d.view === "archive" ? "ARCH" : "ACTIVE"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatTile({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  href?: string;
  tone?: "default" | "sky" | "amber" | "zinc";
}) {
  const toneClass =
    tone === "sky"
      ? "text-sky-300"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "zinc"
          ? "text-zinc-300"
          : "text-zinc-50";
  const inner = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${toneClass}`}>{value}</p>
    </>
  );
  const className =
    "block rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400";
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

function FilterChip({
  href,
  label,
  count,
}: {
  href: string;
  label: string;
  count: number | null;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
    >
      {label}
      {count !== null ? <span className="tabular-nums text-zinc-500">{count}</span> : null}
    </Link>
  );
}
