/**
 * MXT 017-P14B-05 — Accepted MAF vs Historical Reconstruction UI strings.
 * Run: npx tsx tools/test-mxt-017-p14b-accepted-maf-ui.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  countAcceptedMafJoined,
  formatAcceptedMafDrillCell,
  formatAcceptedMafUi,
  formatHistoricalReconstructionUi,
} from "../lib/insights-maf-ui";
import { attachMafToInsightsCaseRows } from "../lib/insights-maf-join";
import { buildHistoricalCaseAttribution } from "../lib/historical-case-attribution";
import type { InsightsCaseRow } from "../lib/insights-case-spine-types";
import type { MafExperiment } from "../lib/maf-types";
import type { Trade } from "../lib/types";

function histRow(withMaf: boolean): InsightsCaseRow {
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
  const base: InsightsCaseRow = {
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
    diagnosis: {
      planId: "HIST:H001",
      classification: { kind: "unclassified", value: "INDETERMINATE" },
      equationId: "HIST-ATTRIBUTION",
      inputsUsed: [],
      missingInputs: ["t0_freeze"],
      reason: hist.summary,
    },
    linkage: {
      tradeId: "H001",
      planThesis: "UNLINKED",
      planPlaybook: "UNLINKED",
      tradePlan: "UNLINKED",
    },
    historicalAttribution: hist,
    mafAttribution: null,
  };
  if (!withMaf) return base;
  const maf: MafExperiment = {
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
        reasoning: "x",
      },
    ],
    primaryDragComponent: "entry_quality",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    source: "attribution",
  };
  return attachMafToInsightsCaseRows([base], [maf])[0]!;
}

function main() {
  // Positive
  const pos = histRow(true);
  const accepted = formatAcceptedMafUi(pos.mafAttribution);
  assert.equal(accepted.present, true);
  assert.equal(accepted.acceptedLine, "Accepted MAF · MAF-AMZN-001");
  assert.equal(accepted.primaryDragLine, "Primary drag · Entry quality");
  assert.ok(
    formatAcceptedMafDrillCell(pos.mafAttribution).includes("MAF-AMZN-001")
  );
  assert.ok(
    formatAcceptedMafDrillCell(pos.mafAttribution).includes("Entry quality")
  );

  const recon = formatHistoricalReconstructionUi(
    pos.historicalAttribution,
    pos.diagnosisReason
  );
  assert.ok(recon);
  assert.equal(recon!.label, "Historical Reconstruction · not accepted");
  assert.ok(!/MAF/i.test(recon!.label));
  assert.ok(recon!.provenanceLine.includes("reconstructed"));

  // Negative — no promotion
  const neg = histRow(false);
  const absent = formatAcceptedMafUi(neg.mafAttribution);
  assert.equal(absent.present, false);
  assert.equal(absent.acceptedLine, "Accepted MAF · —");
  assert.equal(absent.primaryDragLine, "Primary drag · —");
  assert.equal(formatAcceptedMafDrillCell(null), "Accepted MAF · —");
  const reconNeg = formatHistoricalReconstructionUi(neg.historicalAttribution);
  assert.ok(reconNeg);
  assert.equal(reconNeg!.label, "Historical Reconstruction · not accepted");

  // Counter: any source, not only local_json
  const supabaseJoined: InsightsCaseRow = {
    ...pos,
    mafAttribution: {
      mafExperimentId: "MAF-X",
      primaryDragComponent: "stop_quality",
      source: "supabase",
    },
  };
  assert.equal(countAcceptedMafJoined([pos, neg, supabaseJoined]), 2);

  // Copy regression in product files
  const uiSrc = readFileSync(
    join(
      process.cwd(),
      "app/components/insights-preview/PreviewPipelinePerformance.tsx"
    ),
    "utf8"
  );
  assert.ok(!uiSrc.includes("review / MAF is reconstructed"));
  assert.ok(!uiSrc.includes("MAF is reconstructed"));
  assert.ok(uiSrc.includes("Accepted MAF"));
  assert.ok(uiSrc.includes("Reconstruction · not accepted"));
  assert.ok(uiSrc.includes("countAcceptedMafJoined"));
  assert.ok(uiSrc.includes("formatHistoricalReconstructionUi"));
  assert.ok(uiSrc.includes("formatAcceptedMafUi"));

  const uiLib = readFileSync(
    join(process.cwd(), "lib/insights-maf-ui.ts"),
    "utf8"
  );
  assert.ok(uiLib.includes("Historical Reconstruction · not accepted"));
  assert.ok(!uiLib.includes("MAF is reconstructed"));

  const help = readFileSync(
    join(process.cwd(), "lib/page-help.ts"),
    "utf8"
  );
  assert.ok(!help.includes("reconstructed review/MAF"));
  assert.ok(help.includes("Historical Reconstruction"));

  console.log("test-mxt-017-p14b-accepted-maf-ui: PASS");
}

main();
