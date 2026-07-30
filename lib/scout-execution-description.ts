/**
 * Authoritative Scout execution description (30-16).
 *
 * Architecture: every accepted Scout execution preserves two synchronized outputs:
 * 1. Structured execution data (`TradePlan.layeredEntry` + plan entry/stop/target)
 * 2. Human-readable description — a deterministic projection of (1), never the calculation source
 *
 * Never parse reasoning/notes. Never hardcode prices, shares, or allocations in UI.
 */

import type { TradePlan } from "./plan-types";
import {
  formatPlanMapOperationalParagraph,
  type PlanMapOperationalInput,
} from "./scout-plan-map-operational";

export type ScoutExecutionDescriptionResult = {
  /** Broker-actionable sentence(s) derived from structured data only. */
  description?: string;
  /** Integrity flags — layered prose must not outrun a single-entry structure. */
  flags: string[];
  source: "layered_entry" | "single_entry" | "none";
};

function allocationMeaningFromPlan(
  plan: TradePlan
): PlanMapOperationalInput["allocationMeaning"] {
  if (plan.layeredEntry?.sizingMode === "risk_percent") return "risk";
  return "position";
}

/**
 * Build the authoritative execution description from a persisted TradePlan.
 * Prefer calculated shares when present on every layer; otherwise allocation %.
 */
export function buildScoutExecutionDescription(
  plan: TradePlan
): ScoutExecutionDescriptionResult {
  const layered = plan.layeredEntry;
  const flags: string[] = [];

  if (layered?.executionMethod === "layered_limits" && layered.limits.length < 2) {
    flags.push(
      "layered_limits stored with fewer than 2 layers — layered description rejected; treat as single-entry"
    );
  }

  if (layered?.limits && layered.limits.length >= 2) {
    const description = formatPlanMapOperationalParagraph({
      mode: "layered",
      layers: layered.limits.map((limit) => ({
        price: limit.price,
        allocationPercent: limit.allocationPercent,
        shares:
          limit.derived?.plannedQuantity !== undefined &&
          limit.derived.plannedQuantity > 0
            ? limit.derived.plannedQuantity
            : undefined,
        stopPrice: limit.stopPrice ?? layered.commonStopPrice ?? plan.stopPrice,
      })),
      stopModel: layered.stopModel ?? "common",
      commonStop: layered.commonStopPrice ?? plan.stopPrice,
      primaryTarget: layered.primaryTargetPrice ?? plan.targetPrice,
      referenceEntry: plan.plannedEntry,
      allocationMeaning: allocationMeaningFromPlan(plan),
    });

    return {
      description,
      flags,
      source: "layered_entry",
    };
  }

  // Single-entry (no layered structure, or insufficient layers)
  if (
    plan.plannedEntry !== undefined ||
    plan.stopPrice !== undefined ||
    plan.targetPrice !== undefined ||
    (layered?.limits.length === 1 && layered.limits[0])
  ) {
    const only = layered?.limits[0];
    const description = formatPlanMapOperationalParagraph({
      mode: "single_entry",
      layers: only
        ? [
            {
              price: only.price,
              allocationPercent: only.allocationPercent,
              shares:
                only.derived?.plannedQuantity !== undefined &&
                only.derived.plannedQuantity > 0
                  ? only.derived.plannedQuantity
                  : undefined,
              stopPrice: only.stopPrice ?? layered?.commonStopPrice ?? plan.stopPrice,
            },
          ]
        : [],
      stopModel: "common",
      commonStop: layered?.commonStopPrice ?? plan.stopPrice,
      primaryTarget: layered?.primaryTargetPrice ?? plan.targetPrice,
      referenceEntry: plan.plannedEntry ?? only?.price,
      allocationMeaning: allocationMeaningFromPlan(plan),
    });
    return { description, flags, source: "single_entry" };
  }

  return { description: undefined, flags, source: "none" };
}

/**
 * Integrity helper: flag when a caller claims layered execution but the
 * persisted plan cannot support a layered description (0–1 structured layers).
 */
export function flagLayeredDescriptionWithoutLayers(
  plan: TradePlan,
  claimedLayered: boolean
): string[] {
  if (!claimedLayered) return [];
  const layerCount = plan.layeredEntry?.limits?.length ?? 0;
  if (layerCount < 2) {
    return [
      "Layered execution description rejected: stored plan has fewer than 2 entry layers. Persist structured layeredEntry.limits[] (min 2) — do not leave layered intent only in reasoning/notes.",
    ];
  }
  return [];
}

/** Snapshot / Plan Map one-liner — same string as the UI projection. */
export function formatScoutExecutionDescriptionLine(plan: TradePlan): string {
  const { description, flags, source } = buildScoutExecutionDescription(plan);
  const lines: string[] = ["=== EXECUTION DESCRIPTION ==="];
  lines.push(
    "Projection of structured layeredEntry / plan levels — not a calculation source; never parse reasoning."
  );
  lines.push(`source:${source}`);
  if (description) lines.push(`description:${description}`);
  else lines.push("description:none");
  for (const flag of flags) lines.push(`flag:${flag}`);
  return lines.join("\n");
}
