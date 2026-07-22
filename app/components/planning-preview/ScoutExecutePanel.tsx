"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { sampleAiBlock } from "@/lib/ai-block";
import {
  buildTradeProposalBlock,
  type TradeProposalFields,
} from "@/lib/build-trade-proposal-block";
import { buildTradeBootPackage } from "@/lib/trade-boot";
import { buildTradeLevelsView } from "@/lib/trade-levels-preview";
import type { TradeProspect } from "@/lib/trade-prospects";
import { prospectToPrefill } from "@/lib/trade-prospects";
import type { Playbook } from "@/lib/playbook-types";
import type { TradePlan } from "@/lib/plan-types";
import { FamilyBChecklist } from "@/app/components/playbook/FamilyBChecklist";
import { FamilyBBullTrendPanel } from "@/app/components/planning-preview/FamilyBBullTrendPanel";

function buildExecuteFormState(
  plan: TradePlan | null,
  prefill: ReturnType<typeof prospectToPrefill> | undefined,
  suggestedTradeId: string
) {
  return {
    id: suggestedTradeId,
    ticker: prefill?.ticker ?? plan?.ticker ?? "",
    direction: "long" as "long" | "short",
    entry: prefill?.entry ?? (plan?.plannedEntry !== undefined ? String(plan.plannedEntry) : ""),
    stop: prefill?.stop ?? (plan?.stopPrice !== undefined ? String(plan.stopPrice) : ""),
    target: prefill?.target ?? (plan?.targetPrice !== undefined ? String(plan.targetPrice) : ""),
    shares: "10",
    playbookId: prefill?.playbookId ?? plan?.playbookId ?? "",
    notes: plan ? `From plan ${plan.id}` : "",
  };
}

/**
 * Execution strip migrated from Enter Trade / NewTradeScoutFlow.
 * Primary path: copy boot → AI → Control → Apply → Accept.
 * Manual form kept (collapsed) so no capability is lost.
 */
export function ScoutExecutePanel({
  plan,
  prospect,
  prospects,
  playbooks,
  suggestedTradeId,
  monthlyLossRoom,
}: {
  plan: TradePlan | null;
  prospect: TradeProspect | null;
  prospects: TradeProspect[];
  playbooks: Playbook[];
  suggestedTradeId: string;
  monthlyLossRoom: number;
}) {
  const [copiedBoot, setCopiedBoot] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);
  const [copiedProposal, setCopiedProposal] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prefill = useMemo(
    () => (prospect ? prospectToPrefill(prospect) : undefined),
    [prospect]
  );

  const [form, setForm] = useState(() =>
    buildExecuteFormState(plan, prefill, suggestedTradeId)
  );

  // Mirror NewTradeScoutFlow: useState init alone is not enough —
  // PreviewPlanning keeps this panel mounted while Case/ticker changes.
  useEffect(() => {
    setForm(buildExecuteFormState(plan, prefill, suggestedTradeId));
  }, [plan?.id, prospect?.planId, suggestedTradeId, plan, prefill]);

  const bootPackage = useMemo(
    () =>
      buildTradeBootPackage({
        suggestedTradeId,
        playbooks: playbooks.map((p) => ({ id: p.id, name: p.name })),
        monthlyLossRoom,
        prospects,
        scoutPrefill:
          plan || prefill
            ? {
                planId: plan?.id ?? prefill?.planId,
                ticker: prefill?.ticker ?? plan?.ticker,
                entry: prefill?.entry,
                stop: prefill?.stop,
                target: prefill?.target,
                playbookId: prefill?.playbookId ?? plan?.playbookId,
              }
            : undefined,
      }),
    [suggestedTradeId, playbooks, monthlyLossRoom, prospects, plan, prefill]
  );

  const levelsView =
    form.entry && form.stop
      ? buildTradeLevelsView({
          id: form.id || "—",
          ticker: form.ticker || plan?.ticker || "",
          entry: parseFloat(form.entry),
          stop: parseFloat(form.stop),
          target: form.target ? parseFloat(form.target) : undefined,
          shares: parseInt(form.shares, 10) || 10,
        })
      : plan?.plannedEntry !== undefined && plan.stopPrice !== undefined
        ? buildTradeLevelsView({
            id: "—",
            ticker: plan.ticker,
            entry: plan.plannedEntry,
            stop: plan.stopPrice,
            target: plan.targetPrice,
            shares: 10,
          })
        : null;

  async function copyText(text: string, kind: "boot" | "sample" | "proposal") {
    const ok = await navigator.clipboard.writeText(text).then(
      () => true,
      () => false
    );
    if (!ok) {
      setError("Clipboard blocked — copy manually from preview.");
      return;
    }
    setError(null);
    if (kind === "boot") {
      setCopiedBoot(true);
      setTimeout(() => setCopiedBoot(false), 2000);
    } else if (kind === "sample") {
      setCopiedSample(true);
      setTimeout(() => setCopiedSample(false), 2000);
    } else {
      setCopiedProposal(true);
      setTimeout(() => setCopiedProposal(false), 2000);
    }
  }

  function buildFromForm(): TradeProposalFields | null {
    const entry = parseFloat(form.entry);
    const stop = parseFloat(form.stop);
    const shares = parseInt(form.shares, 10);
    const target = form.target.trim() ? parseFloat(form.target) : undefined;
    if (
      !form.id.trim() ||
      !form.ticker.trim() ||
      Number.isNaN(entry) ||
      Number.isNaN(stop) ||
      Number.isNaN(shares)
    ) {
      setError("Fill ID, ticker, entry, stop, and shares.");
      return null;
    }
    return {
      id: form.id,
      ticker: form.ticker,
      entry,
      stop,
      shares,
      target,
      thesis: form.notes || undefined,
      playbookId: form.playbookId || undefined,
      direction: form.direction,
    };
  }

  function handleCopyProposal() {
    const fields = buildFromForm();
    if (!fields) return;
    void copyText(buildTradeProposalBlock(fields), "proposal");
  }

  if (!plan) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-300">Execute</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Select a stock file with an active scout to copy the boot package.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-4">
      <h2 className="text-sm font-semibold text-emerald-200">Execute · {plan.id}</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Copy boot → AI → <span className="text-emerald-300/90">Control → Apply → Accept</span>.
      </p>
      {plan.status === "expired" ? (
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          Plan expired — still valid to update. Paste a decision-update with{" "}
          <code className="text-amber-100">status: &quot;watching&quot;</code>, new{" "}
          <code className="text-amber-100">validUntil</code>, and strategy levels (target/stop/entry).
        </p>
      ) : null}

      {levelsView ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {levelsView.rows.map((row) => (
            <div key={row.label} className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-1.5">
              <dt className="text-zinc-600">{row.label}</dt>
              <dd className="tabular-nums text-zinc-200">{row.value}</dd>
            </div>
          ))}
          {plan.plannedRR !== undefined ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-1.5">
              <dt className="text-zinc-600">Planned R:R</dt>
              <dd className="font-medium text-emerald-400">{plan.plannedRR.toFixed(1)}R</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-3 text-xs text-amber-400/90">Set entry + stop on this scout for R map.</p>
      )}

      <div className="mt-3">
        {plan ? (
          <FamilyBBullTrendPanel plan={plan} compact />
        ) : (
          <FamilyBChecklist playbookId={form.playbookId} compact />
        )}
      </div>

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyText(bootPackage, "boot")}
          className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500"
        >
          {copiedBoot ? "Copied boot" : "Copy trade boot package"}
        </button>
        <button
          type="button"
          onClick={() => void copyText(sampleAiBlock("trade-proposal"), "sample")}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
        >
          {copiedSample ? "Copied" : "Example block"}
        </button>
        <Link
          href={`/trades?tab=open`}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Trades book →
        </Link>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40">
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <div>
            <p className="text-sm font-medium text-zinc-400">Manual levels → JSON</p>
            <p className="mt-0.5 text-xs text-zinc-600">Builds trade-proposal; paste in Control.</p>
          </div>
          <span className="text-xs text-zinc-500">{showManual ? "Hide" : "Show"}</span>
        </button>
        {showManual ? (
          <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["id", "Trade ID"],
                  ["ticker", "Ticker"],
                  ["entry", "Entry"],
                  ["stop", "Stop"],
                  ["target", "Target"],
                  ["shares", "Shares"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs">
                  <span className="text-zinc-500">{label}</span>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
              <label className="block text-xs sm:col-span-2">
                <span className="text-zinc-500">Playbook</span>
                <select
                  value={form.playbookId}
                  onChange={(e) => setForm((f) => ({ ...f, playbookId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                >
                  <option value="">— Optional —</option>
                  {playbooks.map((pb) => (
                    <option key={pb.id} value={pb.id}>
                      {pb.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={handleCopyProposal}
              className="mt-3 w-full rounded-lg border border-emerald-500/40 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-600/10"
            >
              {copiedProposal ? "Copied — paste in Control → Apply" : "Copy trade-proposal JSON"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
