"use client";

import { useEffect, useId, useMemo, useState } from "react";

/**
 * UI-only prototype shape for Chaos Inbox.
 * NOT the final ArgusForge persistence contract.
 * NOT Memory Registry. NOT Vault. NOT Argus/MTA engines.
 */
type ChaosPrototypeItem = {
  temporaryId: string;
  sourceType: "text" | "link" | "image" | "file";
  rawContent: string;
  project: "ArgusForge" | "MatrixTrade" | "Unassigned";
  contextNote: string;
  createdAt: string;
  status: "raw";
};

type SourceMode = ChaosPrototypeItem["sourceType"];

const PROJECTS: ChaosPrototypeItem["project"][] = ["ArgusForge", "MatrixTrade", "Unassigned"];
const STORAGE_KEY = "argusforge-chaos-prototype-v1";

function firstLine(content: string): string {
  const line = content.trim().split(/\r?\n/).find((part) => part.trim().length > 0) ?? "";
  return line.length > 72 ? `${line.slice(0, 72)}…` : line || "(empty)";
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function loadSessionItems(): ChaosPrototypeItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChaosPrototypeItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ChaosInboxClient() {
  const formId = useId();
  const contentId = `${formId}-content`;
  const projectId = `${formId}-project`;
  const noteId = `${formId}-note`;
  const errorId = `${formId}-error`;

  const [sourceMode, setSourceMode] = useState<SourceMode>("text");
  const [content, setContent] = useState("");
  const [project, setProject] = useState<ChaosPrototypeItem["project"]>("Unassigned");
  const [contextNote, setContextNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ChaosPrototypeItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadSessionItems());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota / private mode */
    }
  }, [items, hydrated]);

  const modeHint = useMemo(() => {
    if (sourceMode === "image" || sourceMode === "file") {
      return "Prototype placeholder — upload is not implemented. Switch to Text or Link to capture.";
    }
    if (sourceMode === "link") {
      return "Paste a URL or link-shaped text.";
    }
    return null;
  }, [sourceMode]);

  function onSave() {
    if (sourceMode === "image" || sourceMode === "file") {
      setError("Image and File capture are not implemented in this prototype.");
      return;
    }
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Add text or a link before saving to Chaos.");
      return;
    }
    const next: ChaosPrototypeItem = {
      temporaryId: `tmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      sourceType: sourceMode,
      rawContent: trimmed,
      project,
      contextNote: contextNote.trim(),
      createdAt: new Date().toISOString(),
      status: "raw",
    };
    setItems((prev) => [next, ...prev]);
    setContent("");
    setError(null);
  }

  return (
    <div className="space-y-6">
      <p
        role="status"
        className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100/90"
      >
        Prototype only — captures stay in this browser session. Nothing is permanently saved.
      </p>

      <section aria-labelledby={`${formId}-capture-heading`} className="space-y-4">
        <h2 id={`${formId}-capture-heading`} className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Quick Capture
        </h2>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-zinc-300">Source mode</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["text", "link", "image", "file"] as const).map((mode) => {
              const selected = sourceMode === mode;
              const disabledLook = mode === "image" || mode === "file";
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setSourceMode(mode);
                    setError(null);
                  }}
                  className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-medium capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                    selected
                      ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  } ${disabledLook && !selected ? "opacity-70" : ""}`}
                >
                  {mode}
                  {disabledLook ? <span className="mt-0.5 block text-[10px] font-normal text-zinc-500">Soon</span> : null}
                </button>
              );
            })}
          </div>
        </fieldset>

        {modeHint ? (
          <p className="text-sm text-zinc-500" id={`${formId}-mode-hint`}>
            {modeHint}
          </p>
        ) : null}

        <div className="space-y-2">
          <label htmlFor={contentId} className="block text-sm font-medium text-zinc-300">
            {sourceMode === "link" ? "Link" : "Material"}
          </label>
          <textarea
            id={contentId}
            name="content"
            rows={6}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError(null);
            }}
            disabled={sourceMode === "image" || sourceMode === "file"}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : modeHint ? `${formId}-mode-hint` : undefined}
            placeholder="Paste an idea, conversation, error, instruction, or raw material…"
            className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor={projectId} className="block text-sm font-medium text-zinc-300">
            Project <span className="font-normal text-zinc-500">(optional mock)</span>
          </label>
          <select
            id={projectId}
            name="project"
            value={project}
            onChange={(e) => setProject(e.target.value as ChaosPrototypeItem["project"])}
            className="min-h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            {PROJECTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor={noteId} className="block text-sm font-medium text-zinc-300">
            Why does this matter?
          </label>
          <textarea
            id={noteId}
            name="contextNote"
            rows={2}
            value={contextNote}
            onChange={(e) => setContextNote(e.target.value)}
            placeholder="Optional context for later Task / Vault work"
            className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          />
        </div>

        {error ? (
          <p id={errorId} role="alert" className="text-sm font-medium text-rose-300">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onSave}
          className="flex min-h-12 w-full items-center justify-center rounded-lg border border-zinc-600 bg-zinc-100 px-4 text-base font-semibold text-zinc-950 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          Save to Chaos
        </button>
      </section>

      <section aria-labelledby={`${formId}-recent-heading`} className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={`${formId}-recent-heading`} className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Recent Captures
          </h2>
          <span className="text-xs text-zinc-600">{hydrated ? `${items.length} raw` : "…"}</span>
        </div>

        {!hydrated ? (
          <p className="text-sm text-zinc-500">Loading session captures…</p>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-6 text-center text-sm text-zinc-500">
            No captures yet. Save text or a link to see it here.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
            {items.map((item) => (
              <li key={item.temporaryId} className="space-y-1 bg-zinc-950 px-3 py-3">
                <p className="text-sm font-medium text-zinc-100">{firstLine(item.rawContent)}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                  <span className="capitalize">{item.sourceType}</span>
                  <span>{item.project}</span>
                  <span>{formatTime(item.createdAt)}</span>
                  <span className="font-medium text-zinc-400">Raw</span>
                </div>
                {item.contextNote ? (
                  <p className="text-xs text-zinc-600">Why: {item.contextNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
