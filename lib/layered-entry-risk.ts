/** Risk-based layered participation — deterministic calc (no auto price generation). */

import { computePlannedRR } from "./plan-risk";
import type {
  EntryConfidence,
  LayerRole,
  LayerSizingMode,
  LayeredEntryLimit,
  LayeredEntryPlan,
  LayeredEntryProposalSource,
  StopModel,
} from "./layered-entry-types";

export const DEFAULT_RISK_BUDGET_USD = 100;

/** Migration/default only — editable via ExperimentRules.defaultRiskBudget. Not a permanent hard rule. */
export const STARTER_PARTICIPATION_POLICY = {
  enabled: true,
  mediocreRRMin: 2.5,
  /** Upper bound of "mediocre" band before full-position thesis minimum (caller supplies min). */
  maxStarterRiskPercent: 30,
  maxStarterPositionPercent: 30,
  requireBetterEntryLayers: true,
  requireUncertaintyReason: true,
  requireNoChase: true as const,
} as const;

export type LayerDerivedMetrics = {
  riskPerShare: number;
  rewardPerShare: number;
  rr: number;
  riskSharePercent: number;
  plannedQuantity: number;
  plannedCapital: number;
  plannedRiskAmount: number;
  effectiveStopPrice: number;
};

export type LayeredFillStateProjection = {
  label: string;
  limitsFilled: number;
  allocationPercent: number;
  totalQuantity: number;
  capitalDeployed: number;
  monetaryRisk: number;
  averageEntry: number;
  effectiveStop?: number;
  blendedRR?: number;
  combinedRR?: number;
  portfolioRR?: number;
  entryImprovementVsFirst?: number;
  unusedRiskAmount?: number;
};

export type LayeredRiskValidation = {
  errors: string[];
  warnings: string[];
};

export type LayeredRiskComputeInput = {
  limits: LayeredEntryLimit[];
  primaryTargetPrice: number;
  authorizedRiskAmount: number;
  stopModel: StopModel;
  commonStopPrice?: number;
  sizingMode: LayerSizingMode;
  noChase?: boolean;
  minimumRR?: number;
  proposalSource?: LayeredEntryProposalSource;
  cancelConditions?: string[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function resolveEffectiveStop(
  limit: LayeredEntryLimit,
  stopModel: StopModel,
  commonStopPrice?: number
): number | undefined {
  if (stopModel === "common") {
    return commonStopPrice ?? limit.stopPrice;
  }
  return limit.stopPrice ?? commonStopPrice;
}

export function computeLayerDerived(
  limit: LayeredEntryLimit,
  primaryTargetPrice: number,
  stopModel: StopModel,
  commonStopPrice: number | undefined,
  _sizingMode: LayerSizingMode,
  _authorizedRiskAmount: number,
  plannedQuantity?: number
): LayerDerivedMetrics | null {
  const stop = resolveEffectiveStop(limit, stopModel, commonStopPrice);
  if (stop === undefined || !Number.isFinite(stop)) return null;
  const riskPerShare = limit.price - stop;
  const rewardPerShare = primaryTargetPrice - limit.price;
  if (!(riskPerShare > 0) || !(rewardPerShare > 0)) return null;
  const rr = rewardPerShare / riskPerShare;

  const qty = plannedQuantity ?? 0;
  const plannedRiskAmount = qty * riskPerShare;
  const plannedCapital = qty * limit.price;

  return {
    riskPerShare: round4(riskPerShare),
    rewardPerShare: round4(rewardPerShare),
    rr: round4(rr),
    riskSharePercent: limit.allocationPercent,
    plannedQuantity: qty,
    plannedCapital: round2(plannedCapital),
    plannedRiskAmount: round2(plannedRiskAmount),
    effectiveStopPrice: stop,
  };
}

/** Size quantities for all layers under the chosen sizing mode. */
export function sizeLayerQuantities(
  limits: LayeredEntryLimit[],
  primaryTargetPrice: number,
  stopModel: StopModel,
  commonStopPrice: number | undefined,
  sizingMode: LayerSizingMode,
  authorizedRiskAmount: number
): number[] {
  const riskPerShare = limits.map((limit) => {
    const stop = resolveEffectiveStop(limit, stopModel, commonStopPrice);
    if (stop === undefined) return NaN;
    return limit.price - stop;
  });
  if (riskPerShare.some((d) => !(d > 0))) {
    return limits.map(() => 0);
  }

  if (sizingMode === "risk_percent") {
    return limits.map((limit, i) => {
      const layerRiskBudget = (authorizedRiskAmount * limit.allocationPercent) / 100;
      return Math.floor(layerRiskBudget / riskPerShare[i]);
    });
  }

  // position_percent: share count proportional to allocation; total risk ≈ authorized
  const weightedDistance = limits.reduce(
    (sum, limit, i) => sum + (limit.allocationPercent / 100) * riskPerShare[i],
    0
  );
  if (!(weightedDistance > 0)) return limits.map(() => 0);
  const totalShares = authorizedRiskAmount / weightedDistance;
  return limits.map((limit) => Math.floor(totalShares * (limit.allocationPercent / 100)));
}

/** Compute derived metrics for all layers (runtime — do not trust client-forged derived). */
export function computeAllLayerDerived(
  input: LayeredRiskComputeInput
): Array<LayerDerivedMetrics | null> {
  const quantities = sizeLayerQuantities(
    input.limits,
    input.primaryTargetPrice,
    input.stopModel,
    input.commonStopPrice,
    input.sizingMode,
    input.authorizedRiskAmount
  );
  const derived = input.limits.map((limit, i) =>
    computeLayerDerived(
      limit,
      input.primaryTargetPrice,
      input.stopModel,
      input.commonStopPrice,
      input.sizingMode,
      input.authorizedRiskAmount,
      quantities[i]
    )
  );

  const totalRisk = derived.reduce((s, d) => s + (d?.plannedRiskAmount ?? 0), 0);
  if (totalRisk > 0) {
    for (const d of derived) {
      if (d) {
        d.riskSharePercent = round2((d.plannedRiskAmount / totalRisk) * 100);
      }
    }
  }
  return derived;
}

export function attachDerivedToLimits(
  limits: LayeredEntryLimit[],
  derived: Array<LayerDerivedMetrics | null>
): LayeredEntryLimit[] {
  return limits.map((limit, i) => {
    const d = derived[i];
    if (!d) {
      const next = { ...limit };
      delete next.derived;
      return next;
    }
    return {
      ...limit,
      derived: {
        riskPerShare: d.riskPerShare,
        rewardPerShare: d.rewardPerShare,
        rr: d.rr,
        riskSharePercent: d.riskSharePercent,
        plannedQuantity: d.plannedQuantity,
        plannedCapital: d.plannedCapital,
        plannedRiskAmount: d.plannedRiskAmount,
      },
    };
  });
}

export function projectFillStates(input: LayeredRiskComputeInput): LayeredFillStateProjection[] {
  const derived = computeAllLayerDerived(input);
  const projections: LayeredFillStateProjection[] = [];
  const firstPrice = input.limits[0]?.price;

  for (let end = 0; end < input.limits.length; end++) {
    let totalQuantity = 0;
    let capitalDeployed = 0;
    let monetaryRisk = 0;
    let weightedEntry = 0;
    let allocationPercent = 0;
    let totalReward = 0;

    for (let i = 0; i <= end; i++) {
      const d = derived[i];
      const limit = input.limits[i];
      if (!d || d.plannedQuantity <= 0) continue;
      totalQuantity += d.plannedQuantity;
      capitalDeployed += d.plannedCapital;
      monetaryRisk += d.plannedRiskAmount;
      weightedEntry += d.plannedQuantity * limit.price;
      allocationPercent += limit.allocationPercent;
      totalReward += d.plannedQuantity * d.rewardPerShare;
    }

    const averageEntry = totalQuantity > 0 ? weightedEntry / totalQuantity : 0;
    const label =
      end === 0
        ? "Only L1 fills"
        : end === input.limits.length - 1
          ? "All limits fill"
          : `L1–L${end + 1} fill`;

    let blendedRR: number | undefined;
    let combinedRR: number | undefined;
    let portfolioRR: number | undefined;
    let effectiveStop: number | undefined;

    if (totalQuantity > 0 && monetaryRisk > 0) {
      if (input.stopModel === "common" && input.commonStopPrice !== undefined) {
        effectiveStop = input.commonStopPrice;
        const rr = computePlannedRR(averageEntry, input.commonStopPrice, input.primaryTargetPrice);
        blendedRR = rr?.rr !== undefined ? round4(rr.rr) : undefined;
      } else {
        portfolioRR = round4(totalReward / monetaryRisk);
        combinedRR = portfolioRR;
      }
    }

    const unusedRiskAmount = round2(
      Math.max(0, (input.authorizedRiskAmount * allocationPercent) / 100 - monetaryRisk)
    );

    projections.push({
      label,
      limitsFilled: end + 1,
      allocationPercent: round2(allocationPercent),
      totalQuantity,
      capitalDeployed: round2(capitalDeployed),
      monetaryRisk: round2(monetaryRisk),
      averageEntry: round4(averageEntry),
      effectiveStop,
      blendedRR,
      combinedRR,
      portfolioRR,
      entryImprovementVsFirst:
        firstPrice !== undefined && averageEntry > 0
          ? round4(firstPrice - averageEntry)
          : undefined,
      unusedRiskAmount,
    });
  }

  projections.push({
    label: "None fill — no chase",
    limitsFilled: 0,
    allocationPercent: 0,
    totalQuantity: 0,
    capitalDeployed: 0,
    monetaryRisk: 0,
    averageEntry: 0,
  });

  return projections;
}

export function validateLayeredRiskPlan(input: LayeredRiskComputeInput): LayeredRiskValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Number.isFinite(input.primaryTargetPrice) || input.primaryTargetPrice <= 0) {
    errors.push("primaryTargetPrice required");
  }
  if (!Number.isFinite(input.authorizedRiskAmount) || input.authorizedRiskAmount <= 0) {
    errors.push("authorizedRiskAmount must be > 0");
  }
  if (input.noChase === false) {
    errors.push("noChase is a hard rule — market chase not allowed");
  }
  if (input.stopModel === "common" && input.commonStopPrice === undefined) {
    errors.push("commonStopPrice required in common stop mode");
  }
  if (input.stopModel === "per_layer") {
    warnings.push(
      "Per-layer stops behave as partially independent risk units and require separate attribution."
    );
  }

  const totalAlloc = input.limits.reduce((s, l) => s + l.allocationPercent, 0);
  if (Math.abs(totalAlloc - 100) > 0.01) {
    errors.push(`allocations must sum to 100% (got ${totalAlloc})`);
  }

  const derived = computeAllLayerDerived(input);
  let totalRisk = 0;

  for (const [i, limit] of input.limits.entries()) {
    const stop = resolveEffectiveStop(limit, input.stopModel, input.commonStopPrice);
    if (stop === undefined) {
      errors.push(
        input.stopModel === "per_layer"
          ? `limits[${i}].stopPrice required in per_layer mode`
          : `effective stop missing for limits[${i}]`
      );
      continue;
    }
    if (!(limit.price > stop)) {
      errors.push(`limits[${i}]: entry must be > stop`);
    }
    if (!(input.primaryTargetPrice > limit.price)) {
      errors.push(`limits[${i}]: target must be > entry (do not manipulate target to inflate R)`);
    }
    const d = derived[i];
    if (!d) {
      errors.push(`limits[${i}]: cannot compute R (invalid entry/stop/target)`);
      continue;
    }
    totalRisk += d.plannedRiskAmount;
    if (d.plannedQuantity <= 0) {
      warnings.push(`limits[${i}]: quantity rounds to 0 — extremely small after risk sizing`);
    }
  }

  const riskTolerance = Math.max(0.5, input.authorizedRiskAmount * 0.005);
  if (totalRisk > input.authorizedRiskAmount + riskTolerance) {
    errors.push(
      `calculated total risk $${round2(totalRisk)} exceeds authorization $${input.authorizedRiskAmount}`
    );
  }

  // Starter policy warnings
  const starterIdx = input.limits.findIndex((l) => l.role === "starter");
  if (starterIdx >= 0 && STARTER_PARTICIPATION_POLICY.enabled) {
    const starter = input.limits[starterIdx];
    const d = derived[starterIdx];
    if (starter.allocationPercent > STARTER_PARTICIPATION_POLICY.maxStarterRiskPercent) {
      warnings.push(
        `starter allocation ${starter.allocationPercent}% exceeds maxStarterRiskPercent ${STARTER_PARTICIPATION_POLICY.maxStarterRiskPercent}%`
      );
    }
    if (
      d &&
      input.minimumRR !== undefined &&
      d.rr < input.minimumRR &&
      d.rr >= STARTER_PARTICIPATION_POLICY.mediocreRRMin
    ) {
      warnings.push(
        `starter R ${d.rr.toFixed(2)} is below thesis minimum ${input.minimumRR}R but within mediocre band — starter exception only if rationale present`
      );
    }
    if (
      STARTER_PARTICIPATION_POLICY.requireUncertaintyReason &&
      !starter.rationale &&
      !starter.uncertaintyNote
    ) {
      warnings.push("starter requires explicit rationale / uncertainty note");
    }
    if (STARTER_PARTICIPATION_POLICY.requireBetterEntryLayers) {
      const better = input.limits.some(
        (l, i) => i !== starterIdx && (l.role === "preferred" || l.role === "deep_pullback")
      );
      if (!better) {
        warnings.push("starter should reserve majority risk for better entry layers");
      }
    }
  }

  // Risk concentration on worst-R layer
  const validDerived = derived
    .map((d, i) => (d ? { i, rr: d.rr, alloc: input.limits[i].allocationPercent } : null))
    .filter(Boolean) as Array<{ i: number; rr: number; alloc: number }>;
  if (validDerived.length >= 2) {
    const worst = [...validDerived].sort((a, b) => a.rr - b.rr)[0];
    if (worst.alloc >= 50) {
      warnings.push(`majority of allocation on worst-R layer L${worst.i + 1} (${worst.rr.toFixed(2)}R)`);
    }
    const first = validDerived[0];
    const deeperImprove = validDerived.slice(1).every((x) => x.rr > first.rr);
    if (!deeperImprove) {
      warnings.push("deeper layers do not all improve R vs L1");
    }
  }

  if (input.sizingMode === "position_percent") {
    warnings.push(
      "sizingMode=position_percent: allocation % is position/capital share — not automatically risk share"
    );
  }

  if (input.proposalSource && !input.proposalSource.validatedByHuman) {
    warnings.push("Final human validation not marked — Matrix did not select these levels");
  }

  return { errors, warnings };
}

/** Server-side recompute: strip client derived, reattach canonical metrics + plan summary fields. */
export function recomputeLayeredEntryPlan(
  plan: Partial<LayeredEntryPlan> & {
    limits: LayeredEntryLimit[];
    executionMethod: LayeredEntryPlan["executionMethod"];
  },
  ctx: {
    primaryTargetPrice: number;
    planStopPrice?: number;
    authorizedRiskAmount?: number;
    defaultRiskBudget?: number;
  }
): { plan: LayeredEntryPlan; errors: string[]; warnings: string[]; fillStates: LayeredFillStateProjection[] } {
  const stopModel: StopModel = plan.stopModel ?? "common";
  const sizingMode: LayerSizingMode = plan.sizingMode ?? "position_percent";
  const commonStop =
    plan.commonStopPrice ??
    (stopModel === "common" ? ctx.planStopPrice : undefined);
  const authorized =
    plan.authorizedRiskAmount ??
    ctx.authorizedRiskAmount ??
    ctx.defaultRiskBudget ??
    DEFAULT_RISK_BUDGET_USD;
  const primaryTarget = plan.primaryTargetPrice ?? ctx.primaryTargetPrice;

  const input: LayeredRiskComputeInput = {
    limits: plan.limits.map((limit) => {
      const next = { ...limit };
      delete next.derived;
      return next;
    }),
    primaryTargetPrice: primaryTarget,
    authorizedRiskAmount: authorized,
    stopModel,
    commonStopPrice: commonStop,
    sizingMode,
    noChase: true,
    proposalSource: plan.proposalSource,
    cancelConditions: plan.cancelConditions,
  };

  const { errors, warnings } = validateLayeredRiskPlan(input);
  const derived = computeAllLayerDerived(input);
  const limits = attachDerivedToLimits(input.limits, derived);
  const fillStates = projectFillStates(input);
  const full = fillStates.find((f) => f.limitsFilled === limits.length && f.limitsFilled > 0);
  const totalRisk = derived.reduce((s, d) => s + (d?.plannedRiskAmount ?? 0), 0);

  const result: LayeredEntryPlan = {
    executionMethod: plan.executionMethod,
    limits,
    noChase: true,
    status: plan.status ?? "planned",
    stopModel,
    sizingMode,
    commonStopPrice: commonStop,
    primaryTargetPrice: primaryTarget,
    authorizedRiskAmount: authorized,
    currency: plan.currency ?? "USD",
    averageEntry: plan.averageEntry,
    fillPercent: plan.fillPercent,
    firstLimitPrice: plan.firstLimitPrice ?? limits[0]?.price,
    entryImprovementVsFirst: plan.entryImprovementVsFirst,
    blendedStopPrice: stopModel === "common" ? commonStop : undefined,
    blendedRR: full?.blendedRR,
    combinedRR: full?.combinedRR ?? full?.portfolioRR,
    riskUsedAmount: round2(totalRisk),
    riskUsedPercent:
      authorized > 0 ? round2((totalRisk / authorized) * 100) : undefined,
    cancelConditions: plan.cancelConditions,
    proposalSource: plan.proposalSource,
    filled: plan.limits.some((l) => l.filled),
  };

  // Preserve fill flags
  result.limits = result.limits.map((l, i) => ({
    ...l,
    filled: plan.limits[i]?.filled,
    fillPrice: plan.limits[i]?.fillPrice,
    filledQuantity: plan.limits[i]?.filledQuantity,
  }));

  return { plan: result, errors, warnings, fillStates };
}

export function formatLayeredRiskSnapshotSection(
  plan: LayeredEntryPlan,
  fillStates?: LayeredFillStateProjection[]
): string {
  const lines = [
    "=== LAYERED ENTRY · R / RISK ===",
    "Entry prices, stops and allocations are human/AI proposals.",
    "Matrix calculations are deterministic validation outputs and do not prove that the technical levels are valid.",
    `stop_model:${plan.stopModel ?? "common"}`,
    `sizing_mode:${plan.sizingMode ?? "position_percent"}`,
    `primary_target:${plan.primaryTargetPrice ?? ""}`,
    `authorized_risk:${plan.authorizedRiskAmount ?? ""} ${plan.currency ?? "USD"}`,
    `no_chase:yes`,
  ];
  if (plan.commonStopPrice !== undefined) lines.push(`common_stop:${plan.commonStopPrice}`);
  if (plan.proposalSource) {
    lines.push(
      `proposal_source:human=${plan.proposalSource.human} ai=${plan.proposalSource.ai} validatedByHuman=${plan.proposalSource.validatedByHuman}`
    );
  }
  for (const [i, limit] of plan.limits.entries()) {
    const d = limit.derived;
    lines.push(
      `limit_${i + 1}:price=${limit.price} stop=${limit.stopPrice ?? plan.commonStopPrice ?? ""} alloc=${limit.allocationPercent}% role=${limit.role ?? ""} conf=${limit.confidence ?? ""} rr=${d?.rr ?? ""} risk$=${d?.plannedRiskAmount ?? ""} qty=${d?.plannedQuantity ?? ""}`
    );
    if (limit.rationale) lines.push(`  rationale:${limit.rationale}`);
    if (limit.uncertaintyNote) lines.push(`  uncertainty:${limit.uncertaintyNote}`);
  }
  if (plan.blendedRR !== undefined) lines.push(`full_fill_blended_rr:${plan.blendedRR}`);
  if (plan.combinedRR !== undefined) lines.push(`full_fill_combined_rr:${plan.combinedRR}`);
  if (plan.riskUsedAmount !== undefined) lines.push(`risk_used:${plan.riskUsedAmount}`);
  const states = fillStates ?? [];
  for (const s of states) {
    if (s.limitsFilled === 0) {
      lines.push(`fill_state:none — no chase`);
      continue;
    }
    lines.push(
      `fill_state:${s.label} avg=${s.averageEntry} risk$=${s.monetaryRisk} blendedR=${s.blendedRR ?? ""} combinedR=${s.combinedRR ?? s.portfolioRR ?? ""} capital=${s.capitalDeployed} unused_risk=${s.unusedRiskAmount ?? ""}`
    );
  }
  lines.push("AI: challenge unsupported stops, poor first-entry R, excessive starter, risk concentration, chase, target manipulation, % that do not represent actual risk.");
  return lines.join("\n");
}

export type { LayerRole, EntryConfidence, StopModel, LayerSizingMode };
