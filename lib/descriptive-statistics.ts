/**
 * Descriptive statistics helpers — reusable count/mean/median/proportion only.
 * Not inference, expectancy, significance, or recommendation.
 */

export function descriptiveAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)
  );
}

export function descriptiveMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  const left = sorted[middle - 1]!;
  const right = sorted[middle]!;
  return Number((((left + right) / 2)).toFixed(4));
}

/** Observed proportion = numerator / denominator; null when denominator is 0. */
export function descriptiveProportion(
  numerator: number,
  denominator: number
): number | null {
  if (!(denominator > 0) || !Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return null;
  }
  return Number((numerator / denominator).toFixed(4));
}

export function descriptiveRange(values: number[]): {
  min: number | null;
  max: number | null;
} {
  if (values.length === 0) return { min: null, max: null };
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}
