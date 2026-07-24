"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { Runbook, RunbookItem } from "@/lib/argus/types";
import {
  addRunbookSectionAction,
  appendRunbookCardsFromTextAction,
  checkAllRunbookItemsAction,
  checkAllRunbookItemsScopedAction,
  flattenRunbookSubtasksAction,
  importRunbookJsonAction,
  moveRunbookItemAction,
  moveRunbookSectionAction,
  rebuildRunbookFromTextAction,
  removeDoneRunbookItemsAction,
  renameRunbookItemAction,
  renameRunbookTitleAction,
  setRunbookItemTypeAction,
  setRunbookScopeClosedAction,
  toggleRunbookItemAction,
  uncheckAllRunbookItemsAction,
  uncheckAllRunbookItemsScopedAction,
} from "@/app/argus/actions";
import {
  canMoveRunbookSection,
  isRunbookCheck,
  runbookHasNestedSubtasks,
  runbookItemSectionId,
  runbookItemsToText,
  runbookProgress,
} from "@/lib/argus/runbook-helpers";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import { RunbookAiBulkPanel } from "./RunbookAiBulkPanel";

function toolbarButtonClass(variant: "default" | "danger" | "primary" = "default") {
  if (variant === "danger") {
    return "rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20 disabled:opacity-40";
  }
  if (variant === "primary") {
    return "rounded-lg bg-lime-500/15 px-2.5 py-1.5 text-xs font-medium text-lime-300 ring-1 ring-lime-500/30 hover:bg-lime-500/25 disabled:opacity-40";
  }
  return "rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-lime-500/30 hover:text-lime-300 disabled:opacity-40";
}

function InlineRename({
  value,
  disabled,
  className,
  onSave,
}: {
  value: string;
  disabled: boolean;
  className: string;
  onSave: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === value) {
      setDraft(value);
      return;
    }
    onSave(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(value);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={`w-full rounded-md border border-lime-500/40 bg-zinc-950 px-1.5 py-0.5 focus:outline-none ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setEditing(true)}
      className={`w-full truncate text-left hover:text-lime-200 disabled:opacity-50 ${className}`}
      title="Click to rename"
    >
      {value || "Untitled"}
    </button>
  );
}

function SectionHeaderRow({
  item,
  collapsed,
  disabled,
  editable,
  canMoveUp,
  canMoveDown,
  onToggleCollapse,
  onRename,
  onMove,
  onMakeCheck,
}: {
  item: RunbookItem;
  collapsed: boolean;
  disabled: boolean;
  editable: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleCollapse: () => void;
  onRename: (text: string) => void;
  onMove: (direction: -1 | 1) => void;
  onMakeCheck: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 border-b border-zinc-800/80 py-2">
      <button
        type="button"
        onClick={onToggleCollapse}
        className="runbook-no-print shrink-0 rounded px-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        aria-label={collapsed ? "Expand section" : "Collapse section"}
        aria-expanded={!collapsed}
      >
        {collapsed ? "▶" : "▼"}
      </button>
      <div className="min-w-0 flex-1">
        {editable ? (
          <InlineRename
            value={item.text}
            disabled={disabled}
            onSave={onRename}
            className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400"
          />
        ) : (
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            {item.text}
          </p>
        )}
      </div>
      {editable ? (
        <div className="runbook-no-print flex shrink-0 items-center gap-0.5 opacity-70 transition group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            disabled={disabled || !canMoveUp}
            onClick={() => onMove(-1)}
            className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-lime-300 disabled:opacity-30"
            aria-label="Move section up"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={disabled || !canMoveDown}
            onClick={() => onMove(1)}
            className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-lime-300 disabled:opacity-30"
            aria-label="Move section down"
          >
            ↓
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onMakeCheck}
            className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-lime-300"
            title="Convert to check"
          >
            Check
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CheckRow({
  item,
  hiddenOnScreen,
  disabled,
  editable,
  canMoveUp,
  canMoveDown,
  onToggle,
  onRename,
  onMove,
  onMakeSection,
}: {
  item: RunbookItem;
  hiddenOnScreen: boolean;
  disabled: boolean;
  editable: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: (done: boolean) => void;
  onRename: (text: string) => void;
  onMove: (direction: -1 | 1) => void;
  onMakeSection: () => void;
}) {
  const subtaskCount = item.subtasks?.length ?? 0;

  return (
    <div className={hiddenOnScreen ? "hidden print:block" : ""}>
      <div className="group flex items-start gap-3 border-b border-zinc-900/80 py-2.5">
        <input
          type="checkbox"
          checked={item.done}
          disabled={disabled}
          onChange={(event) => onToggle(event.target.checked)}
          className="runbook-no-print mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1 text-left">
          {editable ? (
            <InlineRename
              value={item.text}
              disabled={disabled}
              onSave={onRename}
              className={`text-sm leading-relaxed ${
                item.done ? "text-zinc-500 line-through" : "text-zinc-100"
              }`}
            />
          ) : (
            <p
              className={`text-sm leading-relaxed ${
                item.done ? "text-zinc-500 line-through" : "text-zinc-100"
              }`}
            >
              {item.text}
            </p>
          )}
          {subtaskCount > 0 ? (
            <span className="mt-1 inline-block text-[10px] text-amber-300">
              {subtaskCount} nested subtask{subtaskCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        {editable ? (
          <div className="runbook-no-print flex shrink-0 items-center gap-0.5 opacity-70 transition group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              disabled={disabled || !canMoveUp}
              onClick={() => onMove(-1)}
              className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-lime-300 disabled:opacity-30"
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={disabled || !canMoveDown}
              onClick={() => onMove(1)}
              className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-lime-300 disabled:opacity-30"
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onMakeSection}
              className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-lime-300"
              title="Make section header"
            >
              Section
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function V2RunbookWorkPanel({
  runbook,
  onBack,
  backLabel = "Back",
  scopeEntityId,
  closed = false,
  executeMode = false,
}: {
  runbook: Runbook;
  onBack?: () => void;
  backLabel?: string;
  /** When set, check/uncheck persists per this entity (Project / Topic / Event / Org). */
  scopeEntityId?: string;
  closed?: boolean;
  /** Hide template rebuild tools — focus on executing checks. */
  executeMode?: boolean;
}) {
  const router = useRouter();
  const importRef = useRef<HTMLInputElement>(null);
  const [showDone, setShowDone] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(runbook.title);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!editingTitle) setTitleDraft(runbook.title);
  }, [runbook.title, editingTitle]);

  const progress = useMemo(() => runbookProgress(runbook.items), [runbook.items]);
  const hasNestedSubtasks = useMemo(() => runbookHasNestedSubtasks(runbook.items), [runbook.items]);

  const hasVisibleCards = useMemo(() => {
    if (showDone) return runbook.items.some(isRunbookCheck);
    return runbook.items.some((item) => isRunbookCheck(item) && !item.done);
  }, [runbook.items, showDone]);

  function run(action: () => Promise<void>, successMessage?: string) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        if (successMessage) setStatus(successMessage);
        router.refresh();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  function handleToggle(itemId: string, done: boolean) {
    run(() => toggleRunbookItemAction(runbook.id, itemId, done, scopeEntityId));
  }

  function handleMove(itemId: string, direction: -1 | 1) {
    run(() => moveRunbookItemAction(runbook.id, itemId, direction));
  }

  function handleMoveSection(sectionId: string, direction: -1 | 1) {
    run(() => moveRunbookSectionAction(runbook.id, sectionId, direction));
  }

  function handleRenameItem(itemId: string, text: string) {
    run(() => renameRunbookItemAction(runbook.id, itemId, text));
  }

  function handleSetType(itemId: string, type: "item" | "section") {
    run(() => setRunbookItemTypeAction(runbook.id, itemId, type));
  }

  function handleAddSection() {
    const title = window.prompt("Section title", "New section");
    if (!title?.trim()) return;
    run(() => addRunbookSectionAction(runbook.id, title), "Section added.");
  }

  function handleLoadItemsToInput() {
    if (runbook.items.length === 0) {
      setStatus("Nothing to load.");
      return;
    }
    setBulkText(runbookItemsToText(runbook.items));
    setStatus("Loaded to bulk input — edit and Build to rebuild (resets checks).");
  }

  function handleBuildFromText() {
    if (!window.confirm("Build replaces all checks and resets progress. Continue?")) return;
    run(async () => {
      await rebuildRunbookFromTextAction(runbook.id, bulkText);
      setStatus("Built from bulk input.");
    });
  }

  function handleAppendFromBulk() {
    if (!bulkText.trim()) {
      setError("Add lines to the input first.");
      return;
    }
    run(async () => {
      await appendRunbookCardsFromTextAction(runbook.id, bulkText);
      setStatus("Appended from input.");
    });
  }

  function handleFlattenSubtasks() {
    if (!window.confirm("Convert nested subtasks into separate checks?")) return;
    run(() => flattenRunbookSubtasksAction(runbook.id), "Converted subtasks to flat checks.");
  }

  function handleRemoveDone() {
    if (!window.confirm("Remove all accomplished checks from the template? This cannot be undone.")) {
      return;
    }
    run(() => removeDoneRunbookItemsAction(runbook.id), "Removed accomplished checks from template.");
  }

  function handleCheckAll() {
    if (scopeEntityId) {
      run(() => checkAllRunbookItemsScopedAction(runbook.id, scopeEntityId), "All checks done.");
      return;
    }
    run(() => checkAllRunbookItemsAction(runbook.id));
  }

  function handleUncheckAll() {
    if (scopeEntityId) {
      run(() => uncheckAllRunbookItemsScopedAction(runbook.id, scopeEntityId), "All checks cleared.");
      return;
    }
    run(() => uncheckAllRunbookItemsAction(runbook.id));
  }

  function handleExportJson() {
    const payload = {
      version: "1.0",
      exportedAt: new Date().toISOString().slice(0, 19),
      runbook: {
        id: runbook.id,
        title: runbook.title,
        items: runbook.items,
        linkedEntityIds: runbook.linkedEntityIds,
        createdAt: runbook.createdAt,
        updatedAt: runbook.updatedAt,
      },
    };
    const filename = `runbook_${runbook.title.replace(/[\\/:*?"<>|]/g, "_")}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    setStatus(`Exported ${filename}`);
  }

  function handleImportClick() {
    importRef.current?.click();
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      if (!window.confirm("Import will replace this runbook's title and checks. Continue?")) {
        setStatus("Import cancelled.");
        return;
      }
      setError(null);
      startTransition(async () => {
        try {
          await importRunbookJsonAction(text, runbook.id);
          setStatus(`Imported: ${file.name}`);
          router.refresh();
        } catch (err) {
          const { layer, message } = formatArgusError(err);
          setError(`${layer.toUpperCase()}: ${message}`);
        }
      });
    } catch {
      setError("Import error: could not read file.");
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleEmailLink() {
    const subject = encodeURIComponent(`Runbook: ${runbook.title}`);
    const body = encodeURIComponent(
      `Runbook: ${runbook.title}\n\nOpen in Argus:\n${window.location.href}\n\n${progress.open} open / ${progress.total} checks`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function handleSaveTitle(event: FormEvent) {
    event.preventDefault();
    const title = titleDraft.trim();
    if (!title || title === runbook.title) {
      setEditingTitle(false);
      setTitleDraft(runbook.title);
      return;
    }
    run(async () => {
      await renameRunbookTitleAction(runbook.id, title);
      setEditingTitle(false);
    }, "Title updated.");
  }

  function isCollapsedUnderSection(item: RunbookItem): boolean {
    if (item.type !== "item") return false;
    const sectionId = runbookItemSectionId(runbook.items, item.id);
    if (!sectionId) return false;
    return !!collapsedSections[sectionId];
  }

  return (
    <div className="runbook-work-panel space-y-4">
      <style>{`
        @media print {
          body { background: #fff !important; color: #111 !important; }
          .v2-page-shell, .argus-v2-scroll { overflow: visible !important; height: auto !important; }
          .runbook-no-print { display: none !important; }
          .runbook-work-panel { color: #111; }
          .runbook-print-header { display: block !important; }
        }
      `}</style>

      <div className="runbook-print-header mb-4 hidden">
        <h2 className="text-xl font-bold text-zinc-900">{runbook.title}</h2>
        <p className="text-sm text-zinc-600">
          {progress.total} checks · {progress.open} open · {progress.done} done · Updated{" "}
          {runbook.updatedAt.slice(0, 19).replace("T", " ")}
        </p>
      </div>

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="runbook-no-print flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-lime-300"
        >
          <span aria-hidden>←</span>
          {backLabel}
        </button>
      ) : null}

      <div className="runbook-no-print flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
        {editingTitle && !executeMode ? (
          <form onSubmit={handleSaveTitle} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <input
              autoFocus
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              disabled={isPending}
              className="min-w-[12rem] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 focus:border-lime-500/40 focus:outline-none"
            />
            <button type="submit" disabled={isPending || !titleDraft.trim()} className={toolbarButtonClass("primary")}>
              Save title
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setEditingTitle(false);
                setTitleDraft(runbook.title);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-sm font-semibold text-zinc-200">{runbook.title}</span>
            {!executeMode ? (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="rounded-md px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-lime-300"
              >
                Rename
              </button>
            ) : null}
            {closed ? (
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-300">Closed</span>
            ) : null}
          </div>
        )}
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">{progress.total} checks</span>
        <span className="rounded-full bg-lime-500/10 px-3 py-1 text-xs text-lime-300">{progress.open} open</span>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-500">{progress.done} done</span>
      </div>

      {!executeMode ? (
        <div className="runbook-no-print rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
          <span className="mb-3 block text-xs font-medium uppercase tracking-wide text-zinc-500">Bulk input</span>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] text-zinc-500">
                Input (1 line = 1 check, blank line = separator, # Title = section)
              </label>
              <textarea
                value={bulkText}
                onChange={(event) => setBulkText(event.target.value)}
                rows={8}
                disabled={isPending}
                placeholder={"Confirm stakeholders\nReview scope\n\n# Follow-up\nSend summary"}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={isPending} onClick={handleBuildFromText} className={toolbarButtonClass("primary")}>
                Build
              </button>
              <button type="button" disabled={isPending} onClick={handleAppendFromBulk} className={toolbarButtonClass()}>
                Append
              </button>
              <button type="button" disabled={isPending} onClick={handleLoadItemsToInput} className={toolbarButtonClass()}>
                Load items → Input
              </button>
              <button type="button" disabled={isPending} onClick={handleAddSection} className={toolbarButtonClass()}>
                Add section
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="runbook-no-print flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(event) => setShowDone(event.target.checked)}
            className="rounded border-zinc-700"
          />
          Show accomplished
        </label>
        <button type="button" disabled={isPending} onClick={handleCheckAll} className={toolbarButtonClass()}>
          Check all
        </button>
        <button type="button" disabled={isPending} onClick={handleUncheckAll} className={toolbarButtonClass()}>
          Uncheck all
        </button>
        {scopeEntityId ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(
                () => setRunbookScopeClosedAction(runbook.id, scopeEntityId, !closed),
                closed ? "Reopened at this level." : "Marked closed at this level."
              )
            }
            className={toolbarButtonClass(closed ? "default" : "primary")}
          >
            {closed ? "Reopen" : "Mark closed"}
          </button>
        ) : null}
        {!executeMode ? (
          <button type="button" disabled={isPending} onClick={handleRemoveDone} className={toolbarButtonClass("danger")}>
            Remove accomplished
          </button>
        ) : null}
        <span className="mx-1 hidden h-4 w-px bg-zinc-800 sm:inline" />
        <button type="button" disabled={isPending} onClick={handleExportJson} className={toolbarButtonClass()}>
          Export JSON
        </button>
        {!executeMode ? (
          <>
            <button type="button" disabled={isPending} onClick={handleImportClick} className={toolbarButtonClass()}>
              Import JSON
            </button>
            <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
          </>
        ) : null}
        <button type="button" onClick={handlePrint} className={toolbarButtonClass()}>
          Print / PDF
        </button>
        <button type="button" onClick={handleEmailLink} className={toolbarButtonClass()}>
          Email link
        </button>
      </div>

      {!executeMode ? (
        <div className="runbook-no-print">
          <RunbookAiBulkPanel runbookId={runbook.id} />
        </div>
      ) : null}

      {!executeMode && hasNestedSubtasks ? (
        <div className="runbook-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-950/20 px-4 py-3">
          <p className="text-xs text-amber-100">This runbook still has nested subtasks. Convert them to flat checks.</p>
          <button type="button" disabled={isPending} onClick={handleFlattenSubtasks} className={toolbarButtonClass("primary")}>
            Convert to flat checks
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">{error}</p>
      ) : null}

      {status ? (
        <p className="runbook-no-print rounded-xl border border-lime-500/20 bg-lime-950/20 px-3 py-2 text-xs text-lime-200">
          {status}
        </p>
      ) : null}

      {!hasVisibleCards ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
          {showDone
            ? executeMode
              ? "No checks in this runbook."
              : "No checks yet — use bulk input above to add items."
            : "All checks done — or nothing to show."}
        </p>
      ) : (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-3 sm:px-4">
          {runbook.items.map((item, itemIndex) => {
            if (item.type === "sep") {
              return (
                <div
                  key={item.id}
                  className="border-t border-zinc-700/50 my-1 print:border-zinc-400"
                  aria-hidden
                />
              );
            }

            if (item.type === "section") {
              const collapsed = !!collapsedSections[item.id];
              return (
                <SectionHeaderRow
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  disabled={isPending}
                  editable={!executeMode}
                  canMoveUp={canMoveRunbookSection(runbook.items, item.id, -1)}
                  canMoveDown={canMoveRunbookSection(runbook.items, item.id, 1)}
                  onToggleCollapse={() =>
                    setCollapsedSections((current) => ({
                      ...current,
                      [item.id]: !current[item.id],
                    }))
                  }
                  onRename={(text) => handleRenameItem(item.id, text)}
                  onMove={(direction) => handleMoveSection(item.id, direction)}
                  onMakeCheck={() => handleSetType(item.id, "item")}
                />
              );
            }

            const collapsedAway = isCollapsedUnderSection(item);
            const hiddenOnScreen =
              collapsedAway || (!showDone && item.done);

            return (
              <CheckRow
                key={item.id}
                item={item}
                hiddenOnScreen={hiddenOnScreen}
                disabled={isPending}
                editable={!executeMode}
                canMoveUp={itemIndex > 0}
                canMoveDown={itemIndex < runbook.items.length - 1}
                onToggle={(done) => handleToggle(item.id, done)}
                onRename={(text) => handleRenameItem(item.id, text)}
                onMove={(direction) => handleMove(item.id, direction)}
                onMakeSection={() => handleSetType(item.id, "section")}
              />
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-zinc-600 print:text-zinc-500">
        Updated {runbook.updatedAt.slice(0, 19).replace("T", " ")} · Execution checklist — not timeline evidence
      </p>
    </div>
  );
}
