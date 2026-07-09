"use client";

import type { Entity } from "@/lib/argus/types";
import { inputClass } from "@/app/argus/components/ui";
import {
  CREATE_ITEM_HINTS,
  CREATE_MENU_SECTIONS,
  type CreateItemKind,
} from "@/lib/argus/create-flow-types";
import type { ReferenceKind } from "@/lib/argus/reference-types";
import type { useCreateLinkFlowState } from "@/lib/argus/create-link-flow-state";
import { createItemDisplayLabel, KindIcon } from "@/app/argus/components/create-link-shared";
import { ADD_CONTEXT } from "@/lib/argus/ux-copy";

const MISSING_KINDS: Array<{ kind: ReferenceKind | "document"; title: string; fields: string[] }> = [
  { kind: "person", title: "Person", fields: ["Full name", "Role", "Organization"] },
  { kind: "organization", title: "Organization", fields: ["Name", "Type", "Country"] },
  { kind: "project", title: "Project", fields: ["Name", "Description", "Status"] },
  { kind: "event", title: "Event", fields: ["Title", "Date", "Type"] },
  { kind: "topic", title: "Topic", fields: ["Name", "Category", "Description"] },
  { kind: "document", title: "Document", fields: ["Name", "Description", "Source"] },
];

type FlowState = ReturnType<typeof useCreateLinkFlowState>;

export function ArgusCreateItemDrawer({
  open,
  onClose,
  dismissible = true,
  itemKind,
  onSelectKind,
  flow,
  suggestedTopics,
  orgOptions,
  entityCaptureOnly = false,
}: {
  open: boolean;
  onClose: () => void;
  dismissible?: boolean;
  itemKind: CreateItemKind;
  onSelectKind: (kind: CreateItemKind) => void;
  flow: FlowState;
  suggestedTopics: string[];
  orgOptions: Entity[];
  entityCaptureOnly?: boolean;
}) {
  if (!open) return null;

  const menuSections = entityCaptureOnly
    ? CREATE_MENU_SECTIONS.filter((section) => section.id !== "knowledge")
    : CREATE_MENU_SECTIONS;

  return (
    <>
      {dismissible ? (
        <button
          type="button"
          className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-[1px]"
          aria-label="Close capture menu"
          onClick={onClose}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 z-[10000] bg-black/35" aria-hidden />
      )}
      <aside
        className="fixed left-0 top-0 z-[10001] flex h-full w-[min(320px,88vw)] flex-col border-r border-zinc-800 bg-zinc-950 shadow-2xl"
        role="dialog"
        aria-label="Capture item menu"
      >
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/25 text-lg ring-1 ring-violet-500/30">
              ◉
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
                {entityCaptureOnly ? ADD_CONTEXT.title : "Capture"}
              </p>
              <h2 className="text-sm font-bold text-zinc-50">ARGUS</h2>
            </div>
          </div>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              aria-label="Close menu"
            >
              ✕
            </button>
          ) : (
            <span className="rounded-lg px-2 py-1 text-[10px] font-medium text-zinc-600">Pick a type</span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {menuSections.map((section) => (
            <div key={section.id} className="mb-5">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {section.label}
              </p>
              <nav className="space-y-1">
                {section.kinds.map((kind) => {
                  const active = itemKind === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => {
                        onSelectKind(kind);
                        if (dismissible) onClose();
                      }}
                      className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30"
                          : "border-transparent hover:border-zinc-800 hover:bg-zinc-900/60"
                      }`}
                    >
                      <KindIcon kind={kind} />
                      <span className="min-w-0">
                        <span className={`block text-sm font-semibold ${active ? "text-zinc-50" : "text-zinc-200"}`}>
                          {createItemDisplayLabel(kind)}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                          {CREATE_ITEM_HINTS[kind]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}

          <div className="mt-6 border-t border-zinc-800/80 pt-4">
            <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Capture missing (if needed)
            </p>
            <p className="mb-3 px-1 text-[11px] text-zinc-600">Quick-capture and link in one step</p>

            {suggestedTopics.length > 0 ? (
              <div className="mb-3 space-y-2">
                {suggestedTopics.map((topic) => (
                  <div
                    key={topic}
                    className="flex items-center justify-between gap-2 rounded-xl border border-violet-800/40 bg-violet-950/20 px-3 py-2"
                  >
                    <p className="truncate text-xs text-zinc-300">&ldquo;{topic}&rdquo;</p>
                    <button
                      type="button"
                      disabled={flow.isPending}
                      onClick={() => {
                        flow.updateMissingDraft("topic", { name: topic });
                        void flow.handleMissingCreate("topic");
                      }}
                      className="shrink-0 rounded-lg bg-violet-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
                    >
                      + Topic
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="space-y-3">
              {MISSING_KINDS.map(({ kind, title, fields }) => {
                const draft = flow.missingDrafts[kind] ?? { name: "", detail: "", extra: "" };
                return (
                  <div key={kind} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400">{title}</p>
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
                      onClick={() => void flow.handleMissingCreate(kind)}
                      className="w-full rounded-lg bg-zinc-800 py-2 text-[10px] font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
                    >
                      Capture &amp; link
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
