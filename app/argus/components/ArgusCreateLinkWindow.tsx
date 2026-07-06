"use client";

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

const LINK_TABS: LinkFilterKind[] = [
  "all",
  "person",
  "organization",
  "project",
  "event",
  "topic",
  "document",
  "journal",
];

const TAB_ICONS: Record<LinkFilterKind, string> = {
  all: "◉",
  person: "👤",
  organization: "🏢",
  project: "📁",
  event: "📅",
  topic: "🏷",
  document: "📄",
  journal: "▤",
};

const ITEM_STYLES: Record<
  CreateItemKind,
  { glyph: string; ring: string; bg: string; text: string }
> = {
  journal: { glyph: "▤", ring: "ring-violet-500/40", bg: "bg-violet-500/15", text: "text-violet-200" },
  person: { glyph: "👤", ring: "ring-emerald-500/40", bg: "bg-emerald-500/15", text: "text-emerald-200" },
  organization: { glyph: "🏢", ring: "ring-sky-500/40", bg: "bg-sky-500/15", text: "text-sky-200" },
  project: { glyph: "📁", ring: "ring-amber-500/40", bg: "bg-amber-500/15", text: "text-amber-200" },
  event: { glyph: "📅", ring: "ring-rose-500/40", bg: "bg-rose-500/15", text: "text-rose-200" },
  topic: { glyph: "🏷", ring: "ring-yellow-500/40", bg: "bg-yellow-500/15", text: "text-yellow-100" },
  document: { glyph: "📄", ring: "ring-zinc-500/40", bg: "bg-zinc-500/15", text: "text-zinc-200" },
};

const MISSING_KINDS: Array<{ kind: ReferenceKind | "document"; title: string; fields: string[] }> = [
  { kind: "person", title: "Create Person", fields: ["Full name", "Role", "Organization"] },
  { kind: "organization", title: "Create Organization", fields: ["Name", "Type", "Country"] },
  { kind: "project", title: "Create Project", fields: ["Name", "Description", "Status"] },
  { kind: "event", title: "Create Event", fields: ["Title", "Date", "Type"] },
  { kind: "topic", title: "Create Topic", fields: ["Name", "Category", "Description"] },
  { kind: "document", title: "Create Document", fields: ["Name", "Description", "Source"] },
];

function KindIcon({ kind, className = "" }: { kind: CreateItemKind | LinkFilterKind; className?: string }) {
  const style =
    kind in ITEM_STYLES
      ? ITEM_STYLES[kind as CreateItemKind]
      : { glyph: TAB_ICONS[kind as LinkFilterKind] ?? "•", bg: "bg-zinc-800", text: "text-zinc-300", ring: "" };
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm ${style.bg} ${style.text} ${className}`}
    >
      {style.glyph}
    </span>
  );
}

function LinkEntityCard({
  entity,
  allEntities,
  checked,
  onToggle,
}: {
  entity: Entity;
  allEntities: Entity[];
  checked: boolean;
  onToggle: () => void;
}) {
  const kind = entityLinkFilterKind(entity) ?? "person";
  const iconKind = kind === "journal" || kind === "all" ? "person" : kind;
  const { subtitle, meta } = entityLinkCardMeta(entity, allEntities);

  return (
    <label
      className={`grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-3 transition ${
        checked
          ? "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30"
          : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
      }`}
    >
      <KindIcon kind={iconKind as CreateItemKind} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-zinc-100">{entity.name}</span>
        <span className="mt-0.5 block truncate text-xs text-zinc-500">{subtitle}</span>
        <span className="mt-0.5 block truncate text-[10px] text-zinc-600">{meta}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 shrink-0 accent-violet-500" />
    </label>
  );
}

function JournalLinkCard({
  row,
  checked,
  onToggle,
}: {
  row: JournalLinkRow;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border px-3 py-3 transition ${
        checked
          ? "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30"
          : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
      }`}
    >
      <KindIcon kind="journal" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-zinc-100">{row.title}</span>
        <span className="mt-0.5 block truncate text-xs text-zinc-500">{row.preview || row.kind}</span>
        <span className="mt-0.5 block text-[10px] text-zinc-600">
          {row.date} · {row.kind}
        </span>
      </span>
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 h-4 w-4 shrink-0 accent-violet-500" />
    </label>
  );
}

function StepCrumb({ active, done, label }: { active?: boolean; done?: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
        active ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/40" : done ? "text-violet-300" : "text-zinc-600"
      }`}
    >
      {label}
    </span>
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
  const flow = useCreateLinkFlowState({ open, options, buckets, journalRows, onClose, onSaved });

  if (!open) return null;

  const saveLabel =
    flow.mode === "link"
      ? "Save links"
      : flow.itemKind === "journal"
        ? "Create & Save Entry"
        : `Create ${CREATE_ITEM_LABELS[flow.itemKind]}`;

  const orgOptions = flow.allEntities.filter((entity) => entity.type === "company");

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#07070a]/95 backdrop-blur-md">
      <header className="shrink-0 border-b border-zinc-800/80 bg-zinc-950/90">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-lg ring-1 ring-violet-500/30">
              ◉
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
                Create &amp; Link Anything
              </p>
              <h1 className="text-base font-bold text-zinc-50 sm:text-lg">ARGUS</h1>
            </div>
          </div>

          <div className="hidden flex-1 px-4 lg:block">
            <div className="mx-auto flex max-w-md items-center rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-600">
              <span className="mr-2">⌕</span>
              Search ARGUS…
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <StepCrumb active={flow.mode === "create"} label="1 Create" />
            <span className="text-zinc-700">→</span>
            <StepCrumb done={flow.totalLinks > 0} label="2 Link" />
            <span className="text-zinc-700">→</span>
            <StepCrumb done={flow.missingOpen} label="3 Missing" />
            <span className="text-zinc-700">→</span>
            <StepCrumb done={flow.canSave()} label="4 Save" />
            <button
              type="button"
              onClick={onClose}
              className="ml-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
        </div>
      </header>

      {flow.error ? (
        <p className="shrink-0 bg-amber-950/40 px-6 py-2 text-center text-sm text-amber-300">{flow.error}</p>
      ) : null}
      {flow.flash ? (
        <p className="shrink-0 bg-emerald-950/40 px-6 py-2 text-center text-sm text-emerald-300">{flow.flash}</p>
      ) : null}

      <div className="mx-auto grid min-h-0 w-full max-w-[1400px] flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[220px_minmax(0,1fr)_340px]">
        {flow.mode === "create" ? (
          <aside className="hidden overflow-y-auto border-b border-zinc-800/80 bg-zinc-950/50 lg:block lg:border-b-0 lg:border-r">
            <p className="px-4 pb-2 pt-4 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              Create any item
            </p>
            <nav className="space-y-1 px-3 pb-4">
              {(flow.lockItemKind ? [flow.itemKind] : CREATE_ITEM_KINDS).map((kind) => {
                const style = ITEM_STYLES[kind];
                const active = flow.itemKind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => flow.setItemKind(kind)}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? `border-violet-500/40 bg-violet-500/10 ring-1 ${style.ring}`
                        : "border-transparent hover:border-zinc-800 hover:bg-zinc-900/60"
                    }`}
                  >
                    <KindIcon kind={kind} />
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${active ? "text-zinc-50" : "text-zinc-200"}`}>
                        {CREATE_ITEM_LABELS[kind]}
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

        <section className="min-h-0 overflow-y-auto border-b border-zinc-800/80 px-4 py-4 lg:border-b-0 lg:border-r lg:px-6">
          {flow.mode === "create" ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-wide text-zinc-100">
                    {CREATE_ITEM_LABELS[flow.itemKind]}
                  </h2>
                  <p className="text-sm text-zinc-500">{CREATE_ITEM_HINTS[flow.itemKind]}</p>
                </div>
                {flow.lockItemKind ? (
                  <select
                    className={`${inputClass} w-auto py-2 text-sm lg:hidden`}
                    value={flow.itemKind}
                    onChange={(event) => flow.setItemKind(event.target.value as CreateItemKind)}
                  >
                    {CREATE_ITEM_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {CREATE_ITEM_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                ) : null}
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
                      className={`${textareaClass} min-h-[180px] rounded-t-none`}
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
                    <summary className="cursor-pointer text-sm font-medium text-zinc-400">Attachments (0)</summary>
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
                      className={`${textareaClass} mt-1.5 min-h-[140px]`}
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

              <div className="mt-6 flex flex-wrap gap-3 border-t border-zinc-800/80 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById("argus-link-panel")?.scrollIntoView({ behavior: "smooth" })}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 lg:hidden"
                >
                  Next: Link &amp; Connect →
                </button>
              </div>
            </>
          ) : (
            <div className="py-8">
              <h2 className="text-xl font-bold text-zinc-100">Link &amp; Connect</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
                Select people, organizations, projects, events, topics, documents, or journal evidence. Create
                anything missing in the panel below — it links automatically.
              </p>
            </div>
          )}
        </section>

        <aside id="argus-link-panel" className="flex min-h-[320px] min-w-0 flex-col bg-zinc-950/40 lg:min-h-0">
          <div className="border-b border-zinc-800/80 px-4 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-200">Link &amp; Connect</h2>
            <input
              className={`${inputClass} mt-3 py-2.5 text-sm`}
              placeholder="Search anything in ARGUS…"
              value={flow.linkQuery}
              onChange={(event) => flow.setLinkQuery(event.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-1">
              {LINK_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => flow.setLinkTab(tab)}
                  title={LINK_FILTER_LABELS[tab]}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium ${
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
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Recent &amp; suggested</p>
            {flow.linkTab === "journal" ? (
              flow.filteredJournalRows.length === 0 ? (
                <p className="py-8 text-center text-xs text-zinc-600">No journal entries yet.</p>
              ) : (
                flow.filteredJournalRows.map((row) => (
                  <JournalLinkCard
                    key={row.id}
                    row={row}
                    checked={flow.draftLogIds.includes(row.id)}
                    onToggle={() => flow.toggleLog(row.id)}
                  />
                ))
              )
            ) : flow.filteredEntities.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-600">No matches — create missing below.</p>
            ) : (
              flow.filteredEntities.map((entity) => (
                <LinkEntityCard
                  key={entity.id}
                  entity={entity}
                  allEntities={flow.allEntities}
                  checked={flow.draftEntityIds.includes(entity.id)}
                  onToggle={() => flow.toggleEntity(entity.id)}
                />
              ))
            )}
          </div>

          {flow.draftEntityIds.length > 0 ? (
            <div className="flex flex-wrap gap-1 border-t border-zinc-800/80 px-4 py-2">
              {flow.draftEntityIds.slice(0, 8).map((id) => {
                const entity = flow.allEntities.find((entry) => entry.id === id);
                if (!entity) return null;
                const kind = entityLinkFilterKind(entity);
                return (
                  <span
                    key={id}
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400"
                  >
                    {TAB_ICONS[kind ?? "all"]} {entity.name.slice(0, 12)}
                  </span>
                );
              })}
            </div>
          ) : null}

          <div className="border-t border-zinc-800/80 px-4 py-3">
            <button
              type="button"
              onClick={() => flow.setMissingOpen((value) => !value)}
              className="w-full rounded-xl border border-dashed border-violet-700/50 bg-violet-950/20 px-3 py-2.5 text-left text-xs font-medium text-violet-300 hover:bg-violet-950/40"
            >
              + Create missing item
              <span className="mt-0.5 block text-[10px] font-normal text-zinc-500">
                Can&apos;t find it? Create it and link automatically.
              </span>
            </button>
          </div>
        </aside>
      </div>

      {flow.missingOpen ? (
        <section className="shrink-0 border-t border-zinc-800/80 bg-zinc-950/80">
          <div className="mx-auto max-w-[1400px] px-4 py-4 lg:px-6">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Create missing item (if needed)
            </h3>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
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
                    <input
                      className={`${inputClass} mb-3 py-2 text-sm`}
                      placeholder={kind === "event" ? fields[1] : fields[2]}
                      type={kind === "event" && fields[1] === "Date" ? "date" : "text"}
                      value={kind === "event" ? draft.extra : draft.extra}
                      onChange={(event) => flow.updateMissingDraft(kind, { extra: event.target.value })}
                    />
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
              {flow.flash ? (
                <div className="flex min-w-[180px] shrink-0 items-center rounded-2xl border border-violet-500/40 bg-violet-500/10 p-4">
                  <div>
                    <p className="text-sm font-semibold text-violet-200">Created and linked</p>
                    <p className="mt-1 text-xs text-zinc-500">New item is linked to your entry.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="shrink-0 border-t border-zinc-800/80 bg-zinc-950">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-4 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-600">
            <span>Link Everything</span>
            <span>·</span>
            <span>Auto-Create</span>
            <span>·</span>
            <span>See the Big Picture</span>
            <span>·</span>
            <span>Built for Truth</span>
          </div>

          <div className="flex flex-wrap items-stretch gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Link summary</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-600">People</dt>
                  <dd className="font-semibold text-zinc-300">{flow.linkCounts.person}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-600">Organizations</dt>
                  <dd className="font-semibold text-zinc-300">{flow.linkCounts.organization}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-600">Projects</dt>
                  <dd className="font-semibold text-zinc-300">{flow.linkCounts.project}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-600">Events</dt>
                  <dd className="font-semibold text-zinc-300">{flow.linkCounts.event}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-600">Topics</dt>
                  <dd className="font-semibold text-zinc-300">{flow.linkCounts.topic}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-600">Documents</dt>
                  <dd className="font-semibold text-zinc-300">{flow.linkCounts.document}</dd>
                </div>
                <div className="col-span-2 flex justify-between border-t border-zinc-800 pt-2">
                  <dt className="font-semibold text-zinc-400">Total links</dt>
                  <dd className="font-bold text-violet-300">{flow.totalLinks}</dd>
                </div>
              </dl>
            </div>

            <button
              type="button"
              onClick={flow.handleSave}
              disabled={flow.isPending || !flow.canSave()}
              className="self-stretch rounded-2xl bg-violet-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-violet-950/50 hover:bg-violet-500 disabled:opacity-40 sm:min-w-[220px]"
            >
              {flow.isPending ? "Saving…" : saveLabel}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
