"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { ImportAiBlockActionResult } from "@/app/actions";
import type { AiBridgeLiveSnapshot } from "@/lib/ai-bridge-live-snapshot";
import { formatSignedUsd } from "@/lib/ai-bridge-live-snapshot";
import {
  AI_BRIDGE_V2_AUTO_INCLUDE_OPTIONS,
  AI_BRIDGE_V2_HUMAN_ACTION_CARDS,
  AI_BRIDGE_V2_NATURAL_EXAMPLES,
  AI_BRIDGE_V2_REQUEST_PILLS,
  buildAiBridgeHandoffText,
  type AiBridgeRequestPill,
} from "@/lib/ai-bridge-v2-content";
import { parseAiBlock } from "@/lib/ai-block";
import { describeProposal } from "@/lib/bridge";
import { ArgusMark } from "@/app/components/ArgusMark";
import { AiBridgeV2RightPanel } from "./AiBridgeV2RightPanel";
import { AiBridgeV2Sidebar } from "./AiBridgeV2Sidebar";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
}

const CARD_COLORS: Record<string, string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  blue: "border-blue-200 bg-blue-50 text-blue-900",
  red: "border-red-200 bg-red-50 text-red-900",
  violet: "border-violet-200 bg-violet-50 text-violet-900",
  zinc: "border-zinc-200 bg-zinc-50 text-zinc-800",
};

export function AiBridgeV2Panel({
  snapshotText,
  liveSnapshot,
  pendingInboxCount,
  importAction,
  viewToggle,
}: {
  snapshotText: string;
  liveSnapshot: AiBridgeLiveSnapshot;
  pendingInboxCount: number;
  importAction: (formData: FormData) => Promise<ImportAiBlockActionResult>;
  viewToggle: React.ReactNode;
}) {
  const [selectedPill, setSelectedPill] = useState<AiBridgeRequestPill>("open");
  const [message, setMessage] = useState("");
  const [proposalText, setProposalText] = useState("");
  const [copiedSnapshot, setCopiedSnapshot] = useState(false);
  const [copiedSend, setCopiedSend] = useState(false);
  const [autoInclude, setAutoInclude] = useState<Record<string, boolean>>({
    Trades: true,
    Playbooks: true,
    Statistics: true,
    Notes: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ inboxItemId: string; origin: string } | null>(
    null
  );
  const [showHelp, setShowHelp] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [pending, startTransition] = useTransition();

  const activePill = AI_BRIDGE_V2_REQUEST_PILLS.find((p) => p.id === selectedPill);
  const placeholder =
    message.trim() || activePill?.placeholder ||
    "Example: Open long Google with stop 335 and target 450 or Move my stop on AMZN to 175";

  const proposalPreview = useMemo(() => {
    if (!proposalText.trim()) return null;
    const parsed = parseAiBlock(proposalText);
    if (!parsed.ok) return { ok: false as const, error: parsed.error };
    return { ok: true as const, summary: describeProposal(parsed.payload) };
  }, [proposalText]);

  async function handleCopySnapshot() {
    const ok = await copyText(snapshotText);
    if (ok) {
      setCopiedSnapshot(true);
      setTimeout(() => setCopiedSnapshot(false), 2000);
    }
  }

  async function handleSendToAi() {
    const label = activePill?.label ?? "Request";
    const text =
      message.trim() ||
      activePill?.placeholder ||
      "Describe what you want your AI to do with your trading context.";
    const handoff = buildAiBridgeHandoffText(label, text, snapshotText);
    const ok = await copyText(handoff);
    if (ok) {
      setCopiedSend(true);
      setTimeout(() => setCopiedSend(false), 2000);
    }
  }

  function handleImport() {
    setError(null);
    setImportResult(null);
    const formData = new FormData();
    formData.set("aiBlock", proposalText);
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
      setProposalText("");
    });
  }

  function toggleAutoInclude(key: string) {
    setAutoInclude((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex min-h-[calc(100vh-2rem)] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm">
      <AiBridgeV2Sidebar
        pendingInboxCount={pendingInboxCount}
        closedCount={liveSnapshot.closedCount}
        maxTrades={liveSnapshot.maxTrades}
        viewToggle={viewToggle}
      />

      <div className="flex min-w-0 flex-1 flex-col xl:flex-row">
        <div className="min-w-0 flex-1 overflow-y-auto p-5 lg:p-6">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">AI Bridge</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Your bridge to any AI. You think in actions. AI handles the rest.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pr-12 sm:pr-14">
              <Link
                href="/argus/journal"
                title="Open ARGUS"
                aria-label="Open ARGUS journal"
                className="rounded-lg border border-teal-200 bg-white p-1 shadow-sm transition hover:border-teal-300 hover:shadow-md"
              >
                <ArgusMark size={32} />
              </Link>
              <button
                type="button"
                onClick={() => setShowHelp((v) => !v)}
                className="text-xs font-medium text-violet-700 hover:underline"
              >
                How it works
              </button>
              <button
                type="button"
                onClick={() => setShowExamples((v) => !v)}
                className="text-xs font-medium text-violet-700 hover:underline"
              >
                Examples
              </button>
              <Link href="/system" className="text-xs font-medium text-zinc-500 hover:underline">
                Docs
              </Link>
              <button
                type="button"
                onClick={handleCopySnapshot}
                className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-50"
              >
                {copiedSnapshot ? "✓ Copied" : "Copy Snapshot"}
              </button>
            </div>
          </header>

          {(showHelp || showExamples) && (
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {showHelp && (
                <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                  Copy snapshot → tell your AI in plain language → paste AI Block → Inbox → Apply.
                  Nothing writes to Supabase until you apply.
                </div>
              )}
              {showExamples && (
                <ul className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 text-xs text-violet-950">
                  {AI_BRIDGE_V2_NATURAL_EXAMPLES.map((ex) => (
                    <li key={ex} className="mt-1 first:mt-0">
                      • {ex}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <section className="mb-8 space-y-3">
            <StepHeader n={1} title="Give AI context (Snapshot)" />
            <p className="text-sm text-zinc-500">
              This is your current trading context. Copy it and paste into any AI.
            </p>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                <MiniStat label="Open Trades" value={String(liveSnapshot.openCount)} accent="emerald" />
                <MiniStat label="Pending" value={String(liveSnapshot.pendingCount)} />
                <MiniStat
                  label="Closed (Cycle)"
                  value={`${liveSnapshot.closedCount}/${liveSnapshot.maxTrades}`}
                  accent="blue"
                />
                <MiniStat
                  label="Total P&L"
                  value={formatSignedUsd(liveSnapshot.totalPnL)}
                  accent={liveSnapshot.totalPnL >= 0 ? "emerald" : "red"}
                />
                <MiniStat
                  label="Win Rate"
                  value={
                    liveSnapshot.winRatePercent !== null
                      ? `${liveSnapshot.winRatePercent}%`
                      : "—"
                  }
                />
                <MiniStat
                  label="Expectancy"
                  value={
                    liveSnapshot.expectancyPerTrade !== null
                      ? formatSignedUsd(liveSnapshot.expectancyPerTrade)
                      : "—"
                  }
                  accent="emerald"
                />
              </div>
              {(liveSnapshot.bestPlaybook || liveSnapshot.worstPlaybook) && (
                <div className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
                  <span className="font-semibold text-zinc-700">Playbook summary: </span>
                  {liveSnapshot.bestPlaybook && (
                    <span>
                      Best: {liveSnapshot.bestPlaybook.name} (
                      {formatSignedUsd(liveSnapshot.bestPlaybook.netPnL)})
                    </span>
                  )}
                  {liveSnapshot.worstPlaybook && (
                    <span className="ml-2">
                      Worst: {liveSnapshot.worstPlaybook.name} (
                      {formatSignedUsd(liveSnapshot.worstPlaybook.netPnL)})
                    </span>
                  )}
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={handleCopySnapshot}
                  className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600"
                >
                  {copiedSnapshot ? "✓ Snapshot copied" : "Copy Snapshot"}
                </button>
                <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
                  <span className="font-medium text-zinc-500">Auto-include:</span>
                  {AI_BRIDGE_V2_AUTO_INCLUDE_OPTIONS.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-center gap-1">
                      <input
                        type="checkbox"
                        checked={autoInclude[opt] ?? true}
                        onChange={() => toggleAutoInclude(opt)}
                        className="rounded border-zinc-300 text-violet-600"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8 space-y-3">
            <StepHeader n={2} title="Send your request to AI" />
            <p className="text-sm text-zinc-500">Tell AI what you want. Be natural.</p>
            <div className="relative rounded-xl border border-zinc-200 bg-white shadow-sm">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder={placeholder}
                className="w-full resize-none rounded-xl border-0 px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              <span
                className="absolute right-3 top-3 text-zinc-300"
                title="Voice input not available yet"
                aria-hidden
              >
                🎤
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AI_BRIDGE_V2_REQUEST_PILLS.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setSelectedPill(pill.id);
                    if (!message.trim()) setMessage(pill.placeholder);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    selectedPill === pill.id
                      ? "border-violet-300 bg-violet-100 text-violet-900"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-200"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSendToAi}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-600"
            >
              <span aria-hidden>✈</span>
              {copiedSend ? "✓ Copied for your AI" : "Send to AI"}
            </button>
          </section>

          <section className="mb-8 space-y-3">
            <StepHeader n={3} title="AI will respond with a proposal" />
            <p className="text-sm text-zinc-500">
              AI decides the right internal action and returns one AI Block.
            </p>
            <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-4">
              {!proposalText.trim() && !importResult && (
                <div className="mb-3 py-2 text-center text-sm text-violet-900/80">
                  <p className="font-medium">AI Block will appear here</p>
                  <p className="mt-1 text-xs">
                    Review the proposal → Inbox → Apply → Supabase
                  </p>
                  <p className="mt-2 flex items-center justify-center gap-1 text-xs text-violet-700/70">
                    <span aria-hidden>🔒</span>
                    Nothing is written to Supabase until you apply.
                  </p>
                </div>
              )}
              <textarea
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
                rows={6}
                placeholder="Paste your AI's JSON response here…"
                className="w-full rounded-lg border border-violet-100 bg-white px-3 py-2 font-mono text-xs focus:border-violet-300 focus:outline-none"
              />
              {proposalPreview?.ok && (
                <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-100">
                  <span className="font-medium">Ready:</span> {proposalPreview.summary}
                </p>
              )}
              {proposalPreview && !proposalPreview.ok && (
                <p className="mt-2 text-xs text-amber-800">{proposalPreview.error}</p>
              )}
              {error && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>
              )}
              {importResult && (
                <div className="mt-2 space-y-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
                  <p className="font-medium">Imported to Inbox</p>
                  <Link
                    href={`/inbox/${importResult.inboxItemId}?origin=${importResult.origin}`}
                    className="inline-block rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Review in Inbox →
                  </Link>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={pending || !proposalText.trim()}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {pending ? "Importing…" : "Import to Inbox"}
                </button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-zinc-800">
              Human actions AI understands
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {AI_BRIDGE_V2_HUMAN_ACTION_CARDS.map((card) => (
                <div
                  key={card.title}
                  className={`rounded-xl border p-3 ${CARD_COLORS[card.color] ?? CARD_COLORS.zinc}`}
                >
                  <span className="text-xl">{card.icon}</span>
                  <p className="mt-2 text-sm font-semibold">{card.title}</p>
                  <p className="mt-1 text-xs opacity-80">{card.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="border-t border-zinc-200 bg-zinc-50 p-5 xl:w-80 xl:border-l xl:border-t-0">
          <AiBridgeV2RightPanel snapshot={liveSnapshot} />
        </div>
      </div>
    </div>
  );
}

function StepHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
        {n}
      </span>
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "blue" | "red";
}) {
  const valueColor =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "red"
        ? "text-red-600"
        : accent === "blue"
          ? "text-blue-700"
          : "text-zinc-900";
  return (
    <div className="rounded-lg bg-zinc-50 px-2 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold tabular-nums ${valueColor}`}>{value}</div>
    </div>
  );
}
