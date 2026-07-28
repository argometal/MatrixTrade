"use client";

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
import type { CapitalAccountSnapshot } from "@/lib/capital-account";
import type { CapitalReservation } from "@/lib/capital-types";
import {
  buildScoutFundingSnapshot,
  canonicalShareCount,
  scoutFundingSnapshotItem,
  type ScoutFundingSnapshotField,
} from "@/lib/scout-funding-snapshot";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import { FamilyBChecklist } from "@/app/components/playbook/FamilyBChecklist";
import { FamilyBBullTrendPanel } from "@/app/components/planning-preview/FamilyBBullTrendPanel";
import { LayeredEntryPanel } from "@/app/components/planning-preview/LayeredEntryPanel";
import { ModifiedKellyPanel } from "@/app/components/planning-preview/ModifiedKellyPanel";

/** Manual form placeholder only — never authoritative for funding (26-48). */
const MANUAL_SHARES_PLACEHOLDER = "10";

function buildExecuteFormState(
  plan: TradePlan | null,
  prefill: ReturnType<typeof prospectToPrefill> | undefined,
  suggestedTradeId: string
) {
  return {
    id: suggestedTradeId,
    ticker: prefill?.ticker ?? plan?.ticker ?? "",
    direction: "long" as "long" | "short",
    entry:
      prefill?.entry ??
      (plan?.plannedEntry !== undefined ? String(plan.plannedEntry) : ""),
    stop:
      prefill?.stop ??
      (plan?.stopPrice !== undefined ? String(plan.stopPrice) : ""),
    target:
      prefill?.target ??
      (plan?.targetPrice !== undefined ? String(plan.targetPrice) : ""),
    /** Placeholder for manual JSON only — not used for capital evaluation. */
    shares: MANUAL_SHARES_PLACEHOLDER,
    playbookId: prefill?.playbookId ?? plan?.playbookId ?? "",
    notes: plan ? `From plan ${plan.id}` : "",
  };
}

function moneyOrUnconfigured(
  v: ScoutFundingSnapshotField<number>,
  reason?: string
): { value: string; reason?: string } {
  if (typeof v === "number" && Number.isFinite(v)) {
    return {
      value: v.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    };
  }
  return {
    value: "Unconfigured",
    reason: reason ?? (v === "unknown" ? "unknown" : undefined),
  };
}

function textOrUnconfigured(
  v: ScoutFundingSnapshotField<string>,
  reason?: string
): { value: string; reason?: string } {
  if (v === "unconfigured" || v === "unknown") {
    return { value: "Unconfigured", reason };
  }
  return { value: v };
}

/**
 * Execution strip — decision/numbers + funding first (26-41 / 26-48).
 * Manual JSON and experiment panels live under Technical actions.
 * Default form shares are never canonical funding inputs.
 */
export function ScoutExecutePanel({
  plan,
  prospect,
  prospects,
  playbooks,
  suggestedTradeId,
  monthlyLossRoom,
  reservations = [],
  capitalAccount = null,
  capitalConfigurationPresent,
  stockFileId,
}: {
  plan: TradePlan | null;
  prospect: TradeProspect | null;
  prospects: TradeProspect[];
  playbooks: Playbook[];
  suggestedTradeId: string;
  monthlyLossRoom: number;
  reservations?: CapitalReservation[];
  capitalAccount?: CapitalAccountSnapshot | null;
  capitalConfigurationPresent?: boolean;
  /**
   * Authoritative Stock File ID only — never a Stock Thesis ID, ticker, or case key.
   * Omit until a real Stock File relationship exists (26-40).
   */
  stockFileId?: string;
}) {
  const [copiedBoot, setCopiedBoot] = useState(false);
  const [copiedProposal, setCopiedProposal] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prefill = useMemo(
    () => (prospect ? prospectToPrefill(prospect) : undefined),
    [prospect]
  );

  const [form, setForm] = useState(() =>
    buildExecuteFormState(plan, prefill, suggestedTradeId)
  );

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
                entry:
                  prefill?.entry ??
                  (plan?.plannedEntry !== undefined
                    ? String(plan.plannedEntry)
                    : undefined),
                stop:
                  prefill?.stop ??
                  (plan?.stopPrice !== undefined
                    ? String(plan.stopPrice)
                    : undefined),
                target:
                  prefill?.target ??
                  (plan?.targetPrice !== undefined
                    ? String(plan.targetPrice)
                    : undefined),
                playbookId: prefill?.playbookId ?? plan?.playbookId,
              }
            : undefined,
      }),
    [suggestedTradeId, playbooks, monthlyLossRoom, prospects, plan, prefill]
  );

  const formMatchesPlan =
    !plan?.ticker ||
    !form.ticker ||
    form.ticker.toUpperCase() === plan.ticker.toUpperCase();

  /** Plan-level view for primary surface — omit hard-coded shares row. */
  const levelsView =
    plan?.plannedEntry !== undefined && plan.stopPrice !== undefined
      ? buildTradeLevelsView({
          id: plan.id,
          ticker: plan.ticker,
          entry: plan.plannedEntry,
          stop: plan.stopPrice,
          target: plan.targetPrice,
          // Canonical share count is not the manual placeholder; use 0 so UI can hide Shares.
          shares: 0,
        })
      : formMatchesPlan && form.entry && form.stop
        ? buildTradeLevelsView({
            id: form.id || "—",
            ticker: form.ticker || plan?.ticker || "",
            entry: parseFloat(form.entry),
            stop: parseFloat(form.stop),
            target: form.target ? parseFloat(form.target) : undefined,
            shares: 0,
          })
        : null;

  const primaryLevelRows = (levelsView?.rows ?? []).filter(
    (row) => row.label !== "Shares"
  );

  async function copyTextClipboard(
    text: string,
    kind: "boot" | "sample" | "proposal"
  ) {
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

  function handleCopyManualProposal() {
    const fields = buildFromForm();
    if (!fields) return;
    void copyTextClipboard(buildTradeProposalBlock(fields), "proposal");
  }

  function handlePrepareTradeCanonical() {
    if (!plan) return;
    const funding = buildScoutFundingSnapshot({
      plan,
      stockFileId,
      reservations,
      account: capitalAccount,
      authorizableLossRoom: monthlyLossRoom,
      capitalConfigurationPresent,
    });
    const shares = canonicalShareCount(funding.shareCount);
    if (shares === undefined) {
      setError("Share count unconfigured — calculate allocation first");
      return;
    }
    const entry =
      typeof funding.entry === "number" ? funding.entry : Number(form.entry);
    const stop =
      typeof funding.stop === "number" ? funding.stop : Number(form.stop);
    const target =
      typeof funding.target === "number"
        ? funding.target
        : form.target
          ? Number(form.target)
          : undefined;
    if (!Number.isFinite(entry) || !Number.isFinite(stop)) {
      setError("Need entry + stop on the scout plan.");
      return;
    }
    setError(null);
    void copyTextClipboard(
      buildTradeProposalBlock({
        id: suggestedTradeId,
        ticker: plan.ticker,
        entry,
        stop,
        target: Number.isFinite(target) ? target : undefined,
        shares,
        playbookId: plan.playbookId,
        thesis: `From plan ${plan.id}`,
        direction: "long",
      }),
      "proposal"
    );
  }

  if (!plan) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-300">Execute</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Select a stock file with an active scout.
        </p>
      </section>
    );
  }

  const fundingInput = {
    plan,
    stockFileId,
    reservations,
    account: capitalAccount,
    authorizableLossRoom: monthlyLossRoom,
    capitalConfigurationPresent,
  };
  const fundingSnap = buildScoutFundingSnapshot(fundingInput);
  const fundingSnapshotItem = scoutFundingSnapshotItem(fundingInput);

  const capitalRequired = moneyOrUnconfigured(
    fundingSnap.requestedCapital,
    fundingSnap.blockingReasons.find((r) => r.includes("capital")) ??
      "No canonical capitalRequired yet"
  );
  const estimatedRisk = moneyOrUnconfigured(
    fundingSnap.estimatedRisk,
    fundingSnap.blockingReasons.find((r) => r.includes("risk")) ??
      "No canonical estimatedRisk yet"
  );
  const availableField = capitalAccount?.availableCapital;
  const availableCapital =
    availableField?.status === "configured"
      ? {
          value: availableField.value.toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }),
        }
      : {
          value: "Unconfigured",
          reason:
            availableField?.reason ??
            (capitalConfigurationPresent
              ? "Available capital not configured"
              : "Missing capital configuration"),
        };
  const riskRoom =
    Number.isFinite(monthlyLossRoom)
      ? {
          value: monthlyLossRoom.toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }),
        }
      : { value: "Unconfigured", reason: "Monthly risk room unavailable" };
  const fundingStatus = textOrUnconfigured(
    fundingSnap.currentFundingDecision,
    fundingSnap.blockingReasons[0]
  );

  const canonicalShares = canonicalShareCount(fundingSnap.shareCount);

  return (
    <section
      className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-4"
      data-scout-execute
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-emerald-200">
          Execute · {plan.id}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div data-scout-funding-snapshot>
            <SnapshotButton
              title="Scout Funding Snapshot"
              description="Canonical package for capital-reservation-create — read-only"
              items={[fundingSnapshotItem]}
              className="!min-h-10 !px-3 !py-2"
            />
          </div>
          <button
            type="button"
            onClick={() => void copyTextClipboard(bootPackage, "boot")}
            className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-500/20"
          >
            {copiedBoot ? "Copied" : "Trade boot"}
          </button>
        </div>
      </div>

      {plan.status === "expired" ? (
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          Plan expired — revive via Control with watching + fresh validUntil.
        </p>
      ) : null}

      {primaryLevelRows.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {primaryLevelRows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-1.5"
            >
              <dt className="text-zinc-600">{row.label}</dt>
              <dd className="tabular-nums text-zinc-200">{row.value}</dd>
            </div>
          ))}
          {plan.plannedRR !== undefined ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-1.5">
              <dt className="text-zinc-600">Planned R:R</dt>
              <dd className="font-medium text-emerald-400">
                {plan.plannedRR.toFixed(1)}R
              </dd>
            </div>
          ) : null}
          {canonicalShares !== undefined ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-1.5">
              <dt className="text-zinc-600">Shares</dt>
              <dd className="tabular-nums text-zinc-200">{canonicalShares}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-3 text-xs text-amber-400/90">
          Set entry + stop on this scout for levels.
        </p>
      )}

      <div
        className="mt-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5"
        data-scout-funding-summary
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Capital / funding
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
          {(
            [
              ["Capital required", capitalRequired],
              ["Estimated risk", estimatedRisk],
              ["Available capital", availableCapital],
              ["Risk room", riskRoom],
              ["Funding status", fundingStatus],
            ] as const
          ).map(([label, cell]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wide text-zinc-600">
                {label}
              </dt>
              <dd className="mt-0.5 font-medium tabular-nums text-zinc-100">
                {cell.value}
              </dd>
              {cell.value === "Unconfigured" && cell.reason ? (
                <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
                  {cell.reason}
                </p>
              ) : null}
            </div>
          ))}
        </dl>
      </div>

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-scout-prepare-trade
          disabled={canonicalShares === undefined}
          title={
            canonicalShares === undefined
              ? "Canonical share count is required."
              : undefined
          }
          onClick={handlePrepareTradeCanonical}
          className={
            canonicalShares === undefined
              ? "cursor-not-allowed rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-xs font-medium text-zinc-500"
              : "rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
          }
        >
          {copiedProposal && canonicalShares !== undefined
            ? "Copied JSON"
            : canonicalShares === undefined
              ? "Prepare trade · allocation required"
              : "Prepare trade"}
        </button>
        {canonicalShares === undefined ? (
          <p
            className="w-full text-[11px] text-zinc-500"
            data-scout-prepare-allocation-msg
          >
            Share count unconfigured — calculate allocation first
          </p>
        ) : null}
      </div>

      <div className="mt-3 border-t border-zinc-800/80 pt-2">
        <button
          type="button"
          onClick={() => setTechOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 py-1.5 text-left text-xs text-zinc-500 hover:text-zinc-300"
          aria-expanded={techOpen}
          data-scout-tech-menu
        >
          <span>Technical actions</span>
          <span>{techOpen ? "▾" : "▸"}</span>
        </button>
        {techOpen ? (
          <div className="mt-2 space-y-3">
            {plan ? (
              <FamilyBBullTrendPanel plan={plan} compact />
            ) : (
              <FamilyBChecklist playbookId={form.playbookId} compact />
            )}
            {plan?.layeredEntry?.executionModel === "modified_kelly" ||
            form.playbookId === "modified-kelly-layered-entry" ||
            plan?.playbookId === "modified-kelly-layered-entry" ? (
              plan ? (
                <ModifiedKellyPanel
                  plan={plan}
                  playbook={playbooks.find(
                    (p) => p.id === (form.playbookId || plan.playbookId)
                  )}
                  compact
                  monthlyRiskRoom={monthlyLossRoom}
                />
              ) : null
            ) : plan?.layeredEntry ? (
              <LayeredEntryPanel
                plan={plan}
                playbook={playbooks.find(
                  (p) => p.id === (form.playbookId || plan.playbookId)
                )}
                compact
              />
            ) : null}

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40">
              <button
                type="button"
                onClick={() => setShowManual((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
              >
                <div>
                  <p className="text-xs font-medium text-zinc-400">
                    Manual levels → JSON
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    Shares default ({MANUAL_SHARES_PLACEHOLDER}) is a form
                    placeholder only — not funding data.
                  </p>
                </div>
                <span className="text-[11px] text-zinc-500">
                  {showManual ? "Hide" : "Show"}
                </span>
              </button>
              {showManual ? (
                <div className="border-t border-zinc-800 px-3 pb-3 pt-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        ["id", "Trade ID"],
                        ["ticker", "Ticker"],
                        ["entry", "Entry"],
                        ["stop", "Stop"],
                        ["target", "Target"],
                        ["shares", "Shares (manual)"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="block text-xs">
                        <span className="text-zinc-500">{label}</span>
                        <input
                          value={form[key]}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, [key]: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                        />
                      </label>
                    ))}
                    <label className="block text-xs sm:col-span-2">
                      <span className="text-zinc-500">Playbook</span>
                      <select
                        value={form.playbookId}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            playbookId: e.target.value,
                          }))
                        }
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopyManualProposal}
                      className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-600/10"
                    >
                      {copiedProposal
                        ? "Copied"
                        : "Copy trade-proposal JSON"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void copyTextClipboard(
                          sampleAiBlock("trade-proposal"),
                          "sample"
                        )
                      }
                      className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      {copiedSample ? "Copied" : "Example block"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
