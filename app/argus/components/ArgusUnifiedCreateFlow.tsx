"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Entity } from "@/lib/argus/types";
import {
  createMissingLinkTargetAction,
  saveUnifiedCreateFlowAction,
} from "@/app/argus/actions";
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
  type UnifiedCreatePayload,
  type UnifiedCreateResult,
} from "@/lib/argus/create-flow-types";
import {
  entityLinkFilterKind,
  filterEntitiesForLinkTab,
} from "@/lib/argus/create-flow-helpers";
import { filterEntityPickerBuckets } from "@/lib/argus/link-hierarchy";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import { entityKindLabel, entityNotesForDisplay, type ReferenceKind } from "@/lib/argus/reference-types";

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

const ITEM_ICONS: Record<CreateItemKind, { glyph: string; boxClass: string }> = {
  journal: { glyph: "▤", boxClass: "bg-violet-500/20 text-violet-300" },
  person: { glyph: "👤", boxClass: "bg-emerald-500/20 text-emerald-300" },
  organization: { glyph: "🏢", boxClass: "bg-sky-500/20 text-sky-300" },
  project: { glyph: "📁", boxClass: "bg-amber-500/20 text-amber-300" },
  event: { glyph: "📅", boxClass: "bg-rose-500/20 text-rose-300" },
  topic: { glyph: "🏷", boxClass: "bg-yellow-500/20 text-yellow-200" },
  document: { glyph: "📄", boxClass: "bg-zinc-500/20 text-zinc-300" },
};

const MISSING_KINDS: Array<ReferenceKind | "document"> = [
  "person",
  "organization",
  "project",
  "event",
  "topic",
  "document",
];

function postCreateHref(pathname: string, kind: CreateItemKind, id: string, fallback: string): string {
  if (kind === "journal") return `/argus/logs/${id}`;
  if (!pathname.startsWith("/argus/v2")) return fallback;
  switch (kind) {
    case "organization":
      return `/argus/v2/organizations/${id}`;
    case "project":
      return `/argus/v2/projects/${id}`;
    case "topic":
      return `/argus/v2/browse/topics?selected=${id}`;
    case "event":
      return `/argus/v2/browse/events?selected=${id}`;
    default:
      return `/argus/network/${id}`;
  }
}

function defaultLogDateTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function EntityLinkRow({
  entity,
  checked,
  onToggle,
}: {
  entity: Entity;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_5rem] items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-800/60">
      <input type="checkbox" checked={checked} onChange={onToggle} className="shrink-0" />
      <span className="truncate text-sm text-zinc-200">{entity.name}</span>
      <span className="truncate text-right text-[11px] text-zinc-500">{entityKindLabel(entity)}</span>
    </label>
  );
}

function JournalLinkRow({
  row,
  checked,
  onToggle,
}: {
  row: JournalLinkRow;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-lg px-2 py-2 hover:bg-zinc-800/60">
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-sm text-zinc-200">{row.title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
          {row.date} · {row.kind}
        </span>
      </span>
    </label>
  );
}

function countLinks(
  entities: Entity[],
  entityIds: string[],
  logIds: string[]
): Record<string, number> {
  const counts = {
    person: 0,
    organization: 0,
    project: 0,
    event: 0,
    topic: 0,
    document: 0,
    journal: logIds.length,
  };
  for (const id of entityIds) {
    const entity = entities.find((entry) => entry.id === id);
    if (!entity) continue;
    const kind = entityLinkFilterKind(entity);
    if (kind && kind !== "all" && kind !== "journal") counts[kind] += 1;
  }
  return counts;
}

export function ArgusUnifiedCreateFlow({
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
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const mode = options.mode ?? "create";
  const lockItemKind = options.lockItemKind ?? false;
  const [itemKind, setItemKind] = useState<CreateItemKind>(options.itemKind ?? "journal");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState(defaultLogDateTime());
  const [tags, setTags] = useState("");
  const [entryType, setEntryType] = useState<"log" | "note">("log");
  const [linkTab, setLinkTab] = useState<LinkFilterKind>("all");
  const [linkQuery, setLinkQuery] = useState("");
  const [draftEntityIds, setDraftEntityIds] = useState<string[]>(options.linkedEntityIds ?? []);
  const [draftLogIds, setDraftLogIds] = useState<string[]>(options.linkedLogIds ?? []);
  const [missingOpen, setMissingOpen] = useState(false);
  const [missingDrafts, setMissingDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const filteredBuckets = useMemo(
    () => filterEntityPickerBuckets(buckets, "create"),
    [buckets]
  );

  const allEntities = filteredBuckets.alphabetical;

  useEffect(() => {
    if (!open) return;
    setItemKind(options.itemKind ?? "journal");
    setName("");
    setTitle("");
    setBody("");
    setNotes("");
    setEventDate(defaultLogDateTime());
    setTags("");
    setEntryType(options.entryType ?? "log");
    setLinkTab("all");
    setLinkQuery("");
    setDraftEntityIds(options.linkedEntityIds ?? []);
    setDraftLogIds(options.linkedLogIds ?? []);
    setMissingOpen(false);
    setMissingDrafts({});
    setError(null);
    setFlash(null);
  }, [open, options]);

  const filteredEntities = useMemo(() => {
    const withoutSelf =
      mode === "link" && options.entityId
        ? allEntities.filter((entity) => entity.id !== options.entityId)
        : allEntities;
    const byTab = filterEntitiesForLinkTab(withoutSelf, linkTab);
    const q = linkQuery.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter(
      (entity) =>
        entity.name.toLowerCase().includes(q) ||
        entity.notes.toLowerCase().includes(q) ||
        entityKindLabel(entity).toLowerCase().includes(q)
    );
  }, [allEntities, linkQuery, linkTab, mode, options.entityId]);

  const filteredJournalRows = useMemo(() => {
    const q = linkQuery.trim().toLowerCase();
    if (!q) return journalRows;
    return journalRows.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        row.preview.toLowerCase().includes(q) ||
        row.kind.toLowerCase().includes(q)
    );
  }, [journalRows, linkQuery]);

  const linkCounts = useMemo(
    () => countLinks(allEntities, draftEntityIds, draftLogIds),
    [allEntities, draftEntityIds, draftLogIds]
  );

  const totalLinks =
    draftEntityIds.length +
    draftLogIds.length;

  if (!open) return null;

  function toggleEntity(id: string) {
    setDraftEntityIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  function toggleLog(id: string) {
    setDraftLogIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  function canSave(): boolean {
    if (mode === "link") return true;
    if (itemKind === "journal") return body.trim().length > 0;
    return name.trim().length > 0;
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const payload: UnifiedCreatePayload = {
          mode,
          itemKind,
          name: name.trim(),
          title: title.trim(),
          body: body.trim(),
          notes: entityNotesForDisplay(notes),
          eventDate,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          entryType,
          linkedEntityIds: draftEntityIds,
          linkedLogIds: draftLogIds,
          entityId: options.entityId,
        };

        const result = await saveUnifiedCreateFlowAction(payload);
        onSaved?.(result);
        onClose();

        if (mode === "create" && !onSaved) {
          router.push(postCreateHref(pathname, itemKind, result.id, result.href));
        }
        router.refresh();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  function handleMissingCreate(kind: ReferenceKind | "document") {
    const draftName = (missingDrafts[kind] ?? "").trim();
    if (!draftName) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await createMissingLinkTargetAction(
          kind,
          draftName,
          "",
          kind === "event" ? { startDate: new Date().toISOString().slice(0, 10) } : undefined
        );
        setDraftEntityIds((current) =>
          current.includes(created.id) ? current : [...current, created.id]
        );
        setMissingDrafts((current) => ({ ...current, [kind]: "" }));
        setFlash(`Created and linked: ${created.name}`);
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  const saveLabel =
    mode === "link"
      ? "Save links"
      : itemKind === "journal"
        ? "Create & Save Entry"
        : `Create ${CREATE_ITEM_LABELS[itemKind]}`;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <div
        className="flex max-h-[min(94vh,900px)] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Create and link"
      >
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 sm:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-400">
              Create &amp; Link Anything
            </p>
            <h2 className="text-lg font-semibold text-zinc-100">
              {mode === "link" ? "Link & Connect" : CREATE_ITEM_LABELS[itemKind]}
            </h2>
          </div>
          <ol className="flex flex-wrap items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            <li className={mode === "create" ? "text-violet-300" : ""}>1 Create</li>
            <li aria-hidden>→</li>
            <li className={totalLinks > 0 ? "text-violet-300" : ""}>2 Link</li>
            <li aria-hidden>→</li>
            <li className={missingOpen ? "text-violet-300" : ""}>3 Missing</li>
            <li aria-hidden>→</li>
            <li className={canSave() ? "text-violet-300" : ""}>4 Save</li>
          </ol>
        </header>

        {error ? <p className="shrink-0 px-5 pt-3 text-sm text-amber-400">{error}</p> : null}
        {flash ? <p className="shrink-0 px-5 pt-2 text-sm text-emerald-400">{flash}</p> : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[11rem_minmax(0,1fr)_18rem]">
          {mode === "create" && !lockItemKind ? (
            <aside className="hidden border-b border-zinc-800 lg:block lg:border-b-0 lg:border-r">
              <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Create
              </p>
              <nav className="space-y-0.5 px-2 pb-3">
                {CREATE_ITEM_KINDS.map((kind) => {
                  const icon = ITEM_ICONS[kind];
                  const active = itemKind === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setItemKind(kind)}
                      className={`flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left transition ${
                        active ? "bg-violet-500/10 ring-1 ring-violet-500/30" : "hover:bg-zinc-900"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${icon.boxClass}`}
                      >
                        {icon.glyph}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-zinc-100">
                          {CREATE_ITEM_LABELS[kind]}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                          {CREATE_ITEM_HINTS[kind]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>
          ) : null}

          <section className="min-h-0 overflow-y-auto border-b border-zinc-800 px-4 py-4 lg:border-b-0 lg:border-r">
            {mode === "create" ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-500">{CREATE_ITEM_HINTS[itemKind]}</p>

                {lockItemKind ? (
                  <label className="block lg:hidden">
                    <span className="text-xs font-medium text-zinc-500">Type</span>
                    <select
                      className={`${inputClass} mt-1`}
                      value={itemKind}
                      onChange={(event) => setItemKind(event.target.value as CreateItemKind)}
                    >
                      {CREATE_ITEM_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {CREATE_ITEM_LABELS[kind]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {itemKind === "journal" ? (
                  <>
                    <label className="block">
                      <span className="text-xs font-medium text-zinc-500">Title (optional)</span>
                      <input
                        className={`${inputClass} mt-1`}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        autoFocus
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-zinc-500">Content</span>
                      <textarea
                        className={`${textareaClass} mt-1 min-h-[160px]`}
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-500">Date</span>
                        <input
                          type="datetime-local"
                          className={`${inputClass} mt-1`}
                          value={eventDate}
                          onChange={(event) => setEventDate(event.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-500">Entry type</span>
                        <select
                          className={`${inputClass} mt-1`}
                          value={entryType}
                          onChange={(event) => setEntryType(event.target.value as "log" | "note")}
                        >
                          <option value="log">Log</option>
                          <option value="note">Note</option>
                        </select>
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-xs font-medium text-zinc-500">Tags (comma-separated)</span>
                      <input
                        className={`${inputClass} mt-1`}
                        value={tags}
                        onChange={(event) => setTags(event.target.value)}
                        placeholder="rigmove, operations"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="block">
                      <span className="text-xs font-medium text-zinc-500">Name</span>
                      <input
                        className={`${inputClass} mt-1`}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        autoFocus
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-zinc-500">
                        {itemKind === "document" ? "Description" : "Notes (optional)"}
                      </span>
                      <textarea
                        className={`${textareaClass} mt-1 min-h-[100px]`}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                      />
                    </label>
                    {itemKind === "event" ? (
                      <label className="block">
                        <span className="text-xs font-medium text-zinc-500">Event date</span>
                        <input
                          type="date"
                          className={`${inputClass} mt-1`}
                          value={eventDate.slice(0, 10)}
                          onChange={(event) => setEventDate(event.target.value)}
                        />
                      </label>
                    ) : null}
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">
                Select people, organizations, projects, events, topics, documents, or journal entries to
                connect. Create anything missing inline below.
              </p>
            )}
          </section>

          <aside className="flex min-h-[240px] min-w-0 flex-col lg:min-h-0">
            <div className="border-b border-zinc-800 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Link &amp; Connect
              </p>
              <input
                className={`${inputClass} mt-2 py-2 text-sm`}
                placeholder="Search anything in ARGUS…"
                value={linkQuery}
                onChange={(event) => setLinkQuery(event.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {LINK_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setLinkTab(tab)}
                    className={`rounded-md px-2 py-1 text-[10px] font-medium ${
                      linkTab === tab ? "bg-violet-500/15 text-violet-300" : "text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    {LINK_FILTER_LABELS[tab]}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {linkTab === "journal" ? (
                filteredJournalRows.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-zinc-500">No journal entries.</p>
                ) : (
                  filteredJournalRows.map((row) => (
                    <JournalLinkRow
                      key={row.id}
                      row={row}
                      checked={draftLogIds.includes(row.id)}
                      onToggle={() => toggleLog(row.id)}
                    />
                  ))
                )
              ) : filteredEntities.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-zinc-500">No matches.</p>
              ) : (
                filteredEntities.map((entity) => (
                  <EntityLinkRow
                    key={entity.id}
                    entity={entity}
                    checked={draftEntityIds.includes(entity.id)}
                    onToggle={() => toggleEntity(entity.id)}
                  />
                ))
              )}
            </div>

            <div className="border-t border-zinc-800 px-3 py-2">
              <button
                type="button"
                onClick={() => setMissingOpen((value) => !value)}
                className="w-full rounded-lg border border-dashed border-violet-800/50 px-3 py-2 text-left text-xs text-violet-300 hover:bg-violet-950/20"
              >
                + Create missing item
                <span className="mt-0.5 block text-[10px] text-zinc-500">
                  Can&apos;t find it? Create it and link automatically.
                </span>
              </button>
            </div>
          </aside>
        </div>

        {missingOpen ? (
          <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/40 px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Create missing &amp; auto-link
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {MISSING_KINDS.map((kind) => (
                <div
                  key={kind}
                  className="min-w-[180px] shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
                >
                  <p className="mb-2 text-xs font-medium text-zinc-300">
                    {kind === "document" ? "Document" : CREATE_ITEM_LABELS[kind]}
                  </p>
                  <input
                    className={`${inputClass} py-2 text-sm`}
                    placeholder="Name"
                    value={missingDrafts[kind] ?? ""}
                    onChange={(event) =>
                      setMissingDrafts((current) => ({ ...current, [kind]: event.target.value }))
                    }
                  />
                  <button
                    type="button"
                    disabled={isPending || !(missingDrafts[kind] ?? "").trim()}
                    onClick={() => handleMissingCreate(kind)}
                    className="mt-2 w-full rounded-lg bg-zinc-800 px-2 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
                  >
                    Create &amp; link
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
            <span>People {linkCounts.person}</span>
            <span>Orgs {linkCounts.organization}</span>
            <span>Projects {linkCounts.project}</span>
            <span>Events {linkCounts.event}</span>
            <span>Topics {linkCounts.topic}</span>
            <span>Docs {linkCounts.document}</span>
            <span>Journal {linkCounts.journal}</span>
            <span className="text-zinc-400">· Total {totalLinks}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !canSave()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
            >
              {isPending ? "Saving…" : saveLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
