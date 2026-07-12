"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Runbook, RunbookItem, RunbookSubtask } from "@/lib/argus/types";
import {
  addRunbookCardAction,
  addRunbookSubtaskAction,
  appendRunbookCardsFromTextAction,
  checkAllRunbookItemsAction,
  importRunbookJsonAction,
  rebuildRunbookFromTextAction,
  removeDoneRunbookItemsAction,
  renameRunbookItemAction,
  renameRunbookTitleAction,
  toggleRunbookItemAction,
  toggleRunbookSubtaskAction,
  uncheckAllRunbookItemsAction,
} from "@/app/argus/actions";
import { runbookCardProgress, runbookProgress } from "@/lib/argus/runbook-helpers";
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

function RunbookCard({
  runbookId,
  item,
  disabled,
  hiddenOnScreen,
  onError,
}: {
  runbookId: string;
  item: RunbookItem;
  disabled: boolean;
  hiddenOnScreen: boolean;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(item.text);
  const progress = useMemo(() => runbookCardProgress(item), [item]);
  const subtasks = item.subtasks ?? [];
  const busy = disabled || isPending;

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

  function handleToggleCard(nextDone: boolean) {
    run(() => toggleRunbookItemAction(runbookId, item.id, nextDone));
  }

  function handleToggleSubtask(subtask: RunbookSubtask, nextDone: boolean) {
    run(() => toggleRunbookSubtaskAction(runbookId, item.id, subtask.id, nextDone));
  }

  function handleAddSubtask(event: FormEvent) {
    event.preventDefault();
    const text = subtaskDraft.trim();
    if (!text) return;
    run(async () => {
      await addRunbookSubtaskAction(runbookId, item.id, text);
      setSubtaskDraft("");
      setAddingSubtask(false);
    });
  }

  function handleSaveRename(event: FormEvent) {
    event.preventDefault();
    const text = editDraft.trim();
    if (!text || text === item.text) {
      setEditing(false);
      setEditDraft(item.text);
      return;
    }
    run(async () => {
      await renameRunbookItemAction(runbookId, item.id, text);
      setEditing(false);
    });
  }

  return (
    <article
      className={`rounded-2xl border px-3.5 py-3 shadow-sm transition ${
        hiddenOnScreen ? "hidden print:block" : ""
      } ${
        item.done
          ? "border-zinc-800/70 bg-zinc-950/50 opacity-80 print:opacity-100"
          : "border-zinc-800/90 bg-zinc-900/70 hover:border-lime-500/25"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.done}
          disabled={busy}
          onChange={(event) => handleToggleCard(event.target.checked)}
          className="runbook-no-print mt-1 shrink-0"
          aria-label={item.done ? "Mark card open" : "Mark card done"}
        />
        <span className="mt-1 hidden shrink-0 text-sm print:inline">{item.done ? "☑" : "☐"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            {editing ? (
              <form onSubmit={handleSaveRename} className="flex min-w-0 flex-1 gap-2">
                <input
                  autoFocus
                  value={editDraft}
                  onChange={(event) => setEditDraft(event.target.value)}
                  disabled={busy}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 focus:border-lime-500/40 focus:outline-none"
                />
                <button type="submit" disabled={busy || !editDraft.trim()} className={toolbarButtonClass("primary")}>
                  Save
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(false);
                    setEditDraft(item.text);
                  }}
                  className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <p
                  className={`text-sm font-medium leading-relaxed ${
                    item.done ? "text-zinc-500 line-through print:text-zinc-900 print:no-underline" : "text-zinc-100 print:text-zinc-900"
                  }`}
                >
                  {item.text}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditDraft(item.text);
                    setEditing(true);
                  }}
                  className="runbook-no-print shrink-0 rounded-md px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-lime-300"
                  aria-label="Rename card"
                >
                  Edit
                </button>
              </>
            )}
            {progress.total > 0 ? (
              <span className="shrink-0 rounded-md bg-zinc-950/80 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400 ring-1 ring-zinc-800 print:hidden">
                {progress.done}/{progress.total}
              </span>
            ) : null}
          </div>

          {subtasks.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-t border-zinc-800/80 pt-3">
              {subtasks.map((subtask) => (
                <li key={subtask.id}>
                  <label className="flex items-start gap-2 rounded-lg px-1 py-0.5 hover:bg-zinc-950/40 print:hover:bg-transparent">
                    <input
                      type="checkbox"
                      checked={subtask.done}
                      disabled={busy}
                      onChange={(event) => handleToggleSubtask(subtask, event.target.checked)}
                      className="runbook-no-print mt-0.5 shrink-0"
                    />
                    <span className="mt-0.5 hidden shrink-0 text-xs print:inline">
                      {subtask.done ? "☑" : "☐"}
                    </span>
                    <span
                      className={`text-xs leading-relaxed ${
                        subtask.done ? "text-zinc-600 line-through print:text-zinc-700" : "text-zinc-300 print:text-zinc-800"
                      }`}
                    >
                      {subtask.text}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}

          {addingSubtask ? (
            <form onSubmit={handleAddSubtask} className="runbook-no-print mt-3 flex gap-2">
              <input
                autoFocus
                value={subtaskDraft}
                onChange={(event) => setSubtaskDraft(event.target.value)}
                disabled={busy}
                placeholder="Checklist item…"
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !subtaskDraft.trim()}
                className={toolbarButtonClass("primary")}
              >
                Add
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setAddingSubtask(false);
                  setSubtaskDraft("");
                }}
                className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setAddingSubtask(true)}
              className="runbook-no-print mt-3 text-left text-[11px] font-medium text-zinc-500 hover:text-lime-300"
            >
              + Add subtask
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function V2RunbookWorkPanel({ runbook }: { runbook: Runbook }) {
  const router = useRouter();
  const importRef = useRef<HTMLInputElement>(null);
  const [showDone, setShowDone] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [appendText, setAppendText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(runbook.title);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!editingTitle) setTitleDraft(runbook.title);
  }, [runbook.title, editingTitle]);

  const progress = useMemo(() => runbookProgress(runbook.items), [runbook.items]);

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

  function handleAddCard(event: FormEvent) {
    event.preventDefault();
    const text = cardDraft.trim();
    if (!text) return;
    run(async () => {
      await addRunbookCardAction(runbook.id, text);
      setCardDraft("");
    });
  }

  function handleLoadItemsToInput() {
    if (runbook.items.length === 0) {
      setStatus("Nothing to load.");
      return;
    }
    setBulkText(runbookItemsToText(runbook.items));
    setBulkOpen(true);
    setStatus("Loaded to bulk input — edit and Build to rebuild (resets checkmarks).");
  }

  function handleBuildFromText() {
    if (!window.confirm("Build replaces all cards and resets checkmarks. Continue?")) return;
    run(async () => {
      await rebuildRunbookFromTextAction(runbook.id, bulkText);
      setStatus("Built from bulk input.");
    });
  }

  function handleAppendFromText() {
    const text = appendText.trim() ? appendText : bulkText;
    if (!text.trim()) {
      setError("No lines to append.");
      return;
    }
    run(async () => {
      await appendRunbookCardsFromTextAction(runbook.id, text);
      setAppendText("");
      setStatus("Appended cards from text.");
    });
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
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
          {progress.total} cards
        </span>
        <span className="rounded-full bg-lime-500/10 px-3 py-1 text-xs text-lime-300">
          {progress.open} open
        </span>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-500">
          {progress.done} done
        </span>
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

      <details
        open={bulkOpen}
        onToggle={(event) => setBulkOpen((event.currentTarget as HTMLDetailsElement).open)}
        className="runbook-no-print rounded-2xl border border-zinc-800/80 bg-zinc-900/50"
      >
        <summary className="cursor-pointer px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 hover:text-lime-300">
          Bulk input
        </summary>
        <div className="space-y-3 border-t border-zinc-800/80 px-4 py-3">
          <div>
            <label className="mb-1.5 block text-[11px] text-zinc-500">Input (1 line = 1 card, blank line = separator)</label>
            <textarea
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              rows={10}
              disabled={isPending}
              placeholder={"• Item 1\n• Item 2\n\n(section break above)"}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-1.5 block text-[11px] text-zinc-500">Append only (keeps checkmarks)</label>
              <textarea
                value={appendText}
                onChange={(event) => setAppendText(event.target.value)}
                rows={3}
                disabled={isPending}
                placeholder="One line = one new card"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none"
              />
            </div>
            <button type="button" disabled={isPending} onClick={handleAppendFromText} className={toolbarButtonClass("primary")}>
              Append
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={isPending} onClick={handleBuildFromText} className={toolbarButtonClass("primary")}>
              Build (replaces all)
            </button>
            <button type="button" disabled={isPending} onClick={handleLoadItemsToInput} className={toolbarButtonClass()}>
              Load items → Input
            </button>
          </div>
        </div>
      </details>

      <div className="runbook-no-print">
        <RunbookAiBulkPanel runbookId={runbook.id} />
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      {status ? (
        <p className="runbook-no-print rounded-xl border border-lime-500/20 bg-lime-950/20 px-3 py-2 text-xs text-lime-200">
          {status}
        </p>
      ) : null}

      <div className="space-y-3">
        {!hasVisibleCards ? (
          <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            {showDone ? "No cards yet." : "All cards done — or nothing to show."}
          </p>
        ) : (
          runbook.items.map((item) => {
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
            return (
              <RunbookCard
                key={item.id}
                runbookId={runbook.id}
                item={item}
                disabled={isPending}
                hiddenOnScreen={hiddenOnScreen}
                onError={setError}
              />
            );
          })
        )}
      </div>

      <form
        onSubmit={handleAddCard}
        className="runbook-no-print rounded-2xl border border-dashed border-zinc-700/80 bg-zinc-950/40 p-3"
      >
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          New card
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={cardDraft}
            onChange={(event) => setCardDraft(event.target.value)}
            disabled={isPending}
            placeholder="What needs to be done…"
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending || !cardDraft.trim()}
            className="rounded-xl bg-lime-500/15 px-4 py-2.5 text-sm font-medium text-lime-300 ring-1 ring-lime-500/30 hover:bg-lime-500/25 disabled:opacity-40"
          >
            Add card
          </button>
        </div>
      </form>

      <p className="text-[11px] text-zinc-600 print:text-zinc-500">
        Updated {runbook.updatedAt.slice(0, 19).replace("T", " ")} · Execution checklist — not timeline
        evidence
      </p>
    </div>
  );
}
