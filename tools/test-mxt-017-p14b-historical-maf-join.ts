/**
 * MXT 017-P14B-03 — historical Case ← MAF join by tradeId only.
 * Run: npx tsx tools/test-mxt-017-p14b-historical-maf-join.ts
 */
import assert from "node:assert/strict";
import {
  attachMafToInsightsCaseRows,
  resolveMafForCase,
} from "../lib/insights-maf-join";
import type { InsightsCaseRow } from "../lib/insights-case-spine-types";
import type { MafExperiment } from "../lib/maf-types";
import { buildHistoricalCaseAttribution } from "../lib/historical-case-attribution";
import type { Trade } from "../lib/types";

function histRowH001(
  overrides: Partial<InsightsCaseRow> = {}
): InsightsCaseRow {
  const trade: Trade = {
    id: "H001",
    ticker: "AMZN",
    status: "closed",
    entry: 240,
    stop: 230,
    target: 270,
    exit: 225.9,
    shares: 8,
    planHistoricallyAbsent: true,
    reviewedAt: "2026-07-03T00:00:00.000Z",
    qualityEntry: 2,
    mistakes: ["fomo", "chased"],
    createdAt: "2025-11-01T00:00:00.000Z",
    closedAt: "2025-11-05T00:00:00.000Z",
  };
  const hist = buildHistoricalCaseAttribution({ trade });
  const diagnosis = {
    planId: "HIST:H001",
    classification: { kind: "unclassified" as const, value: "INDETERMINATE" as const },
    equationId: "HIST-ATTRIBUTION",
    inputsUsed: [],
    missingInputs: ["t0_freeze"],
    reason: hist.summary,
  };
  return {
    planId: "HIST:H001",
    caseId: "H001",
    ticker: "AMZN",
    date: "2025-11-05T00:00:00.000Z",
    playbookId: null,
    stockThesisId: null,
    caseOrigin: "historical_trade",
    participation: "entry",
    verdict: null,
    family: "INDETERMINATE",
    noEntryDiagnosis: null,
    equationId: "HIST-ATTRIBUTION",
    decisionQuality: "INDETERMINATE",
    executionQuality: "INDETERMINATE",
    reality: "INDETERMINATE",
    outcomeLabel: "executed_loss",
    loKind: null,
    realizedR: -1.41,
    realizedPnL: null,
    counterfactualR: null,
    t0Available: false,
    missingInputs: ["t0_freeze"],
    diagnosisReason: hist.summary,
    evidenceSummary: "",
    caseHref: "/mxt/trades/H001",
    diagnosis,
    linkage: {
      tradeId: "H001",
      planThesis: "UNLINKED",
      planPlaybook: "UNLINKED",
      tradePlan: "UNLINKED",
    },
    historicalAttribution: hist,
    mafAttribution: null,
    ...overrides,
  };
}

function modernPlanRow(): InsightsCaseRow {
  return {
    planId: "PLAN-B1",
    caseId: "PLAN-B1",
    ticker: "AAA",
    date: "2026-01-01T00:00:00.000Z",
    playbookId: "PB-1",
    stockThesisId: null,
    caseOrigin: "modern",
    participation: "no_entry",
    verdict: "wait",
    family: "B",
    noEntryDiagnosis: "INDETERMINATE",
    equationId: "EQ-016A-NE-MISSING-T0",
    decisionQuality: "INDETERMINATE",
    executionQuality: "INDETERMINATE",
    reality: "INDETERMINATE",
    outcomeLabel: null,
    loKind: null,
    realizedR: null,
    realizedPnL: null,
    counterfactualR: null,
    t0Available: false,
    missingInputs: ["t0_freeze"],
    diagnosisReason: "test",
    evidenceSummary: "",
    caseHref: "/mxt/scout/case?plan=PLAN-B1",
    diagnosis: {
      planId: "PLAN-B1",
      classification: { kind: "no_entry", value: "INDETERMINATE" },
      equationId: "EQ-016A-NE-MISSING-T0",
      inputsUsed: [],
      missingInputs: ["t0_freeze"],
      reason: "test",
    },
    linkage: {
      tradeId: null,
      planThesis: "UNLINKED",
      planPlaybook: "linked",
      tradePlan: "UNLINKED",
    },
  };
}

function mafForH001(): MafExperiment {
  return {
    id: "MAF-AMZN-001",
    tradeId: "H001",
    ticker: "AMZN",
    status: "concluded",
    humanApproved: true,
    evidence: { fillStatus: "filled", sources: { trade: true } },
    attributions: [
      {
        component: "entry_quality",
        classification: "failure",
        aiInterpretationConfidence: 75,
        reasoning: "qualityEntry low + chased",
      },
    ],
    primaryDragComponent: "entry_quality",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    source: "attribution",
  };
}

function main() {
  const hist = histRowH001();
  const maf = mafForH001();

  // Positive: tradeId-only MAF joins HIST:H001 via linkage.tradeId
  const joined = attachMafToInsightsCaseRows([hist], [maf]);
  assert.equal(joined[0]!.planId, "HIST:H001");
  assert.equal(joined[0]!.mafAttribution?.mafExperimentId, "MAF-AMZN-001");
  assert.equal(joined[0]!.mafAttribution?.primaryDragComponent, "entry_quality");
  assert.equal(joined[0]!.family, "INDETERMINATE");
  assert.equal(joined[0]!.equationId, "HIST-ATTRIBUTION");
  assert.ok(joined[0]!.historicalAttribution);
  assert.notEqual(
    joined[0]!.historicalAttribution?.components.length,
    0,
    "P13 evidence remains present alongside accepted MAF"
  );

  // Direct resolve with HIST planId + tradeId
  const direct = resolveMafForCase({
    planId: "HIST:H001",
    tradeId: "H001",
    experiments: [maf],
  });
  assert.equal(direct?.mafExperimentId, "MAF-AMZN-001");

  // Negative: no MAF → no fabrication; P13 may remain
  const alone = attachMafToInsightsCaseRows([hist], []);
  assert.equal(alone[0]!.mafAttribution, null);
  assert.ok(alone[0]!.historicalAttribution);

  // No ticker-based match
  const otherTickerMaf: MafExperiment = {
    ...maf,
    id: "MAF-AMZN-999",
    tradeId: "H002",
  };
  const noTicker = attachMafToInsightsCaseRows([hist], [otherTickerMaf]);
  assert.equal(noTicker[0]!.mafAttribution, null);

  // No cross-link H001 ↔ H002
  const h002 = histRowH001({
    planId: "HIST:H002",
    caseId: "H002",
    linkage: {
      tradeId: "H002",
      planThesis: "UNLINKED",
      planPlaybook: "UNLINKED",
      tradePlan: "UNLINKED",
    },
  });
  const cross = attachMafToInsightsCaseRows([hist, h002], [maf]);
  assert.equal(cross[0]!.mafAttribution?.mafExperimentId, "MAF-AMZN-001");
  assert.equal(cross[1]!.mafAttribution, null);

  // Modern Plan Case still joins plan-only MAF
  const modern = modernPlanRow();
  const planMaf: MafExperiment = {
    id: "MAF-1",
    planId: "PLAN-B1",
    ticker: "AAA",
    status: "attributed",
    evidence: { fillStatus: "unknown", sources: {} },
    attributions: [],
    primaryDragComponent: "thesis_quality",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const modernJoined = attachMafToInsightsCaseRows([modern], [planMaf]);
  assert.equal(modernJoined[0]!.mafAttribution?.mafExperimentId, "MAF-1");
  assert.equal(modernJoined[0]!.family, "B");
  assert.equal(modernJoined[0]!.noEntryDiagnosis, "INDETERMINATE");

  // Modern loTradeByPlan path still supplies tradeId when map present
  const map = new Map([
    ["PLAN-B1", { learningOutcomeId: null, tradeId: "T-MODERN" }],
  ]);
  const tradeLinkedMaf: MafExperiment = {
    ...planMaf,
    id: "MAF-T-1",
    planId: undefined,
    tradeId: "T-MODERN",
    primaryDragComponent: "stop_quality",
  };
  const viaMap = attachMafToInsightsCaseRows([modern], [tradeLinkedMaf], map);
  assert.equal(viaMap[0]!.mafAttribution?.mafExperimentId, "MAF-T-1");
  assert.equal(viaMap[0]!.mafAttribution?.primaryDragComponent, "stop_quality");

  console.log("test-mxt-017-p14b-historical-maf-join: PASS");
}

main();
