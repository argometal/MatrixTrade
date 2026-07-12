"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { V2EntityCreateButton, V2EntityLinkButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { appendEventChronicleEntryAction } from "@/app/argus/actions";
import type { V2EventDetail, V2EventInboxOption } from "@/lib/argus/v2/event-browse-utils";
import { V2AttachmentComposer } from "@/app/argus/v2/components/V2AttachmentComposer";
import { V2EventLinkEmailModal } from "./V2EventLinkEmailModal";
import { V2QuickDeliverButton } from "@/app/argus/v2/components/V2QuickDeliverModal";
import { V2EntityLifecycleActions } from "@/app/argus/v2/components/V2EntityLifecycleActions";
import { V2PrivateEvidenceGate } from "@/app/argus/v2/components/V2PrivateEvidenceGate";
import type { V2DeleteGateProps } from "@/lib/argus/v2/delete-gate-props";
import { V2TagPatternBadges } from "@/app/argus/v2/components/V2TagPatternBadges";
import { V2RecordRecentEntity } from "@/app/argus/v2/components/V2RecordRecentEntity";

type PanelTab = "note" | "chronicle" | "metrics";
type ChronicleFilter = "all" | "photo" | "file" | "email" | "journal";

function EvidenceIcon({ kind }: { kind: V2EventDetail["evidence"][0]["kind"] }) {
  if (kind === "email") return <>✉</>;
  if (kind === "photo") return <>📷</>;
  if (kind === "file") return <>📎</>;
  return <>📓</>;
}

function MetricPill({ icon, label, count }: { icon: string; label: string; count: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-zinc-900/50 px-2 py-2 ring-1 ring-zinc-800/70">
      <span className="text-[11px] leading-none" aria-hidden>
        {icon}
      </span>
      <span className="mt-1 text-[11px] font-semibold tabular-nums leading-none text-violet-300/90">
        {count}
      </span>
      <span className="mt-1 text-[8px] uppercase tracking-wide text-zinc-600">{label}</span>
    </div>
  );
}

function normalizeEventTag(value: string): string {
  return value.trim();
}

function tagsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((tag, index) => tag === b[index]);
}

export function V2EventDetailPanel({
  selected,
  inboxOptions,
  returnTo,
  privateConfigured = false,
  privateUnlocked = false,
  ...deleteGate
}: {
  selected: V2EventDetail;
  inboxOptions: V2EventInboxOption[];
  returnTo: string;
  privateConfigured?: boolean;
  privateUnlocked?: boolean;
} & V2DeleteGateProps) {
  const router = useRouter();
  const [panelTab, setPanelTab] = useState<PanelTab>("note");
  const [tags, setTags] = useState<string[]>(selected.linkedTags);
  const [tagDraft, setTagDraft] = useState("");
  const [composer, setComposer] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [chronicleFilter, setChronicleFilter] = useState<ChronicleFilter>("all");
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const privateLocked = selected.hasPrivateEvidence && !privateUnlocked;

  function addTag() {
    const next = normalizeEventTag(tagDraft);
    if (!next || tags.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      setTagDraft("");
      return;
    }
    setTags((current) => [...current, next]);
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((value) => value !== tag));
  }

  const tagsDirty = !tagsEqual(tags, selected.linkedTags);
  const canSave = composer.trim().length > 0 || tagsDirty || pendingFiles.length > 0;

  useEffect(() => {
    setTags(selected.linkedTags);
    setComposer("");
    setPendingFiles([]);
    setTagDraft("");
    setSaveNote(null);
  }, [selected.id, selected.linkedTags.join("|")]);

  async function saveEntry() {
    if (!canSave) return;
    setSaving(true);
    setSaveNote(null);
    try {
      const formData = new FormData();
      formData.set("eventId", selected.id);
      formData.set("body", composer);
      formData.set("linkedTags", tags.join(", "));
      for (const file of pendingFiles) {
        formData.append("attachments", file);
      }
      const result = await appendEventChronicleEntryAction(formData);
      setComposer("");
      setPendingFiles([]);
      setSaveNote(result.appended ? "Added to chronicle" : "Tags saved");
      if (result.appended) setPanelTab("chronicle");
      router.refresh();
    } catch {
      setSaveNote("Save failed");
    } finally {
      setSaving(false);
    }
  }

  const filteredEvidence = selected.evidence.filter((item) => {
    if (chronicleFilter === "all") return true;
    if (chronicleFilter === "photo") return item.kind === "photo";
    if (chronicleFilter === "file") return item.kind === "file";
    if (chronicleFilter === "email") return item.kind === "email";
    return item.kind === "journal";
  });

  const chronicleFilters: { id: ChronicleFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "journal", label: "Notes" },
    { id: "email", label: "Emails" },
    { id: "photo", label: "Photos" },
    { id: "file", label: "Files" },
  ];

  const tabs: { id: PanelTab; label: string }[] = [
    { id: "note", label: "Note" },
    { id: "chronicle", label: "Chronicle" },
    { id: "metrics", label: "Metrics" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <V2RecordRecentEntity
        id={selected.id}
        kind="event"
        label={selected.name}
        href={`/argus/v2/browse/events?selected=${selected.id}`}
      />
      <div className="shrink-0 border-b border-zinc-800/80 p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-zinc-50">{selected.name}</h2>
            <p className="mt-1 text-sm text-zinc-400">{selected.dateTimeLabel}</p>
            {selected.linkedTags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.linkedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-200 ring-1 ring-amber-500/25"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="mt-1.5 text-[11px] text-zinc-600">{selected.description}</p>
          </div>
          {selected.tagPatterns.length > 0 ? (
            <V2TagPatternBadges patterns={selected.tagPatterns} className="mt-3" />
          ) : null}
          <div className="flex shrink-0 flex-wrap gap-2">
            <V2QuickDeliverButton scopeType="event" scopeId={selected.id} scopeName={selected.name} />
            <V2EntityLifecycleActions
              entityId={selected.id}
              entityName={selected.name}
              entityKind="event"
              lifecycleStatus={selected.lifecycleStatus}
              returnTo={returnTo}
              hasPrivateEvidence={selected.hasPrivateEvidence}
              privateConfigured={privateConfigured}
              privateUnlocked={privateUnlocked}
              showDelete
              variant="menu"
              {...deleteGate}
            />
            <button
              type="button"
              onClick={() => setEmailOpen(true)}
              className="rounded-lg border border-sky-500/40 bg-sky-600/15 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-600/25"
            >
              Link email
            </button>
            <V2EntityLinkButton
              entityId={selected.id}
              linkedIds={selected.linkedEntityIds}
              className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/25"
            />
            <V2EntityCreateButton className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800" />
          </div>
        </div>

        {selected.meetingUrl ? (
          <a
            href={selected.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="mb-3 inline-flex rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-300 hover:bg-sky-500/15"
          >
            Meeting link ↗
          </a>
        ) : null}

        {selected.projectName && selected.projectHref ? (
          <Link href={selected.projectHref} className="mb-3 block text-sm text-violet-400 hover:text-violet-300">
            📁 {selected.projectName}
          </Link>
        ) : null}

        <div className="flex gap-1 border-b border-zinc-800/80">
          {tabs.map((t) => (
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

      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto p-5">
        <V2PrivateEvidenceGate locked={privateLocked} privateConfigured={privateConfigured} returnTo={returnTo}>
          {panelTab === "note" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-zinc-300">Add to chronicle</p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">
                    Write and save — entry moves to Chronicle. Composer clears for the next note. Append-only.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving || !canSave}
                    onClick={() => void saveEntry()}
                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  {saveNote ? <span className="text-xs text-zinc-500">{saveNote}</span> : null}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-400">Signal tags</p>
                <p className="mt-0.5 text-[11px] text-zinc-600">GAP, CONCERN, follow-up — repeats surface across events.</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-amber-400/70 hover:text-amber-100"
                        aria-label={`Remove tag ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {tags.length === 0 ? <p className="text-xs text-zinc-600">No tags yet.</p> : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="GAP, CONCERN, decision…"
                    className="min-w-[10rem] flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    disabled={!tagDraft.trim()}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                  >
                    Add tag
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/5">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  rows={12}
                  placeholder="What happened, who was involved, decisions, open items…"
                  className="w-full resize-y rounded-xl border-0 bg-transparent px-5 py-4 text-[15px] leading-[1.7] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
                />
              </div>

              <V2AttachmentComposer files={pendingFiles} onChange={setPendingFiles} enablePaste />
            </div>
          ) : null}

          {panelTab === "chronicle" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-zinc-500">
                  Chronicle — notes, emails, photos, and files in chronological order.
                </p>
                <div className="flex flex-wrap gap-1">
                  {chronicleFilters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setChronicleFilter(filter.id)}
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        chronicleFilter === filter.id
                          ? "bg-violet-500/15 text-violet-300"
                          : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
              {filteredEvidence.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  {selected.evidence.length === 0
                    ? "No entries yet. Write a note, attach files, or link an email."
                    : "No items match this filter."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredEvidence.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        target={item.kind === "photo" ? "_blank" : undefined}
                        className="flex items-start gap-3 rounded-xl border border-zinc-800/80 px-3 py-3 transition hover:border-zinc-700"
                      >
                        <span className="mt-0.5 text-sm text-zinc-500">
                          <EvidenceIcon kind={item.kind} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-zinc-100">{item.title}</span>
                          <span className="block text-xs text-zinc-500">{item.meta}</span>
                        </span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-600">
                          {item.kind}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {panelTab === "metrics" ? (
            <div className="space-y-5">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">Linked entities</h3>
                <div className="inline-grid w-[14rem] grid-cols-4 gap-1.5">
                  <MetricPill icon="🏢" label="Orgs" count={selected.orgCount} />
                  <MetricPill icon="📁" label="Proj" count={selected.projectCount} />
                  <MetricPill icon="👤" label="People" count={selected.peopleCount} />
                  <MetricPill icon="🏷" label="Topics" count={selected.topicCount} />
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Attendees ({selected.attendeeCount})
                </h3>
                {selected.attendeeNames.length === 0 ? (
                  <p className="text-sm text-zinc-500">No people linked — link contacts to establish who was present.</p>
                ) : (
                  <ul className="space-y-1 text-sm text-zinc-400">
                    {selected.attendeeNames.map((name) => (
                      <li key={name} className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-zinc-600" aria-hidden />
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">Evidence counts</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2">
                    <dt className="text-xs text-zinc-600">Emails</dt>
                    <dd className="font-semibold tabular-nums text-zinc-200">{selected.relatedEmails.length}</dd>
                  </div>
                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2">
                    <dt className="text-xs text-zinc-600">Notes</dt>
                    <dd className="font-semibold tabular-nums text-zinc-200">{selected.chronicleCount}</dd>
                  </div>
                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2">
                    <dt className="text-xs text-zinc-600">Photos</dt>
                    <dd className="font-semibold tabular-nums text-zinc-200">
                      {selected.evidence.filter((e) => e.kind === "photo").length}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : null}
        </V2PrivateEvidenceGate>
      </div>

      <V2EventLinkEmailModal
        open={emailOpen}
        eventId={selected.id}
        options={inboxOptions}
        onClose={() => setEmailOpen(false)}
        onLinked={() => router.refresh()}
      />
    </div>
  );
}
