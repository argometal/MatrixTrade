/**
 * Family B bull-trend entry — classification, validation, snapshot text.
 * Uses existing layered-entry + R risk calc. Does not invent prices or capital budgets.
 */

import { isSecularTrendContinuationPlaybook } from "./playbook-family-b";
import type { LayerRole, LayeredEntryPlan } from "./layered-entry-types";
import { LAYER_ROLE_LABELS } from "./layered-entry-types";
import {
  projectFillStates,
  recomputeLayeredEntryPlan,
  STARTER_PARTICIPATION_POLICY,
  type LayeredFillStateProjection,
} from "./layered-entry-risk";
import type { TradePlan } from "./plan-types";
import type { StockThesis } from "./stock-thesis-types";
import type { MtaeAssessment } from "./mtae-types";
import type {
  BullTrendEntryState,
  BullTrendLayerRole,
  FamilyBEntryAssessment,
  FamilyBExtension,
  FamilyBParticipationCase,
  FamilyBPullbackQuality,
  FamilyBTrendIntegrity,
  FibonacciContext,
} from "./family-b-types";
import {
  BULL_TREND_STATE_LABELS,
  FAMILY_B_STARTER_MAX_ALLOCATION_PERCENT,
} from "./family-b-types";

export type FamilyBClassifyInput = {
  playbookId?: string | null;
  assessment?: Partial<FamilyBEntryAssessment> | null;
  plan?: TradePlan | null;
  thesis?: StockThesis | null;
  mtae?: MtaeAssessment | null;
  /** Optional last/reference price for extension heuristics — never invent. */
  referencePrice?: number;
};

export type FamilyBValidation = {
  errors: string[];
  warnings: string[];
};

/** Map layered roles ↔ Family B role labels (aliases kept for compat). */
export function toBullTrendLayerRole(role?: LayerRole | string): BullTrendLayerRole | undefined {
  if (!role) return undefined;
  if (role === "preferred") return "preferred_pullback";
  if (role === "confirmation") return "reclaim_confirmation";
  if (
    role === "starter" ||
    role === "preferred_pullback" ||
    role === "deep_pullback" ||
    role === "reclaim_confirmation" ||
    role === "custom"
  ) {
    return role;
  }
  return "custom";
}

export function fromBullTrendLayerRole(role: BullTrendLayerRole): LayerRole {
  if (role === "preferred_pullback") return "preferred";
  if (role === "reclaim_confirmation") return "confirmation";
  if (role === "starter" || role === "deep_pullback" || role === "custom") return role;
  return "custom";
}

export function normalizeFamilyBAssessment(
  raw: unknown
): FamilyBEntryAssessment | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const state = String(o.state ?? "watch") as BullTrendEntryState;
  const validStates = new Set([
    "watch",
    "starter_available",
    "preferred_entry_available",
    "deep_entry_available",
    "extended_no_chase",
    "structure_damaged",
    "invalidated",
  ]);
  if (!validStates.has(state)) return undefined;

  const strArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  let fibonacci: FibonacciContext | undefined;
  if (o.fibonacci && typeof o.fibonacci === "object" && !Array.isArray(o.fibonacci)) {
    const f = o.fibonacci as Record<string, unknown>;
    fibonacci = {
      anchorLow: Number.isFinite(Number(f.anchorLow)) ? Number(f.anchorLow) : undefined,
      anchorHigh: Number.isFinite(Number(f.anchorHigh)) ? Number(f.anchorHigh) : undefined,
      note: typeof f.note === "string" ? f.note : undefined,
      candidateLevels: Array.isArray(f.candidateLevels)
        ? (f.candidateLevels
            .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
            .map((c) => {
              const role: "entry_context" | "target_context" | undefined =
                c.role === "entry_context" || c.role === "target_context"
                  ? c.role
                  : undefined;
              return {
                ratio: Number(c.ratio),
                price: Number(c.price),
                ...(role ? { role } : {}),
              };
            })
            .filter((c) => Number.isFinite(c.ratio) && Number.isFinite(c.price)) as NonNullable<
            FibonacciContext["candidateLevels"]
          >)
        : undefined,
    };
  }

  return {
    state,
    trendIntegrity: (String(o.trendIntegrity ?? "unknown") as FamilyBTrendIntegrity) || "unknown",
    extension: (String(o.extension ?? "unknown") as FamilyBExtension) || "unknown",
    pullbackQuality:
      (String(o.pullbackQuality ?? "unknown") as FamilyBPullbackQuality) || "unknown",
    participationCase:
      (String(o.participationCase ?? "none") as FamilyBParticipationCase) || "none",
    evidenceFor: strArr(o.evidenceFor),
    evidenceAgainst: strArr(o.evidenceAgainst),
    unresolved: strArr(o.unresolved),
    fibonacci,
    proposedBy:
      o.proposedBy && typeof o.proposedBy === "object"
        ? {
            human: (o.proposedBy as Record<string, unknown>).human === true,
            ai: (o.proposedBy as Record<string, unknown>).ai === true,
          }
        : undefined,
    humanValidated: o.humanValidated === true,
    assessedAt: typeof o.assessedAt === "string" ? o.assessedAt : undefined,
    cancelConditions: strArr(o.cancelConditions),
  };
}

function hasRole(limits: LayeredEntryPlan["limits"] | undefined, roles: BullTrendLayerRole[]): boolean {
  if (!limits?.length) return false;
  return limits.some((l) => {
    const r = toBullTrendLayerRole(l.role);
    return r !== undefined && roles.includes(r);
  });
}

/**
 * Deterministic Family B entry-state classification.
 * Prefers explicit human/AI assessment fields; falls back to layered roles + heuristics.
 */
export function classifyBullTrendEntryState(input: FamilyBClassifyInput): BullTrendEntryState {
  const a = input.assessment;
  if (a?.state && a.state !== "watch") {
    // Trust explicit terminal / blocking states from human/AI
    if (
      a.state === "invalidated" ||
      a.state === "structure_damaged" ||
      a.state === "extended_no_chase"
    ) {
      return a.state;
    }
  }

  if (a?.trendIntegrity === "broken" || a?.state === "invalidated") return "invalidated";
  if (a?.pullbackQuality === "structural_damage" || a?.trendIntegrity === "questionable") {
    if (a?.state === "structure_damaged" || a?.pullbackQuality === "structural_damage") {
      return "structure_damaged";
    }
  }
  if (
    a?.extension === "extreme" ||
    a?.extension === "high" ||
    a?.participationCase === "wait"
  ) {
    if (a.extension === "extreme" || a.state === "extended_no_chase") {
      return "extended_no_chase";
    }
  }

  const limits = input.plan?.layeredEntry?.limits;
  if (hasRole(limits, ["deep_pullback"]) && a?.pullbackQuality === "deep_valid") {
    return "deep_entry_available";
  }
  if (hasRole(limits, ["preferred_pullback"]) || hasRole(limits, ["starter"])) {
    if (hasRole(limits, ["preferred_pullback"]) && a?.pullbackQuality === "preferred") {
      return "preferred_entry_available";
    }
    if (hasRole(limits, ["starter"]) && a?.participationCase === "starter") {
      return "starter_available";
    }
    if (hasRole(limits, ["preferred_pullback"])) return "preferred_entry_available";
    if (hasRole(limits, ["deep_pullback"])) return "deep_entry_available";
    if (hasRole(limits, ["starter"])) return "starter_available";
  }

  if (a?.state) return a.state;
  if (a?.trendIntegrity === "intact" || a?.trendIntegrity === "strong") return "watch";
  return "watch";
}

export function synthesizeFamilyBAssessment(
  input: FamilyBClassifyInput
): FamilyBEntryAssessment {
  const base: FamilyBEntryAssessment = {
    state: "watch",
    trendIntegrity: input.assessment?.trendIntegrity ?? "unknown",
    extension: input.assessment?.extension ?? "unknown",
    pullbackQuality: input.assessment?.pullbackQuality ?? "unknown",
    participationCase: input.assessment?.participationCase ?? "none",
    evidenceFor: [...(input.assessment?.evidenceFor ?? [])],
    evidenceAgainst: [...(input.assessment?.evidenceAgainst ?? [])],
    unresolved: [...(input.assessment?.unresolved ?? [])],
    fibonacci: input.assessment?.fibonacci,
    proposedBy: input.assessment?.proposedBy,
    humanValidated: input.assessment?.humanValidated,
    assessedAt: input.assessment?.assessedAt ?? new Date().toISOString(),
    cancelConditions: input.assessment?.cancelConditions,
  };

  // Enrich evidence from MTAE participation when present (no invention)
  const synth = input.mtae?.integrated?.participationSynthesis;
  if (synth) {
    for (const e of synth.buyingEvidence ?? []) {
      if (!base.evidenceFor.includes(e)) base.evidenceFor.push(e);
    }
    for (const e of synth.sellingEvidence ?? []) {
      if (!base.evidenceAgainst.includes(e)) base.evidenceAgainst.push(e);
    }
    for (const e of synth.unresolvedSignals ?? []) {
      if (!base.unresolved.includes(e)) base.unresolved.push(e);
    }
  }

  if (input.thesis?.riskRules?.invalidation && !base.evidenceFor.some((e) => /invalidation/i.test(e))) {
    base.unresolved.push("Confirm structural invalidation still matches Stock File");
  }

  base.state = classifyBullTrendEntryState({ ...input, assessment: base });
  return base;
}

export function validateFamilyBPlan(input: {
  playbookId?: string | null;
  plan?: TradePlan | null;
  thesis?: StockThesis | null;
  assessment?: FamilyBEntryAssessment | null;
  minimumRR?: number;
}): FamilyBValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isSecularTrendContinuationPlaybook(input.playbookId)) {
    return { errors, warnings };
  }

  if (!input.thesis) {
    errors.push("Family B requires a Stock File");
  }
  if (!input.playbookId) {
    errors.push("Family B requires linked playbook secular-trend-continuation");
  }

  const plan = input.plan;
  const target = plan?.layeredEntry?.primaryTargetPrice ?? plan?.targetPrice;
  const stop = plan?.layeredEntry?.commonStopPrice ?? plan?.stopPrice;
  const entry =
    plan?.plannedEntry ??
    plan?.layeredEntry?.limits?.[0]?.price ??
    plan?.layeredEntry?.averageEntry;

  if (target === undefined) errors.push("missing primary target");
  if (!input.thesis?.riskRules?.invalidation && stop === undefined) {
    warnings.push("structural invalidation not stated on Stock File");
  }
  if (entry !== undefined && stop !== undefined && !(entry > stop)) {
    errors.push("stop >= entry for a long");
  }
  if (entry !== undefined && target !== undefined && !(target > entry)) {
    errors.push("target <= entry — do not move target to force R");
  }

  const le = plan?.layeredEntry;
  if (le) {
    if (le.noChase !== true) errors.push("no-chase disabled");
    const total = le.limits.reduce((s, l) => s + l.allocationPercent, 0);
    if (Math.abs(total - 100) > 0.01) {
      errors.push(`allocation total invalid (got ${total})`);
    }

    const starter = le.limits.find((l) => toBullTrendLayerRole(l.role) === "starter");
    const preferred = le.limits.find(
      (l) => toBullTrendLayerRole(l.role) === "preferred_pullback"
    );
    const deep = le.limits.find((l) => toBullTrendLayerRole(l.role) === "deep_pullback");

    if (starter) {
      if (starter.allocationPercent > FAMILY_B_STARTER_MAX_ALLOCATION_PERCENT) {
        warnings.push(
          `starter allocation ${starter.allocationPercent}% exceeds max ${FAMILY_B_STARTER_MAX_ALLOCATION_PERCENT}%`
        );
      }
      if (
        starter.allocationPercent >
        Math.max(preferred?.allocationPercent ?? 0, deep?.allocationPercent ?? 0)
      ) {
        warnings.push("starter has largest allocation — preferred/deep should normally dominate");
      }
      if (!starter.rationale && !starter.uncertaintyNote) {
        warnings.push("starter R/uncertainty needs explicit rationale");
      }
      if (!preferred && !deep) {
        warnings.push("starter without preferred or deep zone — reserve better entries");
      }
      const rr = starter.derived?.rr;
      const minRR = input.minimumRR ?? input.thesis?.riskRules?.minimumRR;
      if (
        rr !== undefined &&
        minRR !== undefined &&
        rr < minRR &&
        !starter.rationale
      ) {
        warnings.push(
          `starter R ${rr.toFixed(2)} below playbook/thesis minimum ${minRR}R without exception rationale`
        );
      }
    }

    if (!preferred && le.limits.length >= 2) {
      warnings.push("preferred pullback zone missing");
    }

    if (preferred && starter?.derived?.rr !== undefined && preferred.derived?.rr !== undefined) {
      if (preferred.derived.rr < starter.derived.rr) {
        warnings.push(
          "preferred entry has lower R than starter without a clear structural reason"
        );
      }
    }

    if (
      preferred &&
      starter &&
      preferred.price > starter.price
    ) {
      warnings.push("preferred zone is above starter — unusual for long pullback ladder");
    }

    if (deep && input.assessment?.trendIntegrity === "questionable") {
      warnings.push(
        "deep entry improves R but trend integrity is questionable — show uncertainty"
      );
    }

    if (le.stopModel === "per_layer") {
      warnings.push("per-layer stops increase attribution complexity");
    }
  }

  const assessment = input.assessment;
  if (assessment) {
    if (assessment.extension === "extreme" || assessment.state === "extended_no_chase") {
      warnings.push("price extended — Scout should WAIT/NO; no market chase");
    }
    if (
      assessment.fibonacci &&
      (!assessment.evidenceFor.length ||
        assessment.evidenceFor.every((e) => /fib|0\.618|0\.5|retracement/i.test(e)))
    ) {
      warnings.push("Fibonacci-only justification — Fib is context, not authorization");
    }
    if (assessment.evidenceAgainst.length && assessment.unresolved.length === 0) {
      warnings.push("evidence against present — ensure unresolved contradictions are listed");
    }
    if (!assessment.humanValidated) {
      warnings.push("Family B assessment not marked human-validated");
    }
  }

  // Align with starter policy from R optimization
  if (STARTER_PARTICIPATION_POLICY.maxStarterRiskPercent < FAMILY_B_STARTER_MAX_ALLOCATION_PERCENT) {
    // informational only
  }

  return { errors, warnings };
}

export function buildFamilyBFillProjections(plan: TradePlan): LayeredFillStateProjection[] {
  const le = plan.layeredEntry;
  if (!le?.authorizedRiskAmount) return [];
  const target = le.primaryTargetPrice ?? plan.targetPrice;
  const stop = le.commonStopPrice ?? plan.stopPrice;
  if (target === undefined || (le.stopModel ?? "common") === "common" && stop === undefined) {
    return [];
  }
  return projectFillStates({
    limits: le.limits,
    primaryTargetPrice: target,
    authorizedRiskAmount: le.authorizedRiskAmount,
    stopModel: le.stopModel ?? "common",
    commonStopPrice: stop,
    sizingMode: le.sizingMode ?? "position_percent",
    noChase: true,
  });
}

export function recomputeFamilyBLayeredPlan(plan: TradePlan): {
  plan: TradePlan;
  errors: string[];
  warnings: string[];
} {
  const le = plan.layeredEntry;
  if (!le) return { plan, errors: [], warnings: [] };
  const target = le.primaryTargetPrice ?? plan.targetPrice;
  if (target === undefined) return { plan, errors: ["missing primary target"], warnings: [] };

  const { plan: recomputed, errors, warnings, fillStates } = recomputeLayeredEntryPlan(le, {
    primaryTargetPrice: target,
    planStopPrice: le.commonStopPrice ?? plan.stopPrice,
    authorizedRiskAmount: le.authorizedRiskAmount,
  });

  void fillStates;
  return {
    plan: {
      ...plan,
      layeredEntry: recomputed,
      targetPrice: recomputed.primaryTargetPrice ?? plan.targetPrice,
      stopPrice:
        (recomputed.stopModel ?? "common") === "common"
          ? (recomputed.commonStopPrice ?? plan.stopPrice)
          : plan.stopPrice,
    },
    errors,
    warnings,
  };
}

export function formatFamilyBAssessmentSection(input: {
  assessment: FamilyBEntryAssessment;
  plan?: TradePlan | null;
  minimumRR?: number;
  fillStates?: LayeredFillStateProjection[];
}): string {
  const { assessment, plan, minimumRR, fillStates } = input;
  const lines = [
    "=== FAMILY B · BULL TREND CONTINUATION ===",
    "Entry prices, stops and allocations are human/AI proposals.",
    "Matrix calculates R and validates — it does not invent technical levels.",
    "Do not invent market facts. Do not change target to improve R. Do not widen invalidation.",
    "Do not treat Fibonacci as standalone evidence. Do not recommend chasing.",
    `state:${assessment.state} (${BULL_TREND_STATE_LABELS[assessment.state]})`,
    `trend_integrity:${assessment.trendIntegrity}`,
    `extension:${assessment.extension}`,
    `pullback_quality:${assessment.pullbackQuality}`,
    `participation_case:${assessment.participationCase}`,
    `human_validated:${assessment.humanValidated === true ? "yes" : "no"}`,
  ];
  if (plan?.targetPrice !== undefined || plan?.layeredEntry?.primaryTargetPrice !== undefined) {
    lines.push(
      `primary_target:${plan.layeredEntry?.primaryTargetPrice ?? plan.targetPrice}`
    );
  }
  if (plan?.stopPrice !== undefined || plan?.layeredEntry?.commonStopPrice !== undefined) {
    lines.push(`structural_or_common_stop:${plan.layeredEntry?.commonStopPrice ?? plan.stopPrice}`);
  }
  if (minimumRR !== undefined) lines.push(`minimum_r:${minimumRR}`);

  if (plan?.layeredEntry?.limits.length) {
    lines.push("ENTRY LAYERS (proposed)");
    for (const [i, limit] of plan.layeredEntry.limits.entries()) {
      const role = toBullTrendLayerRole(limit.role);
      const label = role
        ? role
        : limit.role
          ? LAYER_ROLE_LABELS[limit.role]
          : `L${i + 1}`;
      lines.push(
        `  ${label}: entry=${limit.price} alloc=${limit.allocationPercent}% stop=${limit.stopPrice ?? plan.layeredEntry.commonStopPrice ?? plan.stopPrice ?? ""} rr=${limit.derived?.rr ?? ""} risk$=${limit.derived?.plannedRiskAmount ?? ""} conf=${limit.confidence ?? ""}`
      );
      if (limit.rationale) lines.push(`    rationale:${limit.rationale}`);
      if (limit.structuralBasis) lines.push(`    structural:${limit.structuralBasis}`);
      if (limit.uncertaintyNote) lines.push(`    uncertainty:${limit.uncertaintyNote}`);
    }
  }

  if (fillStates?.length) {
    lines.push("FILL-STATE PROJECTIONS (Matrix-calculated)");
    for (const s of fillStates) {
      if (s.limitsFilled === 0) {
        lines.push("  none — no chase");
        continue;
      }
      lines.push(
        `  ${s.label}: avg=${s.averageEntry} risk$=${s.monetaryRisk} blendedR=${s.blendedRR ?? ""} combinedR=${s.combinedRR ?? s.portfolioRR ?? ""} filled%=${s.allocationPercent} improve_vs_L1=${s.entryImprovementVsFirst ?? ""}`
      );
    }
  }

  lines.push("EVIDENCE FOR");
  for (const e of assessment.evidenceFor.length ? assessment.evidenceFor : ["(none)"]) {
    lines.push(`  - ${e}`);
  }
  lines.push("EVIDENCE AGAINST");
  for (const e of assessment.evidenceAgainst.length ? assessment.evidenceAgainst : ["(none)"]) {
    lines.push(`  - ${e}`);
  }
  lines.push("UNRESOLVED");
  for (const e of assessment.unresolved.length ? assessment.unresolved : ["(none)"]) {
    lines.push(`  - ${e}`);
  }
  if (assessment.fibonacci) {
    lines.push(
      `FIBONACCI_CONTEXT (supporting only): anchors ${assessment.fibonacci.anchorLow ?? ""}–${assessment.fibonacci.anchorHigh ?? ""} note=${assessment.fibonacci.note ?? ""}`
    );
  }
  if (assessment.cancelConditions?.length) {
    lines.push("CANCEL CONDITIONS");
    for (const c of assessment.cancelConditions) lines.push(`  - ${c}`);
  }
  return lines.join("\n");
}

export function isFamilyBPlaybook(playbookId?: string | null): boolean {
  return isSecularTrendContinuationPlaybook(playbookId);
}
