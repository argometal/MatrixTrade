"use client";

/**
 * AlgoApp-equivalent New Deck sheet. UI only — uses existing createDeck.
 * Type is Material (cúmulo), not flashcard Front/Back.
 * Config is a stub for Alexandria later.
 */

import { useMemo, useState } from "react";
import { folderBreadcrumb, getFolder } from "@/lib/argusforge/af03-repo-store";
import type { Af03RepoState, OperationalView } from "@/lib/argusforge/af03-repo-types";

type Props = {
  state: Af03RepoState;
  view: OperationalView;
  currentFolderId: string | null;
  onClose: () => void;
  onSave: (input: { title: string; folderId: string | null }) => void;
};

function folderLabel(state: Af03RepoState, folderId: string): string {
  const folder = getFolder(state, folderId);
  if (!folder) return "Folder";
  const crumbs = folderBreadcrumb(state, folderId);
  return crumbs.map((c) => c.title).join(" / ") || folder.title;
}

export function NewDeckSheet({ state, view, currentFolderId, onClose, onSave }: Props) {
  const [title, setTitle] = useState("My Deck");
  const [folderId, setFolderId] = useState<string | null>(currentFolderId);
  const [folderOpen, setFolderOpen] = useState(false);

  const folders = useMemo(
    () => state.folders.filter((f) => f.view === view).sort((a, b) => a.title.localeCompare(b.title)),
    [state.folders, view]
  );

  function save() {
    const name = title.trim() || "My Deck";
    onSave({ title: name, folderId });
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#f4f6f8]" role="dialog" aria-modal="true" aria-labelledby="new-deck-title">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <button type="button" className="text-sm font-semibold uppercase tracking-wide text-slate-500" onClick={onClose}>
          Close
        </button>
        <h2 id="new-deck-title" className="text-base font-semibold text-slate-900">
          New Deck
        </h2>
        <button type="button" className="text-sm font-semibold uppercase tracking-wide text-[#2f80ed]" onClick={save}>
          Save
        </button>
      </header>

      <div className="w-full flex-1 overflow-y-auto">
        <ul className="divide-y divide-slate-100 bg-white">
          <li className="flex items-center gap-3 px-4 py-3.5">
            <span className="w-20 shrink-0 text-sm text-slate-500">Name</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-h-10 min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none"
              autoFocus
            />
          </li>
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              onClick={() => setFolderOpen((o) => !o)}
            >
              <span className="w-20 shrink-0 text-sm text-slate-500">Folder</span>
              <span className="min-w-0 flex-1 truncate text-base text-slate-800">
                {folderId ? folderLabel(state, folderId) : "None"}
              </span>
              <span className="text-slate-400">›</span>
            </button>
            {folderOpen ? (
              <ul className="max-h-48 overflow-y-auto border-t border-slate-100 bg-slate-50">
                <li>
                  <button
                    type="button"
                    className={`block w-full px-4 py-2.5 text-left text-sm ${
                      folderId === null ? "font-semibold text-[#2f80ed]" : "text-slate-700"
                    }`}
                    onClick={() => {
                      setFolderId(null);
                      setFolderOpen(false);
                    }}
                  >
                    None (root)
                  </button>
                </li>
                {folders.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      className={`block w-full px-4 py-2.5 text-left text-sm ${
                        folderId === f.id ? "font-semibold text-[#2f80ed]" : "text-slate-700"
                      }`}
                      onClick={() => {
                        setFolderId(f.id);
                        setFolderOpen(false);
                      }}
                    >
                      {folderLabel(state, f.id)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
          <li className="flex items-center gap-3 px-4 py-3.5">
            <span className="w-20 shrink-0 text-sm text-slate-500">Type</span>
            <span className="flex-1 text-base text-slate-800">Material</span>
            <span className="text-xs text-slate-400">not flashcard</span>
          </li>
          <li className="flex items-center gap-3 px-4 py-3.5 text-slate-400">
            <span className="w-20 shrink-0 text-sm">Config</span>
            <span className="flex-1 text-sm">Alexandria later</span>
            <span aria-hidden>›</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function NewFolderSheet({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const [title, setTitle] = useState("New folder");

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#f4f6f8]" role="dialog" aria-modal="true" aria-labelledby="new-folder-title">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <button type="button" className="text-sm font-semibold uppercase tracking-wide text-slate-500" onClick={onClose}>
          Close
        </button>
        <h2 id="new-folder-title" className="text-base font-semibold text-slate-900">
          New Folder
        </h2>
        <button
          type="button"
          className="text-sm font-semibold uppercase tracking-wide text-[#2f80ed]"
          onClick={() => onSave(title.trim() || "New folder")}
        >
          Save
        </button>
      </header>
      <div className="w-full bg-white px-4 py-4">
        <label className="block space-y-1.5">
          <span className="text-sm text-slate-500">Name</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[#2f80ed]"
            autoFocus
          />
        </label>
      </div>
    </div>
  );
}
