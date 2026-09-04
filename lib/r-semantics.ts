/**
 * Canonical R / risk nomenclature (MXT 023).
 * Prevents conflating R$, riskPerShare, shares, and reward/risk ratio.
 */

export type TradeSide = "long" | "short";

export type RGeometry = {
  side: TradeSide;
  entry: number;
  tacticalStop: number;
  target: number;
  riskBudgetUsd: number;
  riskPerShare: number;
  rewardPerShare: number;
  rewardRiskRatio: number;
  shares: number;
  actualRiskUsd: number;
  /** actualRiskUsd / R$ — typically ~1.0 after floor sizing. */
  actualR: number;
};

/** Explicit glossary for Mechanics / Analyze — no ambiguous bare “R”. */
export function buildRSemanticsBrief(riskBudgetUsd: number): string {
  return [
    "=== R SEMANTICS (canonical — no ambiguity) ===",
    `R$ = configured monetary risk budget (1R unit). Active: USD ${riskBudgetUsd}.`,
    "Source: rules.defaultRiskBudget (fallback DEFAULT_RISK_BUDGET_USD).",
    "",
    "riskPerShare = abs(entry − tacticalStop)   ← NOT called 1R",
    "shares = floor(R$ / riskPerShare)",
    "actualRisk$ = shares × riskPerShare",
    "actualR = actualRisk$ / R$                 ← usually ≈ 1.0 after floor",
    "rewardPerShare = abs(target − entry)",
    "rewardRiskRatio = rewardPerShare / riskPerShare   ← also written R:R or plannedRR",
    "",
    "EXAMPLE (long): entry 305, stop 295, target 360, R$=100",
    "  riskPerShare=$10 · shares=10 · actualRisk$=$100 · actualR=1.0 · rewardRiskRatio=5.5",
    "Never label $10 as “1R”. Never invent $400 without citing R$×multiple or capital source.",
    "",
    "FEASIBILITY CONSTRAINT (not Optimized Entry):",
    "Long  (need rewardRiskRatio ≥ k): maximumEntry = (target + k×stop) / (1+k)",
    "  ≡ target − (k×(target−stop))/(1+k) — CEILING; worse than this fails min R.",
    "Short (need rewardRiskRatio ≥ k): minimumEntry = (target + k×stop) / (1+k)",
    "  FLOOR for short — entries below this fail min R (short: higher entry usually better R).",
    "maximumEntry / minimumEntry = acceptance bound only — NEVER auto recommendedEntry.",
    "",
    "SEQUENCE (mandatory):",
    "TARGET → TACTICAL STOP → RISK/REWARD GEOMETRY → FEASIBILITY BOUND → PARTICIPATION → OPTIMIZED ENTRY",
    "Never: pick entry first → justify with R afterward.",
    "Tactical stop (plan.stopPrice) sizes risk. Structural invalidation (Stock File) is separate.",
  ].join("\n");
}

export function riskPerShare(entry: number, tacticalStop: number): number | null {
  if (![entry, tacticalStop].every((n) => Number.isFinite(n))) return null;
  const d = Math.abs(entry - tacticalStop);
  return d > 0 ? d : null;
}

export function rewardPerShare(
  side: TradeSide,
  entry: number,
  target: number
): number | null {
  if (![entry, target].every((n) => Number.isFinite(n))) return null;
  if (side === "long") {
    const d = target - entry;
    return d > 0 ? d : null;
  }
  const d = entry - target;
  return d > 0 ? d : null;
}

export function rewardRiskRatio(
  side: TradeSide,
  entry: number,
  tacticalStop: number,
  target: number
): number | null {
  const risk = riskPerShare(entry, tacticalStop);
  const reward = rewardPerShare(side, entry, target);
  if (risk == null || reward == null || risk <= 0) return null;
  if (side === "long" && !(tacticalStop < entry && entry < target)) return null;
  if (side === "short" && !(target < entry && entry < tacticalStop)) return null;
  return reward / risk;
}

/**
 * Long: highest entry that still meets min reward/risk k.
 * E ≤ (target + k×stop) / (1+k)
 */
export function computeLongMaximumEntry(
  target: number,
  stop: number,
  minimumRR: number
): number | null {
  if (![target, stop, minimumRR].every((n) => Number.isFinite(n))) return null;
  if (!(stop < target) || !(minimumRR > 0)) return null;
  return (target + minimumRR * stop) / (1 + minimumRR);
}

/**
 * Short: lowest entry that still meets min reward/risk k.
 * E ≥ (target + k×stop) / (1+k)
 * (For shorts, higher entry tends to improve R; this is the FLOOR.)
 */
export function computeShortMinimumEntry(
  target: number,
  stop: number,
  minimumRR: number
): number | null {
  if (![target, stop, minimumRR].every((n) => Number.isFinite(n))) return null;
  if (!(target < stop) || !(minimumRR > 0)) return null;
  return (target + minimumRR * stop) / (1 + minimumRR);
}

export function sharesFromRiskBudget(
  entry: number,
  tacticalStop: number,
  riskBudgetUsd: number
): number | null {
  const rps = riskPerShare(entry, tacticalStop);
  if (rps == null || !(riskBudgetUsd > 0)) return null;
  const shares = Math.floor(riskBudgetUsd / rps);
  return shares > 0 ? shares : null;
}

export function computeRGeometry(input: {
  side: TradeSide;
  entry: number;
  tacticalStop: number;
  target: number;
  riskBudgetUsd: number;
}): RGeometry | null {
  const rps = riskPerShare(input.entry, input.tacticalStop);
  const reward = rewardPerShare(input.side, input.entry, input.target);
  const rr = rewardRiskRatio(
    input.side,
    input.entry,
    input.tacticalStop,
    input.target
  );
  const shares = sharesFromRiskBudget(
    input.entry,
    input.tacticalStop,
    input.riskBudgetUsd
  );
  if (rps == null || reward == null || rr == null || shares == null) return null;
  const actualRiskUsd = shares * rps;
  return {
    side: input.side,
    entry: input.entry,
    tacticalStop: input.tacticalStop,
    target: input.target,
    riskBudgetUsd: input.riskBudgetUsd,
    riskPerShare: rps,
    rewardPerShare: reward,
    rewardRiskRatio: rr,
    shares,
    actualRiskUsd,
    actualR: actualRiskUsd / input.riskBudgetUsd,
  };
}

/** Target + timeframe governance for Analyze (reuses MTAE role map — no second system). */
export function buildTargetTimeframeGovernanceBrief(roles: {
  strategic_tf: string;
  opportunity_tf: string;
  refinement_tf: string;
  execution_tf: string;
  execution_detail_tf?: string;
}): string {
  return [
    "=== TARGET + TIMEFRAME GOVERNANCE (MTAE roles — no ad-hoc chart asks) ===",
    `structural thesis / invalidation spine: ${roles.strategic_tf} (strategic_tf)`,
    `probable target / resistance-support hierarchy: ${roles.opportunity_tf} (opportunity_tf)`,
    `battle zones / tactical refinement: ${roles.refinement_tf} (refinement_tf)`,
    `entry timing context only: ${roles.execution_tf} (execution_tf)`,
    roles.execution_detail_tf
      ? `optional detail: ${roles.execution_detail_tf} — never invalidates higher roles`
      : null,
    "",
    "PROBABLE TARGET selection (general bullish/bearish — no ticker hardcodes):",
    "Prefer observed structural levels: major R/S, prior swing, HTF structure,",
    "Volume Profile nodes WITH provenance (analysisRange + purpose), thesis geometry.",
    "Distinguish: observed_structural | probable_operational | calculated_projection (reference only).",
    "Fib/projection alone is NOT probableTarget.",
    "",
    "CHART REQUEST DISCIPLINE:",
    "1. First use charts/evidence already attached or in Stock File / active MarketEvidence / accepted MTAE.",
    "2. Do NOT auto-request extra W/M/3M/6M if the selected map's roles are already covered.",
    "3. Only request ONE additional timeframe when a specific uncertainty is named, e.g.:",
    "   - unclear structural invalidation → need strategic_tf",
    "   - ambiguous target hierarchy → need opportunity_tf",
    "   - zone edges unclear → need refinement_tf",
    "4. State exactly which uncertainty the extra chart would resolve. Never fish for charts.",
    "",
    "VOLUME PROFILE:",
    "POC/VAH/VAL without analysisRange/timeframe/purpose are incomplete — do not treat as absolute.",
    "Distinguish STRUCTURAL/HISTORY profile vs DECISION/REASSESSMENT profile — not interchangeable.",
  ]
    .filter((l): l is string => typeof l === "string")
    .join("\n");
}
