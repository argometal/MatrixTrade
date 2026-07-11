"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { importStockCaseBlockAction } from "@/app/actions";
import { parseAiBlock } from "@/lib/ai-block";
import { buildStockCaseExtractionPrompt } from "@/lib/stock-case-extraction-prompt";

export function PreviewNewStockCase() {
  const [researchNotes, setResearchNotes] = useState("");
  const [aiBlockRaw, setAiBlockRaw] = useState("");
  const [copied, setCopied] = useState(false);
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
                Paste research into any AI → get a structured{" "}
                <code className="text-violet-300">stock-case-create</code> block → Apply here.
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                No provider lock-in — ChatGPT, Claude, Gemini, or local models all work the same way.
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

        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:px-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">1 · Your research</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Chart notes, thesis draft, or a conversation summary — include prices, zones, stop rule, targets.
            </p>
            <textarea
              value={researchNotes}
              onChange={(e) => setResearchNotes(e.target.value)}
              rows={6}
              placeholder="Example: NVDA swing long. Wait pullback 118-125. Stop thesis weekly close below 108. Targets 135, 145. Min 3R..."
              className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
            />
          </section>

          <section className="rounded-2xl border border-violet-500/30 bg-violet-950/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-violet-200">2 · Copy prompt to your AI</h2>
              <button
                type="button"
                onClick={copyPrompt}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
              >
                {copied ? "Copied" : "Copy extraction prompt"}
              </button>
            </div>
            <pre className="mt-3 max-h-48 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400 whitespace-pre-wrap">
              {extractionPrompt}
            </pre>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">3 · Paste AI Block & create</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Paste the JSON your AI returns (plain or ```json fenced). Preview validates before create.
            </p>
            <textarea
              value={aiBlockRaw}
              onChange={(e) => setAiBlockRaw(e.target.value)}
              rows={10}
              placeholder='{ "type": "stock-case-create", "proposal": { ... } }'
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
        </div>
      </div>
    </div>
  );
}
