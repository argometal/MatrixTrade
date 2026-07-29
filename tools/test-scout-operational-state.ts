import assert from "node:assert/strict";
import {
  buildOperationalDecisionUpdateProposal,
  evaluateScoutOperationalState,
  parseOperationalPhraseToProposal,
} from "../lib/scout-operational-state";
import type { TradePlan } from "../lib/plan-types";

function plan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-101",
    ticker: "MSFT",
    stockThesisId: "ST-MSFT-001",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 100,
    stopPrice: 90,
    targetPrice: 140,
    plannedRR: 4,
    validUntil: "2026-08-20T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-25T00:00:00.000Z",
    decision: {
      id: "DEC-1",
      verdict: "wait",
      decisionConfidence: 70,
      challenges: ["timing"],
      decidedAt: "2026-07-25T00:00:00.000Z",
    },
    ...overrides,
  };
}

const now = "2026-07-29T00:00:00.000Z";

{
  const result = evaluateScoutOperationalState({
    plan: plan(),
    linkedTrades: [],
    reservations: [],
    now,
    minimumRR: 3,
  });
  assert.equal(result.detectedAssessment.operationalState, "unassessed");
  assert.equal(result.detectedAssessment.plannedRR, 4);
  assert.equal(result.detectedAssessment.currentExecutableRR, 4);
}

{
  const result = evaluateScoutOperationalState({
    plan: plan({ executionReadiness: "armed" }),
    linkedTrades: [],
    reservations: [],
    now,
    minimumRR: 3,
  });
  assert.equal(result.detectedAssessment.operationalState, "needs_reanalysis");
}

{
  const result = evaluateScoutOperationalState({
    plan: plan({
      executionReadiness: "armed",
      decision: {
        id: "DEC-2",
        verdict: "go",
        decisionConfidence: 81,
        challenges: ["none"],
        decidedAt: now,
      },
      layeredEntry: {
        executionMethod: "layered_limits",
        noChase: true,
        status: "planned",
        sizingMode: "risk_percent",
        stopModel: "common",
        commonStopPrice: 90,
        primaryTargetPrice: 140,
        authorizedRiskAmount: 100,
        limits: [{ price: 100, allocationPercent: 100, stopPrice: 90 }],
      },
    }),
    linkedTrades: [],
    reservations: [],
    now,
    minimumRR: 3,
  });
  assert.equal(result.detectedAssessment.operationalState, "armed");
}

{
  const result = evaluateScoutOperationalState({
    plan: plan(),
    linkedTrades: [],
    reservations: [],
    currentPrice: 100,
    now,
    minimumRR: 3,
  });
  assert.equal(result.detectedAssessment.operationalState, "in_zone");
}

{
  const result = evaluateScoutOperationalState({
    plan: plan(),
    linkedTrades: [],
    reservations: [],
    currentPrice: 103,
    atr: 4,
    now,
    minimumRR: 3,
  });
  assert.equal(result.detectedAssessment.operationalState, "approaching");
  assert.equal(result.detectedAssessment.waitHorizon, "weeks");
}

{
  const result = evaluateScoutOperationalState({
    plan: plan({ plannedRR: 3.2 }),
    linkedTrades: [],
    reservations: [],
    now,
    minimumRR: 3,
  });
  assert.equal(result.detectedAssessment.operationalState, "marginal");
}

{
  const result = evaluateScoutOperationalState({
    plan: plan(),
    linkedTrades: [],
    reservations: [],
    recentPrices: [
      { at: "2026-07-20T00:00:00.000Z", high: 101, low: 99, close: 100 },
      { at: "2026-07-21T00:00:00.000Z", high: 108, low: 106, close: 107 },
    ],
    now,
    minimumRR: 3,
  });
  assert.equal(result.detectedAssessment.operationalState, "missed");
  assert.equal(result.detectedAssessment.currentExecutableRR, null);
}

{
  const parsed = parseOperationalPhraseToProposal(plan(), "Ya pasó");
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.match(parsed.json, /"operationalState": "missed"/);
}

{
  const parsed = parseOperationalPhraseToProposal(
    plan({ executionReadiness: "approved" }),
    "Entrada automática activa"
  );
  assert.equal(parsed.ok, false);
}

{
  const json = buildOperationalDecisionUpdateProposal({
    plan: plan(),
    now,
    assessment: {
      operationalState: "approaching",
      nextAction: "monitor",
      waitHorizon: "weeks",
      freshness: "current",
      reviewRequired: false,
      reasonCodes: ["manual_override"],
    },
  });
  assert.match(json, /"type": "decision-update"/);
  assert.match(json, /"operationalAssessment"/);
}

console.log("test-scout-operational-state: ok");
