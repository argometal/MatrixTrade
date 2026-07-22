"use client";

import { useMemo, useState } from "react";
import type { PlanLevelsView } from "@/lib/plan-levels-board";
import {
  deriveTradeMapIntent,
  deriveTradeMapNodes,
  deriveTradeMapWarnings,
  normalizeTradeMapY,
  type TradeMapNode,
  type TradeMapTone,
} from "@/lib/plan-levels-board";

const TONE_STYLES: Record<
  TradeMapTone,
  { border: string; bg: string; text: string; dot: string; chip: string }
> = {
  target: {
    border: "border-emerald-500/50",
    bg: "bg-emerald-950/40",
    text: "text-emerald-200",
    dot: "bg-emerald-400",
    chip: "bg-emerald-500/20 text-emerald-200",
  },
  stretch: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/20",
    text: "text-emerald-300/80",
    dot: "bg-emerald-500/70",
    chip: "bg-emerald-500/10 text-emerald-300/80",
  },
  entry: {
    border: "border-violet-500/45",
    bg: "bg-violet-950/35",
    text: "text-violet-200",
    dot: "bg-violet-400",
    chip: "bg-violet-500/20 text-violet-200",
  },
  preferred: {
    border: "border-sky-500/50",
    bg: "bg-sky-950/35",
    text: "text-sky-200",
    dot: "bg-sky-400",
    chip: "bg-sky-500/20 text-sky-200",
  },
  deep: {
    border: "border-cyan-500/45",
    bg: "bg-cyan-950/30",
    text: "text-cyan-200",
    dot: "bg-cyan-400",
    chip: "bg-cyan-500/20 text-cyan-200",
  },
  stop: {
    border: "border-red-500/50",
    bg: "bg-red-950/40",
    text: "text-red-200",
    dot: "bg-red-400",
    chip: "bg-red-500/20 text-red-200",
  },
  current: {
    border: "border-amber-500/50",
    bg: "bg-amber-950/35",
    text: "text-amber-200",
    dot: "bg-amber-400",
    chip: "bg-amber-500/20 text-amber-200",
  },
};

function formatPrice(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function MapLevelCard({
  node,
  compact,
}: {
  node: TradeMapNode;
  compact?: boolean;
}) {
  const style = TONE_STYLES[node.tone];
  return (
    <div
      role="listitem"
      aria-label={node.ariaLabel}
      className={`w-full max-w-[16rem] rounded-lg border px-3 py-2 transition-opacity duration-300 ${style.border} ${style.bg}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p
          className={`text-[10px] font-semibold uppercase tracking-wide ${style.text}`}
        >
          {node.label}
        </p>
        <p className={`font-mono text-sm font-semibold ${style.text}`}>
          {formatPrice(node.price)}
        </p>
      </div>
      {!compact ? (
        <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-zinc-500">
          {node.allocationPercent !== undefined ? (
            <span>{node.allocationPercent}%</span>
          ) : null}
          {node.rr !== undefined ? <span>{node.rr.toFixed(1)}R</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function VerticalTradeMap({
  nodes,
  compact,
  expanded,
}: {
  nodes: TradeMapNode[];
  compact: boolean;
  expanded: boolean;
}) {
  const prices = nodes.map((n) => n.price);
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const heightPx = compact && !expanded ? 180 : compact ? 280 : 380;

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
    >
      {/* Center spine */}
      <div
        className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 bg-gradient-to-b from-emerald-500/40 via-violet-500/30 to-red-500/50"
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
            className="absolute left-0 right-0 flex -translate-y-1/2 items-center justify-center px-2 opacity-100 transition-opacity duration-300"
            style={{ top: `${y}%` }}
          >
            <div className="flex w-full items-center gap-2">
              <div className="hidden w-[18%] sm:block" aria-hidden />
              <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
              <div className="flex min-w-0 flex-1 justify-center">
                <MapLevelCard node={node} compact={compact && !expanded} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Visual Trade Map — replaces textual Plan Map inside Scout (same PlanLevelsView). */
export function PlanLevelsBoard({
  view,
  compact = false,
}: {
  view: PlanLevelsView;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const nodes = useMemo(() => deriveTradeMapNodes(view), [view]);
  const intent = useMemo(() => deriveTradeMapIntent(view), [view]);
  const warnings = useMemo(() => deriveTradeMapWarnings(view), [view]);

  if (view.rows.length === 0 && nodes.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No levels defined yet — add them via Stock Profile or a scout plan.
      </p>
    );
  }

  const hasLadder = nodes.some((n) => n.kind === "entry" || n.kind === "target" || n.kind === "stop");

  const scenarioCards = (() => {
    const le = view.layeredEntry;
    if (!le) return [];
    if (le.fillStates?.length) {
      return le.fillStates
        .filter((s) => s.limitsFilled > 0)
        .map((s) => ({
          title:
            s.limitsFilled === 1
              ? "Only Starter"
              : s.limitsFilled === le.plan.limits.length
                ? "All Filled"
                : s.label.replace(/^L1–L/, "Starter + L"),
          average: s.averageEntry,
          rr: s.blendedRR ?? s.combinedRR ?? s.portfolioRR,
        }));
    }
    return le.scenarios
      .filter((s) => s.limitsFilled > 0)
      .map((s) => {
        const rr = le.scenarioRR?.find((r) => r.label === s.label)?.rr;
        return {
          title:
            s.limitsFilled === 1
              ? "Only Starter"
              : s.limitsFilled === le.plan.limits.length
                ? "All Filled"
                : s.label,
          average: s.averageEntry,
          rr,
        };
      });
  })();

  // Friendlier scenario titles when layered roles exist
  const titledScenarios = scenarioCards.map((card, i, arr) => {
    if (i === 0) return { ...card, title: "Only Starter" };
    if (i === arr.length - 1) return { ...card, title: "All Filled" };
    if (i === 1) return { ...card, title: "Starter + Preferred" };
    return card;
  });

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {/* Section 1 — Trade Intent */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 transition-opacity duration-300">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Execution intent
            </p>
            <p className="mt-1 text-base font-semibold text-zinc-100 sm:text-lg">
              {view.strategy && view.strategy !== "—"
                ? view.strategy.length > 80
                  ? `${view.strategy.slice(0, 80)}…`
                  : view.strategy
                : "Bull Trend Continuation"}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              This is NOT a prediction — execution geometry only.
            </p>
          </div>
          <p className="rounded-md bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-500">
            {view.ticker}
          </p>
        </div>

        {intent.length > 0 ? (
          <ol className="mt-4 flex flex-col items-start gap-1 sm:items-center">
            {intent.map((step, i) => (
              <li key={`${step.label}-${i}`} className="flex flex-col items-center">
                {i > 0 ? (
                  <span className="py-0.5 text-zinc-600" aria-hidden>
                    ↓
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    step.tone === "target"
                      ? TONE_STYLES.target.chip
                      : step.tone === "preferred"
                        ? TONE_STYLES.preferred.chip
                        : step.tone === "deep"
                          ? TONE_STYLES.deep.chip
                          : TONE_STYLES.entry.chip
                  }`}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {/* Strategy chips */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-300">
          Strategy
        </span>
        {view.minRR !== undefined ? (
          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-300">
            Min R {view.minRR}
          </span>
        ) : null}
        {view.plannedRR !== undefined ? (
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] ${
              view.minRR !== undefined && view.plannedRR < view.minRR
                ? "border-red-500/40 bg-red-950/30 text-red-200"
                : "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
            }`}
          >
            Plan R {view.plannedRR.toFixed(1)}
          </span>
        ) : null}
        {view.layeredEntry?.plan.noChase ? (
          <span className="rounded-full border border-amber-500/30 bg-amber-950/20 px-2.5 py-1 text-[10px] text-amber-200">
            No Chase
          </span>
        ) : null}
        {view.layeredEntry ? (
          <span className="rounded-full border border-violet-500/30 bg-violet-950/20 px-2.5 py-1 text-[10px] text-violet-200">
            Layered
          </span>
        ) : null}
      </div>

      {/* Section 2 — Vertical Trade Map */}
      {hasLadder ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Trade map
            </p>
            {compact ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="rounded-md border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200"
              >
                {expanded ? "Collapse" : "Expand"}
              </button>
            ) : null}
          </div>
          <VerticalTradeMap nodes={nodes} compact={compact} expanded={expanded} />
          <p className="mt-2 text-center text-[10px] text-zinc-600">
            Spacing ≈ price distance · not a chart · not a forecast
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-500">
          Add entry, stop, and target to render the trade map.
        </p>
      )}

      {/* Scenario preview cards */}
      {titledScenarios.length > 0 ? (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Fill scenarios
          </p>
          <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"}`}>
            {titledScenarios.map((s) => (
              <div
                key={s.title}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-3 transition-opacity duration-300"
              >
                <p className="text-xs font-medium text-zinc-300">{s.title}</p>
                <p className="mt-1 font-mono text-sm text-zinc-100">
                  Avg {formatPrice(s.average)}
                </p>
                <p className="mt-0.5 text-xs text-emerald-400/90">
                  {s.rr !== undefined ? `${s.rr.toFixed(1)}R` : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Warnings */}
      {warnings.length > 0 ? (
        <div className="space-y-2">
          {warnings.map((w) => (
            <div
              key={w}
              className="rounded-lg border border-amber-500/35 bg-amber-950/25 px-3 py-2 text-xs text-amber-100/90"
            >
              ⚠ {w}
            </div>
          ))}
        </div>
      ) : null}

      {view.invalidation ? (
        <p className="rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
          <span className="text-red-400">Invalidation · </span>
          {view.invalidation}
        </p>
      ) : null}

      {view.window ? (
        <p className="text-xs text-zinc-500">Window · {view.window}</p>
      ) : null}

      {view.source === "profile" ? (
        <p className="text-xs text-amber-500/80">
          Profile levels only — log a scout plan to pin entry, stop, and target for this window.
        </p>
      ) : null}
    </div>
  );
}
