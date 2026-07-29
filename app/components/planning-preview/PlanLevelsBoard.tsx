"use client";

import type { PlanLevelsView } from "@/lib/plan-levels-board";
import { buildPlanMapModel } from "@/lib/scout-plan-map-model";

function fmtPrice(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "Unconfigured";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function fmtUsd(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "Unconfigured";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fmtR(value?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "Unavailable";
  return `${value.toFixed(1)}R`;
}

function PlanMapLevelRow({
  label,
  price,
  subtitle,
  tone,
}: {
  label: string;
  price: string;
  subtitle?: string;
  tone?: "target" | "entry" | "stop" | "muted";
}) {
  const tones = {
    target: "border-emerald-500/35 bg-emerald-950/20 text-emerald-100",
    entry: "border-sky-500/35 bg-sky-950/20 text-sky-100",
    stop: "border-red-500/35 bg-red-950/20 text-red-100",
    muted: "border-zinc-800 bg-zinc-950/40 text-zinc-200",
  } as const;

  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone ?? "muted"]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
            {label}
          </p>
          {subtitle ? <p className="mt-1 text-xs opacity-80">{subtitle}</p> : null}
        </div>
        <p className="shrink-0 font-mono text-sm font-semibold">{price}</p>
      </div>
    </div>
  );
}

export function PlanLevelsBoard({
  view,
}: {
  view: PlanLevelsView;
  compact?: boolean;
}) {
  const model = buildPlanMapModel(view);

  if (!model.layers.length && model.primaryTarget === undefined && model.commonStop === undefined) {
    return (
      <p className="text-sm text-zinc-500">
        No levels defined yet — add them via Stock Profile or a scout plan.
      </p>
    );
  }

  return (
    <div className="space-y-3 pb-[calc(6rem+env(safe-area-inset-bottom))]" data-scout-plan-map>
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              {model.ticker} · {model.planId}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              {model.mode === "layered" ? "Layered entry" : "Single entry"} ·{" "}
              {(model.stopModel ?? "common") === "common"
                ? "Common stop"
                : "Per-layer stops"}{" "}
              · Risk {fmtUsd(model.roundedRisk)}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              {(model.operationalState ?? "unassessed").replace(/_/g, " ")} ·{" "}
              {(model.nextAction ?? "none").replace(/_/g, " ")} · Executable R {fmtR(model.executableRR)}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {model.referencePlanRR !== undefined ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-950/20 px-2 py-1 text-emerald-200">
                Plan R {model.referencePlanRR.toFixed(1)}
              </span>
            ) : null}
            {model.minRR !== undefined ? (
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-300">
                Min R {model.minRR}
              </span>
            ) : null}
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-300">
              {model.layerCount} {model.layerCount === 1 ? "layer" : "layers"}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Execution geometry
          </p>
          {model.spacingCompressed ? (
            <span className="text-[10px] text-zinc-600">spacing compressed</span>
          ) : null}
        </div>

        <div className="mt-3 space-y-2">
          {model.extendedTargets.map((target, index) => (
            <PlanMapLevelRow
              key={`ext-${target}-${index}`}
              label={`Extended target ${index + 1}`}
              price={fmtPrice(target)}
              tone="target"
            />
          ))}
          {model.primaryTarget !== undefined ? (
            <PlanMapLevelRow
              label="Primary target"
              price={fmtPrice(model.primaryTarget)}
              subtitle={`Reference plan R · ${fmtR(model.referencePlanRR)}`}
              tone="target"
            />
          ) : null}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-3 py-2 text-[10px] uppercase tracking-wide text-emerald-300/80">
            Reward region
          </div>
          {model.layers.map((layer) => {
            const allocLabel =
              layer.allocationPercent !== undefined
                ? layer.allocationMeaning === "risk"
                  ? `${layer.allocationPercent}% of authorized risk`
                  : `${layer.allocationPercent}% position allocation`
                : undefined;
            const secondary = [
              allocLabel,
              layer.shares !== undefined ? `${layer.shares} shares` : "Shares unconfigured",
              layer.capitalRequired !== undefined
                ? `Capital ${fmtUsd(layer.capitalRequired)}`
                : "Capital unconfigured",
              layer.estimatedRisk !== undefined
                ? `Risk ${fmtUsd(layer.estimatedRisk)}`
                : "Risk unconfigured",
              `Primary R ${fmtR(layer.rrToPrimaryTarget)}`,
              layer.fillStatus,
              model.stopModel === "per_layer" && layer.stopPrice !== undefined
                ? `Stop ${fmtPrice(layer.stopPrice)}`
                : undefined,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <PlanMapLevelRow
                key={`layer-${layer.index}-${layer.price}`}
                label={
                  layer.role
                    ? `L${layer.index + 1} · ${layer.role}`
                    : `Layer ${layer.index + 1}`
                }
                price={fmtPrice(layer.price)}
                subtitle={secondary}
                tone="entry"
              />
            );
          })}
          <div className="rounded-xl border border-red-500/20 bg-red-950/10 px-3 py-2 text-[10px] uppercase tracking-wide text-red-300/80">
            Risk region
          </div>
          {model.commonStop !== undefined ? (
            <PlanMapLevelRow
              label={
                (model.stopModel ?? "common") === "common"
                  ? "Common strategy stop"
                  : "Strategy stop"
              }
              price={fmtPrice(model.commonStop)}
              tone="stop"
            />
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Risk summary
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          {(
            [
              ["Allocation mode", model.allocationModeLabel ?? "Unconfigured"],
              ["Reference plan R", fmtR(model.referencePlanRR)],
              ["Full-build blended R", fmtR(model.blendedRR)],
              ["Filled-position R", fmtR(model.filledPositionRR)],
              ["Fill summary", model.fillSummary],
              ["Reference entry", fmtPrice(model.referenceEntry)],
              ["Authorized risk", fmtUsd(model.authorizedRisk)],
              ["Rounded planned risk", fmtUsd(model.roundedRisk)],
              ["Unused risk", fmtUsd(model.unusedRisk)],
              ["Capital required", fmtUsd(model.requestedCapital)],
              ["Common stop", fmtPrice(model.commonStop)],
              ["Executable R", fmtR(model.executableRR)],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black/10 px-2.5 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-zinc-100">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
