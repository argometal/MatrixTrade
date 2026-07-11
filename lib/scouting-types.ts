import type { StockThesis } from "./stock-thesis-types";
import type { TradePlan } from "./plan-types";
import type { DecisionVerdict } from "./scout-decision-types";

/** Display verdict — stored decision when present, else computed from Stock File status. */
export type ScoutingVerdict = DecisionVerdict;

export const SCOUTING_VERDICT_LABELS: Record<ScoutingVerdict, string> = {
  go: "Go",
  wait: "Wait",
  probe: "Probe",
  no: "No",
};

/** Prefer stored scout decision; fall back to thesis status heuristic. */
export function resolveScoutingVerdict(
  thesis: StockThesis,
  plan?: TradePlan
): ScoutingVerdict {
  if (plan?.decision?.verdict) return plan.decision.verdict;
  return computeScoutingVerdictFromThesis(thesis);
}

export function computeScoutingVerdictFromThesis(thesis: StockThesis): ScoutingVerdict {
  switch (thesis.status) {
    case "actionable":
      return "go";
    case "watching":
    case "draft":
      return "wait";
    case "invalidated":
    case "archived":
      return "no";
    default:
      return "wait";
  }
}
