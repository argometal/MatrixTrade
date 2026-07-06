"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ImportAiBlockActionResult } from "@/app/actions";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import {
  formatPct,
  formatUsd,
  type AiBridgeOverviewData,
} from "@/lib/ai-bridge-overview";
import {
  AI_BLOCK_SAMPLE_OPTIONS,
  sampleAiBlock,
  type AiBlockType,
} from "@/lib/ai-block";

const REQUEST_QUICK_ACTIONS = [
  "Open a trade",
  "Adjust a trade",
  "Close a trade",
  "Analyze portfolio",
  "Review performance",
  "Other request",
] as const;

const REQUEST_EXAMPLES = [
  "Open long Google with stop 335 and target 450",
  "Close Google at 335",
  "Move AMZN stop to 175",
  "Analyze my last 10 trades",
] as const;

const HUMAN_ACTIONS = [
  {
    title: "Open trade",
    description: "Propose a new trade with entry, stop, shares, and optional target.",
  },
  {
    title: "Adjust trade",
    description: "Update stop, target, thesis, or playbook on an existing trade.",
  },
  {
    title: "Close trade",
    description: "Close an open position at a specific exit price.",
  },
  {
    title: "Analyze",
    description: "Add notes, thesis, psychology, or lessons to a trade or portfolio.",
  },
  {
    title: "Other",
    description: "Playbook updates, reviews, or any structured proposal your assistant returns.",
  },
] as const;

function SectionBadge({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white">
      {n}
    </span>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "neutral";
}) {
  const valueClass =
    tone === "pos"
      ? "text-emerald-600"
      : tone === "neg"
        ? "text-red-600"
        : "text-zinc-900";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

export function HomeDashboardMain({
  snapshotText,
  overview,
  pendingInboxCount,
  cycleLabel,
  importAction,
}: {
  snapshotText: string;
  overview: AiBridgeOverviewData;
  pendingInboxCount: number;
  cycleLabel: string;
  importAction: (formData: FormData) => Promise<ImportAiBlockActionResult>;
}) {
  const [snapshotCopied, setSnapshotCopied] = useState(false);
  const [requestCopied, setRequestCopied] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [pasteValue, setPasteValue] = useState("");
  const [sampleType, setSampleType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ inboxItemId: string; origin: string } | null>(
    null
  );
  const [pending, startTransition] = useTransition();

  async function handleCopySnapshot() {
    const ok = await copyText(snapshotText);
    if (ok) {
      setSnapshotCopied(true);
      setTimeout(() => setSnapshotCopied(false), 2000);
    }
  }

  async function handleCopyRequest() {
    const text = requestText.trim();
    if (!text) return;
    const ok = await copyText(text);
    if (ok) {
      setRequestCopied(true);
      setTimeout(() => setRequestCopied(false), 2000);
    }
  }

  function handleSampleSelect(type: string) {
    setSampleType(type);
    if (!type) return;
    setPasteValue(sampleAiBlock(type as AiBlockType));
  }

  function handleImport(formData: FormData) {
    setError(null);
    setImportResult(null);
    startTransition(async () => {
      const result = await importAction(formData);
      if ("error" in result) {
        setError(
          result.details?.length
            ? `${result.error}: ${result.details.join("; ")}`
            : result.error
        );
        return;
      }
      setImportResult({ inboxItemId: result.inboxItemId, origin: result.origin });
      setPasteValue("");
      setSampleType("");
    });
  }

  const pnlTone = overview.totalPnL > 0 ? "pos" : overview.totalPnL < 0 ? "neg" : "neutral";
  const expectancyUsd =
    overview.expectancyR !== null && overview.closedCycle.closed > 0
      ? overview.totalPnL / overview.closedCycle.closed
      : null;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
              Cycle {cycleLabel} trades
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Your bridge to any AI. You think in actions. AI handles the rest.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Copy context, ask naturally, import one proposal — approve before anything changes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopySnapshot}
            className="shrink-0 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            {snapshotCopied ? "✓ Snapshot copied" : "Copy Snapshot"}
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <SectionBadge n={1} />
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Give AI context</h2>
            <p className="text-sm text-zinc-500">Snapshot — current MatrixTrade state for your assistant.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Open trades" value={String(overview.openTrades)} />
          <MetricCard label="Pending" value={String(overview.pendingTrades)} />
          <MetricCard
            label="Closed (cycle)"
            value={`${overview.closedCycle.closed} / ${overview.closedCycle.max}`}
          />
          <MetricCard label="Total P/L" value={formatUsd(overview.totalPnL)} tone={pnlTone} />
          <MetricCard label="Win rate" value={formatPct(overview.winRate)} />
          <MetricCard
            label="Expectancy"
            value={expectancyUsd !== null ? formatUsd(expectancyUsd) : "—"}
            tone={
              expectancyUsd !== null && expectancyUsd > 0
                ? "pos"
                : expectancyUsd !== null && expectancyUsd < 0
                  ? "neg"
                  : "neutral"
            }
          />
        </div>
        {(overview.playbookSummary.best || overview.playbookSummary.worst) && (
          <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-700">
            <p className="font-medium text-zinc-800">Playbook summary</p>
            {overview.playbookSummary.best && (
              <p className="mt-1">
                Best: {overview.playbookSummary.best.name}{" "}
                <span className="text-emerald-600">{formatUsd(overview.playbookSummary.best.pnl)}</span>
              </p>
            )}
            {overview.playbookSummary.worst && (
              <p>
                Worst: {overview.playbookSummary.worst.name}{" "}
                <span className="text-red-600">{formatUsd(overview.playbookSummary.worst.pnl)}</span>
              </p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={handleCopySnapshot}
          className="mt-4 rounded-lg border border-violet-200 px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-50"
        >
          {snapshotCopied ? "✓ Snapshot copied" : "Copy Snapshot"}
        </button>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <SectionBadge n={2} />
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Send your request to AI</h2>
            <p className="text-sm text-zinc-500">Write in normal language — no JSON required.</p>
          </div>
        </div>
        <textarea
          value={requestText}
          onChange={(e) => setRequestText(e.target.value)}
          rows={4}
          placeholder="Example: Open long Google with stop 335 and target 450, or Move my stop on AMZN to 175"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {REQUEST_QUICK_ACTIONS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setRequestText(label)}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-violet-200 hover:bg-violet-50"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {REQUEST_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setRequestText(example)}
              className="rounded-full border border-dashed border-zinc-200 px-3 py-1 text-xs text-zinc-500 hover:border-violet-200 hover:text-violet-800"
            >
              {example}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!requestText.trim()}
            onClick={handleCopyRequest}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {requestCopied ? "✓ Request copied" : "Copy Request"}
          </button>
          <p className="text-xs text-zinc-500">Paste into your assistant — no API call from MatrixTrade.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <SectionBadge n={3} />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-zinc-900">AI will respond with a proposal</h2>
            <p className="text-sm text-zinc-500">
              Paste the AI Block here. Review in Inbox before Apply.
            </p>
          </div>
          {pendingInboxCount > 0 && (
            <Link
              href="/inbox"
              className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800 hover:bg-violet-200"
            >
              {pendingInboxCount} in Inbox
            </Link>
          )}
        </div>

        {!pasteValue.trim() && !importResult && (
          <div className="mb-4 rounded-xl border border-dashed border-violet-200 bg-violet-50/50 px-4 py-8 text-center text-sm text-violet-900/80">
            <p className="font-medium">AI Block will appear here</p>
            <p className="mt-1 text-xs text-violet-800/70">
              Review the proposal → Inbox → Apply → Supabase. Nothing writes until you apply.
            </p>
          </div>
        )}

        {error && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {importResult && (
          <div className="mb-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <p className="font-medium">Imported to Inbox — next: Review → Apply</p>
            <dl className="grid gap-2 font-mono text-xs sm:grid-cols-2">
              <div>
                <dt className="text-emerald-800">inboxItemId</dt>
                <dd className="break-all">{importResult.inboxItemId}</dd>
              </div>
              <div>
                <dt className="text-emerald-800">origin</dt>
                <dd>{importResult.origin}</dd>
              </div>
            </dl>
            <Link
              href={`/inbox/${importResult.inboxItemId}?origin=${importResult.origin}`}
              className="inline-block rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Open Inbox
            </Link>
          </div>
        )}

        <form action={handleImport} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-zinc-700">Paste AI Block</span>
            <textarea
              name="aiBlock"
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              rows={12}
              placeholder='{ "type": "trade-proposal", "proposal": { ... } }'
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs focus:border-violet-500 focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="submit"
              disabled={pending || !pasteValue.trim()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {pending ? "Importing…" : "Import AI Block"}
            </button>
            <label className="block min-w-[14rem] flex-1 space-y-1">
              <span className="text-sm text-zinc-700">Load sample format</span>
              <select
                value={sampleType}
                onChange={(e) => handleSampleSelect(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              >
                <option value="">Choose block type…</option>
                {AI_BLOCK_SAMPLE_OPTIONS.map((option) => (
                  <option key={option.type} value={option.type}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-zinc-500">🔒 Nothing is written to Supabase until you apply in Inbox.</p>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <SectionBadge n={4} />
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Human actions AI understands</h2>
            <p className="text-sm text-zinc-500">You speak in actions — AI maps them to one structured block.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {HUMAN_ACTIONS.map((action) => (
            <div key={action.title} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-center">
              <p className="font-medium text-zinc-900">{action.title}</p>
              <p className="mt-2 text-xs text-zinc-600">{action.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
