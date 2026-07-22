/**
 * Scout war-room case order: highest planned R first.
 * Cases without R sink below known R; orphan fills stay last (not re-entry candidates).
 */

export type ScoutCaseSortable = {
  ticker: string;
  plannedRR?: number;
  orphan?: boolean;
};

export function compareScoutCasesByPlannedRR(
  a: ScoutCaseSortable,
  b: ScoutCaseSortable
): number {
  if (Boolean(a.orphan) !== Boolean(b.orphan)) {
    return a.orphan ? 1 : -1;
  }

  const aHas = a.plannedRR !== undefined && Number.isFinite(a.plannedRR);
  const bHas = b.plannedRR !== undefined && Number.isFinite(b.plannedRR);

  if (aHas && bHas && a.plannedRR !== b.plannedRR) {
    return (b.plannedRR as number) - (a.plannedRR as number);
  }
  if (aHas !== bHas) return aHas ? -1 : 1;

  return a.ticker.localeCompare(b.ticker);
}

export function sortScoutCasesByPlannedRR<T extends ScoutCaseSortable>(cases: T[]): T[] {
  return [...cases].sort(compareScoutCasesByPlannedRR);
}

export function formatScoutCasePlannedRR(plannedRR?: number): string | null {
  if (plannedRR === undefined || !Number.isFinite(plannedRR)) return null;
  return `${plannedRR.toFixed(1)}R`;
}
