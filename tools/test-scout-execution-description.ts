/**
 * 30-16 — Authoritative execution description synchronized with structured layeredEntry.
 * Run: npm run test:scout-execution-description
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { authorizeLayeredEntry } from "../lib/layered-entry";
import { sizeLayerQuantities } from "../lib/layered-entry-risk";
import { buildPlanLevelsView } from "../lib/plan-levels-board";
import { formatPlansSnapshotSection } from "../lib/plan-snapshot";
import {
  buildScoutExecutionDescription,
  flagLayeredDescriptionWithoutLayers,
  formatScoutExecutionDescriptionLine,
} from "../lib/scout-execution-description";
import { buildPlanMapModel } from "../lib/scout-plan-map-model";
import { formatPlanMapOperationalParagraph } from "../lib/scout-plan-map-operational";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";

const thesis: StockThesis = {
  id: "ST-GOOGL-001",
  ticker: "GOOGL",
  status: "actionable",
  version: 1,
  style: "swing",
  thesis: "Layered pullback",
  historicalAnalysis: [],
  levels: { primaryZone: { low: 305, high: 315 }, targets: [380] },
  riskRules: { minimumRR: 3, invalidation: "Close below 294" },
  currentHypothesis: "Buy pullback in layers",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

function basePlan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-007",
    ticker: "GOOGL",
    stockThesisId: thesis.id,
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 310,
    stopPrice: 294,
    targetPrice: 380,
    plannedRR: 4.4,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

const EXPECTED_GOOGL =
  "Enter 2 shares at 315, 3 shares at 310, and 3 shares at 305. Use a common stop at 294 and primary target at 380. Any unfilled layer remains inactive.";

// PLAN-007 repair — structured data → exact shares → description
{
  const limits = [
    { price: 315, allocationPercent: 34, role: "starter" as const },
    { price: 310, allocationPercent: 39, role: "preferred" as const },
    { price: 305, allocationPercent: 27, role: "deep_pullback" as const },
  ];
  assert.deepEqual(
    sizeLayerQuantities(limits, 380, "common", 294, "risk_percent", 126),
    [2, 3, 3]
  );

  const layered = authorizeLayeredEntry(
    {
      executionMethod: "layered_limits",
      stopModel: "common",
      sizingMode: "risk_percent",
      authorizedRiskAmount: 126,
      commonStopPrice: 294,
      primaryTargetPrice: 380,
      limits,
    },
    { primaryTargetPrice: 380, planStopPrice: 294 }
  );
  assert.deepEqual(
    layered.limits.map((l) => l.derived?.plannedQuantity),
    [2, 3, 3]
  );

  const plan = basePlan({
    layeredEntry: layered,
    thesis: "Ignore this prose: enter 99 shares at 999",
    chatNotes: "Reasoning: use 2-3-3 hardcoded in notes — must not be the source",
  });
  const result = buildScoutExecutionDescription(plan);
  assert.equal(result.source, "layered_entry");
  assert.equal(result.description, EXPECTED_GOOGL);
  assert.equal(result.flags.length, 0);

  // Plan Map projection matches authoritative description
  const model = buildPlanMapModel(buildPlanLevelsView(thesis, plan));
  assert.equal(model.operationalParagraph, result.description);
  assert.equal(model.mode, "layered");
  assert.equal(model.layers.length, 3);
  assert.deepEqual(
    model.layers.map((l) => l.shares),
    [2, 3, 3]
  );

  // Snapshot includes the same description
  const snap = formatPlansSnapshotSection([plan]);
  assert.match(snap, /=== EXECUTION DESCRIPTION ===/);
  assert.match(snap, /description:Enter 2 shares at 315/);
  assert.match(snap, /Any unfilled layer remains inactive/);
}

// Repair Apply JSON validates
{
  const raw = JSON.parse(
    readFileSync(
      path.join(process.cwd(), "data/repair-plan-007-googl-layered.json"),
      "utf8"
    )
  );
  const parsed = parseTradingInboxPayload(raw);
  assert.ok(parsed);
  const check = validateProposalPayload(parsed!);
  assert.equal(check.ok, true, JSON.stringify(check));
  assert.equal(parsed!.type, "decision-update");
  const proposal = (parsed as { proposal: Record<string, unknown> }).proposal;
  assert.equal(proposal.planId, "PLAN-007");
  assert.ok(proposal.layeredEntry);
}

// Single-entry stays single-entry; notes do not invent layers
{
  const plan = basePlan({
    layeredEntry: undefined,
    chatNotes: "Layered 20/50/30 at 315/310/305 — do not reconstruct",
  });
  const result = buildScoutExecutionDescription(plan);
  assert.equal(result.source, "single_entry");
  assert.equal(
    result.description,
    "Enter at 310 with stop at 294 and primary target at 380."
  );
  assert.equal(
    flagLayeredDescriptionWithoutLayers(plan, true)[0]?.includes("fewer than 2"),
    true
  );
}

// Layered description rejected/flagged when only one stored layer
{
  const layered = authorizeLayeredEntry(
    {
      executionMethod: "single_limit",
      stopModel: "common",
      commonStopPrice: 294,
      primaryTargetPrice: 380,
      limits: [{ price: 310, allocationPercent: 100 }],
    },
    { primaryTargetPrice: 380, planStopPrice: 294 }
  );
  const plan = basePlan({ layeredEntry: layered });
  const result = buildScoutExecutionDescription(plan);
  assert.equal(result.source, "single_entry");
  assert.match(result.description!, /Enter at 310/);
  assert.equal(flagLayeredDescriptionWithoutLayers(plan, true).length, 1);

  // layered_limits with 1 limit is flagged
  const bad = basePlan({
    layeredEntry: {
      ...layered,
      executionMethod: "layered_limits",
      limits: [{ price: 310, allocationPercent: 100 }],
    },
  });
  const badResult = buildScoutExecutionDescription(bad);
  assert.ok(badResult.flags.some((f) => f.includes("fewer than 2")));
}

// Regenerates when shares / stop / target change
{
  const limits = [
    { price: 315, allocationPercent: 34, role: "starter" as const },
    { price: 310, allocationPercent: 39, role: "preferred" as const },
    { price: 305, allocationPercent: 27, role: "deep_pullback" as const },
  ];
  const a = authorizeLayeredEntry(
    {
      executionMethod: "layered_limits",
      stopModel: "common",
      sizingMode: "risk_percent",
      authorizedRiskAmount: 126,
      commonStopPrice: 294,
      primaryTargetPrice: 380,
      limits,
    },
    { primaryTargetPrice: 380, planStopPrice: 294 }
  );
  const b = authorizeLayeredEntry(
    {
      executionMethod: "layered_limits",
      stopModel: "common",
      sizingMode: "risk_percent",
      authorizedRiskAmount: 252,
      commonStopPrice: 294,
      primaryTargetPrice: 400,
      limits,
    },
    { primaryTargetPrice: 400, planStopPrice: 294 }
  );
  const descA = buildScoutExecutionDescription(basePlan({ layeredEntry: a })).description!;
  const descB = buildScoutExecutionDescription(
    basePlan({ layeredEntry: b, targetPrice: 400 })
  ).description!;
  assert.notEqual(descA, descB);
  assert.match(descB, /primary target at 400/);
  assert.ok(
    (b.limits[0]?.derived?.plannedQuantity ?? 0) >
      (a.limits[0]?.derived?.plannedQuantity ?? 0)
  );
}

// Missing risk → allocation % description (no invented shares)
{
  const layered = authorizeLayeredEntry(
    {
      executionMethod: "layered_limits",
      stopModel: "common",
      sizingMode: "position_percent",
      commonStopPrice: 294,
      primaryTargetPrice: 380,
      limits: [
        { price: 315, allocationPercent: 20 },
        { price: 310, allocationPercent: 50 },
        { price: 305, allocationPercent: 30 },
      ],
    },
    { primaryTargetPrice: 380, planStopPrice: 294 }
  );
  assert.equal(layered.authorizedRiskAmount, undefined);
  const desc = buildScoutExecutionDescription(basePlan({ layeredEntry: layered })).description!;
  assert.match(desc, /20% of planned position at 315/);
  assert.doesNotMatch(desc, /\d+ shares/);
  assert.match(desc, /Any unfilled layer remains inactive/);
}

// Formatter ↔ plan API stay synchronized for share wording
{
  const text = formatPlanMapOperationalParagraph({
    mode: "layered",
    allocationMeaning: "risk",
    stopModel: "common",
    commonStop: 294,
    primaryTarget: 380,
    layers: [
      { price: 315, allocationPercent: 34, shares: 2 },
      { price: 310, allocationPercent: 39, shares: 3 },
      { price: 305, allocationPercent: 27, shares: 3 },
    ],
  });
  assert.equal(text, EXPECTED_GOOGL);
  assert.match(formatScoutExecutionDescriptionLine(basePlan()), /source:single_entry/);
}

// Mechanics / UI markers
{
  const brief = readFileSync(
    path.join(process.cwd(), "lib/matrix-mechanics-brief.ts"),
    "utf8"
  );
  assert.match(brief, /AUTHORITATIVE EXECUTION PAIR/);
  assert.match(brief, /deterministic projection/);
  const snap = readFileSync(
    path.join(process.cwd(), "lib/matrix-mechanics-snapshot.ts"),
    "utf8"
  );
  assert.match(snap, /MATRIX_MECHANICS_REVISION = 36/);
  const board = readFileSync(
    path.join(process.cwd(), "app/components/planning-preview/PlanLevelsBoard.tsx"),
    "utf8"
  );
  assert.match(board, /data-scout-plan-map-operational/);
  assert.match(board, /data-scout-execution-flags/);
}

console.log("test-scout-execution-description: ok");
