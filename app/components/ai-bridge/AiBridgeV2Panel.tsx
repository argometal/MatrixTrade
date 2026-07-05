"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { ImportAiBlockActionResult } from "@/app/actions";
import {
  AI_BRIDGE_HUMAN_ACTIONS,
  type AiBridgeHumanAction,
} from "@/lib/ai-bridge-human-actions";
import type { AiBridgeLiveSnapshot } from "@/lib/ai-bridge-live-snapshot";
import {
  AI_BRIDGE_V2_ACTION_MAP,
  AI_BRIDGE_V2_DEFAULT_CHIPS,
  AI_BRIDGE_V2_HOW_IT_WORKS,
  AI_BRIDGE_V2_NATURAL_EXAMPLES,
  AI_BRIDGE_V2_PROTOCOL,
  AI_BRIDGE_V2_WHATS_NEW,
  buildAiBridgeHandoffText,
} from "@/lib/ai-bridge-v2-content";
import { parseAiBlock } from "@/lib/ai-block";
import { describeProposal } from "@/lib/bridge";
import { AiBridgeSnapshotPanel } from "./AiBridgeSnapshotPanel";

const ACTION_STYLES: Record<
  AiBridgeHumanAction,
  { ring: string; icon: string; bg: string; text: string }
> = {
  open: {
    ring: "ring-emerald-200 hover:ring-emerald-400",
    icon: "↗",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
  },
  adjust: {
    ring: "ring-blue-200 hover:ring-blue-400",
    icon: "↔",
    bg: "bg-blue-50",
    text: "text-blue-800",
  },
  close: {
    ring: "ring-red-200 hover:ring-red-400",
    icon: "✕",
    bg: "bg-red-50",
    text: "text-red-800",
  },
  analyze: {
    ring: "ring-violet-200 hover:ring-violet-400",
    icon: "◎",
    bg: "bg-violet-50",
    text: "text-violet-800",
  },
};

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
  const [selectedAction, setSelectedAction] = useState<AiBridgeHumanAction>("open");
  const [message, setMessage] = useState("");
  const [proposalText, setProposalText] = useState("");
  const [copiedHandoff, setCopiedHandoff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ inboxItemId: string; origin: string } | null>(
    null
  );
  const [showHelp, setShowHelp] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [pending, startTransition] = useTransition();

  const chips = AI_BRIDGE_V2_DEFAULT_CHIPS[selectedAction];
  const selectedLabel =
    AI_BRIDGE_HUMAN_ACTIONS.find((a) => a.id === selectedAction)?.label ?? "Open Trade";

  const proposalPreview = useMemo(() => {
    if (!proposalText.trim()) return null;
    const parsed = parseAiBlock(proposalText);
    if (!parsed.ok) return { ok: false as const, error: parsed.error };
    return {
      ok: true as const,
      summary: describeProposal(parsed.payload),
    };
  }, [proposalText]);

  async function handleSendToAiBridge() {
    const handoff = buildAiBridgeHandoffText(selectedLabel, message, snapshotText);
    const ok = await copyText(handoff);
    if (ok) {
      setCopiedHandoff(true);
      setTimeout(() => setCopiedHandoff(false), 2500);
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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">AI Bridge</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Tell AI what you want to do. AI handles the details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            How to use
          </button>
          <button
            type="button"
            onClick={() => setShowExamples((v) => !v)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Examples
          </button>
          {viewToggle}
        </div>
      </header>

      {(showHelp || showExamples) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {showHelp && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
              <h2 className="font-semibold text-zinc-800">How it works</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-600">
                {AI_BRIDGE_V2_HOW_IT_WORKS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          )}
          {showExamples && (
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 text-sm">
              <h2 className="font-semibold text-violet-900">Natural request examples</h2>
              <ul className="mt-2 space-y-2">
                {AI_BRIDGE_V2_NATURAL_EXAMPLES.map((ex) => (
                  <li
                    key={ex}
                    className="rounded-lg bg-white/80 px-3 py-2 text-xs text-violet-950"
                  >
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[200px_minmax(0,1fr)_280px_220px]">
        <aside className="hidden space-y-6 xl:block">
          <SidebarBlock title="Human actions">
            <ul className="space-y-3 text-xs text-zinc-600">
              {AI_BRIDGE_HUMAN_ACTIONS.map((action) => (
                <li key={action.id}>
                  <span className="font-semibold text-zinc-800">{action.label}</span>
                  <p className="mt-0.5">{action.hint}</p>
                </li>
              ))}
            </ul>
          </SidebarBlock>
          <SidebarBlock title="How it works">
            <ol className="list-decimal space-y-1 pl-4 text-xs text-zinc-600">
              {AI_BRIDGE_V2_HOW_IT_WORKS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </SidebarBlock>
        </aside>

        <main className="min-w-0 space-y-6">
          <section className="space-y-3">
            <StepLabel n={1} title="Choose an action" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {AI_BRIDGE_HUMAN_ACTIONS.map((action) => {
                const style = ACTION_STYLES[action.id];
                const active = selectedAction === action.id;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => setSelectedAction(action.id)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center transition ring-2 ring-offset-2 ${style.ring} ${
                      active
                        ? `${style.bg} border-current ${style.text} shadow-sm`
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <span className={`text-2xl ${active ? style.text : "text-zinc-400"}`}>
                      {style.icon}
                    </span>
                    <span className="text-sm font-semibold">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <StepLabel n={2} title="Tell AI what you want to do" />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Describe your idea in your own words… Be as simple or detailed as you want."
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setMessage(chip)}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-900"
                >
                  {chip}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSendToAiBridge}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-600"
            >
              <span aria-hidden>✦</span>
              {copiedHandoff ? "✓ Copied for your AI" : "Send to AI Bridge"}
            </button>
            <p className="text-center text-xs text-zinc-500">
              Copies snapshot + your request. AI will propose a block. You decide what to do next.
            </p>
          </section>

          <section className="space-y-3">
            <StepLabel n={3} title="AI Bridge will respond with a proposal" />
            <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/30 p-4">
              {!proposalText.trim() && !importResult && (
                <div className="py-4 text-center text-sm text-violet-900/70">
                  <p className="font-medium">AI proposal will appear here.</p>
                  <p className="mt-1 text-xs">Exactly one block. Ready for your review.</p>
                  <ul className="mx-auto mt-3 max-w-sm space-y-1 text-left text-xs text-violet-800/80">
                    <li>✓ AI decides the right action</li>
                    <li>✓ You review before applying</li>
                    <li>✓ Nothing is written without your approval</li>
                  </ul>
                </div>
              )}
              <textarea
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
                rows={8}
                placeholder="Paste your AI's JSON response here…"
                className="w-full rounded-lg border border-violet-100 bg-white px-3 py-2 font-mono text-xs text-zinc-800 focus:border-violet-300 focus:outline-none"
              />
              {proposalPreview?.ok && (
                <div className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-100">
                  <span className="font-medium">Ready to import:</span> {proposalPreview.summary}
                </div>
              )}
              {proposalPreview && !proposalPreview.ok && (
                <p className="mt-2 text-xs text-amber-800">{proposalPreview.error}</p>
              )}
              {error && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>
              )}
              {importResult && (
                <div className="mt-3 space-y-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
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
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {pending ? "Importing…" : "Import to Inbox"}
                </button>
                {pendingInboxCount > 0 && (
                  <Link
                    href="/inbox"
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Inbox ({pendingInboxCount})
                  </Link>
                )}
              </div>
            </div>
          </section>
        </main>

        <AiBridgeSnapshotPanel snapshot={liveSnapshot} />

        <aside className="hidden space-y-4 xl:block">
          <SidebarBlock title="What's new">
            <ul className="space-y-1.5 text-xs text-zinc-600">
              {AI_BRIDGE_V2_WHATS_NEW.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-emerald-600">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </SidebarBlock>
          <SidebarBlock title="AI Bridge protocol">
            <ol className="list-decimal space-y-1 pl-4 text-xs text-zinc-600">
              {AI_BRIDGE_V2_PROTOCOL.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </SidebarBlock>
          <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs text-violet-950">
            <p className="font-semibold">Always remember</p>
            <p className="mt-1">You are in control. AI proposes. You decide.</p>
          </div>
        </aside>
      </div>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          How AI maps human actions to internal block types (internally)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="text-zinc-400">
                <th className="pb-2 pr-4 font-medium">Human action</th>
                <th className="pb-2 pr-4 font-medium">Internal type</th>
                <th className="pb-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="text-zinc-700">
              {AI_BRIDGE_V2_ACTION_MAP.map((row) => (
                <tr key={row.action} className="border-t border-zinc-200/80">
                  <td className="py-2 pr-4 font-medium">{row.action}</td>
                  <td className="py-2 pr-4 font-mono text-[11px]">{row.internal}</td>
                  <td className="py-2">{row.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-medium text-zinc-600">
          <FlowStep icon="✦" label="AI Proposes" />
          <span className="text-zinc-300">→</span>
          <FlowStep icon="📥" label="Inbox" />
          <span className="text-zinc-300">→</span>
          <FlowStep icon="👁" label="Review" />
          <span className="text-zinc-300">→</span>
          <FlowStep icon="→" label="Apply" />
          <span className="text-zinc-300">→</span>
          <FlowStep icon="🗄" label="Supabase" />
        </div>
        <p className="text-center text-[11px] text-zinc-400">The flow (unchanged)</p>
      </section>
    </div>
  );
}

function StepLabel({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-800">
        {n}
      </span>
      <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
    </div>
  );
}

function SidebarBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function FlowStep({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5">
      <span>{icon}</span>
      {label}
    </span>
  );
}
