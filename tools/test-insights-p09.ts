/**
 * MXT 016-P09 — human labels, playbook aggregation, MAF join gating.
 * Run: npx tsx tools/test-insights-p09.ts
 */
import assert from "node:assert/strict";
import {
  CASE_FAMILY_LABEL,
  NO_ENTRY_DIAGNOSIS_LABEL,
  caseFamilyLabel,
  noEntryDiagnosisLabel,
} from "../lib/insights-case-labels";
import { aggregatePlaybookDiagnosis } from "../lib/insights-playbook-diagnosis";
import {
  attachMafToInsightsCaseRows,
  resolveMafForCase,
} from "../lib/insights-maf-join";
import { buildInsightsCaseSpineView } from "../lib/insights-case-spine-view";
import type { InsightsCaseRow } from "../lib/insights-case-spine-types";
import type { CaseDiagnosis } from "../lib/case-diagnosis-types";
import type { MafExperiment } from "../lib/maf-types";
import { EQ } from "../lib/case-diagnosis";

function stubDiagnosis(
  overrides: Partial<CaseDiagnosis> &
    Pick<CaseDiagnosis, "classification" | "equationId">
): CaseDiagnosis {
  return {
    planId: "PLAN-X",
    classification: overrides.classification,
    equationId: overrides.equationId,
    reason: overrides.reason ?? "test",
    missingInputs: overrides.missingInputs ?? [],
    inputsUsed: overrides.inputsUsed ?? [],
  };
}

function stubRow(
  overrides: Partial<InsightsCaseRow> &
    Pick<InsightsCaseRow, "planId" | "family" | "diagnosis">
): InsightsCaseRow {
  return {
    planId: overrides.planId,
    caseId: overrides.planId,
    ticker: overrides.ticker ?? "AAA",
    date: overrides.date ?? "2026-01-01T00:00:00.000Z",
    playbookId: overrides.playbookId ?? "PB-1",
    stockThesisId: null,
    participation: overrides.participation ?? "no_entry",
    verdict: overrides.verdict ?? "wait",
    family: overrides.family,
    noEntryDiagnosis: overrides.noEntryDiagnosis ?? null,
    equationId: overrides.diagnosis.equationId,
    decisionQuality: overrides.decisionQuality ?? "INDETERMINATE",
    executionQuality: overrides.executionQuality ?? "INDETERMINATE",
    reality: overrides.reality ?? "INDETERMINATE",
    outcomeLabel: null,
    loKind: null,
    realizedR: null,
    realizedPnL: null,
    counterfactualR: null,
    t0Available: overrides.t0Available ?? false,
    missingInputs: overrides.missingInputs ?? ["t0"],
    diagnosisReason: overrides.diagnosis.reason,
    evidenceSummary: "",
    caseHref: `/mxt/scout/case?plan=${overrides.planId}`,
    diagnosis: overrides.diagnosis,
    mafAttribution: overrides.mafAttribution,
  };
}

function run() {
  // --- Human labels ---
  assert.equal(caseFamilyLabel("A"), "A · Good Entry / Profit");
  assert.equal(caseFamilyLabel("B"), "B · No Entry");
  assert.equal(caseFamilyLabel("C"), "C · Good Entry / Loss");
  assert.equal(caseFamilyLabel("D"), "D · Decision / Execution Failure");
  assert.equal(caseFamilyLabel("INDETERMINATE"), "? · Insufficient Evidence");
  assert.equal(noEntryDiagnosisLabel("GOOD_FILTER"), "Good Filter");
  assert.equal(
    noEntryDiagnosisLabel("OVER_OPTIMIZATION"),
    "Possible Over-Optimization"
  );
  assert.equal(noEntryDiagnosisLabel("INDETERMINATE"), "Insufficient Evidence");

  const dxB = stubDiagnosis({
    classification: { kind: "no_entry", value: "INDETERMINATE" },
    equationId: EQ.NE_INDETERMINATE,
  });
  const rowB = stubRow({
    planId: "PLAN-B1",
    family: "B",
    noEntryDiagnosis: "INDETERMINATE",
    diagnosis: dxB,
    playbookId: "PB-1",
  });
  const view = buildInsightsCaseSpineView([rowB]);
  assert.equal(view.cards.familyB.label, CASE_FAMILY_LABEL.B);
  assert.equal(
    view.cards.noEntryIndeterminate.label,
    NO_ENTRY_DIAGNOSIS_LABEL.INDETERMINATE
  );

  // Filters still use enums
  const filtered = buildInsightsCaseSpineView([rowB], {
    caseFamily: "B",
    noEntryDiagnosis: "INDETERMINATE",
  });
  assert.equal(filtered.rows.length, 1);

  // --- Playbook aggregation ---
  const rowA = stubRow({
    planId: "PLAN-A1",
    family: "A",
    participation: "entry",
    verdict: "go",
    playbookId: "PB-1",
    diagnosis: stubDiagnosis({
      classification: { kind: "entry_family", value: "A" },
      equationId: EQ.ENT_A,
    }),
    t0Available: true,
    missingInputs: [],
  });
  const pb = aggregatePlaybookDiagnosis([rowB, rowA], { "PB-1": "Breakout" });
  assert.equal(pb.length, 1);
  assert.equal(pb[0]!.playbookName, "Breakout");
  assert.equal(pb[0]!.cases, 2);
  assert.equal(pb[0]!.familyA, 1);
  assert.equal(pb[0]!.familyB, 1);
  assert.equal(pb[0]!.evaluableCases, 1); // only A is evaluable

  // --- MAF join / gating ---
  const maf: MafExperiment = {
    id: "MAF-1",
    planId: "PLAN-B1",
    ticker: "AAA",
    status: "attributed",
    evidence: {
      fillStatus: "unknown",
      sources: {},
    },
    attributions: [],
    primaryDragComponent: "thesis_quality",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const joined = resolveMafForCase({
    planId: "PLAN-B1",
    experiments: [maf],
  });
  assert.ok(joined);
  assert.equal(joined!.source, "local_json");
  assert.equal(joined!.primaryDragComponent, "thesis_quality");

  const withMaf = attachMafToInsightsCaseRows([rowB], [maf]);
  assert.equal(withMaf[0]!.family, "B");
  assert.equal(withMaf[0]!.mafAttribution?.mafExperimentId, "MAF-1");
  // MAF must not rewrite classification
  assert.equal(withMaf[0]!.noEntryDiagnosis, "INDETERMINATE");

  const orphan = resolveMafForCase({
    planId: "PLAN-UNKNOWN",
    experiments: [maf],
  });
  assert.equal(orphan, null);

  console.log("PASS tools/test-insights-p09.ts");
}

run();
