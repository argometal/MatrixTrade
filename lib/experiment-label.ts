import type { Experiment } from "./types";

/** Canonical experiment trade id range (validation: H001–H030). */
export const EXPERIMENT_ID_RANGE = "H001–H030";

/** Primary label for preview sidebars and header badges. */
export function formatCycleLabel(_experiment?: Experiment): string {
  return `Experiment ${EXPERIMENT_ID_RANGE}`;
}

/** Compact closed/max label (exchange, assistant headers). */
export function formatCycleProgressLabel(experiment: Experiment): string {
  return `${experiment.closedTrades} / ${experiment.maxTrades}`;
}
