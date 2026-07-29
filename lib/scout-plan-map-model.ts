import type { PlanLevelsView } from "./plan-levels-board";
import { LAYER_ROLE_LABELS, resolveLayeredExecutionModel } from "./layered-entry-types";

export type ScoutPlanMapModel = {
  mode: "single_entry" | "layered";
  ticker: string;
  planId: string;
  primaryTarget?: number;
  extendedTargets: number[];
  referenceEntry?: number;
  commonStop?: number;
  layers: Array<{
    index: number;
    role?: string;
    price: number;
    allocationPercent?: number;
    allocationMeaning?: "risk" | "capital" | "position";
    shares?: number;
    capitalRequired?: number;
    estimatedRisk?: number;
    rrToPrimaryTarget?: number;
    fillStatus?: string;
    stopPrice?: number;
  }>;
  referencePlanRR?: number;
  blendedEntry?: number;
  blendedRR?: number;
  filledPositionRR?: number;
  authorizedRisk?: number;
  roundedRisk?: number;
  unusedRisk?: number;
  requestedCapital?: number;
  minRR?: number;
  stopModel?: string;
  operationalState?: string;
  nextAction?: string;
  executableRR?: number | null;
  decisionVerdict?: string;
  layerCount: number;
  allocationModeLabel?: string;
  fillSummary: string;
  spacingCompressed: boolean;
};

type ScoutPlanMapLayer = ScoutPlanMapModel["layers"][number];

function sum(values: Array<number | undefined>): number | undefined {
  let total = 0;
  let any = false;
  for (const value of values) {
    if (value !== undefined && Number.isFinite(value)) {
      total += value;
      any = true;
    }
  }
  return any ? total : undefined;
}

function resolveLayerFillStatus(view: PlanLevelsView, index: number): string {
  const le = view.layeredEntry?.plan;
  const limit = le?.limits[index];
  if (!le || !limit) return "pending";
  if (limit.filled) return "filled";
  if (le.status === "active") return "armed";
  if (le.status === "missed") return "missed";
  if (le.status === "cancelled") return "skipped";
  return "pending";
}

function computeFilledPositionRR(view: PlanLevelsView): number | undefined {
  const le = view.layeredEntry?.plan;
  if (!le?.limits?.length) return undefined;
  const filled = le.limits.filter((limit) => limit.filled && limit.derived);
  if (filled.length === 0) return undefined;
  const totalCapital = sum(filled.map((limit) => limit.derived?.plannedCapital));
  const totalRisk = sum(filled.map((limit) => limit.derived?.plannedRiskAmount));
  const totalReward = sum(
    filled.map((limit) =>
      limit.derived && view.primaryTarget !== undefined && limit.derived.plannedQuantity > 0
        ? (view.primaryTarget - limit.price) * limit.derived.plannedQuantity
        : undefined
    )
  );
  if (
    totalCapital === undefined ||
    totalRisk === undefined ||
    totalReward === undefined ||
    !(totalRisk > 0)
  ) {
    return undefined;
  }
  return Math.round((totalReward / totalRisk) * 100) / 100;
}

function allocationModeLabel(view: PlanLevelsView): string | undefined {
  const le = view.layeredEntry?.plan;
  if (!le) return undefined;
  if (le.sizingMode === "risk_percent") return "Risk weighted";
  const executionModel = resolveLayeredExecutionModel(le);
  if (executionModel === "risk_weighted") return "Risk weighted";
  return "Position weighted";
}

export function buildPlanMapModel(view: PlanLevelsView): ScoutPlanMapModel {
  const layered = view.layeredEntry?.plan;
  const primaryTarget = layered?.primaryTargetPrice ?? view.primaryTarget;
  const commonStop = layered?.commonStopPrice ?? view.commonStop;
  const layers: ScoutPlanMapLayer[] =
    layered?.limits?.length
      ? layered.limits.map((limit, index) => ({
          index,
          role: limit.role ? LAYER_ROLE_LABELS[limit.role] : undefined,
          price: limit.price,
          allocationPercent: limit.allocationPercent,
          allocationMeaning:
            layered.sizingMode === "risk_percent"
              ? ("risk" as const)
              : ("position" as const),
          shares:
            limit.derived?.plannedQuantity !== undefined &&
            limit.derived.plannedQuantity > 0
              ? limit.derived.plannedQuantity
              : undefined,
          capitalRequired: limit.derived?.plannedCapital,
          estimatedRisk: limit.derived?.plannedRiskAmount,
          rrToPrimaryTarget: limit.derived?.rr,
          fillStatus: resolveLayerFillStatus(view, index),
          stopPrice:
            (layered.stopModel ?? "common") === "per_layer"
              ? limit.stopPrice
              : commonStop,
        }))
      : view.referenceEntry !== undefined
        ? [
            {
              index: 0,
              price: view.referenceEntry,
              allocationPercent: undefined,
              allocationMeaning: undefined,
              shares: undefined,
              capitalRequired: undefined,
              estimatedRisk: undefined,
              rrToPrimaryTarget: view.plannedRR,
              fillStatus: "pending",
              stopPrice: commonStop,
            },
          ]
        : [];

  const fillStates = view.layeredEntry?.fillStates;
  const fullBuild = fillStates?.[fillStates.length - 1];
  const filledCount = layers.filter((layer) => layer.fillStatus === "filled").length;
  return {
    mode: layered?.limits?.length ? "layered" : "single_entry",
    ticker: view.ticker,
    planId: view.planId ?? "—",
    primaryTarget,
    extendedTargets: view.extendedTargets ?? [],
    referenceEntry: view.referenceEntry,
    commonStop,
    layers,
    referencePlanRR: view.plannedRR,
    blendedEntry: fullBuild?.averageEntry ?? layered?.averageEntry,
    blendedRR:
      fullBuild?.blendedRR ??
      fullBuild?.combinedRR ??
      fullBuild?.portfolioRR ??
      layered?.blendedRR ??
      layered?.combinedRR,
    filledPositionRR: computeFilledPositionRR(view),
    authorizedRisk: layered?.authorizedRiskAmount,
    roundedRisk: fullBuild?.assignedLoss ?? sum(layers.map((layer) => layer.estimatedRisk)),
    unusedRisk:
      layered?.authorizedRiskAmount !== undefined &&
      (fullBuild?.assignedLoss ?? sum(layers.map((layer) => layer.estimatedRisk))) !== undefined
        ? Math.max(
            0,
            layered.authorizedRiskAmount -
              ((fullBuild?.assignedLoss ??
                sum(layers.map((layer) => layer.estimatedRisk))) as number)
          )
        : undefined,
    requestedCapital:
      fullBuild?.capitalDeployed ?? sum(layers.map((layer) => layer.capitalRequired)),
    minRR: view.minRR,
    stopModel: layered?.stopModel ?? "common",
    operationalState: view.operationalState,
    nextAction: view.nextAction,
    executableRR: view.executableRR,
    layerCount: layers.length,
    allocationModeLabel: allocationModeLabel(view),
    fillSummary:
      layers.length > 1
        ? filledCount > 0
          ? `Partial build · ${filledCount} / ${layers.length} layers`
          : `0 / ${layers.length} layers filled`
        : filledCount > 0
          ? "Filled"
          : "Pending",
    spacingCompressed: true,
  };
}
