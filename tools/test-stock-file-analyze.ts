import assert from "node:assert/strict";
import {
  buildStockFileAnalyzePackage,
  buildStockFileOperativePrompt,
} from "../lib/stock-file-analyze";
import type { StockThesis } from "../lib/stock-thesis-types";
import type { TradePlan } from "../lib/plan-types";
import type { MtaeTimeframeMapPreset } from "../lib/mtae-types";

const thesis = {
  id: "ST-TEST",
  ticker: "TEST",
  status: "watching",
  style: "swing",
  version: 1,
  thesis: "Test thesis",
  currentHypothesis: "Wait for zone",
  levels: {
    primaryZone: { low: 90, high: 95 },
    targets: [120],
  },
  riskRules: { minimumRR: 3, invalidation: "Weekly close below 85" },
  notes: "",
  historicalAnalysis: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as StockThesis;

const plan = {
  id: "PLAN-099",
  ticker: "TEST",
  stockThesisId: "ST-TEST",
  status: "watching",
  analysisTimeframes: ["1W", "1D"],
  entryTimeframe: "1D",
  plannedEntry: 94,
  stopPrice: 88,
  targetPrice: 118,
  plannedRR: 4,
  decision: {
    id: "DEC-1",
    verdict: "wait",
    decisionConfidence: 70,
    challenges: ["Needs volume confirmation"],
    decidedAt: "2026-01-01T00:00:00.000Z",
  },
} as TradePlan;

const presets: MtaeTimeframeMapPreset[] = [
  {
    id: "swing-6m",
    label: "Swing 6M",
    roles: {
      strategic_tf: "6M",
      opportunity_tf: "3M",
      refinement_tf: "1M",
      execution_tf: "1W",
    },
  },
];

const operative = buildStockFileOperativePrompt();
assert.match(operative, /FIVE LANES/);
assert.match(operative, /TECHNICAL \(MTAE\)/);
assert.match(operative, /DECISION/);

const pkg = buildStockFileAnalyzePackage({
  thesis,
  plans: [plan],
  mtaePresets: presets,
  activeEvidence: [],
});

assert.match(pkg, /=== TEST ANALYZE ===/);
assert.match(pkg, /MATRIX OPERATIVE PROMPT/);
assert.match(pkg, /MATRIX MECHANICS/);
assert.match(pkg, /MTAE PROTOCOL/);
assert.match(pkg, /MTAE REQUEST/);
assert.match(pkg, /stockProfileId:ST-TEST/);
assert.match(pkg, /ACTIVE SCOUT · PLAN-099/);
assert.match(pkg, /verdict:wait/);
assert.match(pkg, /technical-assessment/);
assert.match(pkg, /decision-update/);
assert.match(pkg, /=== END TEST ANALYZE ===/);
assert.ok(!pkg.includes("whalesAreBuying") || pkg.includes("FORBIDDEN") || pkg.includes("Forbidden"));

console.log("test-stock-file-analyze: ok");
