/**
 * Observation Engine persistence facade.
 * Durable backend: Supabase `public.observations` when Matrix store is cloud/Vercel.
 * Local JSON only off-Vercel — never write observations.json in production (25-115).
 */
import {
  getObservationsStore,
  OBSERVATIONS_JSON_PATH,
} from "./observations-store";
import type { ObservationRecord } from "./observation-types";

export { OBSERVATIONS_JSON_PATH };

export async function getObservations(): Promise<ObservationRecord[]> {
  return getObservationsStore().readAll();
}

export async function getObservationById(
  id: string
): Promise<ObservationRecord | undefined> {
  const needle = id.toUpperCase();
  return (await getObservations()).find((row) => row.id.toUpperCase() === needle);
}

export async function getObservationsByTradeId(
  tradeId: string
): Promise<ObservationRecord[]> {
  const needle = tradeId.toUpperCase();
  return (await getObservations()).filter(
    (row) => row.tradeId?.toUpperCase() === needle
  );
}

export async function getObservationByTradeId(
  tradeId: string
): Promise<ObservationRecord | undefined> {
  const matches = await getObservationsByTradeId(tradeId);
  return matches[0];
}

export async function getObservationByPlanId(
  planId: string
): Promise<ObservationRecord | undefined> {
  const needle = planId.toUpperCase();
  return (await getObservations()).find(
    (row) => row.planId?.toUpperCase() === needle && !row.tradeId
  );
}

export async function upsertObservation(row: ObservationRecord): Promise<void> {
  await getObservationsStore().upsert(row);
}

export function nextObservationId(
  rows: ObservationRecord[],
  ticker: string
): string {
  const normalized = ticker.trim().toUpperCase();
  const prefix = `OBS-${normalized}-`;
  let max = 0;
  for (const row of rows) {
    if (!row.id.startsWith(prefix)) continue;
    const n = Number(row.id.slice(prefix.length));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
