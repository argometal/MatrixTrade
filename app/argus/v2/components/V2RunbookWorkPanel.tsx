"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Runbook, RunbookItem } from "@/lib/argus/types";
import {
  appendRunbookCardsFromTextAction,
  checkAllRunbookItemsAction,
  flattenRunbookSubtasksAction,
  importRunbookJsonAction,
  moveRunbookItemAction,
  rebuildRunbookFromTextAction,
  removeDoneRunbookItemsAction,
  renameRunbookItemAction,
  renameRunbookTitleAction,
  toggleRunbookItemAction,
  uncheckAllRunbookItemsAction,
} from "@/app/argus/actions";
import { runbookHasNestedSubtasks, runbookProgress } from "@/lib/argus/runbook-helpers";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import { RunbookAiBulkPanel } from "./RunbookAiBulkPanel";

function runbookItemsToText(items: RunbookItem[]): string {
  return items.map((item) => (item.type === "sep" ? "" : item.text)).join("\n");
}

function toolbarButtonClass(variant: "default" | "danger" | "primary" = "default") {
  if (variant === "danger") {
    return "rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20 disabled:opacity-40";
  }
  if (variant === "primary") {
    return "rounded-lg bg-lime-500/15 px-2.5 py-1.5 text-xs font-medium text-lime-300 ring-1 ring-lime-500/30 hover:bg-lime-500/25 disabled:opacity-40";
  }
  return "rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-lime-500/30 hover:text-lime-300 disabled:opacity-40";
}

function RunbookCardExpanded({
  runbookId,
  item,
  disabled,
  onClose,
  onError,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  runbookId: string;
  item: RunbookItem;
  disabled: boolean;
  onClose: () => void;
  onError: (message: string | null) => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editDraft, setEditDraft] = useState(item.text);
  const busy = disabled || isPending;

  useEffect(() => {
    setEditDraft(item.text);
  }, [item.id, item.text]);

  function run(action: () => Promise<void>) {
    onError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        onError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  function handleSaveRename(event: FormEvent) {
    event.preventDefault();
    const text = editDraft.trim();
    if (!text || text === item.text) {
      onClose();
      return;
    }
    run(async () => {
      await renameRunbookItemAction(runbookId, item.id, text);
      onClose();
    });
  }

  return (
    <div className="runbook-no-print rounded-2xl border border-lime-500/30 bg-zinc-900/90 p-4 shadow-lg ring-1 ring-lime-500/10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Edit card</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={busy || !canMoveUp}
            onClick={() => onMove(-1)}
            className={toolbarButtonClass()}
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={busy || !canMoveDown}
            onClick={() => onMove(1)}
            className={toolbarButtonClass()}
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            Close
          </button>
        </div>
      </div>

      <label className="mb-3 flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.done}
          disabled={busy}
          onChange={(event) => run(() => toggleRunbookItemAction(runbookId, item.id, event.target.checked))}
          className="mt-1 shrink-0"
          aria-label={item.done ? "Mark open" : "Mark done"}
        />
        <span className="text-xs text-zinc-500">{item.done ? "Done" : "Open"}</span>
      </label>

      <form onSubmit={handleSaveRename} className="space-y-3">
        <textarea
          autoFocus
          value={editDraft}
          onChange={(event) => setEditDraft(event.target.value)}
          disabled={busy}
          rows={4}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-lime-500/40 focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy || !editDraft.trim()} className={toolbarButtonClass("primary")}>
            Save
          </button>
          <button type="button" disabled={busy} onClick={onClose} className={toolbarButtonClass()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function RunbookListRow({
  item,
  hiddenOnScreen,
  expanded,
  disabled,
  onSelect,
  onToggle,
}: {
  item: RunbookItem;
  hiddenOnScreen: boolean;
  expanded: boolean;
  disabled: boolean;
  onSelect: () => void;
  onToggle: (done: boolean) => void;
}) {
  const subtaskCount = item.subtasks?.length ?? 0;

  return (
    <div className={hiddenOnScreen ? "hidden print:block" : ""}>
      <div
        className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 transition ${
          expanded
            ? "border-lime-500/40 bg-lime-500/5"
            : item.done
              ? "border-zinc-800/70 bg-zinc-950/50 opacity-80"
              : "border-zinc-800/90 bg-zinc-900/70 hover:border-lime-500/25"
        }`}
      >
        <input
          type="checkbox"
          checked={item.done}
          disabled={disabled}
          onChange={(event) => onToggle(event.target.checked)}
          className="runbook-no-print mt-1 shrink-0"
        />
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <p
            className={`text-sm font-medium leading-relaxed ${
              item.done ? "text-zinc-500 line-through" : "text-zinc-100"
            }`}
          >
            {item.text}
          </p>
          {subtaskCount > 0 ? (
            <span className="mt-1 inline-block text-[10px] text-amber-300">
              {subtaskCount} nested subtask{subtaskCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onSelect}
          className="runbook-no-print shrink-0 rounded-md px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-lime-300"
        >
          {expanded ? "Close" : "Edit"}
        </button>
      </div>
    </div>
  );
}

export function V2RunbookWorkPanel({
  runbook,
  onBack,
  backLabel = "Back",
}: {
  runbook: Runbook;
  onBack?: () => void;
  backLabel?: string;
}) {
  const router = useRouter();
  const importRef = useRef<HTMLInputElement>(null);
  const [showDone, setShowDone] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(runbook.title);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!editingTitle) setTitleDraft(runbook.title);
  }, [runbook.title, editingTitle]);

  const progress = useMemo(() => runbookProgress(runbook.items), [runbook.items]);
  const hasNestedSubtasks = useMemo(() => runbookHasNestedSubtasks(runbook.items), [runbook.items]);

  const hasVisibleCards = useMemo(() => {
    if (showDone) return runbook.items.some((item) => item.type === "item");
    return runbook.items.some((item) => item.type === "item" && !item.done);
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
    run(() => toggleRunbookItemAction(runbook.id, itemId, done));
  }

  function handleMove(itemId: string, direction: -1 | 1) {
    run(() => moveRunbookItemAction(runbook.id, itemId, direction));
  }

  function handleLoadItemsToInput() {
    if (runbook.items.length === 0) {
      setStatus("Nothing to load.");
      return;
    }
    setBulkText(runbookItemsToText(runbook.items));
    setStatus("Loaded to bulk input — edit and Build to rebuild (resets checkmarks).");
  }

  function handleBuildFromText() {
    if (!window.confirm("Build replaces all cards and resets checkmarks. Continue?")) return;
    run(async () => {
      await rebuildRunbookFromTextAction(runbook.id, bulkText);
      setExpandedId(null);
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
      setStatus("Appended new cards from input (checkmarks kept).");
    });
  }

  function handleFlattenSubtasks() {
    if (!window.confirm("Convert nested subtasks into separate cards?")) return;
    run(() => flattenRunbookSubtasksAction(runbook.id), "Converted subtasks to flat cards.");
  }

  function handleRemoveDone() {
    if (!window.confirm("Remove all accomplished cards?")) return;
    run(() => removeDoneRunbookItemsAction(runbook.id), "Removed accomplished cards.");
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
      if (!window.confirm("Import will replace this runbook's title and cards. Continue?")) {
        setStatus("Import cancelled.");
        return;
      }
      setError(null);
      startTransition(async () => {
        try {
          await importRunbookJsonAction(text, runbook.id);
          setExpandedId(null);
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
      `Runbook: ${runbook.title}\n\nOpen in Argus:\n${window.location.href}\n\n${progress.open} open / ${progress.total} cards`
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
          {progress.total} cards · {progress.open} open · {progress.done} done · Updated{" "}
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
        {editingTitle ? (
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
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="rounded-md px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-lime-300"
            >
              Rename
            </button>
          </div>
        )}
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">{progress.total} cards</span>
        <span className="rounded-full bg-lime-500/10 px-3 py-1 text-xs text-lime-300">{progress.open} open</span>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-500">{progress.done} done</span>
      </div>

      <div className="runbook-no-print rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
        <span className="mb-3 block text-xs font-medium uppercase tracking-wide text-zinc-500">Bulk input</span>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] text-zinc-500">
              Input (1 line = 1 card, blank line = separator)
            </label>
            <textarea
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              rows={8}
              disabled={isPending}
              placeholder={"• Item 1\n• Item 2\n\n(section break above)"}
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
          </div>
        </div>
      </div>

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
        <button type="button" disabled={isPending} onClick={() => run(() => checkAllRunbookItemsAction(runbook.id))} className={toolbarButtonClass()}>
          Check all
        </button>
        <button type="button" disabled={isPending} onClick={() => run(() => uncheckAllRunbookItemsAction(runbook.id))} className={toolbarButtonClass()}>
          Uncheck all
        </button>
        <button type="button" disabled={isPending} onClick={handleRemoveDone} className={toolbarButtonClass("danger")}>
          Remove accomplished
        </button>
        <span className="mx-1 hidden h-4 w-px bg-zinc-800 sm:inline" />
        <button type="button" disabled={isPending} onClick={handleExportJson} className={toolbarButtonClass()}>
          Export JSON
        </button>
        <button type="button" disabled={isPending} onClick={handleImportClick} className={toolbarButtonClass()}>
          Import JSON
        </button>
        <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
        <button type="button" onClick={handlePrint} className={toolbarButtonClass()}>
          Print / PDF
        </button>
        <button type="button" onClick={handleEmailLink} className={toolbarButtonClass()}>
          Email link
        </button>
      </div>

      <div className="runbook-no-print">
        <RunbookAiBulkPanel runbookId={runbook.id} />
      </div>

      {hasNestedSubtasks ? (
        <div className="runbook-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-950/20 px-4 py-3">
          <p className="text-xs text-amber-100">This runbook still has nested subtasks. Convert them to flat cards.</p>
          <button type="button" disabled={isPending} onClick={handleFlattenSubtasks} className={toolbarButtonClass("primary")}>
            Convert to flat cards
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
          {showDone ? "No cards yet — use bulk input above to add items." : "All cards done — or nothing to show."}
        </p>
      ) : (
        <div className="space-y-2">
          {runbook.items.map((item) => {
            const hiddenOnScreen = !showDone && item.type === "item" && item.done;
            if (item.type === "sep") {
              return (
                <div
                  key={item.id}
                  className={`border-t border-zinc-700/70 pt-1 print:border-zinc-400 ${hiddenOnScreen ? "hidden print:block" : ""}`}
                  aria-hidden
                />
              );
            }
            const itemIndex = runbook.items.findIndex((entry) => entry.id === item.id);
            return (
              <div key={item.id} className="space-y-2">
                <RunbookListRow
                  item={item}
                  hiddenOnScreen={hiddenOnScreen}
                  expanded={expandedId === item.id}
                  disabled={isPending}
                  onSelect={() => setExpandedId((current) => (current === item.id ? null : item.id))}
                  onToggle={(done) => handleToggle(item.id, done)}
                />
                {expandedId === item.id ? (
                  <RunbookCardExpanded
                    runbookId={runbook.id}
                    item={item}
                    disabled={isPending}
                    onClose={() => setExpandedId(null)}
                    onError={setError}
                    onMove={(direction) => handleMove(item.id, direction)}
                    canMoveUp={itemIndex > 0}
                    canMoveDown={itemIndex < runbook.items.length - 1}
                  />
                ) : null}
              </div>
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
