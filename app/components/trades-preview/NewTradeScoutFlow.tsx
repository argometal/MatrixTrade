"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ImportAiBlockActionResult } from "@/app/actions";
import { TradeProspectPicker } from "@/app/components/trades-preview/TradeProspectPicker";
import { parseAiBlock, sampleAiBlock } from "@/lib/ai-block";
import {
  buildTradeProposalBlock,
  proposalRMultiple,
  type TradeProposalFields,
} from "@/lib/build-trade-proposal-block";
import { buildTradeBootPackage } from "@/lib/trade-boot";
import { buildTradeLevelsView } from "@/lib/trade-levels-preview";
import {
  findTradeProspect,
  prospectToPrefill,
  type TradeProspect,
} from "@/lib/trade-prospects";
import type { TradesWorkspaceData } from "@/lib/trades-workspace-types";

const rowEmphasis: Record<string, string> = {
  primary: "text-violet-300",
  danger: "text-red-400",
  success: "text-emerald-400",
  muted: "text-zinc-400",
};

export function NewTradeScoutFlow({
  data,
  importAction,
  prefill,
}: {
  data: TradesWorkspaceData;
  importAction: (formData: FormData) => Promise<ImportAiBlockActionResult>;
  prefill?: {
    ticker?: string;
    playbookId?: string;
    entry?: string;
    stop?: string;
    target?: string;
    planId?: string;
  };
}) {
  const [showManual, setShowManual] = useState(false);
  const [showBootPreview, setShowBootPreview] = useState(false);
  const [aiBlockRaw, setAiBlockRaw] = useState("");
  const [copiedBoot, setCopiedBoot] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<{ id: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedPlanId, setSelectedPlanId] = useState(prefill?.planId ?? "");

  const activePrefill = useMemo(() => {
    const fromProspect = findTradeProspect(data.prospects, selectedPlanId);
    if (fromProspect) return prospectToPrefill(fromProspect);
    if (prefill?.planId || prefill?.ticker) return prefill;
    return undefined;
  }, [data.prospects, selectedPlanId, prefill]);

  const [form, setForm] = useState({
    id: data.suggestedTradeId,
    ticker: prefill?.ticker ?? "",
    direction: "long" as "long" | "short",
    entry: prefill?.entry ?? "",
    stop: prefill?.stop ?? "",
    target: prefill?.target ?? "",
    shares: "10",
    playbookId: prefill?.playbookId ?? "",
    notes: prefill?.planId ? `From plan ${prefill.planId}` : "",
  });

  useEffect(() => {
    setSelectedPlanId(prefill?.planId ?? "");
  }, [prefill?.planId]);

  useEffect(() => {
    if (!activePrefill) return;
    setForm((current) => ({
      ...current,
      ticker: activePrefill.ticker ?? current.ticker,
      entry: activePrefill.entry ?? current.entry,
      stop: activePrefill.stop ?? current.stop,
      target: activePrefill.target ?? current.target,
      playbookId: activePrefill.playbookId ?? current.playbookId,
      notes: activePrefill.planId ? `From plan ${activePrefill.planId}` : current.notes,
    }));
  }, [activePrefill]);

  const bootPackage = useMemo(
    () =>
      buildTradeBootPackage({
        suggestedTradeId: data.suggestedTradeId,
        playbooks: data.playbooks,
        monthlyLossRoom: data.monthlyLossRoom,
        prospects: data.prospects,
        scoutPrefill:
          activePrefill?.planId || activePrefill?.ticker
            ? {
                planId: activePrefill.planId,
                ticker: activePrefill.ticker,
                entry: activePrefill.entry,
                stop: activePrefill.stop,
                target: activePrefill.target,
                playbookId: activePrefill.playbookId,
              }
            : undefined,
      }),
    [data, activePrefill]
  );

  function handleProspectSelect(prospect: TradeProspect | null) {
    setSelectedPlanId(prospect?.planId ?? "");
    setProposalError(null);
    setImportSuccess(null);
  }

  const preview = useMemo(() => {
    if (!aiBlockRaw.trim()) return null;
    return parseAiBlock(aiBlockRaw);
  }, [aiBlockRaw]);

  const proposalBody =
    preview?.ok && preview.body.proposal && typeof preview.body.proposal === "object"
      ? (preview.body.proposal as Record<string, unknown>)
      : null;

  const levelsView = proposalBody ? buildTradeLevelsView(proposalBody) : null;

  function copyBoot() {
    void navigator.clipboard.writeText(bootPackage).then(() => {
      setCopiedBoot(true);
      setTimeout(() => setCopiedBoot(false), 2000);
    });
  }

  function copySample() {
    void navigator.clipboard.writeText(sampleAiBlock("trade-proposal")).then(() => {
      setCopiedSample(true);
      setTimeout(() => setCopiedSample(false), 2000);
    });
  }

  function buildFromForm(): TradeProposalFields | null {
    const entry = parseFloat(form.entry);
    const stop = parseFloat(form.stop);
    const shares = parseInt(form.shares, 10);
    const target = form.target.trim() ? parseFloat(form.target) : undefined;
    if (!form.id.trim() || !form.ticker.trim() || Number.isNaN(entry) || Number.isNaN(stop) || Number.isNaN(shares)) {
      setProposalError("Fill ID, ticker, entry, stop, and shares.");
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

  function handleManualReview() {
    const fields = buildFromForm();
    if (!fields) return;
    setProposalError(null);
    setImportSuccess(null);
    setAiBlockRaw(buildTradeProposalBlock(fields));
  }

  function handleAcceptProposal() {
    if (!aiBlockRaw.trim() || !preview?.ok) return;
    setProposalError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("aiBlock", aiBlockRaw);
      const result = await importAction(fd);
      if ("error" in result) {
        setProposalError(
          result.details?.length ? `${result.error}: ${result.details.join("; ")}` : result.error
        );
        return;
      }
      setImportSuccess({ id: result.inboxItemId });
      setAiBlockRaw("");
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 lg:px-6">
      <TradeProspectPicker
        prospects={data.prospects}
        selectedPlanId={selectedPlanId}
        onSelect={handleProspectSelect}
      />


      <section className="rounded-2xl border border-violet-500/40 bg-violet-950/15 p-5">
        <h2 className="text-sm font-semibold text-violet-200">1 · Start in your AI</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Copy the trade boot package → paste in your external AI → final sizing and emotion check.
          Ask for one <code className="text-violet-300">trade-proposal</code> JSON block when ready.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyBoot}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            {copiedBoot ? "Copied boot package" : "Copy trade boot package"}
          </button>
          <button
            type="button"
            onClick={copySample}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
          >
            {copiedSample ? "Copied" : "Example block"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-500/30 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold text-zinc-200">2 · Paste AI output & send to Inbox</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Validate levels and R:R before Accept. Same pipeline as Scout — proposal only until you
          Apply.
        </p>
        <textarea
          value={aiBlockRaw}
          onChange={(e) => {
            setAiBlockRaw(e.target.value);
            setProposalError(null);
            setImportSuccess(null);
          }}
          rows={12}
          placeholder='Paste trade-proposal JSON from your AI chat'
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

        {preview?.ok && proposalBody ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
              Valid · {String(proposalBody.ticker)} · {String(proposalBody.id)}
              {levelsView?.plannedRR !== undefined
                ? ` · ${levelsView.plannedRR.toFixed(2)}R`
                : ""}
            </div>
            {levelsView ? (
              <div className="rounded-xl border border-violet-500/20 bg-violet-950/15 p-4">
                <p className="text-xs uppercase tracking-wide text-violet-400">Trade map</p>
                <dl className="mt-3 space-y-2">
                  {levelsView.rows.map((row) => (
                    <div key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
                      <dt className="text-xs text-zinc-500">{row.label}</dt>
                      <dd className={`tabular-nums ${rowEmphasis[row.emphasis ?? "muted"] ?? "text-zinc-300"}`}>
                        {row.value}
                        {row.detail ? (
                          <span className="ml-1 text-xs text-zinc-500">{row.detail}</span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                  {proposalBody.target !== undefined &&
                  typeof proposalBody.entry === "number" &&
                  typeof proposalBody.stop === "number" ? (
                    <div className="flex items-baseline justify-between gap-3 border-t border-zinc-800 pt-2 text-sm">
                      <dt className="text-xs text-zinc-500">Planned R:R</dt>
                      <dd className="font-medium text-emerald-400">
                        {proposalRMultiple(
                          Number(proposalBody.entry),
                          Number(proposalBody.stop),
                          Number(proposalBody.target)
                        )}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {typeof proposalBody.thesis === "string" && proposalBody.thesis.trim() ? (
                  <p className="mt-3 text-sm text-zinc-400">{proposalBody.thesis}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {proposalError ? <p className="mt-3 text-sm text-red-400">{proposalError}</p> : null}

        {importSuccess ? (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
            Sent to Inbox ·{" "}
            <Link href={`/inbox/${importSuccess.id}`} className="font-semibold underline">
              Review proposal →
            </Link>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleAcceptProposal}
          disabled={pending || !preview?.ok}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Accept proposal → Inbox"}
        </button>
        <p className="mt-2 text-xs text-zinc-600">
          AI proposes. You decide. Nothing is applied until Inbox → Apply.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40">
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <div>
            <p className="text-sm font-medium text-zinc-400">Manual entry</p>
            <p className="mt-0.5 text-xs text-zinc-600">
              Traditional form → builds trade-proposal for step 2.
            </p>
          </div>
          <span className="text-xs text-zinc-500">{showManual ? "Hide" : "Show"}</span>
        </button>
        {showManual ? (
          <div className="border-t border-zinc-800 px-5 pb-5 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="text-zinc-500">Trade ID</span>
                <input
                  value={form.id}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-zinc-500">Ticker</span>
                <input
                  value={form.ticker}
                  onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value }))}
                  placeholder="AMZN"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="text-zinc-500">Direction</span>
                <div className="mt-1 flex gap-2">
                  {(["long", "short"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, direction: d }))}
                      className={`flex-1 rounded-lg border py-1.5 text-xs capitalize ${
                        form.direction === d
                          ? "border-violet-500 bg-violet-600/20 text-violet-300"
                          : "border-zinc-700 text-zinc-500"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </label>
              <label className="block text-xs">
                <span className="text-zinc-500">Entry</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.entry}
                  onChange={(e) => setForm((f) => ({ ...f, entry: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-zinc-500">Stop</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.stop}
                  onChange={(e) => setForm((f) => ({ ...f, stop: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-zinc-500">Target</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.target}
                  onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-zinc-500">Shares</span>
                <input
                  type="number"
                  value={form.shares}
                  onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="text-zinc-500">Playbook</span>
                <select
                  value={form.playbookId}
                  onChange={(e) => setForm((f) => ({ ...f, playbookId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                >
                  <option value="">— Optional —</option>
                  {data.playbooks.map((pb) => (
                    <option key={pb.id} value={pb.id}>
                      {pb.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="text-zinc-500">Notes / thesis</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setForm({
                    id: data.suggestedTradeId,
                    ticker: "",
                    direction: "long",
                    entry: "",
                    stop: "",
                    target: "",
                    shares: "10",
                    playbookId: "",
                    notes: "",
                  })
                }
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleManualReview}
                className="flex-1 rounded-lg border border-violet-500/50 py-2 text-sm font-medium text-violet-300 hover:bg-violet-600/10"
              >
                Review trade → fill step 2
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40">
        <button
          type="button"
          onClick={() => setShowBootPreview((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <div>
            <p className="text-sm font-medium text-zinc-400">Boot package preview (optional)</p>
            <p className="mt-0.5 text-xs text-zinc-600">What Copy trade boot package sends to your AI.</p>
          </div>
          <span className="text-xs text-zinc-500">{showBootPreview ? "Hide" : "Show"}</span>
        </button>
        {showBootPreview ? (
          <pre className="max-h-64 overflow-auto border-t border-zinc-800 px-5 pb-5 pt-2 text-xs text-zinc-500 whitespace-pre-wrap">
            {bootPackage}
          </pre>
        ) : null}
      </section>
    </div>
  );
}
