import type { Experiment } from "./types";

/** Primary label for preview sidebars and header badges. */
export function formatCycleLabel(_experiment?: Experiment): string {
  return "Trading lab";
}

/** Closed trade count for exchange, assistant headers, nav. */
export function formatCycleProgressLabel(experiment: Experiment): string {
  return `${experiment.closedTrades} closed`;
}
