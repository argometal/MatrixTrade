"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Entity } from "@/lib/argus/types";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import { inputClass, textareaClass } from "@/app/argus/components/ui";
import {
  CREATE_ITEM_HINTS,
  CREATE_ITEM_KINDS,
  CREATE_ITEM_LABELS,
  LINK_FILTER_LABELS,
  type CreateFlowOpenOptions,
  type CreateItemKind,
  type JournalLinkRow,
  type LinkFilterKind,
  type UnifiedCreateResult,
} from "@/lib/argus/create-flow-types";
import { entityLinkCardMeta, entityLinkFilterKind } from "@/lib/argus/create-flow-helpers";
import { useCreateLinkFlowState } from "@/lib/argus/create-link-flow-state";
import type { ReferenceKind } from "@/lib/argus/reference-types";
import { ArgusCreateLinkMobile } from "@/app/argus/components/ArgusCreateLinkMobile";
import {
  KindIcon,
  LINK_TABS,
  LinkedEntityRow,
  LinkedJournalRow,
  StepBadge,
  TAB_ICONS,
  ITEM_STYLES,
} from "@/app/argus/components/create-link-shared";

const STEPS = [
  { key: "create", label: "Create", sub: "Select what you want to create" },
  { key: "link", label: "Add Context", sub: "Link this item to anything in ARGUS" },
  { key: "missing", label: "Create Missing", sub: "Auto-create and link if needed" },
  { key: "save", label: "Save & Link", sub: "Review and save everything" },
] as const;

const MISSING_KINDS: Array<{ kind: ReferenceKind | "document"; title: string; fields: string[] }> = [
  { kind: "person", title: "Person", fields: ["Full name", "Role", "Organization"] },
  { kind: "organization", title: "Organization", fields: ["Name", "Type", "Country"] },
  { kind: "project", title: "Project", fields: ["Name", "Description", "Status"] },
  { kind: "event", title: "Event", fields: ["Title", "Date", "Type"] },
  { kind: "topic", title: "Topic", fields: ["Name", "Category", "Description"] },
  { kind: "document", title: "Document", fields: ["Name", "Description", "Source"] },
];

function SearchResultRow({
  entity,
  allEntities,
  onAdd,
}: {
  entity: Entity;
  allEntities: Entity[];
  onAdd: () => void;
}) {
  const kind = entityLinkFilterKind(entity) ?? "person";
  const { subtitle } = entityLinkCardMeta(entity, allEntities);
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex w-full items-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-2.5 text-left transition hover:border-violet-700/40 hover:bg-violet-950/20"
    >
      <KindIcon kind={kind === "journal" || kind === "all" ? "person" : (kind as CreateItemKind)} className="!h-8 !w-8 !text-xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-zinc-200">{entity.name}</p>
        <p className="truncate text-[11px] text-zinc-600">{subtitle}</p>
      </div>
      <span className="text-xs font-medium text-violet-400">+ Link</span>
    </button>
  );
}

export function ArgusCreateLinkWindow({
  open,
  onClose,
  options,
  buckets,
  journalRows,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  options: CreateFlowOpenOptions;
  buckets: EntityPickerBuckets;
  journalRows: JournalLinkRow[];
  onSaved?: (result: UnifiedCreateResult) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const flow = useCreateLinkFlowState({ open, options, buckets, journalRows, onClose, onSaved });

  useEffect(() => {
    setMounted(true);
  }, []);

  const linkedEntities = useMemo(
    () =>
      flow.draftEntityIds
        .map((id) => flow.allEntities.find((entity) => entity.id === id))
        .filter((entity): entity is Entity => Boolean(entity)),
    [flow.draftEntityIds, flow.allEntities]
  );

  const linkedJournalRows = useMemo(
    () =>
      flow.draftLogIds
        .map((id) => journalRows.find((row) => row.id === id))
        .filter((row): row is JournalLinkRow => Boolean(row)),
    [flow.draftLogIds, journalRows]
  );

  const searchResults = useMemo(() => {
    const linked = new Set(flow.draftEntityIds);
    return flow.filteredEntities.filter((entity) => !linked.has(entity.id)).slice(0, 12);
  }, [flow.filteredEntities, flow.draftEntityIds]);

  const suggestedTopics = useMemo(() => {
    const existing = new Set(
      flow.allEntities
        .filter((entity) => entityLinkFilterKind(entity) === "topic")
        .map((entity) => entity.name.toLowerCase())
    );
    return flow.tagList.filter((tag) => !existing.has(tag.toLowerCase()));
  }, [flow.tagList, flow.allEntities]);

  if (!open || !mounted) return null;

  const saveLabel =
    flow.mode === "link"
      ? "Save & Link"
      : flow.itemKind === "journal"
        ? "Create & Save"
        : `Create ${CREATE_ITEM_LABELS[flow.itemKind]}`;

  const itemPreviewTitle =
    flow.itemKind === "journal"
      ? flow.title.trim() || "Untitled journal note"
      : flow.name.trim() || `New ${CREATE_ITEM_LABELS[flow.itemKind]}`;

  const itemPreviewBody =
    flow.itemKind === "journal"
      ? flow.body.trim().slice(0, 120) || CREATE_ITEM_HINTS.journal
      : flow.notes.trim().slice(0, 120) || CREATE_ITEM_HINTS[flow.itemKind];

  const orgOptions = flow.allEntities.filter((entity) => entity.type === "company");

  const desktop = (
    <div
      className="fixed inset-0 z-[9999] hidden flex-col bg-[#030308] lg:flex"
      role="dialog"
      aria-modal="true"
      aria-label="Create and link anything"
    >
      {/* Header */}
      <header className="shrink-0 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/25 text-lg ring-1 ring-violet-500/30">
              ◉
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-400">
                Create &amp; Link Anything
              </p>
              <h1 className="text-sm font-bold text-zinc-50">ARGUS</h1>
            </div>
          </div>

          <div className="hidden flex-1 items-center justify-center lg:flex">
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-2">
              {STEPS.map((step, index) => (
                <span key={step.key} className="flex items-center gap-2">
                  {index > 0 ? <span className="text-zinc-700">→</span> : null}
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    <StepBadge n={index + 1} active={index === 0} />
                    {step.label}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
        </div>
      </header>

      {flow.error ? (
        <p className="shrink-0 bg-amber-950/50 px-6 py-2 text-center text-sm text-amber-300">{flow.error}</p>
      ) : null}
      {flow.flash ? (
        <p className="shrink-0 bg-emerald-950/50 px-6 py-2 text-center text-sm text-emerald-300">{flow.flash}</p>
      ) : null}

      {/* Main 4-column workspace */}
      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[220px_minmax(0,1fr)_320px_280px]">
        {/* Step 1 — Create item */}
        {flow.mode === "create" ? (
          <aside
            className="flex min-h-0 flex-col overflow-y-auto border-b border-zinc-800/80 bg-zinc-950/60 lg:border-b-0 lg:border-r"
          >
            <div className="flex items-start gap-2 px-4 pb-2 pt-4">
              <StepBadge n={1} active />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Create Item</p>
                <p className="text-[11px] text-zinc-600">Select what you want to create</p>
              </div>
            </div>
            <nav className="space-y-1 px-3 pb-4">
              {CREATE_ITEM_KINDS.map((kind) => {
                const style = ITEM_STYLES[kind];
                const active = flow.itemKind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => flow.setItemKind(kind)}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? `border-violet-500/50 bg-violet-500/10 ring-1 ${style.ring}`
                        : "border-transparent hover:border-zinc-800 hover:bg-zinc-900/60"
                    }`}
                  >
                    <KindIcon kind={kind} />
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${active ? "text-zinc-50" : "text-zinc-200"}`}>
                        {kind === "journal" ? "Journal Note" : CREATE_ITEM_LABELS[kind]}
                      </span>
                      <span className="mt-1 block text-[11px] leading-snug text-zinc-500">
                        {CREATE_ITEM_HINTS[kind]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>
        ) : (
          <aside className="hidden lg:block lg:border-r lg:border-zinc-800/80" />
        )}

        {/* Center — Form */}
        <section
          className="flex min-h-0 flex-col overflow-y-auto border-b border-zinc-800/80 px-4 py-4 lg:border-b-0 lg:border-r lg:px-6"
        >
          {flow.mode === "create" ? (
            <>
              <div className="mb-4 flex items-center gap-2">
                <KindIcon kind={flow.itemKind} />
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-100">
                    {flow.itemKind === "journal" ? "Journal Note" : CREATE_ITEM_LABELS[flow.itemKind]}
                  </h2>
                  <p className="text-xs text-zinc-500">{CREATE_ITEM_HINTS[flow.itemKind]}</p>
                </div>
              </div>

              {flow.itemKind === "journal" ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Template</span>
                    <select
                      className={`${inputClass} mt-1.5`}
                      value={flow.template}
                      onChange={(event) => flow.setTemplate(event.target.value)}
                    >
                      <option value="standard">Standard Note</option>
                      <option value="meeting">Meeting Notes</option>
                      <option value="field">Field Log</option>
                      <option value="followup">Follow-up</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Title (optional)
                    </span>
                    <input
                      className={`${inputClass} mt-1.5`}
                      value={flow.title}
                      onChange={(event) => flow.setTitle(event.target.value)}
                      placeholder="Rig Move – Noble Developer → Liza Unity"
                      autoFocus
                    />
                  </label>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Content</span>
                    <div className="mt-1.5 flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-zinc-700 bg-zinc-900/80 px-2 py-2">
                      {["B", "I", "U", "•", "1.", "🔗", "❝", "`"].map((tool) => (
                        <button
                          key={tool}
                          type="button"
                          className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                        >
                          {tool}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className={`${textareaClass} min-h-[200px] rounded-t-none`}
                      value={flow.body}
                      onChange={(event) => flow.setBody(event.target.value)}
                      placeholder="Record what matters — evidence for later retrieval…"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Date</span>
                      <input
                        type="datetime-local"
                        className={`${inputClass} mt-1.5`}
                        value={flow.eventDate}
                        onChange={(event) => flow.setEventDate(event.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Entry type</span>
                      <select
                        className={`${inputClass} mt-1.5`}
                        value={flow.entryType}
                        onChange={(event) => flow.setEntryType(event.target.value as "log" | "note")}
                      >
                        <option value="log">Log</option>
                        <option value="note">Note</option>
                      </select>
                    </label>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Tags</span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {flow.tagList.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => flow.removeTag(tag)}
                          className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200"
                        >
                          {tag} ×
                        </button>
                      ))}
                    </div>
                    <input
                      className={`${inputClass} mt-2`}
                      value={flow.tagInput}
                      onChange={(event) => flow.setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === ",") {
                          event.preventDefault();
                          flow.addTag(flow.tagInput);
                        }
                      }}
                      placeholder="rigmove, operations, logistics"
                    />
                  </div>
                  <details className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-medium text-zinc-400">
                      Attachments ({flow.draftEntityIds.length > 0 ? "—" : "0"})
                    </summary>
                    <p className="mt-2 text-xs text-zinc-600">Attach files after save from the journal entry page.</p>
                  </details>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</span>
                    <input
                      className={`${inputClass} mt-1.5`}
                      value={flow.name}
                      onChange={(event) => flow.setName(event.target.value)}
                      autoFocus
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {flow.itemKind === "document" ? "Description" : "Notes (optional)"}
                    </span>
                    <textarea
                      className={`${textareaClass} mt-1.5 min-h-[160px]`}
                      value={flow.notes}
                      onChange={(event) => flow.setNotes(event.target.value)}
                    />
                  </label>
                  {flow.itemKind === "event" ? (
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Event date</span>
                      <input
                        type="date"
                        className={`${inputClass} mt-1.5`}
                        value={flow.eventDate.slice(0, 10)}
                        onChange={(event) => flow.setEventDate(event.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
              )}
            </>
          ) : (
            <div className="py-6">
              <h2 className="text-xl font-bold text-zinc-100">Link &amp; Connect</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
                Select people, organizations, projects, events, topics, documents, or journal evidence. Create
                anything missing — it links automatically.
              </p>
            </div>
          )}
        </section>

        {/* Step 2 — Link panel */}
        <aside className="flex min-h-0 flex-col overflow-hidden border-b border-zinc-800/80 bg-zinc-950/40 lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-2 border-b border-zinc-800/80 px-4 py-3">
            <StepBadge n={2} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Add Context (Link)</p>
              <p className="text-[11px] text-zinc-600">Link this item to anything in ARGUS</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {linkedEntities.length > 0 || linkedJournalRows.length > 0 ? (
              <div className="mb-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Linked ({flow.totalLinks})
                </p>
                <div className="space-y-2">
                  {linkedEntities.map((entity) => (
                    <LinkedEntityRow
                      key={entity.id}
                      entity={entity}
                      allEntities={flow.allEntities}
                      onRemove={() => flow.toggleEntity(entity.id)}
                    />
                  ))}
                  {linkedJournalRows.map((row) => (
                    <LinkedJournalRow key={row.id} row={row} onRemove={() => flow.toggleLog(row.id)} />
                  ))}
                </div>
              </div>
            ) : null}

            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Add more links</p>
            <input
              className={`${inputClass} py-2.5 text-sm`}
              placeholder="Search for anything in ARGUS…"
              value={flow.linkQuery}
              onChange={(event) => flow.setLinkQuery(event.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {LINK_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => flow.setLinkTab(tab)}
                  title={LINK_FILTER_LABELS[tab]}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium ${
                    flow.linkTab === tab
                      ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/40"
                      : "text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400"
                  }`}
                >
                  <span>{TAB_ICONS[tab]}</span>
                  <span className="hidden sm:inline">{LINK_FILTER_LABELS[tab]}</span>
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              {flow.linkTab === "journal" ? (
                flow.filteredJournalRows
                  .filter((row) => !flow.draftLogIds.includes(row.id))
                  .slice(0, 8)
                  .map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => flow.toggleLog(row.id)}
                      className="flex w-full items-center gap-2 rounded-xl border border-dashed border-zinc-800 px-3 py-2.5 text-left hover:border-violet-700/40 hover:bg-violet-950/20"
                    >
                      <KindIcon kind="journal" className="!h-8 !w-8 !text-xs" />
                      <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">{row.title}</span>
                      <span className="text-xs text-violet-400">+ Link</span>
                    </button>
                  ))
              ) : searchResults.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-600">No matches — create missing below.</p>
              ) : (
                searchResults.map((entity) => (
                  <SearchResultRow
                    key={entity.id}
                    entity={entity}
                    allEntities={flow.allEntities}
                    onAdd={() => flow.toggleEntity(entity.id)}
                  />
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Step 4 — Review & Save */}
        <aside className="flex min-h-0 flex-col overflow-y-auto bg-zinc-950/60">
          <div className="flex items-start gap-2 border-b border-zinc-800/80 px-4 py-3">
            <StepBadge n={4} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Review &amp; Save</p>
              <p className="text-[11px] text-zinc-600">Everything ready to be saved</p>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">This item</p>
              <div className="mt-3 flex items-start gap-3">
                <KindIcon kind={flow.itemKind} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-100">{itemPreviewTitle}</p>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-zinc-500">{itemPreviewBody}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Links ({flow.totalLinks})
              </p>
              <dl className="mt-3 space-y-1.5 text-xs">
                {(
                  [
                    ["person", "People"],
                    ["organization", "Organizations"],
                    ["project", "Projects"],
                    ["event", "Events"],
                    ["topic", "Topics"],
                    ["document", "Documents"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <dt className="text-zinc-600">{label}</dt>
                    <dd className="font-semibold tabular-nums text-zinc-300">{flow.linkCounts[key]}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-zinc-800 pt-2">
                  <dt className="text-zinc-600">Journal</dt>
                  <dd className="font-semibold tabular-nums text-zinc-300">{flow.linkCounts.journal}</dd>
                </div>
              </dl>
            </div>

            <button
              type="button"
              onClick={flow.handleSave}
              disabled={flow.isPending || !flow.canSave()}
              className="hidden w-full rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 disabled:opacity-40 lg:block"
            >
              {flow.isPending ? "Saving…" : saveLabel}
            </button>
          </div>
        </aside>
      </div>

      {/* Step 3 — Create missing */}
      <section className="shrink-0 border-t border-zinc-800/80 bg-zinc-950/80">
        <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6">
          <div className="mb-3 flex items-start gap-2">
            <StepBadge n={3} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                Create Missing (if needed)
              </p>
              <p className="text-[11px] text-zinc-600">These items will be created and linked automatically</p>
            </div>
          </div>

          {suggestedTopics.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-3">
              {suggestedTopics.map((topic) => (
                <div
                  key={topic}
                  className="flex min-w-[200px] items-center justify-between gap-3 rounded-2xl border border-violet-800/40 bg-violet-950/20 px-4 py-3"
                >
                  <div>
                    <p className="text-xs text-zinc-500">Nothing found for</p>
                    <p className="text-sm font-semibold text-zinc-200">&ldquo;{topic}&rdquo;</p>
                  </div>
                  <button
                    type="button"
                    disabled={flow.isPending}
                    onClick={() => {
                      flow.updateMissingDraft("topic", { name: topic });
                      flow.handleMissingCreate("topic");
                    }}
                    className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
                  >
                    + Create Topic
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex gap-3 overflow-x-auto pb-1">
            {MISSING_KINDS.map(({ kind, title, fields }) => {
              const draft = flow.missingDrafts[kind] ?? { name: "", detail: "", extra: "" };
              return (
                <div
                  key={kind}
                  className="min-w-[200px] shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
                >
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-300">{title}</p>
                  <input
                    className={`${inputClass} mb-2 py-2 text-sm`}
                    placeholder={fields[0]}
                    value={draft.name}
                    onChange={(event) => flow.updateMissingDraft(kind, { name: event.target.value })}
                  />
                  {kind === "person" && fields[2] === "Organization" ? (
                    <select
                      className={`${inputClass} mb-2 py-2 text-sm`}
                      value={draft.extra}
                      onChange={(event) => flow.updateMissingDraft(kind, { extra: event.target.value })}
                    >
                      <option value="">{fields[2]}</option>
                      {orgOptions.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={`${inputClass} mb-2 py-2 text-sm`}
                      placeholder={fields[1]}
                      value={draft.detail}
                      onChange={(event) => flow.updateMissingDraft(kind, { detail: event.target.value })}
                    />
                  )}
                  <button
                    type="button"
                    disabled={flow.isPending || !draft.name.trim()}
                    onClick={() => flow.handleMissingCreate(kind)}
                    className="w-full rounded-lg bg-zinc-800 py-2 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
                  >
                    Create &amp; link
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Info footer */}
      <section className="hidden shrink-0 border-t border-zinc-800/80 bg-zinc-950/90 lg:block">
        <div className="mx-auto grid max-w-[1600px] grid-cols-3 gap-6 px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">How it works in practice</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Capture a note → link people, projects, and topics → create anything missing in one step → save with
              full context preserved.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">What you get</p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-500">
              <li>✓ Everything connected</li>
              <li>✓ No lost context</li>
              <li>✓ Evidence preserved</li>
              <li>✓ Searchable later</li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Built for you</p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-500">
              <li>Capture the truth</li>
              <li>Organize your world</li>
              <li>Link without friction</li>
              <li>Professional memory</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Bottom actions */}
      <footer className="shrink-0 border-t border-zinc-800/80 bg-zinc-950">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={flow.handleSave}
            disabled={flow.isPending || !flow.canSave()}
            className="rounded-xl bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 disabled:opacity-40"
          >
            {flow.isPending ? "Saving…" : saveLabel}
          </button>
        </div>
      </footer>
    </div>
  );

  return createPortal(
    <>
      <ArgusCreateLinkMobile
        open={open}
        onClose={onClose}
        options={options}
        buckets={buckets}
        journalRows={journalRows}
        onSaved={onSaved}
      />
      {desktop}
    </>,
    document.body
  );
}
