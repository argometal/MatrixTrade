"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { importStockCaseBlockAction } from "@/app/actions";
import { parseAiBlock, sampleAiBlock } from "@/lib/ai-block";
import { buildStockCaseExtractionPrompt } from "@/lib/stock-case-extraction-prompt";

export function PreviewNewStockCase() {
  const [showNotesHelper, setShowNotesHelper] = useState(false);
  const [researchNotes, setResearchNotes] = useState("");
  const [aiBlockRaw, setAiBlockRaw] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const extractionPrompt = useMemo(
    () => buildStockCaseExtractionPrompt(researchNotes),
    [researchNotes]
  );

  const preview = useMemo(() => {
    if (!aiBlockRaw.trim()) return null;
    return parseAiBlock(aiBlockRaw);
  }, [aiBlockRaw]);

  function copyPrompt() {
    void navigator.clipboard.writeText(extractionPrompt).then(() => {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    });
  }

  function copySample() {
    void navigator.clipboard.writeText(sampleAiBlock("stock-case-create")).then(() => {
      setCopiedSample(true);
      setTimeout(() => setCopiedSample(false), 2000);
    });
  }

  function applyBlock() {
    startTransition(async () => {
      setError(null);
      setCreatedId(null);
      const result = await importStockCaseBlockAction(aiBlockRaw);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCreatedId(result.thesisId ?? null);
    });
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">New stock case</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Analyze in your AI chat — charts, photos, thesis — then paste the{" "}
                <code className="text-violet-300">stock-case-create</code> block here.
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Matrix is the expectation database. The conversation lives in your AI; we store the structured result.
              </p>
            </div>
            <Link
              href="/planning"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              ← Scouting Desk
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 lg:px-6">
          <section className="rounded-2xl border border-emerald-500/30 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">Paste from your AI</h2>
            <p className="mt-1 text-xs text-zinc-500">
              In ChatGPT / Claude / etc.: discuss the setup, share screenshots, ask for one{" "}
              <code className="text-violet-300">stock-case-create</code> JSON block (ASCII quotes).
              Paste it below — human Apply, same as Inbox.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copySample}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                {copiedSample ? "Copied sample" : "Copy example block"}
              </button>
            </div>
            <textarea
              value={aiBlockRaw}
              onChange={(e) => setAiBlockRaw(e.target.value)}
              rows={12}
              placeholder='Paste { "type": "stock-case-create", "proposal": { ... } } from your AI chat'
              className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200"
            />

            {preview && !preview.ok ? (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                {preview.error}
                {preview.details?.length ? (
                  <ul className="mt-1 list-disc pl-5 text-xs">
                    {preview.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {preview?.ok ? (
              <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
                Valid · {String(preview.payload.proposal.ticker)} ·{" "}
                {String(preview.payload.proposal.currentHypothesis).slice(0, 80)}
              </div>
            ) : null}

            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

            {createdId ? (
              <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
                Created{" "}
                <Link href={`/stock-theses/${createdId}`} className="font-semibold underline">
                  {createdId}
                </Link>
                {" · "}
                <Link href={`/planning?thesis=${createdId}`} className="underline">
                  Open in Scouting Desk
                </Link>
              </div>
            ) : null}

            <button
              type="button"
              onClick={applyBlock}
              disabled={pending || !preview?.ok}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create stock case"}
            </button>
          </section>

          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40">
            <button
              type="button"
              onClick={() => setShowNotesHelper((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <div>
                <p className="text-sm font-medium text-zinc-400">Notes helper (optional)</p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  Only if you want to type notes here instead of chatting in your AI first.
                </p>
              </div>
              <span className="text-xs text-zinc-500">{showNotesHelper ? "Hide" : "Show"}</span>
            </button>

            {showNotesHelper ? (
              <div className="space-y-4 border-t border-zinc-800 px-5 pb-5 pt-4">
                <div>
                  <p className="text-xs text-zinc-500">
                    Optional scratch pad — appended to the extraction prompt if you copy it.
                  </p>
                  <textarea
                    value={researchNotes}
                    onChange={(e) => setResearchNotes(e.target.value)}
                    rows={4}
                    placeholder="Optional notes (most people skip this and use the AI chat directly)"
                    className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-zinc-500">Extraction prompt with your notes</p>
                  <button
                    type="button"
                    onClick={copyPrompt}
                    className="rounded-lg border border-violet-500/40 px-3 py-1.5 text-xs text-violet-300 hover:bg-violet-500/10"
                  >
                    {copiedPrompt ? "Copied" : "Copy prompt"}
                  </button>
                </div>
                <pre className="max-h-40 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-500 whitespace-pre-wrap">
                  {extractionPrompt}
                </pre>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
