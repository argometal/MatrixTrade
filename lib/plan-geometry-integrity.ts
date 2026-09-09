/**
 * KISS Plan geometry integrity guard.
 *
 * Identical entry/stop/target → STALL before persistence.
 * Human/AI verify → CANCEL or OVERRIDE. No auto-classify/consolidate/delete.
 */

export type PlanGeometryLevels = {
  entry: number;
  stop: number;
  target: number;
};

export type ExistingPlanGeometry = PlanGeometryLevels & {
  planId: string;
  ticker: string;
};

export type ProposedPlanGeometry = PlanGeometryLevels & {
  ticker: string;
};

export type PlanGeometryMatch = {
  existing: ExistingPlanGeometry;
  proposed: ProposedPlanGeometry;
};

export type PlanGeometryStall = {
  kind: "identical_geometry";
  matches: PlanGeometryMatch[];
  /** Human-readable comparison for CANCEL vs OVERRIDE / CREATE ANYWAY */
  comparisonText: string;
  actions: readonly ["CANCEL", "OVERRIDE / CREATE ANYWAY"];
};

export const PLAN_GEOMETRY_OVERRIDE_FLAG = "identicalGeometryOverride" as const;

export function parsePlanGeometryLevels(input: {
  entry?: number | null;
  stop?: number | null;
  target?: number | null;
}): PlanGeometryLevels | null {
  const entry = input.entry;
  const stop = input.stop;
  const target = input.target;
  if (
    entry == null ||
    stop == null ||
    target == null ||
    !Number.isFinite(entry) ||
    !Number.isFinite(stop) ||
    !Number.isFinite(target)
  ) {
    return null;
  }
  return { entry, stop, target };
}

export function geometriesIdentical(
  a: PlanGeometryLevels,
  b: PlanGeometryLevels
): boolean {
  return a.entry === b.entry && a.stop === b.stop && a.target === b.target;
}

export function findIdenticalGeometryMatches(input: {
  proposed: ProposedPlanGeometry;
  existingPlans: Array<{
    id: string;
    ticker: string;
    plannedEntry?: number | null;
    stopPrice?: number | null;
    targetPrice?: number | null;
  }>;
  /** Exclude this plan id (update path). */
  excludePlanId?: string;
}): PlanGeometryMatch[] {
  const exclude = input.excludePlanId?.trim().toUpperCase();
  const matches: PlanGeometryMatch[] = [];
  for (const plan of input.existingPlans) {
    if (exclude && plan.id.toUpperCase() === exclude) continue;
    const levels = parsePlanGeometryLevels({
      entry: plan.plannedEntry,
      stop: plan.stopPrice,
      target: plan.targetPrice,
    });
    if (!levels) continue;
    if (!geometriesIdentical(levels, input.proposed)) continue;
    matches.push({
      existing: {
        planId: plan.id,
        ticker: plan.ticker,
        ...levels,
      },
      proposed: input.proposed,
    });
  }
  return matches;
}

export function formatGeometryStallComparison(
  matches: PlanGeometryMatch[]
): string {
  if (matches.length === 0) return "";
  const lines: string[] = [
    "IDENTICAL PLAN GEOMETRY — STALL",
    "No automatic persist. Verify, then CANCEL or OVERRIDE / CREATE ANYWAY.",
    "",
  ];
  for (const match of matches) {
    lines.push("EXISTING PLAN");
    lines.push(`Plan ID: ${match.existing.planId}`);
    lines.push(`Ticker: ${match.existing.ticker}`);
    lines.push(`Entry: ${match.existing.entry}`);
    lines.push(`Stop: ${match.existing.stop}`);
    lines.push(`Target: ${match.existing.target}`);
    lines.push("");
  }
  const proposed = matches[0]!.proposed;
  lines.push("PROPOSED PLAN");
  lines.push(`Ticker: ${proposed.ticker}`);
  lines.push(`Entry: ${proposed.entry}`);
  lines.push(`Stop: ${proposed.stop}`);
  lines.push(`Target: ${proposed.target}`);
  lines.push("");
  lines.push("Actions: CANCEL | OVERRIDE / CREATE ANYWAY");
  return lines.join("\n");
}

export function buildGeometryStall(
  matches: PlanGeometryMatch[]
): PlanGeometryStall | null {
  if (matches.length === 0) return null;
  return {
    kind: "identical_geometry",
    matches,
    comparisonText: formatGeometryStallComparison(matches),
    actions: ["CANCEL", "OVERRIDE / CREATE ANYWAY"] as const,
  };
}

/** True when caller explicitly opts to create despite identical geometry. */
export function isIdenticalGeometryOverride(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "string") {
    const raw = value.trim().toUpperCase();
    return (
      raw === "OVERRIDE" ||
      raw === "OVERRIDE / CREATE ANYWAY" ||
      raw === "CREATE ANYWAY" ||
      raw === "TRUE" ||
      raw === "1"
    );
  }
  return false;
}
