/**
 * Insights presentation helpers — Accepted MAF vs Historical Reconstruction (P14B-05).
 * Pure strings for UI; never invents MAF from P13 reconstruction.
 */

import { MAF_COMPONENT_LABELS } from "./maf-types";
import type { InsightsCaseRow } from "./insights-case-spine-types";
import type { HistoricalCaseAttribution } from "./historical-case-attribution";
import type { InsightsCaseMafAttribution } from "./insights-case-spine-types";

export type AcceptedMafUiLines = {
  /** e.g. "Accepted MAF · MAF-AMZN-001" or "Accepted MAF · —" */
  acceptedLine: string;
  /** e.g. "Primary drag · Entry quality" or "Primary drag · —" */
  primaryDragLine: string;
  present: boolean;
};

export type HistoricalReconstructionUiLines = {
  label: string;
  summary: string;
  provenanceLine: string;
};

/** Count Cases with any accepted MAF join (any store source). */
export function countAcceptedMafJoined(rows: InsightsCaseRow[]): number {
  return rows.filter((r) => Boolean(r.mafAttribution?.mafExperimentId)).length;
}

export function formatAcceptedMafUi(
  maf: InsightsCaseMafAttribution | null | undefined
): AcceptedMafUiLines {
  if (!maf?.mafExperimentId) {
    return {
      acceptedLine: "Accepted MAF · —",
      primaryDragLine: "Primary drag · —",
      present: false,
    };
  }
  const drag = maf.primaryDragComponent
    ? MAF_COMPONENT_LABELS[maf.primaryDragComponent] ?? maf.primaryDragComponent
    : "—";
  return {
    acceptedLine: `Accepted MAF · ${maf.mafExperimentId}`,
    primaryDragLine: `Primary drag · ${drag}`,
    present: true,
  };
}

export function formatHistoricalReconstructionUi(
  hist: HistoricalCaseAttribution | null | undefined,
  fallbackSummary?: string | null
): HistoricalReconstructionUiLines | null {
  if (!hist && !fallbackSummary?.trim()) return null;
  const summary =
    hist?.summary?.trim() ||
    fallbackSummary?.trim() ||
    "Insufficient reconstructed evidence.";
  const provenance =
    hist?.components
      .map((c) => `${c.component}=${c.provenance}`)
      .join(", ") || "none";
  return {
    label: "Historical Reconstruction · not accepted",
    summary,
    provenanceLine: `Provenance: ${provenance} · fabricatedT0=${String(
      hist?.fabricatedT0 ?? false
    )}`,
  };
}

/** Compact Case drill-down cell for Accepted MAF (any Case origin). */
export function formatAcceptedMafDrillCell(
  maf: InsightsCaseMafAttribution | null | undefined
): string {
  const ui = formatAcceptedMafUi(maf);
  if (!ui.present) return "Accepted MAF · —";
  const drag = maf?.primaryDragComponent
    ? MAF_COMPONENT_LABELS[maf.primaryDragComponent] ?? maf.primaryDragComponent
    : "—";
  return `${maf!.mafExperimentId} · ${drag}`;
}
