/**
 * closestApproach vs plannedEntry learning (MXT 023 L).
 * Capture + measure only when evidence is valid — never invent fill probability.
 */

export type ClosestApproachEvidence = {
  plannedEntry: number;
  /** Closest observed price to plannedEntry while setup was active. */
  closestApproach: number;
  /** When true, price touched/filled at plannedEntry (observable). */
  entryTouched?: boolean | null;
  /** Optional: persisted T0 freeze id — required for T0-anchored learning claims. */
  t0FreezeId?: string | null;
};

export type ClosestApproachMeasurement =
  | {
      status: "MEASURABLE_NOW";
      plannedEntry: number;
      closestApproach: number;
      distance: number;
      distanceAbs: number;
      entryTouched: boolean | null;
      /** Fraction of plannedEntry distance; not a fill probability. */
      approachVsEntryRatio: number | null;
      t0Anchored: boolean;
    }
  | {
      status: "INSUFFICIENT_DATA";
      reason: string;
    };

/**
 * Compute distance metrics only when plannedEntry + closestApproach are finite.
 * Does NOT estimate fill-rate / probability.
 */
export function measureClosestApproach(
  input: ClosestApproachEvidence
): ClosestApproachMeasurement {
  const { plannedEntry, closestApproach } = input;
  if (!Number.isFinite(plannedEntry) || !Number.isFinite(closestApproach)) {
    return {
      status: "INSUFFICIENT_DATA",
      reason:
        "plannedEntry and closestApproach must both be finite observed numbers",
    };
  }
  if (!(plannedEntry > 0)) {
    return {
      status: "INSUFFICIENT_DATA",
      reason: "plannedEntry must be a positive price",
    };
  }

  const distance = closestApproach - plannedEntry;
  const distanceAbs = Math.abs(distance);
  const touched =
    typeof input.entryTouched === "boolean"
      ? input.entryTouched
      : distanceAbs < 1e-9
        ? true
        : null;

  return {
    status: "MEASURABLE_NOW",
    plannedEntry,
    closestApproach,
    distance,
    distanceAbs,
    entryTouched: touched,
    approachVsEntryRatio: distanceAbs / plannedEntry,
    t0Anchored: Boolean(input.t0FreezeId?.trim()),
  };
}

/** Honest status when historical case has no persisted T0. */
export function classifyMissingT0Case(planId: string): {
  status: "INDETERMINATE";
  reason: string;
} {
  return {
    status: "INDETERMINATE",
    reason: `${planId}: NO PERSISTED T0 — cannot run T0→Reality→Evaluation→Diagnosis with fabricated freeze.`,
  };
}
