/**
 * External Position persistence facade.
 */
import {
  getExternalPositionsStore,
  __setExternalPositionsStoreForTests,
  EXTERNAL_POSITIONS_JSON_PATH,
  withExternalPositionLock,
} from "./external-positions-store";
import type { ExternalPosition } from "./external-position-types";

export { EXTERNAL_POSITIONS_JSON_PATH, withExternalPositionLock };

export async function getExternalPositions(): Promise<ExternalPosition[]> {
  return getExternalPositionsStore().readAll();
}

export async function getExternalPositionById(
  id: string
): Promise<ExternalPosition | undefined> {
  const needle = id.toUpperCase();
  return (await getExternalPositions()).find(
    (row) => row.id.toUpperCase() === needle
  );
}

export async function upsertExternalPosition(
  row: ExternalPosition
): Promise<ExternalPosition> {
  return getExternalPositionsStore().upsert(row);
}

export async function upsertExternalPositionIfRevision(
  row: ExternalPosition,
  expectedRevision: number
): Promise<ExternalPosition> {
  return getExternalPositionsStore().upsertIfRevision(row, expectedRevision);
}

export function nextExternalPositionId(
  rows: ExternalPosition[],
  ticker: string
): string {
  const normalized = ticker.trim().toUpperCase();
  const prefix = `EXT-${normalized}-`;
  let max = 0;
  for (const row of rows) {
    if (!row.id.startsWith(prefix)) continue;
    const n = Number(row.id.slice(prefix.length));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function __setExternalPositionStoreForTests(
  seedOrStore: Parameters<typeof __setExternalPositionsStoreForTests>[0]
): void {
  __setExternalPositionsStoreForTests(seedOrStore);
}
