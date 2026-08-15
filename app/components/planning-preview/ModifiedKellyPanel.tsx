"use client";

import type { TradePlan } from "@/lib/plan-types";
import type { Playbook } from "@/lib/playbook-types";
import {
  LAYERED_EXECUTION_MODEL_LABELS,
  LAYER_ROLE_LABELS,
  resolveLayeredExecutionModel,
  type LayeredExecutionModel,
} from "@/lib/layered-entry-types";
import {
  computeModifiedKelly,
  UNCALIBRATED_KELLY_WARNING,
} from "@/lib/modified-kelly";
import {
  MODIFIED_KELLY_CHECKLIST,
  MODIFIED_KELLY_DEFAULT_CONFIG,
  MODIFIED_KELLY_PLAYBOOK_ID,
  type ModifiedKellyLayerRole,
} from "@/lib/modified-kelly-types";
import { MtaHelpLink } from "@/app/components/preview/MtaHelpLink";

function formatPrice(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
}

function formatR(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}R`;
}

function formatUsd(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
}

const EXECUTION_MODEL_OPTIONS: LayeredExecutionModel[] = [
  "standard_layered",
  "risk_weighted",
  "modified_kelly",
];

export function ModifiedKellyPanel({
  plan,
  playbook,
  compact = false,
  capitalAvailable,
  monthlyRiskRoom,
}: {
  plan: TradePlan;
  playbook?: Playbook;
  compact?: boolean;
  capitalAvailable?: number;
  monthlyRiskRoom?: number;
}) {
  const entry = plan.layeredEntry;
  const playbookIsKelly =
    playbook?.id === MODIFIED_KELLY_PLAYBOOK_ID ||
    Boolean(playbook?.modifiedKellyLayeredEntryExperiment);
  const model = resolveLayeredExecutionModel(entry);
  const showKelly = model === "modified_kelly" || (playbookIsKelly && Boolean(entry));

  if (!entry && !playbookIsKelly) return null;

  const commonStop = entry?.commonStopPrice ?? plan.stopPrice;
  const target = entry?.primaryTargetPrice ?? plan.targetPrice;
  const mk = entry?.modifiedKelly;
  const baseRiskDollar =
    mk?.baseRiskDollar ?? entry?.authorizedRiskAmount ?? MODIFIED_KELLY_DEFAULT_CONFIG.baseRiskR * 100;
  // Prefer plan 1R dollar from modifiedKelly; fall back to default budget convention
  const rDollar =
    mk?.baseRiskDollar ??
    (entry?.authorizedRiskAmount && mk?.totalAuthorizedRiskR
      ? entry.authorizedRiskAmount / mk.totalAuthorizedRiskR
      : 100);

  let computed =
    showKelly &&
    entry &&
    commonStop !== undefined &&
    target !== undefined
      ? computeModifiedKelly({
          baseRiskDollar: rDollar > 0 ? rDollar : baseRiskDollar,
          baseRiskR: mk?.baseRiskR ?? 1,
          additionalRiskR: mk?.additionalRiskR ?? 0.65,
          layers: entry.limits.map((limit, index) => {
            const role: ModifiedKellyLayerRole =
              limit.role === "kelly_extension"
                ? "kelly_extension"
                : limit.role === "base" || index === 0
                  ? "base"
                  : "kelly_extension";
            return {
              price: limit.price,
              riskWeightR:
                limit.riskWeightR ??
                (role === "base"
                  ? (mk?.baseRiskR ?? 1)
                  : (mk?.additionalRiskR ?? 0.65)),
              role,
              filled: limit.filled,
              fillPrice: limit.fillPrice,
              filledShares: limit.filledQuantity,
            };
          }),
          commonStopPrice: commonStop,
          targetPrice: target,
          kellyFraction: mk?.kellyFraction ?? "quarter",
          customKellyFraction: mk?.customKellyFraction,
          estimatedWinProbability: mk?.estimatedWinProbability,
          probabilitySource: mk?.probabilitySource,
          maximumAdditionalRiskR:
            playbook?.modifiedKellyLayeredEntryExperiment?.defaults.maximumAdditionalRiskR ??
            0.65,
          capitalAvailable,
          monthlyRiskRoom,
          allowFractionalShares:
            playbook?.modifiedKellyLayeredEntryExperiment?.defaults.allowFractionalShares !==
            false,
        })
      : null;

  if (!showKelly && entry) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
        <p className="text-xs font-medium text-zinc-400">Execution Model</p>
        <p className="mt-1 text-sm text-zinc-200">
          {LAYERED_EXECUTION_MODEL_LABELS[model]}
        </p>
        <p className="mt-1 text-[11px] text-zinc-600">
          Modified Kelly available via playbook {MODIFIED_KELLY_PLAYBOOK_ID} (Apply).
        </p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-amber-300">
            Modified Kelly Layered Entry
          </p>
          <MtaHelpLink topic="modified-kelly" label="Modified Kelly" />
        </div>
        {!compact ? (
          <ul className="mt-2 space-y-1 text-[11px] text-zinc-500">
            {MODIFIED_KELLY_CHECKLIST.slice(0, 5).map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  const summary = computed?.summary;
  const warnings = summary?.warnings ?? (mk?.warning ? [mk.warning] : []);

  return (
    <div
      className={`rounded-xl border border-sky-500/25 bg-sky-950/15 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className={`font-medium text-sky-200 ${compact ? "text-xs" : "text-sm"}`}>
            Layered Entry · Modified Kelly
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MtaHelpLink topic="modified-kelly" label="Modified Kelly" />
          <label className="text-[11px] text-zinc-500">
            Execution Model
            <select
              className="ml-2 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
              value={model}
              disabled
              aria-label="Execution Model"
              title="Set via Apply on layeredEntry.executionModel"
            >
              {EXECUTION_MODEL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {LAYERED_EXECUTION_MODEL_LABELS[opt]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5">
          <dt className="text-zinc-600">Base Risk</dt>
          <dd className="text-zinc-200">{formatR(mk?.baseRiskR ?? 1)}</dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5">
          <dt className="text-zinc-600">Additional Kelly Risk</dt>
          <dd className="text-zinc-200">
            {formatR(
              mk?.additionalRiskR ??
                (summary
                  ? summary.totalAuthorizedRiskR - (mk?.baseRiskR ?? 1)
                  : undefined)
            )}
          </dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5">
          <dt className="text-zinc-600">Total Authorized Risk</dt>
          <dd className="text-sky-200">
            {formatR(mk?.totalAuthorizedRiskR ?? summary?.totalAuthorizedRiskR)}
          </dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5">
          <dt className="text-zinc-600">Kelly Fraction</dt>
          <dd className="text-zinc-200">{mk?.kellyFraction ?? "quarter"}</dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5">
          <dt className="text-zinc-600">Est. Win Probability</dt>
          <dd className="text-zinc-200">
            {mk?.estimatedWinProbability !== undefined
              ? `${(mk.estimatedWinProbability * 100).toFixed(0)}%`
              : "—"}
          </dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5">
          <dt className="text-zinc-600">Probability Source</dt>
          <dd className="text-zinc-200">{mk?.probabilitySource ?? "—"}</dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5">
          <dt className="text-zinc-600">Common Stop</dt>
          <dd className="font-mono text-zinc-200">{formatPrice(commonStop)}</dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5">
          <dt className="text-zinc-600">Probable Target</dt>
          <dd className="font-mono text-zinc-200">{formatPrice(target)}</dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5">
          <dt className="text-zinc-600">Capital Available</dt>
          <dd className="text-zinc-200">{formatUsd(capitalAvailable)}</dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2 py-1.5">
          <dt className="text-zinc-600">Monthly Risk Room</dt>
          <dd className="text-zinc-200">{formatUsd(monthlyRiskRoom)}</dd>
        </div>
      </dl>

      {computed ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[11px]">
            <thead>
              <tr className="text-zinc-500">
                <th className="pb-2 pr-2 font-medium">Role</th>
                <th className="pb-2 pr-2 font-medium">Entry</th>
                <th className="pb-2 pr-2 font-medium">Risk Weight</th>
                <th className="pb-2 pr-2 font-medium">Risk USD</th>
                <th className="pb-2 pr-2 font-medium">Distance to Stop</th>
                <th className="pb-2 pr-2 font-medium">Shares</th>
                <th className="pb-2 pr-2 font-medium">Capital</th>
                <th className="pb-2 pr-2 font-medium">R to Target</th>
                <th className="pb-2 font-medium">Fill Status</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {computed.layers.map((layer) => (
                <tr key={`${layer.role}-${layer.price}`} className="border-t border-zinc-800/80">
                  <td className="py-1.5 pr-2">
                    {LAYER_ROLE_LABELS[layer.role] ?? layer.role}
                  </td>
                  <td className="py-1.5 pr-2 font-mono">{formatPrice(layer.price)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{formatR(layer.riskWeightR)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{formatUsd(layer.riskDollars)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {layer.distanceToStop.toFixed(2)} ({layer.distanceToStopPercent.toFixed(1)}%)
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{layer.shares.toFixed(4)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{formatUsd(layer.capitalRequired)}</td>
                  <td className="py-1.5 pr-2 font-mono text-sky-300/90">
                    {formatR(layer.layerR)}
                  </td>
                  <td className="py-1.5">
                    {layer.filled ? (
                      <span className="text-emerald-400">Filled</span>
                    ) : (
                      <span className="text-zinc-600">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {summary ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
          <div>
            <dt className="text-zinc-600">Total authorized risk</dt>
            <dd className="text-zinc-200">
              {formatR(summary.totalAuthorizedRiskR)} · {formatUsd(summary.totalAuthorizedRiskDollars)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-600">Current filled risk</dt>
            <dd className="text-zinc-200">
              {formatR(summary.currentFilledRiskR)} · {formatUsd(summary.currentFilledRiskDollars)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-600">Remaining risk authorization</dt>
            <dd className="text-zinc-200">{formatR(summary.remainingRiskAuthorizationR)}</dd>
          </div>
          <div>
            <dt className="text-zinc-600">Capital if fully filled</dt>
            <dd className="text-zinc-200">{formatUsd(summary.capitalRequiredIfFullyFilled)}</dd>
          </div>
          <div>
            <dt className="text-zinc-600">Avg entry if fully filled</dt>
            <dd className="font-mono text-zinc-200">
              {formatPrice(summary.averageEntryIfFullyFilled)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-600">Avg entry from fills</dt>
            <dd className="font-mono text-zinc-200">
              {formatPrice(summary.averageEntryFromFills)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-600">Maximum loss</dt>
            <dd className="text-zinc-200">{formatUsd(summary.maximumLoss)}</dd>
          </div>
          <div>
            <dt className="text-zinc-600">Profit at probable target</dt>
            <dd className="text-zinc-200">{formatUsd(summary.profitAtProbableTarget)}</dd>
          </div>
          <div>
            <dt className="text-zinc-600">Authorized campaign R</dt>
            <dd className="text-sky-200">{formatR(summary.authorizedCampaignR)}</dd>
          </div>
          <div>
            <dt className="text-zinc-600">Filled-position R</dt>
            <dd className="text-sky-200">{formatR(summary.filledPositionR)}</dd>
          </div>
          <div>
            <dt className="text-zinc-600">Fill state</dt>
            <dd className="text-zinc-200">{summary.fillState}</dd>
          </div>
          <div>
            <dt className="text-zinc-600">Monthly room after full fill</dt>
            <dd className="text-zinc-200">
              {monthlyRiskRoom !== undefined
                ? formatUsd(monthlyRiskRoom - summary.totalAuthorizedRiskDollars)
                : "—"}
            </dd>
          </div>
        </dl>
      ) : null}

      {warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200">
          {warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[11px] text-zinc-500">{UNCALIBRATED_KELLY_WARNING}</p>
      )}
    </div>
  );
}
