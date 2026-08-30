"use client";

/**
 * Scout Desk — Watching scan card (16-08).
 * Visual language from Stock File “Open Scout” / Active scout block;
 * density cues from Execute. Scan only — not funding/Prepare/Apply workshop.
 */
import Link from "next/link";
import { formatStockThesisZone, type StockThesis } from "@/lib/stock-thesis-types";
import type { TradePlan } from "@/lib/plan-types";
import {
  formatConsolidatedOperationalTag,
  formatOperationalR,
  formatScoutWatchTriggerLine,
  type ScoutOperationalAssessment,
} from "@/lib/scout-operational-state";
import type { ScoutingVerdict } from "@/lib/scouting-types";

export function ScoutWatchingScan({
  thesis,
  plan,
  verdict,
  plannedRR,
  displayOperational,
  mismatch,
  detectedStateLabel,
  confirmedStateLabel,
}: {
  thesis: StockThesis;
  plan: TradePlan | null | undefined;
  verdict: ScoutingVerdict | null;
  plannedRR: number | undefined;
  displayOperational: ScoutOperationalAssessment;
  mismatch: boolean;
  detectedStateLabel?: string;
  confirmedStateLabel?: string;
}) {
  const le = plan?.layeredEntry;
  const entry = plan?.plannedEntry ?? le?.limits?.[0]?.price;
  const stop = plan?.stopPrice ?? le?.commonStopPrice;
  const target = plan?.targetPrice ?? le?.primaryTargetPrice;
  const zone = formatStockThesisZone(thesis.levels?.primaryZone);
  const trigger = formatScoutWatchTriggerLine(displayOperational);
  const rrLabel =
    plannedRR !== undefined
      ? `${plannedRR.toFixed(1)}R`
      : formatOperationalR(displayOperational.currentExecutableRR);

  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
      data-scout-case-summary
      data-scout-watching-scan
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-zinc-100">{thesis.ticker}</span>
        {plan ? (
          <span className="text-xs text-zinc-500">{plan.id}</span>
        ) : (
          <span className="text-xs text-zinc-500">{thesis.id}</span>
        )}
        <span
          className="rounded-full border border-zinc-600/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-300"
          data-scout-operational-tag
        >
          {formatConsolidatedOperationalTag({
            verdict,
            assessment: displayOperational,
          })}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2 lg:grid-cols-3">
        {(
          [
            ["Zone", zone],
            ["Entry", entry !== undefined ? String(entry) : "—"],
            ["Stop", stop !== undefined ? String(stop) : "—"],
            ["Target", target !== undefined ? String(target) : "—"],
            ["R", rrLabel],
            ["Wait horizon", displayOperational.waitHorizon],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-2.5 py-1.5"
          >
            <dt className="text-[10px] uppercase tracking-wide text-zinc-600">
              {label}
            </dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums text-zinc-200">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <p
        className="mt-3 text-xs leading-relaxed text-zinc-400"
        data-scout-watch-trigger
      >
        {trigger}
      </p>

      {mismatch ? (
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
          Detected: {detectedStateLabel ?? "—"} · Confirmed:{" "}
          {confirmedStateLabel ?? "none"} · Review required
        </p>
      ) : null}

      <div className="mt-3">
        <Link
          href={`/mta/stock-theses/${thesis.id}`}
          className="inline-flex flex-col rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-left transition hover:border-zinc-500 hover:bg-zinc-900"
          data-scout-open-scout
        >
          <span className="text-sm font-semibold text-zinc-100">Open Scout</span>
          <span className="mt-0.5 text-xs text-zinc-500">
            Decision · entry · stop · targets · R
          </span>
        </Link>
      </div>
    </section>
  );
}
