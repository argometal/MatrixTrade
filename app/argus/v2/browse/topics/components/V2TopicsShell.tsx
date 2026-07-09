"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { V2CreateEntityButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import {
  buildV2TopicTabCounts,
  filterV2TopicRows,
  parseV2TopicTab,
  type V2TopicDetail,
  type V2TopicRow,
  type V2TopicTab,
  type V2TopicTagChip,
} from "@/lib/argus/v2/topic-browse-utils";
import { resolveV2SelectedId, v2ActiveTableRowClass } from "@/lib/argus/v2/selection";
import { useScrollToSelected } from "@/lib/argus/v2/use-scroll-to-selected";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import { V2TopicDetailPanel } from "./V2TopicDetailPanel";

const TABS: { id: V2TopicTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mine", label: "My topics" },
  { id: "followed", label: "Followed" },
];

export function V2TopicsShell({
  rows,
  details,
  tagChips,
  initialSelectedId,
  initialTab,
  neighborhood,
}: {
  rows: V2TopicRow[];
  details: V2TopicDetail[];
  tagChips: V2TopicTagChip[];
  initialSelectedId?: string;
  initialTab?: string;
  neighborhood?: V2EntityNeighborhoodGraph | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseV2TopicTab(searchParams.get("tab") ?? initialTab);
  const selectedId = resolveV2SelectedId(searchParams.get("selected"), initialSelectedId);
  const counts = useMemo(() => buildV2TopicTabCounts(rows), [rows]);
  const filtered = useMemo(() => filterV2TopicRows(rows, tab), [rows, tab]);
  const selected = selectedId ? details.find((d) => d.id === selectedId) : undefined;

  useScrollToSelected(selectedId);

  function setTab(next: V2TopicTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/argus/v2/browse/topics?${params.toString()}`);
  }

  function selectItem(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", id);
    router.replace(`/argus/v2/browse/topics?${params.toString()}`);
  }

  const returnTo = selected
    ? `/argus/v2/browse/topics?selected=${selected.id}${tab !== "all" ? `&tab=${tab}` : ""}`
    : `/argus/v2/browse/topics`;

  return (
    <div className="v2-browse-shell flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
      <section className="flex min-h-0 w-full flex-col border-b border-zinc-800/80 lg:w-[min(420px,42%)] lg:flex-none lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-800/80 px-4 py-4 lg:px-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-zinc-50">Topics</h1>
              <p className="mt-0.5 text-xs text-zinc-500">Knowledge binders — pick one to review evidence</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <V2CreateEntityButton
                kind="topic"
                label="+ Topic"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
              />
            </div>
          </div>

          <div className="mb-3 flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${
                  tab === t.id ? "bg-violet-500/15 text-violet-300" : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {t.label} {counts[t.id]}
              </button>
            ))}
          </div>

          {tagChips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tagChips.map((chip) => (
                <span
                  key={chip.name}
                  className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-400"
                >
                  {chip.name} {chip.count}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          {filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm text-zinc-500">No topics yet.</p>
              <p className="mt-1 text-xs text-zinc-600">Capture a topic and link emails or journal entries to it.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-950/95 text-[10px] uppercase tracking-wide text-zinc-600">
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-2 font-medium lg:px-5">Topic</th>
                  <th className="px-2 py-2 font-medium">Last</th>
                  <th className="px-4 py-2 font-medium lg:px-5">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    data-v2-selected-id={row.id}
                    onClick={() => selectItem(row.id)}
                    className={`cursor-pointer border-b border-zinc-800/60 transition hover:bg-zinc-900/40 ${v2ActiveTableRowClass(
                      selectedId === row.id
                    )}`}
                  >
                    <td className="px-4 py-3 lg:px-5">
                      <span className="font-medium text-zinc-100">{row.name}</span>
                    </td>
                    <td className="px-2 py-3 text-zinc-500">{row.lastActivity}</td>
                    <td className="px-4 py-3 lg:px-5">
                      <EvidenceCountCell row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="min-h-0 min-w-0 flex-1 overflow-hidden bg-zinc-950/50">
        {selected ? (
          <V2TopicDetailPanel selected={selected} neighborhood={neighborhood} returnTo={returnTo} />
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center p-8 text-sm text-zinc-500">
            Select a topic to review linked evidence.
          </div>
        )}
      </section>
    </div>
  );
}

function EvidenceCountCell({ row }: { row: V2TopicRow }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold tabular-nums text-violet-300">{row.evidenceCount}</span>
      <span className="text-[10px] text-zinc-600">
        {row.journalCount > 0 ? `📓${row.journalCount}` : null}
        {row.emailCount > 0 ? ` ✉${row.emailCount}` : null}
        {row.fileCount > 0 ? ` 📎${row.fileCount}` : null}
      </span>
    </div>
  );
}
