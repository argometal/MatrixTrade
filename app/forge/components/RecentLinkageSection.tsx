"use client";

/**
 * CHANGE 24-33 — Recent linkage under Argus Realm Treemap.
 * Derived from existing Fragments / Decks / Realms / Argus relations.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  formatLinkageTime,
  linkageStatusLabel,
  listRecentLinkageRows,
  type RecentLinkageRow,
  type RecentLinkageStatus,
} from "@/lib/argusforge/af03-recent-linkage";
import {
  chaosAssetsAvailability,
  createObjectUrl,
  revokeObjectUrl,
} from "@/lib/argusforge/af03-chaos-assets-idb";
import { viewHref } from "@/lib/argusforge/af03-repo-store";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import type { ArgusGraphState } from "@/lib/argusforge/argus-graph-types";

type Props = {
  state: Af03RepoState;
  graph: ArgusGraphState | null;
};

export function RecentLinkageSection({ state, graph }: Props) {
  const rows = useMemo(
    () => listRecentLinkageRows(state, graph),
    [state, graph]
  );

  return (
    <section
      aria-labelledby="argus-recent-linkage"
      className="shrink-0 space-y-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
    >
      <h3
        id="argus-recent-linkage"
        className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600"
      >
        Recent linkage
      </h3>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-4 text-center text-xs text-zinc-600">
          No recent captures
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800/80 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
          {rows.map((row) => (
            <li key={row.fragmentId}>
              <RecentLinkageRowView row={row} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentLinkageRowView({ row }: { row: RecentLinkageRow }) {
  const meta = [row.deckTitle, row.realmTitle, formatLinkageTime(row.createdAt)]
    .filter(Boolean)
    .join(" · ");
  const openHref = viewHref(row.deckId, row.fragmentId);

  return (
    <div className="flex items-stretch gap-2 px-2.5 py-2">
      <Link
        href={openHref}
        className="flex min-w-0 flex-1 items-start gap-2.5 rounded-lg py-0.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
      >
        <LinkageThumb row={row} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-zinc-100">
            {row.title}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
            {meta}
          </span>
          <span
            className={`mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide ${statusTone(row.status)}`}
          >
            {linkageStatusLabel(row.status, row.relationCount)}
          </span>
        </span>
      </Link>
      <Link
        href={openHref}
        className="flex shrink-0 items-center self-center rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
      >
        Open
      </Link>
    </div>
  );
}

function statusTone(status: RecentLinkageStatus): string {
  if (status === "related") return "text-emerald-400/90";
  if (status === "in_realm") return "text-sky-400/90";
  return "text-zinc-500";
}

function LinkageThumb({ row }: { row: RecentLinkageRow }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!row.imageAssetId) {
      setUrl(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    const avail = chaosAssetsAvailability();
    if (!avail.ok) {
      setUrl(null);
      return;
    }
    createObjectUrl(row.imageAssetId)
      .then((u) => {
        if (!active) {
          if (u) revokeObjectUrl(u);
          return;
        }
        if (!u) {
          setUrl(null);
          return;
        }
        objectUrl = u;
        setUrl(u);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
      if (objectUrl) revokeObjectUrl(objectUrl);
    };
  }, [row.imageAssetId]);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="mt-0.5 h-9 w-9 shrink-0 rounded-lg object-cover"
      />
    );
  }

  return (
    <span
      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-[11px] font-semibold uppercase text-zinc-400"
      aria-hidden
    >
      {typeGlyph(row)}
    </span>
  );
}

function typeGlyph(row: RecentLinkageRow): string {
  if (row.kind === "image" || row.kind === "mixed" || row.imageAssetId) return "▣";
  if (row.kind === "link") return "↗";
  return "T";
}
