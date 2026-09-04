/**
 * Optimized Entry resolver (MXT 021 Punto 2 / 023 R semantics).
 *
 * TARGET → TACTICAL STOP → RISK/REWARD GEOMETRY → FEASIBILITY BOUND →
 * PARTICIPATION → OPTIMIZED ENTRY → R$ sizing.
 * MAXIMUM R ≠ OPTIMIZED ENTRY. Feasibility bound ≠ recommended entry.
 * Does not invent fill probabilities.
 */

import { DEFAULT_RISK_BUDGET_USD } from "./layered-entry-risk";
import {
  computeMaximumEntryCeiling,
  type FillEvidenceStatus,
  type ProbableTargetKind,
  longRewardRiskR,
} from "./entry-solver";
import { classifyTargetLifecycle } from "./target-discipline";

export type OptimizedEntryCandidate = {
  price: number;
  role: string;
  riskPerShare: number | null;
  rewardPerShare: number | null;
  plannedRR: number | null;
  estimatedShares: number | null;
  meetsMinimumRR: boolean;
  /** Full stop loss ≈ -1R in dollars when sized from riskBudgetUsd. */
  fullStopLossUsd: number | null;
};

export type OptimizedEntryStatus =
  | "selected"
  | "unresolved"
  | "needs_evidence"
  | "wait_extended"
  | "target_reached"
  | "reassessment_required";

export type OptimizedEntryResult = {
  status: OptimizedEntryStatus;
  riskBudgetUsd: number;
  /** Explicit: monetary 1R unit — never confuse with riskPerShare. */
  oneRDefinition: string;
  probableTarget: number | null;
  probableTargetKind: ProbableTargetKind | null;
  tacticalStop: number | null;
  maximumEntryCeiling: number | null;
  opportunityZone: { low: number; high: number } | null;
  candidates: OptimizedEntryCandidate[];
  participationEvidence: FillEvidenceStatus;
  participationNote: string;
  selectedEntry: number | null;
  whySelected: string | null;
  alternativeDeeperOpportunity: string | null;
  reassessmentRequired: boolean;
  reassessmentCondition: string | null;
  /** True only when status=selected and worksheet complete. */
  optimizedClaimEligible: boolean;
};

export type ResolveOptimizedEntryInput = {
  candidates: Array<{ price: number; role: string }>;
  probableTarget: number | null;
  probableTargetKind: ProbableTargetKind | null;
  tacticalStop: number | null;
  minimumRR: number;
  riskBudgetUsd?: number;
  opportunityZone?: { low: number; high: number } | null;
  currentPrice?: number | null;
  structuralInvalidationNote?: string | null;
  calculatedProjections?: Array<{ label: string; price: number }>;
  /** Independently evidenced next target only — never invent. */
  nextEvidencedTarget?: number | null;
  /** Optional qualitative hist counts — never converted to fill %. */
  historical?: {
    missedOpportunityCases?: number;
    possibleOverOptimizationCases?: number;
  };
  playbookId?: string | null;
  familyHint?: "A" | "B" | null;
  side?: "long" | "short";
};

/** shares = floor(R$ / riskPerShare); riskPerShare is NOT 1R. Works long/short via abs. */
export function sharesForRiskBudget(
  entry: number,
  stop: number,
  riskBudgetUsd: number
): number | null {
  if (![entry, stop, riskBudgetUsd].every((n) => Number.isFinite(n))) return null;
  if (!(riskBudgetUsd > 0)) return null;
  const riskPerShare = Math.abs(entry - stop);
  if (!(riskPerShare > 0)) return null;
  const shares = Math.floor(riskBudgetUsd / riskPerShare);
  return shares > 0 ? shares : null;
}

export function resolveRiskBudgetUsd(raw?: number | null): number {
  if (raw != null && Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_RISK_BUDGET_USD;
}

function enrichCandidate(
  price: number,
  role: string,
  stop: number | null,
  target: number | null,
  minimumRR: number,
  riskBudgetUsd: number
): OptimizedEntryCandidate {
  const riskPerShare =
    stop != null && Number.isFinite(stop) && price > stop ? price - stop : null;
  const rewardPerShare =
    target != null && Number.isFinite(target) && target > price
      ? target - price
      : null;
  const plannedRR =
    stop != null && target != null ? longRewardRiskR(price, stop, target) : null;
  const estimatedShares =
    stop != null ? sharesForRiskBudget(price, stop, riskBudgetUsd) : null;
  const fullStopLossUsd =
    estimatedShares != null && riskPerShare != null
      ? estimatedShares * riskPerShare
      : null;
  return {
    price,
    role,
    riskPerShare,
    rewardPerShare,
    plannedRR,
    estimatedShares,
    meetsMinimumRR: plannedRR != null && plannedRR + 1e-9 >= minimumRR,
    fullStopLossUsd,
  };
}

/**
 * Pure Optimized Entry resolver.
 * Does not pick zone midpoint, max R, or maximumEntry automatically.
 */
export function resolveOptimizedEntry(
  input: ResolveOptimizedEntryInput
): OptimizedEntryResult {
  const riskBudgetUsd = resolveRiskBudgetUsd(input.riskBudgetUsd);
  const stop = input.tacticalStop;
  const target = input.probableTarget;
  const zone = input.opportunityZone ?? null;
  const side = input.side ?? "long";
  const lifecycle = classifyTargetLifecycle({
    side,
    probableTarget: target,
    probableTargetKind: input.probableTargetKind,
    currentPrice: input.currentPrice ?? null,
    nextEvidencedTarget: input.nextEvidencedTarget ?? null,
  });
  const extended =
    input.currentPrice != null &&
    zone != null &&
    Number.isFinite(input.currentPrice) &&
    input.currentPrice > zone.high;

  const ceiling =
    target != null && stop != null && !lifecycle.blockEntrySolverGeometry
      ? computeMaximumEntryCeiling(target, stop, input.minimumRR)
      : null;

  const histMiss = input.historical?.missedOpportunityCases ?? 0;
  const histOver = input.historical?.possibleOverOptimizationCases ?? 0;
  const participationEvidence: FillEvidenceStatus =
    histMiss + histOver > 0 ? "qualitative_only" : "insufficient";

  const participationNote =
    participationEvidence === "qualitative_only"
      ? `Historical Cases: missed_opportunity=${histMiss}, Possible Over-Optimization=${histOver}. Deeper entries raise R but risk non-participation — no calibrated fill-rate. MAX R ≠ OPTIMIZED ENTRY.`
      : "FILL EVIDENCE: INSUFFICIENT — no calibrated fill-rate. Qualitatively: higher entry → lower R / greater participation likelihood; lower entry → higher R / lower fill likelihood. MAX R ≠ OPTIMIZED ENTRY. Do not invent fill %.";

  const candidates =
    lifecycle.blockEntrySolverGeometry
      ? input.candidates.map((c) => ({
          price: c.price,
          role: c.role,
          riskPerShare: null as number | null,
          rewardPerShare: null as number | null,
          plannedRR: null as number | null,
          estimatedShares: null as number | null,
          meetsMinimumRR: false,
          fullStopLossUsd: null as number | null,
        }))
      : input.candidates.map((c) =>
          enrichCandidate(c.price, c.role, stop, target, input.minimumRR, riskBudgetUsd)
        );

  const deeper = [...candidates]
    .filter((c) => c.meetsMinimumRR)
    .sort((a, b) => a.price - b.price)[0];

  const base: OptimizedEntryResult = {
    status: "needs_evidence",
    riskBudgetUsd,
    oneRDefinition: `1R = USD ${riskBudgetUsd} (rules.defaultRiskBudget / DEFAULT_RISK_BUDGET_USD) — distinct from riskPerShare = Entry−Stop`,
    probableTarget: target,
    probableTargetKind: input.probableTargetKind,
    tacticalStop: stop,
    maximumEntryCeiling: ceiling,
    opportunityZone: zone,
    candidates,
    participationEvidence,
    participationNote,
    selectedEntry: null,
    whySelected: null,
    alternativeDeeperOpportunity: deeper
      ? `Opportunity 2 / deeper candidate @ ${deeper.price} (${deeper.plannedRR?.toFixed(2) ?? "?"}R) — reassessment required before use; never auto-select for higher R alone.`
      : "If a deeper zone exists, treat as Opportunity 2 — reassessment required.",
    reassessmentRequired: true,
    reassessmentCondition:
      "Attempt 1 stop-out ≈ -1R (tactical) does not auto-invalidate Stock File thesis. Before Opportunity 2: reassess sweep vs structure break, target, tactical stop, Family/Playbook, thesis validity.",
    optimizedClaimEligible: false,
  };

  if (lifecycle.blockEntrySolverGeometry) {
    const status: OptimizedEntryStatus =
      lifecycle.status === "target_reached"
        ? "target_reached"
        : "reassessment_required";
    return {
      ...base,
      status,
      whySelected: `${lifecycle.status}: ${lifecycle.reason}`,
      reassessmentRequired: true,
      reassessmentCondition:
        "TARGET REASSESSMENT REQUIRED — do not invent next probableTarget/extendedTarget for R:R. Wait for independently evidenced next level.",
      maximumEntryCeiling: null,
    };
  }

  if (extended) {
    return {
      ...base,
      status: "wait_extended",
      whySelected:
        "NO CHASE while price extended above opportunity zone — Optimized Entry deferred.",
    };
  }

  if (
    target == null ||
    stop == null ||
    input.probableTargetKind == null ||
    input.probableTargetKind === "calculated_projection"
  ) {
    return {
      ...base,
      status: "needs_evidence",
      whySelected:
        "Cannot optimize entry — probable target (non-projection) and/or tactical stop not defendable.",
    };
  }

  if (input.candidates.length < 2) {
    return {
      ...base,
      status: "needs_evidence",
      whySelected: "R map requires ≥2 candidate entries before Optimized Entry.",
    };
  }

  const valid = candidates.filter((c) => c.meetsMinimumRR);
  if (valid.length === 0) {
    return {
      ...base,
      status: "unresolved",
      whySelected: "No candidate meets minimumRR under defendable target/stop.",
    };
  }

  // Refuse aesthetic midpoint / max-R-only when participation evidence insufficient.
  const maxR = [...valid].sort(
    (a, b) => (b.plannedRR ?? 0) - (a.plannedRR ?? 0)
  )[0];
  const opp1 =
    valid.find((c) => /opportunity_1|zone_high|early/i.test(c.role)) ?? null;

  // Prefer Opportunity 1 (more participative) over max-R deeper when fill evidence insufficient.
  let pick = opp1 ?? null;
  if (!pick && participationEvidence === "insufficient") {
    // Prefer highest price among valid (more likely fill) — not lowest/max R.
    pick = [...valid].sort((a, b) => b.price - a.price)[0] ?? null;
    if (pick && /mid|midpoint|aesthetic/i.test(pick.role)) {
      return {
        ...base,
        status: "needs_evidence",
        whySelected:
          "Refusing zone midpoint as Optimized Entry without participation evidence.",
      };
    }
  } else if (!pick) {
    pick = maxR;
  }

  // Never select solely because it is max R when a more participative opp1 exists with lower R.
  if (
    pick &&
    maxR &&
    pick.price === maxR.price &&
    opp1 &&
    opp1.price !== maxR.price &&
    participationEvidence === "insufficient"
  ) {
    pick = opp1;
  }

  if (!pick) {
    return {
      ...base,
      status: "unresolved",
      whySelected: "No defendable Optimized Entry among candidates.",
    };
  }

  // Hard reject: selecting max-R deep solely when another valid higher entry exists + insufficient fill
  if (
    participationEvidence === "insufficient" &&
    maxR &&
    pick.price === maxR.price &&
    valid.some((c) => c.price > pick!.price + 1e-9)
  ) {
    return {
      ...base,
      status: "needs_evidence",
      whySelected:
        "Refusing max-R deeper entry as Optimized Entry while FILL EVIDENCE INSUFFICIENT and more participative candidates exist.",
    };
  }

  const why = [
    `target ${target} (${input.probableTargetKind})`,
    `tacticalStop ${stop}`,
    `R map ${candidates.length} candidates`,
    `${pick.role} @ ${pick.price} → ${(pick.plannedRR ?? 0).toFixed(2)}R ≥ min ${input.minimumRR}`,
    `riskPerShare $${pick.riskPerShare?.toFixed(2) ?? "?"} (NOT 1R)`,
    `1R = $${riskBudgetUsd} → ~${pick.estimatedShares ?? "?"} shares`,
    `full stop ≈ -$${pick.fullStopLossUsd?.toFixed(0) ?? "?"} ≈ -1R`,
    `maximumEntry ceiling ${ceiling?.toFixed(2) ?? "na"} (not recommendation)`,
    `participation: ${participationEvidence}`,
    input.familyHint ? `family ${input.familyHint}` : null,
    input.playbookId ? `playbook ${input.playbookId}` : null,
  ]
    .filter(Boolean)
    .join("; ");

  return {
    ...base,
    status: "selected",
    selectedEntry: pick.price,
    whySelected: why,
    optimizedClaimEligible: true,
    reassessmentRequired: true,
  };
}

/** Format for Analyze / Mechanics advising. */
export function formatOptimizedEntrySection(
  result: OptimizedEntryResult
): string {
  const rows =
    result.candidates.length === 0
      ? ["(no candidates)"]
      : result.candidates.map((c) => {
          const rr = c.plannedRR == null ? "—" : `${c.plannedRR.toFixed(2)}R`;
          const gate = c.meetsMinimumRR ? "PASS" : "FAIL";
          return `- ${c.role} @ ${c.price} | risk/sh $${c.riskPerShare?.toFixed(2) ?? "—"} | ${rr} ${gate} | shares ~${c.estimatedShares ?? "—"} | stop$-1R ~${c.fullStopLossUsd?.toFixed(0) ?? "—"}`;
        });

  return [
    "=== ENTRY SOLVER / OPTIMIZED ENTRY ===",
    "pipeline: Target → Tactical Stop → R Map → Participation → Optimized Entry → R$ sizing",
    "MAX R ≠ OPTIMIZED ENTRY. maximumEntry = ceiling only.",
    "",
    `Probable Target: ${result.probableTarget ?? "UNDEFINED"} (${result.probableTargetKind ?? "none"})`,
    `Tactical Stop: ${result.tacticalStop ?? "UNDEFINED"}`,
    result.opportunityZone
      ? `Opportunity Zone: ${result.opportunityZone.low}–${result.opportunityZone.high}`
      : "Opportunity Zone: UNDEFINED",
    `Risk Budget: ${result.oneRDefinition}`,
    `maximumEntry (ceiling): ${result.maximumEntryCeiling?.toFixed(4) ?? "na"}`,
    "",
    "Candidate Entry | Risk/share | RR | Shares | Participation",
    ...rows,
    `Participation evidence: FILL EVIDENCE: ${result.participationEvidence.toUpperCase()}`,
    result.participationNote,
    "",
    `Optimized Entry: ${result.selectedEntry ?? "NONE — " + result.status.toUpperCase()}`,
    `Why: ${result.whySelected ?? "(none)"}`,
    `Alternative Opportunity: ${result.alternativeDeeperOpportunity ?? "none"}`,
    `Reassess If: ${result.reassessmentCondition ?? "none"}`,
    `optimizedClaimEligible: ${result.optimizedClaimEligible ? "yes" : "no"}`,
  ].join("\n");
}

/**
 * Apply-path enforcement: claiming optimized requires evidence.
 * Legacy plannedEntry without claim remains allowed.
 */
export function validateOptimizedEntryApplyClaim(proposal: Record<string, unknown>): {
  ok: boolean;
  errors: string[];
  legacyMissing: boolean;
} {
  const errors: string[] = [];
  const claimRaw = proposal.optimizedEntryClaim ?? proposal.entryClaim;
  const claimsOptimized =
    claimRaw === true ||
    String(claimRaw ?? "").toLowerCase() === "optimized" ||
    proposal.optimizedEntry === true;

  const hasSolver =
    proposal.entrySolver != null ||
    proposal.optimizedEntryEvidence != null ||
    proposal.entrySolverEvidence != null;

  if (!claimsOptimized && !hasSolver) {
    return {
      ok: true,
      errors: [],
      legacyMissing: proposal.plannedEntry !== undefined,
    };
  }

  const evidence = (proposal.entrySolver ??
    proposal.optimizedEntryEvidence ??
    proposal.entrySolverEvidence) as Record<string, unknown> | undefined;

  if (!evidence || typeof evidence !== "object") {
    errors.push(
      "optimizedEntryClaim requires entrySolver / optimizedEntryEvidence worksheet"
    );
    return { ok: false, errors, legacyMissing: false };
  }

  const target = Number(evidence.probableTarget);
  const stop = Number(evidence.tacticalStop);
  const why = String(evidence.whySelected ?? "").trim();
  const participation = String(
    evidence.participationEvidence ?? evidence.fillEvidenceStatus ?? ""
  ).trim();
  const riskBudget = Number(evidence.riskBudgetUsd);
  const candidates = Array.isArray(evidence.candidates)
    ? evidence.candidates
    : Array.isArray(evidence.candidateEntries)
      ? evidence.candidateEntries
      : [];

  if (!Number.isFinite(target)) errors.push("entrySolver.probableTarget required");
  if (!Number.isFinite(stop)) errors.push("entrySolver.tacticalStop required");
  if (candidates.length < 2) {
    errors.push("entrySolver.candidates R map requires ≥2 entries");
  }
  if (!why) errors.push("entrySolver.whySelected required");
  if (!participation) {
    errors.push("entrySolver.participationEvidence / fillEvidenceStatus required");
  }
  if (!Number.isFinite(riskBudget) || riskBudget <= 0) {
    errors.push("entrySolver.riskBudgetUsd required (canonical 1R $)");
  }

  const planned =
    Number(proposal.plannedEntry ?? proposal.executableEntry ?? evidence.selectedEntry);
  if (Number.isFinite(planned) && candidates.length >= 2) {
    const hit = candidates.some((c) => {
      if (!c || typeof c !== "object") return false;
      const price = Number((c as Record<string, unknown>).price);
      return Number.isFinite(price) && Math.abs(price - planned) < 1e-6;
    });
    if (!hit) {
      errors.push("plannedEntry must appear on entrySolver candidates R map");
    }
  }

  if (/inside (support )?zone|good level|near support|^better R$/i.test(why)) {
    errors.push(
      "entrySolver.whySelected insufficient — reconstruct target→stop→R→participation→entry"
    );
  }

  return { ok: errors.length === 0, errors, legacyMissing: false };
}

/** Empty Analyze scaffold when no live resolve yet. */
export function emptyOptimizedEntryAdviseTemplate(
  minimumRR: number,
  riskBudgetUsd: number
): string {
  const budget = resolveRiskBudgetUsd(riskBudgetUsd);
  return formatOptimizedEntrySection({
    status: "needs_evidence",
    riskBudgetUsd: budget,
    oneRDefinition: `1R = USD ${budget} (canonical rules.defaultRiskBudget) — distinct from riskPerShare`,
    probableTarget: null,
    probableTargetKind: null,
    tacticalStop: null,
    maximumEntryCeiling: null,
    opportunityZone: null,
    candidates: [],
    participationEvidence: "insufficient",
    participationNote:
      "FILL EVIDENCE: INSUFFICIENT until Cases attached. Complete worksheet before claiming Optimized Entry.",
    selectedEntry: null,
    whySelected: null,
    alternativeDeeperOpportunity:
      "Opportunity 2 deeper = reassessment (sweep/structure/target/stop/playbook/thesis).",
    reassessmentRequired: true,
    reassessmentCondition:
      "Attempt 1 tactical stop ≈ -1R does not auto-kill Stock File thesis.",
    optimizedClaimEligible: false,
  });
}

/** Learning surfaces already present (audit — no new engine). */
export function auditOptimizedEntryLearningSurfaces(): string {
  return [
    "OPTIMIZED ENTRY → REALITY LEARNING SURFACES (existing)",
    "EXISTS:",
    "- plannedEntry / stopPrice / targetPrice / plannedRR on TradePlan",
    "- plan-outcome missed_opportunity | unexecuted_plan_loss",
    "- Insights: GOOD_FILTER vs Possible Over-Optimization (no-entry)",
    "- Learning Outcome + Observation (planId path for missed scout)",
    "- Practical hist: ENTRY_NOT_REACHED / NON-ADAPTATION notes",
    "- T0 freeze geometry when present (originalEntry / plannedEntry)",
    "PARTIAL:",
    "- Family/Playbook on plans often null historically",
    "CLOSEST APPROACH vs plannedEntry (MXT 023):",
    "- MEASURABLE NOW: observation-update may carry closestApproach / closestApproachAt / entryTouched",
    "  → measureClosestApproach() distance only when both prices finite (lib/entry-learning-closest-approach.ts)",
    "- INSUFFICIENT DATA: no calibrated fill-rate; do not invent fill probability",
    "- T0-anchored claims require persisted freeze id — Missing T0 → Indeterminate",
    "Future Family/Playbook fill-rate still blocked without comparable sample.",
  ].join("\n");
}
