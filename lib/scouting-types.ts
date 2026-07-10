import type { StockThesis } from "./stock-thesis-types";

/** Display-only gatekeeper verdict — computed from Stock File + plan state, no DB field. */
export type ScoutingVerdict = "go" | "wait" | "no";

export const SCOUTING_VERDICT_LABELS: Record<ScoutingVerdict, string> = {
  go: "Go",
  wait: "Wait",
  no: "No",
};

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
