/**
 * MAF → Insights Case join (MXT 016-P09 S5).
 * Attribution evidence only — never Case family / DQ / EQ authority.
 *
 * Persistence follows Matrix store gate (JSON local or Supabase maf_experiments).
 */

import type { MafExperiment } from "./maf-types";
import { getMafExperimentsStoreMode } from "./maf-store";
import type {
  InsightsCaseMafAttribution,
  InsightsCaseRow,
  MafEvidenceSource,
} from "./insights-case-spine-types";

export type { InsightsCaseMafAttribution, MafEvidenceSource };

/** @deprecated Prefer resolveMafEvidenceSource() — kept for callers that need a constant. */
export const MAF_EVIDENCE_SOURCE: MafEvidenceSource = "local_json";

export function resolveMafEvidenceSource(): MafEvidenceSource {
  return getMafExperimentsStoreMode() === "supabase" ? "supabase" : "local_json";
}

export const MAF_SOURCE_HELP =
  "Attribution source: accepted MAF experiments from the active Matrix store. MAF explains possible component drag; it does not independently determine Case Family or Decision Quality.";

/**
 * Unambiguous join only: planId match, or LO mafExperimentId / tradeId
 * when the Case already carries a single LO identity via planId.
 * Orphan MAF stays orphan.
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

  const byLo =
    loNeedle == null
      ? []
      : input.experiments.filter(
          (e) => e.learningOutcomeId?.toUpperCase() === loNeedle
        );
  const source = resolveMafEvidenceSource();

  if (byLo.length === 1) {
    const e = byLo[0]!;
    return {
      mafExperimentId: e.id,
      primaryDragComponent: e.primaryDragComponent ?? null,
      source,
    };
  }

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

/** Attach MAF attribution onto rows without mutating classification fields. */
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
      learningOutcomeId: ids?.learningOutcomeId,
      tradeId: ids?.tradeId,
      experiments,
    });
    if (!maf) return { ...row, mafAttribution: null };
    return { ...row, mafAttribution: maf };
  });
}
