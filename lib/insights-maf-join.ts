/**
 * MAF → Insights Case join (MXT 016-P09 S5).
 * Attribution evidence only — never Case family / DQ / EQ authority.
 *
 * Persistence follows Matrix store gate (JSON local or Supabase maf_experiments).
 * This module must stay client-safe (no fs-backed store imports).
 */

import type { MafExperiment } from "./maf-types";
import { resolveMafEvidenceSource } from "./maf-evidence-source";
import type {
  InsightsCaseMafAttribution,
  InsightsCaseRow,
  MafEvidenceSource,
} from "./insights-case-spine-types";

export type { InsightsCaseMafAttribution, MafEvidenceSource };
export { resolveMafEvidenceSource };

/** @deprecated Prefer resolveMafEvidenceSource() — kept for callers that need a constant. */
export const MAF_EVIDENCE_SOURCE: MafEvidenceSource = "local_json";

export const MAF_SOURCE_HELP =
  "Attribution source: accepted MAF experiments from the active Matrix store. MAF explains possible component drag; it does not independently determine Case Family or Decision Quality.";

/**
 * Unambiguous join only.
 * Priority: explicit tradeId → LO mafExperimentId → plan-only MAF (no tradeId).
 * Orphan MAF stays orphan. Never match by ticker/date/geometry.
 */
export function resolveMafForCase(input: {
  planId: string;
  learningOutcomeId?: string | null;
  tradeId?: string | null;
  experiments: MafExperiment[];
}): InsightsCaseMafAttribution | null {
  const planNeedle = input.planId.toUpperCase();
  const loNeedle = input.learningOutcomeId?.toUpperCase() ?? null;
  const tradeNeedle = input.tradeId?.toUpperCase() ?? null;
  const source = resolveMafEvidenceSource();

  const byTrade =
    tradeNeedle == null
      ? []
      : input.experiments.filter(
          (e) => e.tradeId?.toUpperCase() === tradeNeedle
        );
  if (byTrade.length === 1) {
    const e = byTrade[0]!;
    return {
      mafExperimentId: e.id,
      primaryDragComponent: e.primaryDragComponent ?? null,
      source,
    };
  }

  const byLo =
    loNeedle == null
      ? []
      : input.experiments.filter(
          (e) => e.learningOutcomeId?.toUpperCase() === loNeedle
        );
  if (byLo.length === 1) {
    const e = byLo[0]!;
    return {
      mafExperimentId: e.id,
      primaryDragComponent: e.primaryDragComponent ?? null,
      source,
    };
  }

  const byPlan = input.experiments.filter(
    (e) => e.planId?.toUpperCase() === planNeedle && !e.tradeId
  );
  if (byPlan.length === 1) {
    const e = byPlan[0]!;
    return {
      mafExperimentId: e.id,
      primaryDragComponent: e.primaryDragComponent ?? null,
      source,
    };
  }

  return null;
}

/**
 * Attach MAF attribution onto rows without mutating classification fields.
 * Historical rows resolve via linkage.tradeId when loTradeByPlan has no entry
 * for synthetic planId HIST:{tradeId}.
 */
export function attachMafToInsightsCaseRows(
  rows: InsightsCaseRow[],
  experiments: MafExperiment[],
  loTradeByPlan?: Map<
    string,
    { learningOutcomeId?: string | null; tradeId?: string | null }
  >
): InsightsCaseRow[] {
  return rows.map((row) => {
    const ids = loTradeByPlan?.get(row.planId.toUpperCase());
    const maf = resolveMafForCase({
      planId: row.planId,
      learningOutcomeId: ids?.learningOutcomeId ?? null,
      tradeId: ids?.tradeId ?? row.linkage?.tradeId ?? null,
      experiments,
    });
    if (!maf) return { ...row, mafAttribution: null };
    return { ...row, mafAttribution: maf };
  });
}
