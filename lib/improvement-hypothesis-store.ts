/**
 * Improvement Hypothesis persistence facade (MXT 028).
 */
import {
  getImprovementHypothesesStore,
  getImprovementHypothesesStoreMode,
  IMPROVEMENT_HYPOTHESES_JSON_PATH,
} from "./improvement-hypotheses-store";
import type { ImprovementHypothesis } from "./improvement-hypothesis-types";

export { IMPROVEMENT_HYPOTHESES_JSON_PATH };
export { getImprovementHypothesesStoreMode } from "./improvement-hypotheses-store";

export async function getImprovementHypotheses(): Promise<
  ImprovementHypothesis[]
> {
  return getImprovementHypothesesStore().readAll();
}

export async function getImprovementHypothesisById(
  id: string
): Promise<ImprovementHypothesis | undefined> {
  const needle = id.toUpperCase();
  const all = await getImprovementHypotheses();
  return all.find((row) => row.id.toUpperCase() === needle);
}

export async function getImprovementHypothesesByOriginPlanId(
  planId: string
): Promise<ImprovementHypothesis[]> {
  const needle = planId.toUpperCase();
  const all = await getImprovementHypotheses();
  return all.filter((row) => row.originPlanId.toUpperCase() === needle);
}

export async function getImprovementHypothesisByEvidencePlanId(
  planId: string
): Promise<ImprovementHypothesis | undefined> {
  const needle = planId.toUpperCase();
  const all = await getImprovementHypotheses();
  return all.find((row) =>
    row.evidencePlanIds.some((id) => id.toUpperCase() === needle)
  );
}

export async function upsertImprovementHypothesis(
  row: ImprovementHypothesis
): Promise<void> {
  await getImprovementHypothesesStore().upsert(row);
}

export function nextImprovementHypothesisId(
  rows: ImprovementHypothesis[],
  ticker: string
): string {
  const normalized = ticker.trim().toUpperCase();
  const prefix = `IH-${normalized}-`;
  let max = 0;
  for (const row of rows) {
    if (!row.id.startsWith(prefix)) continue;
    const n = Number(row.id.slice(prefix.length));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
