import assert from "node:assert/strict";
import type { CaseDiagnosis } from "../lib/case-diagnosis-types";
import { buildFocusCaseOption } from "../lib/focus-case-option";
import type { InsightsCaseRow } from "../lib/insights-case-spine-types";

function diagnosis(planId: string): CaseDiagnosis {
  return {
    planId,
    classification: { kind: "unclassified", value: "INDETERMINATE" },
    equationId: "EQ-FIXTURE",
    inputsUsed: [],
    missingInputs: [],
    reason: "fixture",
  };
}

function row(
  partial: Partial<InsightsCaseRow> & Pick<InsightsCaseRow, "planId" | "ticker">
): InsightsCaseRow {
  const { planId, ticker, ...rest } = partial;
  return {
    planId,
    caseId: partial.caseId ?? planId,
    ticker,
    date: "2026-09-07T00:00:00.000Z",
    playbookId: null,
    stockThesisId: null,
    caseOrigin: partial.caseOrigin ?? "modern",
    participation: "entry",
    verdict: "go",
    family: "INDETERMINATE",
    noEntryDiagnosis: null,
    equationId: "EQ-FIXTURE",
    decisionQuality: "supported",
    executionQuality: "not_applicable",
    reality: "INDETERMINATE",
    outcomeLabel: null,
    loKind: null,
    realizedR: null,
    realizedPnL: null,
    counterfactualR: null,
    t0Available: true,
    lifecycle: {
      status: partial.lifecycle?.status ?? "COMPLETE",
      summary: "fixture",
      evaluativeCompleteness: partial.lifecycle?.status ?? "COMPLETE",
      blockingLabels: [],
      requirements: [],
    },
    missingInputs: [],
    diagnosisReason: "fixture",
    evidenceSummary: "",
    caseHref: `/mxt/scout/case?plan=${planId}`,
    diagnosis: diagnosis(planId),
    ...rest,
  };
}

const watching = buildFocusCaseOption({
  row: row({ planId: "PLAN-100", ticker: "AAPL" }),
  planStatus: "watching",
});
assert.equal(watching?.label, "AAPL · PLAN-100 · COMPLETE · WATCHING");

const success = buildFocusCaseOption({
  row: row({
    planId: "PLAN-101",
    ticker: "MSFT",
    realizedPnL: 125.5,
    outcomeLabel: "executed_win",
  }),
  planStatus: "failed",
});
assert.equal(success?.label, "MSFT · PLAN-101 · COMPLETE · SUCCESS");

const failed = buildFocusCaseOption({
  row: row({
    planId: "PLAN-102",
    ticker: "TSLA",
    outcomeLabel: "missed_opportunity",
    lifecycle: {
      status: "INCOMPLETE",
      summary: "fixture",
      evaluativeCompleteness: "INCOMPLETE",
      blockingLabels: ["T0"],
      requirements: [],
    },
  }),
  planStatus: "expired",
});
assert.equal(failed?.label, "TSLA · PLAN-102 · INCOMPLETE · FAILED");
assert.doesNotMatch(failed?.label ?? "", /\bexpired\b/i);
assert.doesNotMatch(failed?.label ?? "", /—/);

const neutral = buildFocusCaseOption({
  row: row({ planId: "PLAN-103", ticker: "NVDA" }),
  planStatus: "entered",
});
assert.equal(neutral?.label, "NVDA · PLAN-103 · COMPLETE");

const historical = buildFocusCaseOption({
  row: row({
    planId: "HIST:H001",
    caseId: "H001",
    ticker: "META",
    caseOrigin: "historical_trade",
  }),
  planStatus: null,
});
assert.equal(historical, null);

console.log("test-focus-case-option: PASS");
