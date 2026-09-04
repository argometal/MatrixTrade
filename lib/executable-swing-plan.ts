/**
 * Executable swing plan — Analysis Mode output contract (MXT 023).
 * Trains AI to deliver one-pass math + if-stopped plan. No new Entry Engine.
 * Reuses R semantics + LayeredEntry math; no ticker hardcodes.
 */

import { DEFAULT_RISK_BUDGET_USD } from "./layered-entry-risk";

function resolveBudget(riskBudgetUsd?: number): number {
  return typeof riskBudgetUsd === "number" &&
    Number.isFinite(riskBudgetUsd) &&
    riskBudgetUsd > 0
    ? riskBudgetUsd
    : DEFAULT_RISK_BUDGET_USD;
}

/** Sum of realized trade-level R units for one thesis/setup episode. */
export function computeEpisodeCumulativeR(tradeLevelR: number[]): number | null {
  if (!Array.isArray(tradeLevelR) || tradeLevelR.length === 0) return null;
  if (!tradeLevelR.every((n) => Number.isFinite(n))) return null;
  return tradeLevelR.reduce((s, n) => s + n, 0);
}

export type LayeredDistributionInput = {
  layers: Array<{ quantity: number; entry: number }>;
  tacticalStop: number;
  target: number;
  riskBudgetUsd: number;
  side?: "long" | "short";
};

export type LayeredDistributionMath = {
  totalShares: number;
  averageEntry: number;
  totalRiskUsd: number;
  totalRewardUsd: number;
  rewardRiskRatio: number;
  riskBudgetUtilization: number;
  withinBudget: boolean;
};

/**
 * Generic layered sizing check (any ticker).
 * totalRisk$ = Σ(qi × |Ei − S|); must be ≤ configured 1R$.
 */
export function computeLayeredDistributionMath(
  input: LayeredDistributionInput
): LayeredDistributionMath | null {
  const { layers, tacticalStop, target, riskBudgetUsd } = input;
  if (!(riskBudgetUsd > 0) || !Number.isFinite(tacticalStop) || !Number.isFinite(target)) {
    return null;
  }
  if (!layers.length || layers.some((l) => !(l.quantity > 0) || !Number.isFinite(l.entry))) {
    return null;
  }

  let totalShares = 0;
  let weightedEntry = 0;
  let totalRiskUsd = 0;
  let totalRewardUsd = 0;

  for (const layer of layers) {
    const riskPerShare = Math.abs(layer.entry - tacticalStop);
    const rewardPerShare = Math.abs(target - layer.entry);
    if (!(riskPerShare > 0) || !(rewardPerShare > 0)) return null;
    totalShares += layer.quantity;
    weightedEntry += layer.quantity * layer.entry;
    totalRiskUsd += layer.quantity * riskPerShare;
    totalRewardUsd += layer.quantity * rewardPerShare;
  }

  if (!(totalShares > 0) || !(totalRiskUsd > 0)) return null;

  return {
    totalShares,
    averageEntry: weightedEntry / totalShares,
    totalRiskUsd,
    totalRewardUsd,
    rewardRiskRatio: totalRewardUsd / totalRiskUsd,
    riskBudgetUtilization: totalRiskUsd / riskBudgetUsd,
    withinBudget: totalRiskUsd <= riskBudgetUsd + 1e-9,
  };
}

/**
 * Canonical Mechanics / Analyze training — one-pass EXECUTABLE PLAN.
 * Must appear in the AI paste so a clean chat does not need stepwise human prompts.
 */
export function buildExecutableSwingPlanBrief(riskBudgetUsd?: number): string {
  const budget = resolveBudget(riskBudgetUsd);
  return [
    "=== EXECUTABLE SWING PLAN (Analysis Mode — one pass when evidence suffices) ===",
    "PRINCIPLE: When charts + Stock File already supply target, zone, and stop geometry,",
    "resolve the FULL swing plan in ONE pass. Do not stop after Target, after Participation,",
    "or before Stops/R/sizing. STOP only when a truly indispensable input is missing — name it.",
    "",
    `Configured 1R$ (rules.defaultRiskBudget): USD ${budget}`,
    "Never ask the human to remind you of 1R$. Never invent a different budget without Settings evidence.",
    "",
    "OUTPUT ORDER (mandatory when proposing a swing plan):",
    "1) EXECUTABLE PLAN block FIRST (human must understand the trade in seconds).",
    "2) WHY THIS ENTRY second (evidence + rejected alternatives).",
    "Do not bury shares/stop/max loss inside narrative.",
    "",
    "EXECUTABLE PLAN template (use exact labels; fill with THIS ticker’s evidence only):",
    "---",
    "EXECUTABLE PLAN",
    "Ticker: <TICKER>",
    `1R budget: USD ${budget}`,
    "Target: $<T>   (live defensible probableTarget only — see TARGET DISCIPLINE)",
    "",
    "ENTRY:",
    "- <n> shares @ $<E1>   (single entry OR layered distribution)",
    "- <n> shares @ $<E2>   (omit extra lines if single entry is best)",
    "Expected average entry: $<EA>",
    "",
    "TACTICAL STOP: $<S> exact   (never ~approx / 'below the zone' — if exact S unknown: UNRESOLVED, no executable claim)",
    "structural invalidation (Stock File) is SEPARATE unless intentionally identical by design",
    "",
    "MAX LOSS: $<X>   (= shares×|entry−stop| or layered Σ; utilization = actualRisk$/1R$)",
    "EXPECTED REWARD: $<Y>   R:R = Y/X",
    "",
    "IF STOPPED:",
    "- realized trade-level result: −Z R (usually ≈ −1R if sized to budget)",
    "- reassess technical evidence (do NOT auto re-enter)",
    "- re-entry: allowed | not_allowed | unresolved",
    "- if re-entry allowed: NEW target/entry/stop geometry + NEW R:R from current evidence",
    "- episode cumulative R = sum of trade-level R (e.g. −1R then +2R → episode +1R)",
    "- NEVER martingale: do not raise next risk$ to 'recover'; do not backsolve target to recover R",
    "---",
    "",
    "WHY THIS ENTRY (after the plan block):",
    "- target evidence · entry-zone evidence · stop evidence",
    "- alternatives rejected (deeper max-R, higher fill-poor R, aesthetic mid)",
    "- R comparison · participation tradeoff · FILL EVIDENCE status",
    "- why this execution beats alternatives · unresolved evidence",
    "",
    "SINGLE vs LAYERED:",
    "Optimized Entry may conclude ONE price OR a LayeredEntry distribution — layering is not always better.",
    "If layered: Q=Σqi · averageEntry=Σ(qi×Ei)/Q · totalRisk$=Σ(qi×|Ei−S|) · totalReward$=Σ(qi×|T−Ei|)",
    "CONSTRAINT: totalRisk$ ≤ configured 1R$. No arbitrary equal splits. No invented fill %.",
    "Reuse existing LayeredEntry / Family B authorize path on Apply — do not invent a second entry engine.",
    "",
    "EXACT TACTICAL STOP:",
    "Derive an executable price from structure (e.g. clear swing invalidation / zone extreme + rule).",
    "If you cannot defend an exact $<S>, say UNRESOLVED — do not present an executable plan.",
    "",
    "DIAGNOSTIC MAPPING (existing MAF/Insights — no new Case taxonomy):",
    "TARGET → thesis_quality / zone_quality · ENTRY-ZONE → zone_quality / entry_quality",
    "TACTICAL-STOP → stop_quality · R-FILTER → entry_quality / capital_allocation_quality",
    "PARTICIPATION/NO-FILL → entry_quality / timing_quality + Insights GOOD_FILTER vs Over-Optimization",
    "OPTIMIZED-ENTRY / LAYERING → entry_quality / execution_quality · RE-ENTRY → trade_management_quality",
    "",
    "DISCOVERY (do not invent UI):",
    "Existence of Stock Files → Control → Stock Files (pick list) or Analyze with AI on the known ticker window.",
    "Library Index = category labels only — not an inventory of ST-/PLAN- ids.",
    "MTAE protocol → Control → Library → Technical Analysis → copy row 'MTAE protocol'.",
    "Rules → Control → MTA Mechanics. Never invent routes like nonexistent menus.",
  ].join("\n");
}
