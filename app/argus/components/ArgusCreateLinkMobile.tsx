"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Entity } from "@/lib/argus/types";
import { inputClass, textareaClass } from "@/app/argus/components/ui";
import {
  CREATE_ITEM_HINTS,
  CREATE_MENU_SECTIONS,
  LINK_FILTER_LABELS,
  type CreateFlowOpenOptions,
  type CreateItemKind,
  type JournalLinkRow,
  type UnifiedCreateResult,
} from "@/lib/argus/create-flow-types";
import { entityLinkFilterKind } from "@/lib/argus/create-flow-helpers";
import { useCreateLinkFlowState, flowNeedsItemKindPicker } from "@/lib/argus/create-link-flow-state";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import { useOverlayLock } from "@/lib/argus/use-overlay-lock";
import {
  KindIcon,
  LINK_TABS,
  LinkedEntityRow,
  LinkedJournalRow,
  InboxEvidenceBanner,
  MobileProgressBar,
  TAB_ICONS,
  createItemDisplayLabel,
} from "./create-link-shared";
import { ArgusCreateItemDrawer } from "@/app/argus/components/ArgusCreateItemDrawer";
import { ADD_CONTEXT } from "@/lib/argus/ux-copy";

type MobileStep =
  | "choose-type"
  | "details"
  | "link"
  | "missing"
  | "review-links"
  | "review-item"
  | "processing"
  | "success";

type FlowState = ReturnType<typeof useCreateLinkFlowState>;

function initialMobileStep(options: CreateFlowOpenOptions): MobileStep {
  if (options.mode === "link") return "link";
  if (options.mode === "inbox-evidence" && options.linkOnly) return "link";
  if (options.lockItemKind) return "details";
  if (flowNeedsItemKindPicker(options)) return "choose-type";
  return "details";
}

function MobileFooter({
  primaryLabel,
  onPrimary,
  onBack,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  onBack?: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <footer className="shrink-0 border-t border-zinc-800/80 bg-zinc-950 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-2xl border border-zinc-700 py-3.5 text-sm font-medium text-zinc-300"
          >
            Back
          </button>
        ) : null}
        {onSecondary ? (
          <button
            type="button"
            onClick={onSecondary}
            className="flex-1 rounded-2xl border border-zinc-700 py-3.5 text-sm font-medium text-zinc-300"
          >
            {secondaryLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled}
          className="flex-[2] rounded-2xl bg-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-950/40 disabled:opacity-40"
        >
          {primaryLabel}
        </button>
      </div>
    </footer>
  );
}

function ChooseTypeStep({
  flow,
  onSelect,
  onLinkOnly,
  onClose,
  entityCaptureOnly = false,
}: {
  flow: FlowState;
  onSelect: (kind: CreateItemKind) => void;
  onLinkOnly: () => void;
  onClose: () => void;
  entityCaptureOnly?: boolean;
}) {
  const menuSections = entityCaptureOnly
    ? CREATE_MENU_SECTIONS.filter((section) => section.id !== "knowledge")
    : CREATE_MENU_SECTIONS;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
            {flow.isInboxEvidence ? "Email evidence" : entityCaptureOnly ? ADD_CONTEXT.title : "Capture"}
          </p>
          <h2 className="text-lg font-bold text-zinc-50">
            {flow.isInboxEvidence
              ? "Capture or link this email"
              : entityCaptureOnly
                ? ADD_CONTEXT.pickKind
                : "What do you want to capture?"}
          </h2>
          {entityCaptureOnly && !flow.isInboxEvidence ? (
            <p className="mt-0.5 text-xs text-zinc-500">{ADD_CONTEXT.useRegisterHint}</p>
          ) : null}
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800">
          ✕
        </button>
      </header>
      {flow.isInboxEvidence ? (
        <InboxEvidenceBanner title={flow.title} preview={flow.body.slice(0, 120)} />
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <nav className="space-y-2">
          {flow.isInboxEvidence ? (
            <button
              type="button"
              onClick={() => {
                flow.setLinkOnly(true);
                onLinkOnly();
              }}
              className="flex w-full items-center gap-4 rounded-2xl border border-violet-500/30 bg-violet-950/20 px-4 py-4 text-left active:bg-violet-950/40"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-xl">✉</span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-zinc-100">Link only</span>
                <span className="mt-0.5 block text-sm text-zinc-500">
                  Assign email to existing records — no new journal
                </span>
              </span>
              <span className="text-zinc-600">›</span>
            </button>
          ) : null}
          {menuSections.map((section) => (
            <div key={section.id} className="mb-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{section.label}</p>
              <div className="space-y-2">
                {section.kinds.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      flow.setLinkOnly(false);
                      flow.chooseItemKind(kind);
                      onSelect(kind);
                    }}
                    className="flex w-full items-center gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-4 text-left active:bg-zinc-900"
                  >
                    <KindIcon kind={kind} className="!h-11 !w-11" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold text-zinc-100">
                        {createItemDisplayLabel(kind)}
                      </span>
                      <span className="mt-0.5 block text-sm text-zinc-500">{CREATE_ITEM_HINTS[kind]}</span>
                    </span>
                    <span className="text-zinc-600">›</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}

function DetailsStep({
  flow,
  onNext,
  onBack,
  onOpenMenu,
}: {
  flow: FlowState;
  onNext: () => void;
  onBack: () => void;
  onOpenMenu: () => void;
}) {
  const canNext =
    flow.mode === "link"
      ? true
      : flow.isInboxEvidence && flow.linkOnly
        ? true
        : flow.itemKind === "journal"
          ? flow.body.trim().length > 0
          : flow.itemKind === "runbook"
            ? flow.name.trim().length > 0 && flow.body.trim().length > 0
            : flow.name.trim().length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MobileProgressBar step={1} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        <div className="mb-4 flex items-center gap-3">
          <KindIcon kind={flow.itemKind} />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold uppercase tracking-wide text-zinc-100">
              {createItemDisplayLabel(flow.itemKind)}
            </h2>
            <p className="text-xs text-zinc-500">Fill in the details</p>
          </div>
          <button
            type="button"
            onClick={onOpenMenu}
            className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[10px] font-medium text-zinc-400"
          >
            ☰ Type
          </button>
        </div>

        {flow.itemKind === "journal" ? (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Template</span>
              <select
                className={`${inputClass} mt-1.5`}
                value={flow.template}
                onChange={(e) => flow.setTemplate(e.target.value)}
              >
                <option value="standard">Standard Note</option>
                <option value="meeting">Meeting Notes</option>
                <option value="field">Field Log</option>
                <option value="followup">Follow-up</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Title (optional)</span>
              <input
                className={`${inputClass} mt-1.5`}
                value={flow.title}
                onChange={(e) => flow.setTitle(e.target.value)}
                placeholder="Rig Move – Noble Developer → Liza Unity"
              />
            </label>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Content</span>
              <div className="mt-1.5 flex gap-1 overflow-x-auto rounded-t-xl border border-b-0 border-zinc-700 bg-zinc-900/80 px-2 py-2">
                {["B", "I", "U", "•", "1.", "🔗"].map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    className="shrink-0 rounded-md px-2.5 py-1 text-xs text-zinc-500"
                  >
                    {tool}
                  </button>
                ))}
              </div>
              <textarea
                className={`${textareaClass} min-h-[160px] rounded-t-none`}
                value={flow.body}
                onChange={(e) => flow.setBody(e.target.value)}
                placeholder="Record what matters…"
              />
            </div>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Date</span>
              <input
                type="datetime-local"
                className={`${inputClass} mt-1.5`}
                value={flow.eventDate}
                onChange={(e) => flow.setEventDate(e.target.value)}
              />
            </label>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Tags (optional)</span>
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
                onChange={(e) => flow.setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    flow.addTag(flow.tagInput);
                  }
                }}
                placeholder="rigmove, operations, logistics"
              />
            </div>
          </div>
        ) : flow.itemKind === "runbook" ? (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Title</span>
              <input
                className={`${inputClass} mt-1.5`}
                value={flow.name}
                onChange={(e) => flow.setName(e.target.value)}
                placeholder="RIG RUN — Prejob"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Cards (one line = one card)
              </span>
              <textarea
                className={`${textareaClass} mt-1.5 min-h-[180px] font-mono text-sm`}
                value={flow.body}
                onChange={(e) => flow.setBody(e.target.value)}
                placeholder={"Confirm permits\nCheck equipment"}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</span>
              <input
                className={`${inputClass} mt-1.5`}
                value={flow.name}
                onChange={(e) => flow.setName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Notes</span>
              <textarea
                className={`${textareaClass} mt-1.5 min-h-[120px]`}
                value={flow.notes}
                onChange={(e) => flow.setNotes(e.target.value)}
              />
            </label>
          </div>
        )}
      </div>
      <MobileFooter primaryLabel="Next" onPrimary={onNext} onBack={onBack} primaryDisabled={!canNext} />
    </div>
  );
}

function LinkStep({
  flow,
  linkedEntities,
  linkedJournalRows,
  searchResults,
  suggestedRecent,
  onNext,
  onBack,
}: {
  flow: FlowState;
  linkedEntities: Entity[];
  linkedJournalRows: JournalLinkRow[];
  searchResults: Entity[];
  suggestedRecent: Entity[];
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MobileProgressBar step={2} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        <h2 className="text-base font-bold text-zinc-100">Add Context (Link)</h2>
        <p className="mt-1 text-xs text-zinc-500">Link this item to anything in ARGUS</p>

        <input
          className={`${inputClass} mt-4 py-3 text-sm`}
          placeholder="Search anything in ARGUS…"
          value={flow.linkQuery}
          onChange={(e) => flow.setLinkQuery(e.target.value)}
        />
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {LINK_TABS.filter((t) => t !== "journal").map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => flow.setLinkTab(tab)}
              className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium ${
                flow.linkTab === tab ? "bg-violet-500/20 text-violet-200" : "bg-zinc-900 text-zinc-600"
              }`}
            >
              {TAB_ICONS[tab]} {LINK_FILTER_LABELS[tab]}
            </button>
          ))}
        </div>

        {(linkedEntities.length > 0 || linkedJournalRows.length > 0) && (
          <div className="mt-4">
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
                  compact
                />
              ))}
              {linkedJournalRows.map((row) => (
                <LinkedJournalRow key={row.id} row={row} onRemove={() => flow.toggleLog(row.id)} compact />
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Add more links</p>
          {flow.linkQuery.trim() ? (
            <div className="space-y-2">
              {searchResults.length === 0 ? (
                <p className="py-4 text-center text-xs text-zinc-600">No matches — capture missing on next step.</p>
              ) : (
                searchResults.map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => flow.toggleEntity(entity.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-dashed border-zinc-800 px-3 py-3 text-left"
                  >
                    <KindIcon kind={(entityLinkFilterKind(entity) ?? "person") as CreateItemKind} className="!h-8 !w-8" />
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{entity.name}</span>
                    <span className="text-xs font-medium text-violet-400">+</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-zinc-600">Recent</p>
              {suggestedRecent.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => flow.toggleEntity(entity.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-3 text-left"
                >
                  <KindIcon kind={(entityLinkFilterKind(entity) ?? "person") as CreateItemKind} className="!h-8 !w-8" />
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{entity.name}</span>
                  <span className="text-xs font-medium text-violet-400">+</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <MobileFooter primaryLabel="Next" onPrimary={onNext} onBack={onBack} />
    </div>
  );
}

function MissingStep({
  flow,
  suggestedTopics,
  onNext,
  onBack,
}: {
  flow: FlowState;
  suggestedTopics: string[];
  onNext: () => void;
  onBack: () => void;
}) {
  const [topicCategory, setTopicCategory] = useState<Record<string, string>>({});

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MobileProgressBar step={3} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        <h2 className="text-base font-bold text-zinc-100">Capture missing (if needed)</h2>
        <p className="mt-1 text-xs text-zinc-500">These will be captured and linked automatically</p>

        <div className="mt-4 space-y-3">
          {suggestedTopics.map((topic) => (
            <div key={topic} className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4">
              <p className="text-xs text-zinc-500">Topic not found</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">&ldquo;{topic}&rdquo;</p>
              <label className="mt-3 block">
                <span className="text-[10px] font-semibold uppercase text-zinc-500">Category</span>
                <input
                  className={`${inputClass} mt-1 py-2 text-sm`}
                  placeholder="Operations, Knowledge…"
                  value={topicCategory[topic] ?? ""}
                  onChange={(e) => setTopicCategory((c) => ({ ...c, [topic]: e.target.value }))}
                />
              </label>
              <button
                type="button"
                disabled={flow.isPending}
                onClick={() => {
                  flow.updateMissingDraft("topic", {
                    name: topic,
                    detail: topicCategory[topic] ?? "",
                  });
                  flow.handleMissingCreate("topic");
                }}
                className="mt-3 w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white"
              >
                Capture &amp; Link Topic
              </button>
            </div>
          ))}
        </div>

        {suggestedTopics.length === 0 ? (
          <p className="mt-6 text-center text-sm text-zinc-600">All tags match existing topics. Continue to review.</p>
        ) : null}
      </div>
      <MobileFooter primaryLabel="Next" onPrimary={onNext} onBack={onBack} />
    </div>
  );
}

function ReviewLinksStep({
  flow,
  linkedEntities,
  linkedJournalRows,
  onNext,
  onEdit,
}: {
  flow: FlowState;
  linkedEntities: Entity[];
  linkedJournalRows: JournalLinkRow[];
  onNext: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MobileProgressBar step={4} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        <h2 className="text-base font-bold text-zinc-100">Review Links</h2>
        <p className="mt-1 text-xs text-zinc-500">Link summary before saving</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {(
            [
              ["person", "Person"],
              ["organization", "Organization"],
              ["project", "Project"],
              ["event", "Event"],
              ["topic", "Topic"],
              ["document", "Document"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-center">
              <p className="text-lg font-bold tabular-nums text-zinc-100">{flow.linkCounts[key]}</p>
              <p className="text-[10px] text-zinc-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">All links ({flow.totalLinks})</p>
          {linkedEntities.map((entity) => (
            <LinkedEntityRow
              key={entity.id}
              entity={entity}
              allEntities={flow.allEntities}
              onRemove={() => flow.toggleEntity(entity.id)}
              compact
            />
          ))}
          {linkedJournalRows.map((row) => (
            <LinkedJournalRow key={row.id} row={row} onRemove={() => flow.toggleLog(row.id)} compact />
          ))}
        </div>
      </div>
      <MobileFooter
        primaryLabel="Continue"
        onPrimary={onNext}
        secondaryLabel="Edit Links"
        onSecondary={onEdit}
      />
    </div>
  );
}

function ReviewItemStep({
  flow,
  itemTitle,
  itemBody,
  onSave,
  onBack,
}: {
  flow: FlowState;
  itemTitle: string;
  itemBody: string;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MobileProgressBar step={4} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        <h2 className="text-base font-bold text-zinc-100">Review Item</h2>
        <p className="mt-1 text-xs text-zinc-500">Final check before save</p>

        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-start gap-3">
            <KindIcon kind={flow.itemKind} />
            <div className="min-w-0">
              <p className="font-semibold text-zinc-100">{itemTitle}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{itemBody}</p>
              {flow.itemKind === "journal" && flow.tagList.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {flow.tagList.map((tag) => (
                    <span key={tag} className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-300">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="mt-3 text-xs text-zinc-600">{flow.eventDate.replace("T", " ")}</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-zinc-600">Attachments can be added after save from the item page.</p>
      </div>
      <MobileFooter
        primaryLabel="Save & Link ✓"
        onPrimary={onSave}
        onBack={onBack}
        primaryDisabled={!flow.canSave() || flow.isPending}
      />
    </div>
  );
}

function ProcessingStep({ flow, missingTopicCount }: { flow: FlowState; missingTopicCount: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 400);
    return () => window.clearInterval(id);
  }, []);

  const tasks = [
    { label: "Creating journal note", done: tick >= 1 },
    { label: `Linking to ${flow.totalLinks} items`, done: tick >= 2 },
    ...(missingTopicCount > 0
      ? [{ label: `Creating ${missingTopicCount} missing topics`, done: tick >= 3 }]
      : []),
    { label: "Building connections", done: tick >= (missingTopicCount > 0 ? 4 : 3) },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-zinc-800 border-t-violet-500" />
        <span className="text-2xl text-violet-400">◉</span>
      </div>
      <h2 className="mt-8 text-lg font-bold text-zinc-100">Saving &amp; linking…</h2>
      <ul className="mt-6 w-full max-w-xs space-y-3">
        {tasks.map((task) => (
          <li key={task.label} className="flex items-center gap-3 text-sm">
            <span className={task.done ? "text-emerald-400" : "text-zinc-600"}>{task.done ? "✓" : "○"}</span>
            <span className={task.done ? "text-zinc-300" : "text-zinc-600"}>{task.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuccessStep({
  result,
  onViewItem,
  onGoHome,
}: {
  result: UnifiedCreateResult;
  onViewItem: () => void;
  onGoHome: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-4xl text-emerald-400">
        ✓
      </div>
      <h2 className="mt-6 text-2xl font-bold text-zinc-50">All done!</h2>
      <p className="mt-2 text-center text-sm text-zinc-500">
        <span className="font-medium text-zinc-300">{result.name}</span> is saved and linked.
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={onViewItem}
          className="w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-bold text-white"
        >
          View Item
        </button>
        <button
          type="button"
          onClick={onGoHome}
          className="w-full rounded-2xl border border-zinc-700 py-3.5 text-sm font-medium text-zinc-300"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}

export function ArgusCreateLinkMobile({
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
  const flow = useCreateLinkFlowState({ open, options, buckets, journalRows, onClose, onSaved });
  const entityCaptureOnly = Boolean(options.entityCaptureOnly);
  const [step, setStep] = useState<MobileStep>("details");
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveResult, setSaveResult] = useState<UnifiedCreateResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useOverlayLock(open);

  useEffect(() => {
    if (open) {
      setStep(initialMobileStep(options));
      setMenuOpen(false);
    }
  }, [open, options]);

  const linkedEntities = useMemo(
    () =>
      flow.draftEntityIds
        .map((id) => flow.allEntities.find((e) => e.id === id))
        .filter((e): e is Entity => Boolean(e)),
    [flow.draftEntityIds, flow.allEntities]
  );

  const linkedJournalRows = useMemo(
    () =>
      flow.draftLogIds
        .map((id) => journalRows.find((r) => r.id === id))
        .filter((r): r is JournalLinkRow => Boolean(r)),
    [flow.draftLogIds, journalRows]
  );

  const searchResults = useMemo(() => {
    const linked = new Set(flow.draftEntityIds);
    return flow.filteredEntities.filter((e) => !linked.has(e.id)).slice(0, 10);
  }, [flow.filteredEntities, flow.draftEntityIds]);

  const suggestedRecent = useMemo(() => flow.allEntities.slice(0, 6), [flow.allEntities]);

  const suggestedTopics = useMemo(() => {
    const existing = new Set(
      flow.allEntities
        .filter((e) => entityLinkFilterKind(e) === "topic")
        .map((e) => e.name.toLowerCase())
    );
    return flow.tagList.filter((tag) => !existing.has(tag.toLowerCase()));
  }, [flow.tagList, flow.allEntities]);

  const orgOptions = useMemo(
    () => flow.allEntities.filter((entity) => entity.type === "company"),
    [flow.allEntities]
  );

  if (!open) return null;

  const itemTitle =
    flow.isInboxEvidence && flow.linkOnly
      ? flow.title.trim() || "Link email to records"
      : flow.itemKind === "journal"
        ? flow.title.trim() || "Untitled journal note"
        : flow.name.trim() || `New ${createItemDisplayLabel(flow.itemKind)}`;

  const itemBody =
    flow.isInboxEvidence && flow.linkOnly
      ? "Assign this email to people, organizations, projects, events, or topics."
      : flow.itemKind === "journal"
        ? flow.body.trim() || CREATE_ITEM_HINTS.journal
        : flow.notes.trim() || CREATE_ITEM_HINTS[flow.itemKind];

  async function runSave() {
    setSaveError(null);
    setStep("processing");
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const result = await flow.executeSave();
      setSaveResult(result);
      setStep("success");
    } catch (err) {
      const { layer, message } = formatArgusError(err);
      setSaveError(`${layer}: ${message}`);
      setStep("review-item");
    }
  }

  function goAfterLink() {
    setStep("review-links");
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#030308] lg:hidden" role="dialog" aria-modal="true" aria-label="Capture">
      {flow.error || saveError ? (
        <p className="shrink-0 bg-amber-950/50 px-4 py-2 text-center text-sm text-amber-300">
          {flow.error ?? saveError}
        </p>
      ) : null}

      {step === "choose-type" ? (
        <ChooseTypeStep
          flow={flow}
          onSelect={() => setStep("details")}
          onLinkOnly={() => setStep("link")}
          onClose={onClose}
          entityCaptureOnly={entityCaptureOnly}
        />
      ) : null}

      {step === "details" ? (
        <DetailsStep
          flow={flow}
          onNext={() => setStep("link")}
          onBack={onClose}
          onOpenMenu={() => setMenuOpen(true)}
        />
      ) : null}

      {step === "link" ? (
        <LinkStep
          flow={flow}
          linkedEntities={linkedEntities}
          linkedJournalRows={linkedJournalRows}
          searchResults={searchResults}
          suggestedRecent={suggestedRecent}
          onNext={goAfterLink}
          onBack={() =>
            flow.mode === "link" || (flow.isInboxEvidence && flow.linkOnly)
              ? onClose()
              : setStep("details")
          }
        />
      ) : null}

      {step === "missing" ? (
        <MissingStep
          flow={flow}
          suggestedTopics={suggestedTopics}
          onNext={() => setStep("review-links")}
          onBack={() => setStep("link")}
        />
      ) : null}

      {step === "review-links" ? (
        <ReviewLinksStep
          flow={flow}
          linkedEntities={linkedEntities}
          linkedJournalRows={linkedJournalRows}
          onNext={() => setStep("review-item")}
          onEdit={() => setStep("link")}
        />
      ) : null}

      {step === "review-item" ? (
        <ReviewItemStep
          flow={flow}
          itemTitle={itemTitle}
          itemBody={itemBody}
          onSave={runSave}
          onBack={() => setStep("review-links")}
        />
      ) : null}

      {step === "processing" ? (
        <ProcessingStep flow={flow} missingTopicCount={suggestedTopics.length} />
      ) : null}

      {step === "success" && saveResult ? (
        <SuccessStep
          result={saveResult}
          onViewItem={() => {
            onClose();
            if (flow.isInboxEvidence && options.returnTo) {
              router.push(options.returnTo);
            } else {
              router.push(saveResult.href);
            }
          }}
          onGoHome={() => {
            onClose();
            router.push(flow.isInboxEvidence && options.returnTo ? options.returnTo : "/argus/v2");
          }}
        />
      ) : null}

      <ArgusCreateItemDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        itemKind={flow.itemKind}
        onSelectKind={flow.chooseItemKind}
        flow={flow}
        suggestedTopics={suggestedTopics}
        orgOptions={orgOptions}
        entityCaptureOnly={entityCaptureOnly}
      />
    </div>
  );
}
