/**
 * MXT 017-P14B-01 — evidence pack for AI to propose Apply type `attribution`
 * on historical / planless closed trades.
 *
 * Does NOT create MafExperiment. Does NOT auto-Accept.
 * P13 historicalAttribution is reconstructed evidence/hints — not accepted MAF.
 */

import {
  buildHistoricalCaseAttribution,
  isHistoricalTradeCandidate,
  type HistoricalCaseAttribution,
} from "./historical-case-attribution";
import { buildMafProtocolBrief } from "./maf-brief";
import type { ObservationRecord } from "./observation-types";
import type { Trade } from "./types";

export type HistoricalAttributionEvidenceInput = {
  trade: Trade;
  observation?: ObservationRecord | null;
  reconstructionNote?: string | null;
  stockThesisReconstructed?: boolean;
};

/**
 * Format legitimate historical evidence for an external AI to propose
 * `type: attribution` with tradeId (Plan optional / absent).
 */
export function formatHistoricalAttributionEvidenceBrief(
  input: HistoricalAttributionEvidenceInput
): string {
  const { trade } = input;
  const hist = buildHistoricalCaseAttribution({
    trade,
    reconstructionNote: input.reconstructionNote,
    stockThesisReconstructed: input.stockThesisReconstructed,
  });
  const obs = input.observation ?? null;

  const lines: string[] = [
    "=== HISTORICAL ATTRIBUTION EVIDENCE ===",
    "Purpose: supply verified/reconstructed facts so AI can propose Apply type attribution.",
    "This pack is NOT accepted MAF. trade-review ≠ MAF attribution.",
    "P13 historicalAttribution below is reconstructed evidence/hints — never treat as MafExperiment.",
    "Do NOT fabricate T0, Plan, Scout, prices, dates, or links.",
    "Classify only what evidence supports; else inconclusive or not_applicable.",
    "Human Accept via Control → Apply (type attribution) persists MafExperiment.",
    "",
    "=== IDENTITY ===",
    `tradeId:${trade.id}`,
    `ticker:${trade.ticker}`,
    `status:${trade.status}`,
    `historical_candidate:${isHistoricalTradeCandidate(trade) ? "yes" : "no"}`,
    `planId:${trade.planId ?? "none"}`,
    `planHistoricallyAbsent:${trade.planHistoricallyAbsent === true ? "yes" : "no"}`,
    `playbookId:${trade.playbookId ?? "none"}`,
    `playbookHistoricallyAbsent:${trade.playbookHistoricallyAbsent === true ? "yes" : "no"}`,
    `t0:${hist.t0Status}`,
    `fabricatedT0:${hist.fabricatedT0}`,
    `preMxt:${hist.preMxt ? "yes" : "no"}`,
    `datesReconstructed:${trade.datesReconstructed === true ? "yes" : "no"}`,
    "",
    "=== EXECUTION (do not invent) ===",
    `entry:${trade.entry}`,
    `stop:${trade.stop}`,
    `target:${trade.target ?? "na"}`,
    `exit:${trade.exit ?? "na"}`,
    `shares:${trade.shares}`,
    `direction:${trade.direction ?? "long"}`,
    trade.closedAt ? `closedAt:${trade.closedAt}` : null,
    trade.riskRewardActual != null
      ? `riskRewardActual:${trade.riskRewardActual}`
      : null,
    "",
    "=== REVIEW (human journal — not MAF) ===",
  ].filter((line): line is string => line !== null);

  if (trade.reviewedAt) {
    lines.push(
      `reviewedAt:${trade.reviewedAt}`,
      `qualityEntry:${trade.qualityEntry ?? "na"}`,
      `qualityExit:${trade.qualityExit ?? "na"}`,
      `qualityMgmt:${trade.qualityMgmt ?? "na"}`,
      `mistakes:${(trade.mistakes ?? []).join(",") || "none"}`
    );
    if (trade.lesson?.trim()) lines.push(`lesson:${trade.lesson.trim()}`);
    if (trade.actionItem?.trim()) {
      lines.push(`actionItem:${trade.actionItem.trim()}`);
    }
  } else {
    lines.push("review:pending");
  }

  lines.push("", "=== OBSERVATION ===");
  if (obs) {
    lines.push(
      `observationId:${obs.id}`,
      `status:${obs.status}`,
      `targetReached:${obs.targetReached ?? "na"}`,
      `thesisInvalidated:${obs.thesisInvalidated ?? "na"}`,
      `mfe:${obs.mfe ?? "na"}`,
      `mae:${obs.mae ?? "na"}`,
      `mfeMaeUnit:${obs.mfeMaeUnit ?? "na"}`,
      `firstTerminalEvent:${obs.firstTerminalEvent ?? "na"}`,
      "note: Observation numbers above are store facts — never invent additional prices."
    );
  } else {
    lines.push(
      "observation:none",
      "note: No ObservationRecord — do not invent MFE/MAE/timestamps in proposal.observation."
    );
  }

  lines.push(
    "",
    "=== EVIDENCE WITH PROVENANCE (P13) ===",
    ...hist.evidence.map((e) => {
      const note = e.note ? ` · ${e.note}` : "";
      return `- ${e.key}=${e.value} [${e.provenance}]${note}`;
    }),
    "",
    "=== UNSUPPORTED WITHOUT EXTRA EVIDENCE ===",
    ...hist.unsupportedConclusions.map((u) => `- ${u}`),
    "",
    "=== RECONSTRUCTED COMPONENT HINTS (NOT accepted MAF) ==="
  );
  if (hist.components.length === 0) {
    lines.push("(none — insufficient review evidence)");
  } else {
    for (const c of hist.components) {
      lines.push(
        `- ${c.component}:${c.band} [${c.provenance}] refs=${c.evidenceRefs.join(",")} · ${c.reasoning}`
      );
    }
  }
  lines.push(
    `summary_hint:${hist.summary}`,
    `confidence_note:${hist.confidenceNote}`,
    "",
    "=== APPLY CONTRACT ===",
    "Return ONE JSON block only when human requests Apply Mode:",
    '{ "type": "attribution", "proposal": { "tradeId": "<this tradeId>", "components": [...], optional primaryDragComponent, summary, observation{} } }',
    "Plan/planId is optional — historical trades may attribute by tradeId alone.",
    "Do not invent planId. Do not invent observation numbers not listed above.",
    "MAF component/classification schema is inside Control → MTA Mechanics (already embedded below).",
    "",
    "=== MAF PROTOCOL (embedded) ===",
    buildMafProtocolBrief()
  );

  return lines.join("\n");
}

/** Snapshot menu label for a historical trade attribution evidence pack. */
export function historicalAttributionEvidenceLabel(trade: Trade): string {
  return `${trade.ticker} · ${trade.id} historical attribution evidence`;
}

export function buildHistoricalAttributionForEvidence(
  input: HistoricalAttributionEvidenceInput
): HistoricalCaseAttribution {
  return buildHistoricalCaseAttribution({
    trade: input.trade,
    reconstructionNote: input.reconstructionNote,
    stockThesisReconstructed: input.stockThesisReconstructed,
  });
}
