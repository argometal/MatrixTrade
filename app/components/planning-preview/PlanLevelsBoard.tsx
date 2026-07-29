"use client";

import { useMemo, useState } from "react";
import type { PlanLevelsView } from "@/lib/plan-levels-board";
import {
  normalizeTradeMapY,
  type TradeMapTone,
} from "@/lib/plan-levels-board";
import { buildPlanMapModel } from "@/lib/scout-plan-map-model";

const TONE_STYLES: Record<
  TradeMapTone,
  { border: string; bg: string; text: string; dot: string }
> = {
  target: {
    border: "border-emerald-500/50",
    bg: "bg-emerald-950/40",
    text: "text-emerald-200",
    dot: "bg-emerald-400",
  },
  stretch: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/20",
    text: "text-emerald-300/80",
    dot: "bg-emerald-500/70",
  },
  entry: {
    border: "border-violet-500/45",
    bg: "bg-violet-950/35",
    text: "text-violet-200",
    dot: "bg-violet-400",
  },
  preferred: {
    border: "border-sky-500/50",
    bg: "bg-sky-950/35",
    text: "text-sky-200",
    dot: "bg-sky-400",
  },
  deep: {
    border: "border-cyan-500/45",
    bg: "bg-cyan-950/30",
    text: "text-cyan-200",
    dot: "bg-cyan-400",
  },
  stop: {
    border: "border-red-500/50",
    bg: "bg-red-950/40",
    text: "text-red-200",
    dot: "bg-red-400",
  },
  current: {
    border: "border-amber-500/50",
    bg: "bg-amber-950/35",
    text: "text-amber-200",
    dot: "bg-amber-400",
  },
};

type GraphicNode = {
  kind: "target" | "entry" | "stop" | "current";
  label: string;
  price: number;
  /** Shares or allocation only — no capital/risk on the node. */
  quantityLabel?: string;
  rr?: number;
  tone: TradeMapTone;
  ariaLabel: string;
};

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
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "Unavailable";
  }
  return `${value.toFixed(1)}R`;
}

function toneForRole(role?: string): TradeMapTone {
  const lower = (role ?? "").toLowerCase();
  if (lower.includes("preferred") || lower.includes("preferid")) return "preferred";
  if (lower.includes("deep") || lower.includes("profunda")) return "deep";
  if (lower.includes("starter") || lower.includes("inicial")) return "entry";
  return "entry";
}

function buildGraphicNodes(
  view: PlanLevelsView
): GraphicNode[] {
  const model = buildPlanMapModel(view);
  const nodes: GraphicNode[] = [];

  for (const [index, target] of model.extendedTargets.entries()) {
    nodes.push({
      kind: "target",
      label: `Extended target ${index + 1}`,
      price: target,
      tone: "stretch",
      ariaLabel: `Extended target ${target}`,
    });
  }

  if (model.primaryTarget !== undefined) {
    nodes.push({
      kind: "target",
      label: "Primary target",
      price: model.primaryTarget,
      rr: model.referencePlanRR,
      tone: "target",
      ariaLabel: `Primary target ${model.primaryTarget}`,
    });
  }

  for (const layer of model.layers) {
    const role = layer.role ?? `Layer ${layer.index + 1}`;
    const quantityLabel =
      layer.shares !== undefined
        ? `${layer.shares} sh.`
        : layer.allocationPercent !== undefined
          ? `${layer.allocationPercent}%`
          : undefined;
    nodes.push({
      kind: "entry",
      label: role,
      price: layer.price,
      quantityLabel,
      rr: layer.rrToPrimaryTarget,
      tone: toneForRole(layer.role),
      ariaLabel: `${role} ${layer.price}`,
    });
  }

  if (model.commonStop !== undefined) {
    nodes.push({
      kind: "stop",
      label:
        (model.stopModel ?? "common") === "common"
          ? "Common stop"
          : "Stop",
      price: model.commonStop,
      tone: "stop",
      ariaLabel: `Stop ${model.commonStop}`,
    });
  }

  if (view.currentPrice !== undefined && Number.isFinite(view.currentPrice)) {
    nodes.push({
      kind: "current",
      label: "Current price",
      price: view.currentPrice,
      tone: "current",
      ariaLabel: `Current price ${view.currentPrice}`,
    });
  }

  const seen = new Set<string>();
  return nodes
    .filter((node) => {
      const key = `${node.kind}:${node.price}:${node.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.price - a.price);
}

function MapLevelCard({ node }: { node: GraphicNode }) {
  const style = TONE_STYLES[node.tone];
  return (
    <div
      role="listitem"
      aria-label={node.ariaLabel}
      className={`w-full max-w-[15rem] rounded-lg border px-3 py-2 ${style.border} ${style.bg}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p
          className={`text-[10px] font-semibold uppercase tracking-wide ${style.text}`}
        >
          {node.label}
        </p>
        <p className={`font-mono text-sm font-semibold ${style.text}`}>
          {fmtPrice(node.price)}
        </p>
      </div>
      <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-zinc-400">
        {node.quantityLabel ? <span>{node.quantityLabel}</span> : null}
        {node.rr !== undefined ? <span>{node.rr.toFixed(1)}R</span> : null}
      </div>
    </div>
  );
}

function VerticalTradeMap({
  nodes,
  compact,
  expanded,
}: {
  nodes: GraphicNode[];
  compact: boolean;
  expanded: boolean;
}) {
  const prices = nodes.map((n) => n.price);
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const heightPx = compact && !expanded ? 200 : compact ? 300 : 380;

  const entries = nodes.filter((n) => n.kind === "entry");
  const highestEntry = entries.length
    ? Math.max(...entries.map((e) => e.price))
    : undefined;
  const lowestEntry = entries.length
    ? Math.min(...entries.map((e) => e.price))
    : undefined;
  const primaryTarget = nodes.find(
    (n) => n.kind === "target" && n.tone === "target"
  );
  const stop = nodes.find((n) => n.kind === "stop");

  const rewardBand =
    primaryTarget && highestEntry !== undefined
      ? {
          top: normalizeTradeMapY(primaryTarget.price, high, low),
          bottom: normalizeTradeMapY(highestEntry, high, low),
        }
      : null;
  const riskBand =
    stop && lowestEntry !== undefined
      ? {
          top: normalizeTradeMapY(lowestEntry, high, low),
          bottom: normalizeTradeMapY(stop.price, high, low),
        }
      : null;

  return (
    <div
      className="relative mx-auto w-full max-w-md transition-[height] duration-300 ease-out"
      style={{ height: heightPx }}
      role="list"
      aria-label="Vertical trade map"
      data-scout-trade-map-spine
    >
      <div
        className="absolute bottom-2 left-1/2 top-2 w-px -translate-x-1/2 bg-gradient-to-b from-emerald-500/40 via-violet-500/30 to-red-500/50"
        aria-hidden
      />

      {rewardBand ? (
        <div
          className="pointer-events-none absolute left-[calc(50%+0.75rem)] flex flex-col items-start justify-center"
          style={{
            top: `${rewardBand.top}%`,
            height: `${Math.max(8, rewardBand.bottom - rewardBand.top)}%`,
          }}
          aria-hidden
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-400/70">
            ↑ Reward
          </span>
        </div>
      ) : null}

      {riskBand ? (
        <div
          className="pointer-events-none absolute left-[calc(50%+0.75rem)] flex flex-col items-start justify-end"
          style={{
            top: `${riskBand.top}%`,
            height: `${Math.max(8, riskBand.bottom - riskBand.top)}%`,
          }}
          aria-hidden
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-red-400/70">
            ↓ Risk
          </span>
        </div>
      ) : null}

      {nodes.map((node) => {
        const y = normalizeTradeMapY(node.price, high, low);
        const style = TONE_STYLES[node.tone];
        return (
          <div
            key={`${node.kind}-${node.label}-${node.price}`}
            className="absolute left-0 right-0 flex -translate-y-1/2 items-center justify-center px-2"
            style={{ top: `${y}%` }}
          >
            <div className="flex w-full items-center gap-2">
              <div className="hidden w-[12%] sm:block" aria-hidden />
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
                aria-hidden
              />
              <div className="flex min-w-0 flex-1 justify-center">
                <MapLevelCard node={node} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Visual Trade Map — spine geometry + canonical layered data summary. */
export function PlanLevelsBoard({
  view,
  compact = false,
}: {
  view: PlanLevelsView;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const model = useMemo(() => buildPlanMapModel(view), [view]);
  const nodes = useMemo(() => buildGraphicNodes(view), [view]);

  if (
    !model.layers.length &&
    model.primaryTarget === undefined &&
    model.commonStop === undefined
  ) {
    return (
      <p className="text-sm text-zinc-500">
        No levels defined yet — add them via Stock Profile or a scout plan.
      </p>
    );
  }

  return (
    <div
      className="space-y-3 pb-[calc(6rem+env(safe-area-inset-bottom))]"
      data-scout-plan-map
    >
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
              · {model.layerCount}{" "}
              {model.layerCount === 1 ? "layer" : "layers"}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              {(model.operationalState ?? "unassessed").replace(/_/g, " ")} ·{" "}
              {(model.nextAction ?? "none").replace(/_/g, " ")} · Executable R{" "}
              {fmtR(model.executableRR)}
            </p>
          </div>
          {compact ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200"
            >
              {expanded ? "Compact" : "Expand"}
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-2 py-3">
        {nodes.length > 0 ? (
          <VerticalTradeMap
            nodes={nodes}
            compact={compact}
            expanded={expanded}
          />
        ) : (
          <p className="px-2 text-sm text-zinc-500">No price geometry.</p>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Capital / risk summary
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
          {(
            [
              ["Allocation mode", model.allocationModeLabel ?? "Unconfigured"],
              ["Reference plan R", fmtR(model.referencePlanRR)],
              ["Full-build blended R", fmtR(model.blendedRR)],
              ["Filled-position R", fmtR(model.filledPositionRR)],
              ["Executable R", fmtR(model.executableRR)],
              ["Min R", model.minRR !== undefined ? `${model.minRR}` : "Unconfigured"],
              ["Authorized risk", fmtUsd(model.authorizedRisk)],
              ["Rounded planned risk", fmtUsd(model.roundedRisk)],
              ["Unused risk", fmtUsd(model.unusedRisk)],
              ["Capital required", fmtUsd(model.requestedCapital)],
              ["Reference entry", fmtPrice(model.referenceEntry)],
              ["Common stop", fmtPrice(model.commonStop)],
              ["Fill summary", model.fillSummary],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-black/10 px-2.5 py-2"
            >
              <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
                {label}
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-zinc-100">{value}</dd>
            </div>
          ))}
        </dl>
        {model.layers.some(
          (layer) =>
            layer.shares === undefined && layer.allocationPercent === undefined
        ) ? (
          <p className="mt-2 text-[10px] text-zinc-500">
            Shares unconfigured on one or more layers — not invented.
          </p>
        ) : null}
      </section>
    </div>
  );
}
