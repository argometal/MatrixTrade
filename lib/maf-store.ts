/**
 * MAF experiment persistence facade.
 * Durable backend: Supabase `public.maf_experiments` when Matrix store is cloud/Vercel.
 * Local JSON only off-Vercel — never write maf-experiments.json in production (P14B-02).
 */
import {
  getMafExperimentsStore,
  getMafExperimentsStoreMode,
  MAF_EXPERIMENTS_JSON_PATH,
} from "./maf-experiments-store";
import type { MafExperiment } from "./maf-types";

export { MAF_EXPERIMENTS_JSON_PATH };
export { getMafExperimentsStoreMode } from "./maf-experiments-store";

export async function getMafExperiments(): Promise<MafExperiment[]> {
  return getMafExperimentsStore().readAll();
}

export async function getMafExperimentById(
  id: string
): Promise<MafExperiment | undefined> {
  const needle = id.toUpperCase();
  const all = await getMafExperiments();
  return all.find((row) => row.id.toUpperCase() === needle);
}

export async function getMafExperimentByTradeId(
  tradeId: string
): Promise<MafExperiment | undefined> {
  const needle = tradeId.toUpperCase();
  const all = await getMafExperiments();
  return all.find((row) => row.tradeId?.toUpperCase() === needle);
}

export async function getMafExperimentByPlanId(
  planId: string
): Promise<MafExperiment | undefined> {
  const needle = planId.toUpperCase();
  const all = await getMafExperiments();
  return all.find(
    (row) => row.planId?.toUpperCase() === needle && !row.tradeId
  );
}

export async function upsertMafExperiment(row: MafExperiment): Promise<void> {
  await getMafExperimentsStore().upsert(row);
}

export function nextMafExperimentId(rows: MafExperiment[], ticker: string): string {
  const normalized = ticker.trim().toUpperCase();
  const prefix = `MAF-${normalized}-`;
  let max = 0;
  for (const row of rows) {
    if (!row.id.startsWith(prefix)) continue;
    const n = Number(row.id.slice(prefix.length));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
