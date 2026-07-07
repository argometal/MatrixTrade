"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { V2CreateEntityButton, V2EntityLinkButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { V2OpenCaptureButton } from "@/app/argus/v2/components/V2OpenCaptureButton";
import { V2TopicAliasEditor } from "./V2TopicAliasEditor";
import {
  buildV2TopicTabCounts,
  filterV2TopicRows,
  parseV2TopicTab,
  type V2TopicDetail,
  type V2TopicRow,
  type V2TopicTab,
  type V2TopicTagChip,
} from "@/lib/argus/v2/topic-browse-utils";

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
}: {
  rows: V2TopicRow[];
  details: V2TopicDetail[];
  tagChips: V2TopicTagChip[];
  initialSelectedId?: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseV2TopicTab(searchParams.get("tab") ?? initialTab);
  const selectedId = searchParams.get("selected") ?? initialSelectedId ?? rows[0]?.id;
  const counts = useMemo(() => buildV2TopicTabCounts(rows), [rows]);
  const filtered = useMemo(() => filterV2TopicRows(rows, tab), [rows, tab]);
  const selected = details.find((d) => d.id === selectedId);

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

  return (
    <div className="v2-browse-shell flex min-h-[calc(100vh-4.5rem)] flex-col lg:min-h-[calc(100vh-4rem)] lg:flex-row">
      <section className="flex w-full flex-col border-b border-zinc-800/80 lg:w-[min(520px,48%)] lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-800/80 px-4 py-4 lg:px-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-zinc-50">Topics</h1>
              <p className="mt-0.5 text-xs text-zinc-500">Knowledge areas and themes</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <V2CreateEntityButton
                kind="topic"
                label="+ Topic"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
              />
              <button type="button" className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400">
                Filters
              </button>
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

        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm text-zinc-500">No topics yet.</p>
              <p className="mt-1 text-xs text-zinc-600">Create a topic and link it to projects, orgs, people, or events.</p>
              <div className="mt-4">
                <V2CreateEntityButton
                  kind="topic"
                  label="+ Topic"
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                />
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-950/95 text-[10px] uppercase tracking-wide text-zinc-600">
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-2 font-medium lg:px-5">Topic</th>
                  <th className="hidden px-2 py-2 font-medium sm:table-cell">Category</th>
                  <th className="hidden px-2 py-2 font-medium md:table-cell">Linked to</th>
                  <th className="px-2 py-2 font-medium">Last activity</th>
                  <th className="px-4 py-2 font-medium lg:px-5">Entries</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => selectItem(row.id)}
                    className={`cursor-pointer border-b border-zinc-800/60 transition hover:bg-zinc-900/40 ${
                      selectedId === row.id ? "bg-violet-500/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3 lg:px-5">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" readOnly className="rounded border-zinc-700" onClick={(e) => e.stopPropagation()} />
                        <span className="font-medium text-zinc-100">{row.name}</span>
                      </div>
                    </td>
                    <td className="hidden px-2 py-3 text-zinc-500 sm:table-cell">{row.category}</td>
                    <td className="hidden px-2 py-3 text-[11px] text-zinc-500 md:table-cell">
                      <span title="Organizations">🏢 {row.orgCount}</span>{" "}
                      <span title="Projects">📁 {row.projectCount}</span>{" "}
                      <span title="People">👤 {row.peopleCount}</span>
                    </td>
                    <td className="px-2 py-3 text-zinc-500">{row.lastActivity}</td>
                    <td className="px-4 py-3 lg:px-5">
                      <span className="text-zinc-400">★</span>{" "}
                      <span className="tabular-nums text-zinc-500">{row.entryCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="min-w-0 flex-1 overflow-y-auto bg-zinc-950/50">
        {selected ? (
          <div className="flex h-full flex-col p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-zinc-50">{selected.name}</h2>
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300 ring-1 ring-amber-500/25">
                    {selected.category}
                  </span>
                  <span className="text-zinc-600">★</span>
                </div>
                <p className="max-w-xl text-sm leading-relaxed text-zinc-400">{selected.description}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <V2EntityLinkButton
                  entityId={selected.id}
                  linkedIds={selected.linkedEntityIds}
                  className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/25"
                />
              </div>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3">
              <LinkCountCard icon="🏢" label="Organizations" count={selected.orgCount} />
              <LinkCountCard icon="📁" label="Projects" count={selected.projectCount} />
              <LinkCountCard icon="👤" label="People" count={selected.peopleCount} />
            </div>

            <div className="mb-6">
              <V2TopicAliasEditor
                topicId={selected.id}
                topicName={selected.name}
                initialAliases={selected.aliases}
                returnTo={`/argus/v2/browse/topics?selected=${selected.id}${tab !== "all" ? `&tab=${tab}` : ""}`}
              />
            </div>

            <h3 className="mb-3 text-sm font-semibold text-zinc-100">Recent entries</h3>
            {selected.recentEntries.length === 0 ? (
              <p className="text-sm text-zinc-500">No journal entries linked yet.</p>
            ) : (
              <ul className="space-y-2">
                {selected.recentEntries.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={entry.href}
                      className="block rounded-xl border border-zinc-800/80 px-3 py-2.5 transition hover:border-zinc-700"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-zinc-200">{entry.title}</span>
                        <span className="text-[10px] text-violet-400">{entry.kind}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-600">{entry.meta}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-auto flex flex-wrap gap-3 pt-6">
              <V2OpenCaptureButton
                entityIds={selected ? [selected.id] : undefined}
                entryType="note"
                className="inline-flex rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
              >
                + Journal about this topic
              </V2OpenCaptureButton>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center p-8 text-sm text-zinc-500">
            Select a topic to view details.
          </div>
        )}
      </section>
    </div>
  );
}

function LinkCountCard({ icon, label, count }: { icon: string; label: string; count: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4 text-center">
      <div className="text-2xl">{icon}</div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-50">{count}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
