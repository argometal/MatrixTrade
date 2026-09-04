/**
 * Target lifecycle discipline (MXT 023).
 * Trains AI + pure classifiers: optimize against available evidence, not forecasts.
 * No ticker-specific levels. No Target Engine — Mechanics + existing Entry Solver.
 */

import type { ProbableTargetKind } from "./entry-solver";
import type { TradeSide } from "./r-semantics";

/** Explicit AI-facing lifecycle — states 4–5 must not become probableTarget. */
export type TargetLifecycleStatus =
  | "observed_defensible"
  | "target_reached"
  | "extended_evidenced"
  | "possible_future_upside"
  | "reassessment_required";

export type TargetLifecycleClassification = {
  status: TargetLifecycleStatus;
  /** True when Entry Solver must NOT compute R / maxEntry / optimized entry on a live target. */
  blockEntrySolverGeometry: boolean;
  reason: string;
};

/**
 * Canonical Mechanics / Analyze training text.
 * Must be explicit enough that a clean AI chat cannot invent the next target
 * merely because trend remains bullish or minimumRR needs a higher ceiling.
 */
export function buildTargetDisciplineBrief(): string {
  return [
    "=== TARGET DISCIPLINE (mandatory — trains Analysis Mode) ===",
    "PRINCIPLE: Optimize against available evidence, not against a forecast required to make the trade work.",
    "MXT works with the evidence it HAS. It does not need to predict how far price might eventually go",
    "to keep a setup alive. Plausibility ≠ evidence.",
    "",
    "FIVE STATES (never collapse them):",
    "1. OBSERVED / DEFENSIBLE TARGET — level backed by available technical evidence",
    "   (major R/S, prior swing, HTF structure, VP node WITH provenance, thesis geometry).",
    "   Kind: observed_structural | probable_operational.",
    "2. TARGET REACHED — price has reached or exceeded that defensible target.",
    "3. EXTENDED TARGET — an ADDITIONAL level that ALREADY has independent technical evidence.",
    "   Same evidence bar as (1). Never the same price as probableTarget.",
    "4. POSSIBLE FUTURE UPSIDE/DOWNSIDE — continuation hypothesis still insufficient for calculation.",
    "5. TARGET REASSESSMENT REQUIRED — prior target consumed; no evidence yet for a new one.",
    "",
    "STATES 4 AND 5 MUST NOT auto-become probableTarget, extendedTarget, or R:R inputs.",
    "",
    "WHEN PROBABLE TARGET IS REACHED (long: price ≥ target; short: price ≤ target):",
    "- Recognize TARGET REACHED explicitly.",
    "- Do NOT invent a higher (long) / lower (short) probableTarget to continue the setup.",
    "- Do NOT promote a plausible extension into probableTarget or operational extendedTarget.",
    "- Do NOT pick a new target to fabricate / improve R:R or to satisfy minimumRR.",
    "- Do NOT treat a drawn line without provenance as the new target.",
    "- Do NOT treat 'price discovery' / 'open sky' / 'no historical resistance above' as permission to speculate.",
    "- Say TARGET REASSESSMENT REQUIRED until new independent evidence supports another level.",
    "- Entry Solver must STOP geometry (no maximumEntry / optimizedEntry / sizing) on a consumed target",
    "  until reassessment produces a new defensible target.",
    "",
    "FORBIDDEN PIPELINE:",
    "TARGET REACHED → invent extension → calculate attractive R → optimize entry.",
    "",
    "ALLOWED PIPELINE (only with a live defensible target):",
    "evidence → probable target → tactical stop → R map → participation → optimized entry → sizing.",
    "",
    "ERROR PATTERNS TO REJECT:",
    "- Stopping because 'no resistance exists above' when a nearer defensible target already worked —",
    "  if that target is reached, the answer is TARGET REACHED + REASSESSMENT, not invent-or-freeze.",
    "- Filling an evidence gap with a 'technically plausible' round number or Fib extension.",
    "- Backsolving target from desired minimumRR / desired R:R.",
    "- Using possible future upside as Scout targetPrice / plannedRR / maximumEntry input.",
    "",
    "GENERAL (any ticker): never hardcode example prices as rules; only evidence on THIS chart set counts.",
  ].join("\n");
}

/**
 * Classify whether the current probable target is still live for Entry Solver geometry.
 * Does not invent next targets. nextEvidencedTarget must be independently supported by caller.
 */
export function classifyTargetLifecycle(input: {
  side: TradeSide;
  probableTarget: number | null;
  probableTargetKind: ProbableTargetKind | null;
  currentPrice: number | null;
  /** Independently evidenced next target — NOT a guess / Fib alone. */
  nextEvidencedTarget?: number | null;
}): TargetLifecycleClassification {
  const { probableTarget, probableTargetKind, currentPrice, side } = input;
  const next = input.nextEvidencedTarget;

  if (
    probableTarget == null ||
    !Number.isFinite(probableTarget) ||
    probableTargetKind == null ||
    probableTargetKind === "calculated_projection"
  ) {
    return {
      status: "reassessment_required",
      blockEntrySolverGeometry: true,
      reason:
        "No live defensible probableTarget (missing or projection-only). Do not invent one for R geometry.",
    };
  }

  if (currentPrice == null || !Number.isFinite(currentPrice)) {
    return {
      status: "observed_defensible",
      blockEntrySolverGeometry: false,
      reason: "Defensible probableTarget present; current price not supplied for reach check.",
    };
  }

  const reached =
    side === "long"
      ? currentPrice + 1e-9 >= probableTarget
      : currentPrice - 1e-9 <= probableTarget;

  if (!reached) {
    return {
      status: "observed_defensible",
      blockEntrySolverGeometry: false,
      reason: "Probable target still ahead of price — Entry Solver may use it.",
    };
  }

  if (
    next != null &&
    Number.isFinite(next) &&
    ((side === "long" && next > probableTarget) ||
      (side === "short" && next < probableTarget))
  ) {
    return {
      status: "extended_evidenced",
      blockEntrySolverGeometry: false,
      reason:
        "Prior target reached AND an independently evidenced next level was supplied — may promote only with that evidence (never fabricate).",
    };
  }

  return {
    status: "target_reached",
    blockEntrySolverGeometry: true,
    reason:
      "TARGET REACHED — prior defensible target consumed; no independently evidenced next target. TARGET REASSESSMENT REQUIRED. Do not invent extension for R:R / Entry Solver.",
  };
}

/** True when a proposed "next" level is only a projection label — never promote. */
export function isProjectionOnlyTargetKind(
  kind: ProbableTargetKind | null | undefined
): boolean {
  return kind === "calculated_projection" || kind == null;
}
