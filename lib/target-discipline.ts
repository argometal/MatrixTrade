/**
 * Target lifecycle discipline (MXT 023).
 * Trains AI + pure classifiers: optimize against available evidence, not forecasts.
 * No ticker-specific levels. No Target Engine — Mechanics + existing Entry Solver.
 *
 * LIVE vs EVALUATION (do not collapse):
 * - LIVE new entry now: consumed T offers no future reward → reassessment; never invent T2.
 * - EVALUATION/reconstruction: T remains valid evidence for R map / historical optimized entry.
 * Prefer Mechanics teaching over hard gates. Geometry against T is allowed for evaluation;
 * inventing a next target remains forbidden.
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
  /**
   * True only when there is no defensible T at all (missing / projection-only).
   * Target-reached does NOT set this — evaluation may still compute R against T.
   * LIVE new-entry against a consumed T is a reasoning/Apply concern (see Mechanics), not a hard geometry wipe.
   */
  blockEntrySolverGeometry: boolean;
  /** Advisory: do not open a NEW live trade whose only reward is this already-reached T. */
  liveNewEntryAgainstConsumedTargetBlocked: boolean;
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
    "5. TARGET REASSESSMENT REQUIRED — prior target consumed for NEW forward trades; no evidenced next T yet.",
    "",
    "STATES 4 AND 5 MUST NOT auto-become probableTarget, extendedTarget, or R:R inputs for NEW live geometry.",
    "",
    "LIVE vs EVALUATION (infer from the question — no separate product mode required):",
    "A) LIVE / NEW ENTRY NOW — if price already reached T, T no longer offers future reward.",
    "   Do NOT invent T2. Say TARGET REACHED / REASSESSMENT REQUIRED before a new trade.",
    "   Do NOT propose a new Scout go whose only target is the already-consumed T.",
    "B) EVALUATION / RECONSTRUCTION — ask what entry would have optimized the move that reached T.",
    "   T remains valid evidence. ALLOW: T → candidate entries → tactical stops → R map →",
    "   participation → optimized historical/planned entry → learning/diagnosis.",
    "   Does NOT require inventing T2. Does NOT rewrite frozen T0. Does NOT auto-Accept as MAF.",
    "   Preserve hindsight controls: reconstruction ≠ accepted historical fact; Case/T0 stay immutable.",
    "",
    "WHEN PROBABLE TARGET IS REACHED (long: price ≥ target; short: price ≤ target):",
    "- Recognize TARGET REACHED explicitly.",
    "- Do NOT invent a higher (long) / lower (short) probableTarget to continue a LIVE setup.",
    "- Do NOT promote a plausible extension into probableTarget or operational extendedTarget.",
    "- Do NOT pick a new target to fabricate / improve R:R or to satisfy minimumRR.",
    "- Do NOT treat a drawn line without provenance as the new target.",
    "- Do NOT treat 'price discovery' / 'open sky' / 'no historical resistance above' as permission to speculate.",
    "- For LIVE new risk: reassessment until independent evidence supports another level.",
    "- For EVALUATION of the opportunity that produced T: keep using T; do not wipe R geometry.",
    "",
    "FORBIDDEN PIPELINE:",
    "TARGET REACHED → invent extension → calculate attractive R → open NEW live entry.",
    "",
    "ALLOWED PIPELINES:",
    "- LIVE with live defensible T ahead of price: evidence → T → stop → R map → participation → entry → sizing.",
    "- EVALUATION with T already reached: same chain against that T (no T2 invention).",
    "",
    "ERROR PATTERNS TO REJECT:",
    "- Stopping because 'no resistance exists above' when a nearer defensible target already worked —",
    "  if that target is reached, say TARGET REACHED; evaluate against T or reassess for NEW trades — never invent-or-freeze.",
    "- Filling an evidence gap with a 'technically plausible' round number or Fib extension.",
    "- Backsolving target from desired minimumRR / desired R:R.",
    "- Using possible future upside as Scout targetPrice / plannedRR / maximumEntry input for NEW risk.",
    "",
    "GENERAL (any ticker): never hardcode example prices as rules; only evidence on THIS chart set counts.",
  ].join("\n");
}

/**
 * Classify target lifecycle for advising.
 * Does not invent next targets. nextEvidencedTarget must be independently supported by caller.
 * Target-reached does not wipe Entry Solver geometry (evaluation needs it); live misuse is trained in Mechanics.
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
      liveNewEntryAgainstConsumedTargetBlocked: true,
      reason:
        "No live defensible probableTarget (missing or projection-only). Do not invent one for R geometry.",
    };
  }

  if (currentPrice == null || !Number.isFinite(currentPrice)) {
    return {
      status: "observed_defensible",
      blockEntrySolverGeometry: false,
      liveNewEntryAgainstConsumedTargetBlocked: false,
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
      liveNewEntryAgainstConsumedTargetBlocked: false,
      reason:
        "Probable target still ahead of price — Entry Solver may use it for live or evaluation.",
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
      liveNewEntryAgainstConsumedTargetBlocked: false,
      reason:
        "Prior target reached AND an independently evidenced next level was supplied — may promote only with that evidence (never fabricate).",
    };
  }

  return {
    status: "target_reached",
    /** Allow R map / optimized reconstruction against T — do not wipe evaluation geometry. */
    blockEntrySolverGeometry: false,
    liveNewEntryAgainstConsumedTargetBlocked: true,
    reason:
      "TARGET REACHED — T consumed for NEW live reward. EVALUATION may still compute entry/stop/R against T. Do NOT invent T2. LIVE new entry against this T alone → REASSESSMENT REQUIRED.",
  };
}

/** True when a proposed "next" level is only a projection label — never promote. */
export function isProjectionOnlyTargetKind(
  kind: ProbableTargetKind | null | undefined
): boolean {
  return kind === "calculated_projection" || kind == null;
}
