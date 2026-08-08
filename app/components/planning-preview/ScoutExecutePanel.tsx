"use client";

import { useEffect, useMemo, useState } from "react";
import { sampleAiBlock } from "@/lib/ai-block";
import {
  buildTradeProposalBlock,
  type TradeProposalFields,
} from "@/lib/build-trade-proposal-block";
import { buildTradeBootPackage } from "@/lib/trade-boot";
import type { TradeProspect } from "@/lib/trade-prospects";
import { prospectToPrefill } from "@/lib/trade-prospects";
import type { Playbook } from "@/lib/playbook-types";
import type { TradePlan } from "@/lib/plan-types";
import type { CapitalAccountSnapshot } from "@/lib/capital-account";
import type { CapitalReservation } from "@/lib/capital-types";
import {
  buildScoutFundingSnapshot,
  type ScoutFundingSnapshotField,
} from "@/lib/scout-funding-snapshot";
import {
  assessFundingFollowUp,
  isReservationStaleRelativeToPlan,
} from "@/lib/scout-funding-follow-up";
import { isActiveReservation } from "@/lib/capital-types";
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
 * Scout card execution extras — funding summary, alerts, Trade boot, technical
 * actions. Levels / Prepare trade / Funding Snapshot live on the yellow Scout
 * card (29-48); this panel is embedded there so the bottom Execute strip is gone.
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

  if (!plan) {
    return null;
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

  const fundingFollowUp = assessFundingFollowUp({
    plan,
    reservations,
    account: capitalAccount,
    authorizableLossRoom: monthlyLossRoom,
    capitalConfigurationPresent,
  });
  const activeReservation = reservations.find(
    (r) => r.planId === plan.id && isActiveReservation(r)
  );
  const reservationStale = activeReservation
    ? isReservationStaleRelativeToPlan(activeReservation, plan)
    : false;

  return (
    <div
      className="mt-3 space-y-3 border-t border-current/15 pt-3"
      data-scout-execute
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide opacity-70">
          Capital / funding
        </h2>
        <button
          type="button"
          onClick={() => void copyTextClipboard(bootPackage, "boot")}
          className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20"
        >
          {copiedBoot ? "Copied" : "Trade boot"}
        </button>
      </div>

      {plan.status === "expired" ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          Plan expired — revive via Control with watching + fresh validUntil.
        </p>
      ) : null}

      <div
        className="rounded-xl border border-current/15 bg-black/10 px-3 py-2.5"
        data-scout-funding-summary
      >
        <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
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
              <dt className="text-[10px] uppercase tracking-wide opacity-60">
                {label}
              </dt>
              <dd className="mt-0.5 font-medium tabular-nums">{cell.value}</dd>
              {cell.value === "Unconfigured" && cell.reason ? (
                <p className="mt-0.5 text-[10px] leading-snug opacity-60">
                  {cell.reason}
                </p>
              ) : null}
            </div>
          ))}
        </dl>
      </div>

      {reservationStale ? (
        <p
          className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-100"
          data-scout-reservation-stale
        >
          Reservation stale — Scout funding parameters changed. Release the old
          reservation, then prepare a replacement via Control → Apply.
        </p>
      ) : null}

      {!activeReservation && fundingFollowUp.eligible ? (
        <p
          className="rounded-lg border border-sky-500/30 bg-sky-950/20 px-3 py-2 text-xs text-sky-100"
          data-scout-funding-follow-up-pending
        >
          Funding follow-up pending — Accept a decision-update (or reopen Control
          success) to Prepare Funding JSON. Does not reserve capital until Apply
          → Validate → Accept.
        </p>
      ) : null}

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      {/* Prepare trade / Funding Snapshot live once in Scout card Funding & execution (29-48). */}

      <div>
        <button
          type="button"
          onClick={() => setTechOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 py-1.5 text-left text-xs opacity-70 hover:opacity-100"
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

            <div className="rounded-xl border border-current/15 bg-black/10">
              <button
                type="button"
                onClick={() => setShowManual((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
              >
                <div>
                  <p className="text-xs font-medium opacity-80">
                    Manual levels → JSON
                  </p>
                  <p className="mt-0.5 text-[10px] opacity-50">
                    Shares default ({MANUAL_SHARES_PLACEHOLDER}) is a form
                    placeholder only — not funding data.
                  </p>
                </div>
                <span className="text-[11px] opacity-50">
                  {showManual ? "Hide" : "Show"}
                </span>
              </button>
              {showManual ? (
                <div className="border-t border-current/15 px-3 pb-3 pt-2">
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
                        <span className="opacity-60">{label}</span>
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
                      <span className="opacity-60">Playbook</span>
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
    </div>
  );
}
