"use client";

import { useState, useTransition } from "react";
import type { SaveAiNotesActionResult } from "@/app/actions";
import { AI_NOTE_TYPES, type AiNote, type AiNoteType } from "@/lib/ai-notes-types";
import { aiNotesPasteExample } from "@/lib/ai-notes-parse";

const NOTE_TYPE_LABELS: Record<AiNoteType, string> = {
  analysis: "Analysis",
  risk: "Risk",
  strategy: "Strategy",
  lesson: "Lesson",
  action: "Action",
};

export function PasteAiNotesPanel({
  snapshotRevision,
  recentNotes,
  saveAction,
}: {
  snapshotRevision: number;
  recentNotes: AiNote[];
  saveAction: (formData: FormData) => Promise<SaveAiNotesActionResult>;
}) {
  const [pending, startTransition] = useTransition();
  const [pasteJson, setPasteJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveAction(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSuccess(`Saved ${result.count} note${result.count === 1 ? "" : "s"}.`);
      setPasteJson("");
    });
  }

  function loadExample() {
    setPasteJson(aiNotesPasteExample());
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-600">
        Paste structured JSON returned by your AI assistant. Notes are stored at snapshot revision{" "}
        <span className="font-mono">{snapshotRevision}</span> and appear in future sectioned
        snapshots.
      </p>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success}
        </p>
      )}

      <form action={handleSubmit} className="space-y-3">
        <input type="hidden" name="snapshotRevision" value={snapshotRevision} />
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700">AI notes JSON</span>
          <textarea
            name="pasteJson"
            value={pasteJson}
            onChange={(e) => setPasteJson(e.target.value)}
            rows={12}
            placeholder='{ "notes": [ { "note_type": "analysis", "body": "..." } ] }'
            className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs focus:border-zinc-500 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending || !pasteJson.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save AI Notes"}
          </button>
          <button
            type="button"
            onClick={loadExample}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Load example JSON
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Valid note_type: {AI_NOTE_TYPES.join(" | ")}. Optional: trade_id, proposal_json, date.
        </p>
      </form>

      {recentNotes.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Recent AI notes
          </p>
          <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200 text-sm">
            {recentNotes.slice(0, 8).map((note) => (
              <li key={note.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className="font-medium text-zinc-800">
                    {NOTE_TYPE_LABELS[note.noteType]}
                  </span>
                  {note.tradeId && <span>{note.tradeId}</span>}
                  <span>rev {note.snapshotRevision}</span>
                  <span>{new Date(note.date).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 line-clamp-3 text-zinc-700">{note.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
