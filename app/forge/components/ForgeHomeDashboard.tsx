"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  deckHref,
  emptyOrSeedRepo,
  formatRelativeAgo,
  homeOverview,
} from "@/lib/argusforge/af03-repo-store";
import { listVaultPreps } from "@/lib/argusforge/af03-vault-prep-store";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";

/**
 * AF03 Home — overview dashboard (Stats-like layout).
 * Not a second Active/Focus list. AF-safe counts only — no due/grades/FSRS/SRS.
 */
export function ForgeHomeDashboard() {
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [vaultAwaiting, setVaultAwaiting] = useState(0);

  useEffect(() => {
    setState(emptyOrSeedRepo());
    setVaultAwaiting(listVaultPreps().filter((p) => p.status === "awaiting_review").length);
  }, []);

  if (!state) {
    return <p className="text-sm text-zinc-500">Loading overview…</p>;
  }

  const o = homeOverview(state);
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

      <header className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-50">Overview</h2>
        <p className="text-xs text-zinc-500">
          Home is the dashboard — not another Active/Focus list. Active/Archive remain filters
          (DEBT-AF03-01). Focus pending.
        </p>
      </header>

      {/* Hero total */}
      <section aria-labelledby="items-hero" className="space-y-1">
        <p id="items-hero" className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Content items
        </p>
        <p className="text-5xl font-bold tabular-nums tracking-tight text-zinc-50">{o.items}</p>
        <p className="text-xs text-zinc-600">
          Updated {formatRelativeAgo(o.lastModified)} · browser-local only
        </p>
      </section>

      {/* Library metrics */}
      <section aria-labelledby="library-heading" className="space-y-3">
        <h3 id="library-heading" className="text-base font-semibold text-zinc-100">
          Library
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Chaos Decks" value={String(o.decks)} href="/forge/active" />
          <StatTile label="Folders" value={String(o.folders)} href="/forge/active" />
          <StatTile label="Active decks" value={String(o.activeDecks)} href="/forge/active" tone="sky" />
          <StatTile label="Archived decks" value={String(o.archivedDecks)} href="/forge/archive" tone="zinc" />
        </div>
      </section>

      {/* Activity */}
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
          Not Cards Due · not grades · not FSRS · not Alexandria review schedules.
        </p>
      </section>

      {/* Mix chart */}
      <section aria-labelledby="mix-heading" className="space-y-3">
        <h3 id="mix-heading" className="text-base font-semibold text-zinc-100">
          Content mix
        </h3>
        <div className="flex items-end justify-between gap-1.5 border-b border-zinc-800 pb-2 pt-1">
          {mix.map((m) => {
            const heightPct = m.value === 0 ? 0 : Math.max(8, Math.round((m.value / maxBar) * 100));
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

      {/* Recent decks */}
      <section aria-labelledby="recent-decks-heading" className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 id="recent-decks-heading" className="text-base font-semibold text-zinc-100">
            Recent Chaos Decks
          </h3>
          <Link href="/forge/active" className="text-xs font-semibold text-sky-400 hover:text-sky-300">
            Open library ›
          </Link>
        </div>
        {o.recentDecks.length === 0 ? (
          <p className="text-sm text-zinc-600">No decks yet.</p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950/50">
            {o.recentDecks.map((d) => (
              <li key={d.id} className="border-b border-zinc-800/80 last:border-b-0">
                <Link
                  href={deckHref(d.id)}
                  className="flex items-center gap-3 px-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-zinc-100">{d.title}</span>
                    <span className="text-[11px] text-zinc-500">
                      {d.contentCount} items · {formatRelativeAgo(d.updatedAt)} ·{" "}
                      {d.view === "archive" ? "archived" : "active"}
                    </span>
                  </span>
                  <span aria-hidden className="text-zinc-600">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Filter shortcuts — not separate homes */}
      <section aria-labelledby="filters-heading" className="space-y-2">
        <h3 id="filters-heading" className="text-base font-semibold text-zinc-100">
          Library filters
        </h3>
        <p className="text-[11px] text-zinc-600">
          Interim dual routes until DEBT-AF03-01 (one UI + filter chips).
        </p>
        <div className="flex flex-wrap gap-2">
          <FilterChip href="/forge/active" label="Active" count={o.activeDecks} />
          <FilterChip href="/forge/archive" label="Archive" count={o.archivedDecks} />
          <span className="inline-flex min-h-10 items-center rounded-full border border-dashed border-zinc-800 px-3 text-xs text-zinc-600">
            Focus · Pending
          </span>
        </div>
      </section>
    </div>
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

function FilterChip({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
    >
      {label}
      <span className="tabular-nums text-zinc-500">{count}</span>
    </Link>
  );
}
