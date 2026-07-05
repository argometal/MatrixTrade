"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Entity, InboxItem, Log } from "@/lib/argus/types";
import type { AttachmentViewModel, EmailViewModel } from "@/lib/argus/email-view";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";
import { InboxTriagePanel } from "@/app/argus/components/InboxTriagePanel";
import {
  buildV2InboxTabCounts,
  filterV2InboxRows,
  parseV2InboxTab,
  type V2InboxDetailEntity,
  type V2InboxRow,
  type V2InboxTab,
} from "@/lib/argus/v2/inbox-loaders";

const TABS: { id: V2InboxTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "in_progress", label: "In Progress" },
  { id: "processed", label: "Processed" },
  { id: "archived", label: "Archived" },
];

const FILTER_CHIPS = ["All sources", "All senders", "All types", "All entities", "All tags"] as const;

type DetailBundle = {
  item: InboxItem;
  view: EmailViewModel;
  attachments: AttachmentViewModel[];
  linkedEntities: V2InboxDetailEntity[];
  convertedLog?: Log;
  defaultTitle: string;
  defaultBody: string;
};

export function V2InboxShell({
  rows,
  details,
  buckets,
  tagBuckets,
  linkedEntityRecords,
  initialSelectedId,
  initialTab,
}: {
  rows: V2InboxRow[];
  details: DetailBundle[];
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
  linkedEntityRecords: Entity[];
  initialSelectedId?: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseV2InboxTab(searchParams.get("tab") ?? initialTab);
  const selectedId = searchParams.get("selected") ?? initialSelectedId ?? rows[0]?.id;
  const counts = useMemo(() => buildV2InboxTabCounts(rows), [rows]);
  const filtered = useMemo(() => filterV2InboxRows(rows, tab), [rows, tab]);
  const selectedDetail = details.find((d) => d.item.id === selectedId);

  function setTab(next: V2InboxTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/argus/v2/inbox?${params.toString()}`);
  }

  function selectItem(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", id);
    router.replace(`/argus/v2/inbox?${params.toString()}`);
  }

  return (
    <div className="v2-inbox-shell -mx-4 flex min-h-[calc(100vh-4.5rem)] flex-col lg:-mx-8 lg:min-h-[calc(100vh-4rem)] lg:flex-row">
      {/* List column */}
      <section className="flex w-full flex-col border-b border-zinc-800/80 lg:w-[min(420px,38%)] lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-800/80 px-4 py-4 lg:px-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-zinc-50">Inbox</h1>
              <p className="mt-0.5 text-xs text-zinc-500">Unprocessed emails and items</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" className="text-xs text-zinc-500 hover:text-zinc-300">
                Select
              </button>
              <button type="button" className="text-xs text-zinc-500 hover:text-zinc-300">
                Mark all read
              </button>
              <button
                type="button"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
              >
                Process ▾
              </button>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${
                  tab === t.id ? "bg-violet-500/15 text-violet-300" : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {t.label} {counts[t.id] > 0 ? counts[t.id] : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-zinc-800/80 px-4 py-2 lg:px-5">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-[10px] text-zinc-500 hover:border-zinc-700"
            >
              {chip} ▾
            </button>
          ))}
          <button
            type="button"
            className="rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-[10px] text-zinc-500"
          >
            Filters
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">No items in this tab.</p>
          ) : (
            <ul>
              {filtered.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => selectItem(row.id)}
                    className={`w-full border-b border-zinc-800/60 px-4 py-3 text-left transition hover:bg-zinc-900/40 lg:px-5 ${
                      selectedId === row.id ? "bg-violet-500/10" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center gap-2 pt-1">
                        <input type="checkbox" className="rounded border-zinc-700 bg-zinc-900" readOnly />
                        <span
                          className={`h-2 w-2 rounded-full ${
                            row.unread ? "bg-violet-400" : "bg-zinc-700"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-100">{row.sender}</p>
                          <span className="shrink-0 text-[10px] tabular-nums text-zinc-600">{row.timeLabel}</span>
                        </div>
                        <p className="truncate text-sm text-zinc-300">{row.subject}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-600">{row.preview}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              row.statusTone === "violet"
                                ? "bg-violet-500/15 text-violet-300"
                                : row.statusTone === "amber"
                                  ? "bg-amber-500/15 text-amber-300"
                                  : "bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            {row.statusLabel}
                          </span>
                          {row.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className={`rounded-full px-2 py-0.5 text-[10px] ${
                                tag.tone === "blue"
                                  ? "bg-sky-500/15 text-sky-300"
                                  : tag.tone === "orange"
                                    ? "bg-orange-500/15 text-orange-300"
                                    : "bg-zinc-800 text-zinc-400"
                              }`}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Detail column */}
      <section className="min-w-0 flex-1 overflow-y-auto bg-zinc-950/50">
        {selectedDetail ? (
          <V2InboxDetailPanel
            detail={selectedDetail}
            buckets={buckets}
            tagBuckets={tagBuckets}
            linkedEntityRecords={linkedEntityRecords}
          />
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center p-8 text-sm text-zinc-500">
            Select an inbox item to read and process.
          </div>
        )}
      </section>
    </div>
  );
}

function V2InboxDetailPanel({
  detail,
  buckets,
  tagBuckets,
  linkedEntityRecords,
}: {
  detail: DetailBundle;
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
  linkedEntityRecords: Entity[];
}) {
  const [panelTab, setPanelTab] = useState<"email" | "details" | "attachments" | "related">("email");
  const { item, view, attachments, linkedEntities, convertedLog, defaultTitle, defaultBody } = detail;
  const linkedRecords = linkedEntityRecords.filter((e) => (item.linkedEntityIds ?? []).includes(e.id));

  const detailTabs = [
    { id: "email" as const, label: "Email" },
    { id: "details" as const, label: "Details" },
    { id: "attachments" as const, label: `Attachments (${attachments.length})` },
    { id: "related" as const, label: "Related" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800/80 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-snug text-zinc-50">
            {view.subject || "(No subject)"}
          </h2>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/argus/inbox/${item.id}`}
              className="text-zinc-600 hover:text-zinc-400"
              title="Open legacy view"
            >
              ↗
            </Link>
            <button type="button" className="text-zinc-600 hover:text-zinc-400">
              ···
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/50 to-zinc-700 text-xs font-bold text-violet-100">
            {view.from.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-zinc-200">{view.from}</p>
            {view.to ? <p className="text-xs text-zinc-500">To {view.to}</p> : null}
            <p className="text-xs text-zinc-600">
              {new Date(view.receivedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-1 border-b border-zinc-800/80">
          {detailTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPanelTab(t.id)}
              className={`border-b-2 px-3 py-2 text-xs font-medium ${
                panelTab === t.id
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {panelTab === "email" ? (
          <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">{view.textBody}</div>
        ) : null}
        {panelTab === "details" ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-[6rem_1fr]">
            <dt className="text-zinc-500">From</dt>
            <dd className="text-zinc-200">{view.from}</dd>
            <dt className="text-zinc-500">To</dt>
            <dd className="text-zinc-200">{view.to || "—"}</dd>
            <dt className="text-zinc-500">Status</dt>
            <dd className="text-zinc-200">{item.status}</dd>
            <dt className="text-zinc-500">Source</dt>
            <dd className="text-zinc-200">{item.source}</dd>
          </dl>
        ) : null}
        {panelTab === "attachments" ? (
          attachments.length === 0 ? (
            <p className="text-sm text-zinc-500">No attachments.</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li
                  key={att.id}
                  className="rounded-xl border border-zinc-800/80 px-3 py-2 text-sm text-zinc-300"
                >
                  {att.fileName}{" "}
                  <span className="text-xs text-zinc-600">({Math.round(att.sizeBytes / 1024)} KB)</span>
                </li>
              ))}
            </ul>
          )
        ) : null}
        {panelTab === "related" ? (
          linkedEntities.length === 0 ? (
            <p className="text-sm text-zinc-500">No linked entities yet.</p>
          ) : (
            <ul className="space-y-2">
              {linkedEntities.map((entity) => (
                <li key={entity.id}>
                  <Link href={entity.href} className="text-sm text-violet-400 hover:text-violet-300">
                    {entity.label}: {entity.name}
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : null}

        <div className="mt-6 space-y-4 border-t border-zinc-800/80 pt-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Linked entities</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {linkedEntities.map((entity) => (
                <Link
                  key={entity.id}
                  href={entity.href}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                    entity.kind === "project"
                      ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                      : entity.kind === "organization"
                        ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                        : "border-zinc-700 bg-zinc-800/80 text-zinc-300"
                  }`}
                >
                  {entity.kind === "project" ? "📁" : entity.kind === "organization" ? "🏢" : "👤"}
                  {entity.name}
                </Link>
              ))}
              <button
                type="button"
                className="rounded-xl border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-500 hover:border-zinc-600"
              >
                + Add entity
              </button>
            </div>
          </div>

          {linkedEntities.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-zinc-100">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {linkedEntities.map((entity) => (
                  <span
                    key={`tag-${entity.id}`}
                    className="rounded-md bg-zinc-800 px-2 py-1 text-[11px] text-zinc-400"
                  >
                    {entity.name.toLowerCase().replace(/\s+/g, "-").slice(0, 24)}
                  </span>
                ))}
                <button type="button" className="rounded-md border border-dashed border-zinc-700 px-2 py-1 text-[11px] text-zinc-500">
                  + Add tag
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
          <InboxTriagePanel
            item={item}
            linkedEntities={linkedRecords}
            buckets={buckets}
            tagBuckets={tagBuckets}
            convertedLog={convertedLog}
            defaultTitle={defaultTitle}
            defaultBody={defaultBody}
          />
        </div>
      </div>

      <div className="border-t border-zinc-800/80 px-5 py-3 text-center text-[11px] text-zinc-600">
        ✨ Created for you by Argus AI
      </div>
    </div>
  );
}
