"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  createBootstrapAiGrantAction,
  importStockCaseBlockAction,
} from "@/app/actions";
import { parseAiBlock, sampleAiBlock } from "@/lib/ai-block";
import { buildStockCaseBootPackage } from "@/lib/stock-case-boot";

export function PreviewNewStockCase() {
  const [showNotesHelper, setShowNotesHelper] = useState(false);
  const [aiBlockRaw, setAiBlockRaw] = useState("");
  const [copiedBoot, setCopiedBoot] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<{ id: string } | null>(null);
  const [grantLinks, setGrantLinks] = useState<{
    grantId: string;
    humanPageUrl: string;
    contextUrl: string;
    inboxUrl: string;
    expiresAt: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [grantPending, startGrantTransition] = useTransition();

  const bootPackage = useMemo(() => buildStockCaseBootPackage(), []);

  const preview = useMemo(() => {
    if (!aiBlockRaw.trim()) return null;
    return parseAiBlock(aiBlockRaw);
  }, [aiBlockRaw]);

  function copyBoot() {
    void navigator.clipboard.writeText(bootPackage).then(() => {
      setCopiedBoot(true);
      setTimeout(() => setCopiedBoot(false), 2000);
    });
  }

  function copySample() {
    void navigator.clipboard.writeText(sampleAiBlock("stock-case-create")).then(() => {
      setCopiedSample(true);
      setTimeout(() => setCopiedSample(false), 2000);
    });
  }

  function createGrant() {
    startGrantTransition(async () => {
      const result = await createBootstrapAiGrantAction();
      if ("error" in result) {
        setError(result.error);
        setGrantLinks(null);
        return;
      }
      setError(null);
      setGrantLinks(result);
    });
  }

  function applyBlock() {
    startTransition(async () => {
      setError(null);
      setImportSuccess(null);
      const result = await importStockCaseBlockAction(aiBlockRaw);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setImportSuccess({ id: result.inboxItemId });
      setAiBlockRaw("");
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
                Analyze in your AI chat → one <code className="text-violet-300">stock-case-create</code>{" "}
                block → Inbox Apply (Profile + Evidence + optional Scout).
              </p>
            </div>
            <Link
              href="/planning"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 lg:mr-[11rem]"
            >
              ← Scouting Desk
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 lg:px-6">
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4 text-xs text-zinc-500">
            <p className="font-medium text-zinc-400">Two layers in one paste</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>
                <span className="text-violet-300">Stock Profile</span> — zones, invalidation, hypothesis,
                historicalAnalysis → Evidence rows
              </li>
              <li>
                <span className="text-emerald-300">initialScout</span> (optional) — entry, stop, target,
                window → PLAN-xxx
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-violet-500/40 bg-violet-950/15 p-5">
            <h2 className="text-sm font-semibold text-violet-200">1 · Start in your AI</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Copy the boot package → paste in your external AI → discuss charts, photos, thesis. Ask for
              one JSON block when ready.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyBoot}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                {copiedBoot ? "Copied boot package" : "Copy boot package"}
              </button>
              <button
                type="button"
                onClick={copySample}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
              >
                {copiedSample ? "Copied" : "Example block"}
              </button>
              <button
                type="button"
                onClick={createGrant}
                disabled={grantPending}
                className="rounded-lg border border-violet-500/40 px-3 py-2 text-xs text-violet-300 hover:bg-violet-500/10 disabled:opacity-50"
              >
                {grantPending ? "Creating…" : "Create AI access link (24h)"}
              </button>
            </div>
            {grantLinks ? (
              <dl className="mt-4 space-y-2 rounded-xl border border-violet-500/30 bg-zinc-950/60 p-4 text-xs">
                <div>
                  <dt className="text-zinc-500">Human page (share with AI user)</dt>
                  <dd>
                    <a href={grantLinks.humanPageUrl} className="break-all text-violet-300 hover:underline">
                      {grantLinks.humanPageUrl}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Context API — GET for your AI</dt>
                  <dd className="break-all font-mono text-zinc-400">{grantLinks.contextUrl}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Inbox API — POST stock-case-create</dt>
                  <dd className="break-all font-mono text-zinc-400">{grantLinks.inboxUrl}</dd>
                </div>
              </dl>
            ) : null}
          </section>

          <section className="rounded-2xl border border-emerald-500/30 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">2 · Paste AI output & send to Inbox</h2>
            <p className="mt-1 text-xs text-zinc-500">
              The JSON from your chat includes thesis, zones, history, and optional initialScout. Human
              Apply in Inbox — same gate as trades.
            </p>
            <textarea
              value={aiBlockRaw}
              onChange={(e) => setAiBlockRaw(e.target.value)}
              rows={12}
              placeholder='Paste stock-case-create JSON from your AI chat'
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
                Valid · {String(preview.payload.proposal.ticker)}
                {preview.payload.proposal.initialScout ? " · includes initialScout" : ""}
              </div>
            ) : null}

            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

            {importSuccess ? (
              <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
                Sent to Inbox ·{" "}
                <Link href={`/inbox/${importSuccess.id}`} className="font-semibold underline">
                  Review & Apply →
                </Link>
                {" · "}
                <Link href="/planning" className="underline">
                  Scouting Desk
                </Link>
              </div>
            ) : null}

            <button
              type="button"
              onClick={applyBlock}
              disabled={pending || !preview?.ok}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {pending ? "Sending…" : "Accept proposal → Inbox"}
            </button>
          </section>

          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40">
            <button
              type="button"
              onClick={() => setShowNotesHelper((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <div>
                <p className="text-sm font-medium text-zinc-400">Boot package preview (optional)</p>
                <p className="mt-0.5 text-xs text-zinc-600">What Copy boot package sends to your AI.</p>
              </div>
              <span className="text-xs text-zinc-500">{showNotesHelper ? "Hide" : "Show"}</span>
            </button>
            {showNotesHelper ? (
              <pre className="max-h-64 overflow-auto border-t border-zinc-800 px-5 pb-5 pt-2 text-xs text-zinc-500 whitespace-pre-wrap">
                {bootPackage}
              </pre>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
