"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Entity } from "@/lib/argus/types";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import { inputClass, textareaClass } from "@/app/argus/components/ui";
import {
  CREATE_ITEM_HINTS,
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
import { ArgusCreateItemDrawer } from "@/app/argus/components/ArgusCreateItemDrawer";
import {
  KindIcon,
  LINK_TABS,
  LinkedEntityRow,
  LinkedJournalRow,
  InboxEvidenceBanner,
  StepBadge,
  TAB_ICONS,
  createItemDisplayLabel,
} from "@/app/argus/components/create-link-shared";
import { ADD_CONTEXT } from "@/lib/argus/ux-copy";
import { ArgusUnifiedLinkPanel } from "@/app/argus/components/ArgusUnifiedLinkPanel";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";
import { usesLinkModalShell } from "@/lib/argus/link-modal-adapter";

const STEPS = [
  { key: "create", label: "Capture", sub: "Fill in your new item" },
  { key: "link", label: "Link", sub: "Connect to existing ARGUS records" },
  { key: "save", label: "Save", sub: "Review and save" },
] as const;

function ArgusMenuButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close capture menu" : "Open capture menu"}
      aria-expanded={open}
      className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-[5px] rounded-xl bg-violet-600/25 ring-1 ring-violet-500/30 transition hover:bg-violet-600/35"
    >
      <span className={`block h-0.5 w-4 rounded-full bg-violet-200 transition ${open ? "translate-y-[3.5px] rotate-45" : ""}`} />
      <span className={`block h-0.5 w-4 rounded-full bg-violet-200 transition ${open ? "opacity-0" : ""}`} />
      <span className={`block h-0.5 w-4 rounded-full bg-violet-200 transition ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
    </button>
  );
}

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
  tagBuckets,
  journalRows,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  options: CreateFlowOpenOptions;
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
  journalRows: JournalLinkRow[];
  onSaved?: (result: UnifiedCreateResult) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  if (usesLinkModalShell(options)) {
    return createPortal(
      <ArgusUnifiedLinkPanel
        open={open}
        onClose={onClose}
        options={options}
        buckets={buckets}
        tagBuckets={tagBuckets}
      />,
      document.body
    );
  }

  return createPortal(
    <ArgusCreateLinkWindowBody
      open={open}
      onClose={onClose}
      options={options}
      buckets={buckets}
      journalRows={journalRows}
      onSaved={onSaved}
    />,
    document.body
  );
}

function ArgusCreateLinkWindowBody({
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
  const [menuOpen, setMenuOpen] = useState(false);
  const flow = useCreateLinkFlowState({ open, options, buckets, journalRows, onClose, onSaved });
  const entityCaptureOnly = Boolean(options.entityCaptureOnly);
  const needsKindPicker = flow.needsItemKindPicker;
  const drawerOpen = menuOpen || needsKindPicker;
  const drawerDismissible = !needsKindPicker;

  useEffect(() => {
    if (!open) {
      setMenuOpen(false);
      return;
    }
    setMenuOpen(needsKindPicker);
  }, [open, needsKindPicker]);

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

  if (!open) return null;

  const saveLabel =
    flow.mode === "link"
      ? "Save & Link"
      : flow.isInboxEvidence && flow.linkOnly
        ? "Link Email"
        : flow.isInboxEvidence
          ? "Save & Link Email"
          : flow.itemKind === "journal"
            ? "Capture & Save"
            : `Capture ${createItemDisplayLabel(flow.itemKind)}`;

  const showCreateForm =
    (flow.mode === "create" || (flow.isInboxEvidence && !flow.linkOnly)) && flow.itemKindChosen;

  const itemPreviewTitle =
    flow.isInboxEvidence && flow.linkOnly
      ? flow.title.trim() || "Link email to records"
      : flow.itemKind === "journal"
        ? flow.title.trim() || "Untitled journal note"
        : flow.name.trim() || `New ${createItemDisplayLabel(flow.itemKind)}`;

  const itemPreviewBody =
    flow.isInboxEvidence && flow.linkOnly
      ? "Assign this email to people, organizations, projects, events, or topics."
      : flow.itemKind === "journal"
        ? flow.body.trim().slice(0, 120) || CREATE_ITEM_HINTS.journal
        : flow.itemKind === "runbook"
          ? flow.body.trim().slice(0, 120) || CREATE_ITEM_HINTS.runbook
          : flow.notes.trim().slice(0, 120) || CREATE_ITEM_HINTS[flow.itemKind];

  const orgOptions = flow.allEntities.filter((entity) => entity.type === "company");

  const desktop = (
    <div
      className="fixed inset-0 z-[9999] hidden flex-col bg-[#030308] lg:flex"
      role="dialog"
      aria-modal="true"
      aria-label="Capture"
    >
      {/* Header */}
      <header className="shrink-0 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[min(100%,1920px)] items-center gap-4 px-5 py-3 xl:px-10">
          <ArgusMenuButton
            open={drawerOpen}
            onClick={() => {
              if (needsKindPicker) return;
              setMenuOpen((value) => !value);
            }}
          />
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-400">{ADD_CONTEXT.title}</p>
              <h1 className="truncate text-sm font-bold text-zinc-50">
                {needsKindPicker
                  ? entityCaptureOnly
                    ? ADD_CONTEXT.pickKind
                    : "Choose what to add"
                  : flow.mode === "link"
                    ? "Link & Connect"
                    : createItemDisplayLabel(flow.itemKind)}
              </h1>
              {entityCaptureOnly && needsKindPicker ? (
                <p className="text-[11px] text-zinc-500">{ADD_CONTEXT.useRegisterHint}</p>
              ) : null}
            </div>
          </div>

          <div className="hidden flex-1 items-center justify-center lg:flex">
            {!entityCaptureOnly ? (
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-2">
              {STEPS.map((step, index) => (
                <span key={step.key} className="flex items-center gap-2">
                  {index > 0 ? <span className="text-zinc-700">→</span> : null}
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    <StepBadge
                      n={index + 1}
                      active={index === 0 ? needsKindPicker || showCreateForm : index === 1}
                    />
                    {step.label}
                  </span>
                </span>
              ))}
            </div>
            ) : (
              <p className="text-xs text-zinc-500">Create one thing · search and link what already exists</p>
            )}
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

      {flow.isInboxEvidence ? (
        <InboxEvidenceBanner
          title={options.prefillTitle ?? flow.title}
          preview={options.prefillBody?.slice(0, 160)}
        />
      ) : null}

      {/* Main workspace — form + link + review (create item types live in the menu) */}
      <div className="mx-auto grid min-h-[min(58vh,640px)] w-full max-w-[min(100%,1920px)] flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1.65fr)_minmax(400px,1fr)_minmax(320px,0.9fr)]">
        {/* Center — Form */}
        <section
          className="flex min-h-0 flex-col overflow-y-auto border-b border-zinc-800/80 px-5 py-5 lg:border-b-0 lg:border-r lg:px-8"
        >
          {showCreateForm ? (
            <>
              <div className="mb-4 flex items-center gap-2">
                <KindIcon kind={flow.itemKind} />
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-100">
                    {createItemDisplayLabel(flow.itemKind)}
                  </h2>
                  <p className="text-xs text-zinc-500">{CREATE_ITEM_HINTS[flow.itemKind]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="ml-auto rounded-lg border border-zinc-700 px-2.5 py-1 text-[10px] font-medium text-zinc-400 hover:border-violet-500/40 hover:text-violet-300"
                >
                  Change type
                </button>
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
                      className={`${textareaClass} min-h-[260px] rounded-t-none`}
                      value={flow.body}
                      onChange={(event) => flow.setBody(event.target.value)}
                      placeholder="Record what matters — evidence for later retrieval…"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-1">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Date</span>
                      <input
                        type="datetime-local"
                        className={`${inputClass} mt-1.5`}
                        value={flow.eventDate}
                        onChange={(event) => flow.setEventDate(event.target.value)}
                      />
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
              ) : flow.itemKind === "runbook" ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Title</span>
                    <input
                      className={`${inputClass} mt-1.5`}
                      value={flow.name}
                      onChange={(event) => flow.setName(event.target.value)}
                      placeholder="RIG RUN — Prejob"
                      autoFocus
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Cards (one line = one card)
                    </span>
                    <textarea
                      className={`${textareaClass} mt-1.5 min-h-[220px] font-mono text-sm`}
                      value={flow.body}
                      onChange={(event) => flow.setBody(event.target.value)}
                      placeholder={"Confirm permits\nCheck equipment\n\nSafety briefing"}
                    />
                    <p className="mt-1.5 text-[11px] text-zinc-600">
                      Blank line = section break. Add subtasks on the runbook page after create.
                    </p>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {flow.itemKind === "tag" ? "Tag name" : "Name"}
                    </span>
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
          ) : needsKindPicker ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20 text-2xl ring-1 ring-violet-500/30">
                ◉
              </span>
              <h2 className="text-lg font-bold text-zinc-100">Choose what to capture</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
                Pick an intent — Knowledge, Entity, or Execution. The form unlocks once you choose.
              </p>
            </div>
          ) : flow.isInboxEvidence && flow.linkOnly ? (
            <div className="py-6">
              <h2 className="text-xl font-bold text-zinc-100">Link email evidence</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
                Select people, organizations, projects, events, or topics. Capture anything missing below — it
                links to this email automatically.
              </p>
            </div>
          ) : (
            <div className="py-6">
              <h2 className="text-xl font-bold text-zinc-100">Link &amp; Connect</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
                Select people, organizations, projects, events, topics, documents, or journal evidence. Capture
                anything missing — it links automatically.
              </p>
            </div>
          )}
        </section>

        {/* Step 2 — Link panel */}
        <aside
          className={`flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-zinc-800/80 bg-zinc-950/40 lg:border-b-0 lg:border-r ${
            needsKindPicker ? "opacity-50" : ""
          }`}
        >
          <div className="flex items-start gap-2 border-b border-zinc-800/80 px-5 py-3">
            <StepBadge n={2} active={!needsKindPicker && (showCreateForm || flow.mode === "link")} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Add Context (Link)</p>
              <p className="text-[11px] text-zinc-600">
                {needsKindPicker ? "Available after you choose a capture type" : "Link this item to anything in ARGUS"}
              </p>
            </div>
          </div>

          <div
            className={`argus-overlay-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 ${needsKindPicker ? "pointer-events-none" : ""}`}
          >
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
                <p className="py-6 text-center text-xs text-zinc-600">No matches — capture missing below.</p>
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

        {/* Review & Save */}
        <aside className="flex min-h-0 min-w-0 flex-col overflow-y-auto bg-zinc-950/60">
          <div className="flex items-start gap-2 border-b border-zinc-800/80 px-5 py-3">
            <StepBadge n={3} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Review &amp; Save</p>
              <p className="text-[11px] text-zinc-600">Everything ready to be saved</p>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5">
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
          </div>
        </aside>
      </div>

      <ArgusCreateItemDrawer
        open={drawerOpen}
        dismissible={drawerDismissible}
        onClose={() => setMenuOpen(false)}
        itemKind={flow.itemKind}
        onSelectKind={flow.chooseItemKind}
        flow={flow}
        suggestedTopics={suggestedTopics}
        orgOptions={orgOptions}
        entityCaptureOnly={entityCaptureOnly}
      />

      {/* Bottom actions */}
      <footer className="shrink-0 border-t border-zinc-800/80 bg-zinc-950">
        <div className="mx-auto flex w-full max-w-[min(100%,1920px)] flex-wrap items-center justify-between gap-3 px-5 py-3 xl:px-10">
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

  return (
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
    </>
  );
}
