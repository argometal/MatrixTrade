import assert from "node:assert/strict";
import {
  buildStockFileAnalyzePackage,
  buildStockFileOperativePrompt,
  formatAnalyzeT0Section,
} from "../lib/stock-file-analyze";
import type { StockThesis } from "../lib/stock-thesis-types";
import type { TradePlan } from "../lib/plan-types";
import type { MtaeAssessment, MtaeTimeframeMapPreset } from "../lib/mtae-types";
import type { ThesisT0Freeze } from "../lib/thesis-t0-types";

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
  originalEntry: 94,
  stopPrice: 88,
  targetPrice: 118,
  plannedRR: 4,
  participationBlocker: "Price above zone",
  reviseIf: ["Close back into 90-95"],
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

const freeze = {
  id: "T0-TEST-1",
  stockThesisId: "ST-TEST",
  planIds: ["PLAN-099"],
  t0: "2026-01-01T00:00:00.000Z",
  evaluationHorizonEndsAt: "2026-04-01T00:00:00.000Z",
  evaluationHorizonDays: 90,
  evaluationHorizonOverride: false,
  status: "open" as const,
  t1: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  decision: {
    decisionId: "DEC-1",
    decidedAt: "2026-01-01T00:00:00.000Z",
    verdict: "wait" as const,
    reasoning: null,
    challenges: ["Needs volume confirmation"],
    decidedBy: null,
  },
  plan: {
    planId: "PLAN-099",
    plannedEntry: 94,
    originalEntry: 94,
    stopPrice: 88,
    targetPrice: 118,
    plannedRR: 4,
    layeredEntry: null,
    executionInstruction: null,
    validFrom: null,
    maximumEntryProxy: null,
    participationBlocker: "Price above zone",
    reviseIf: ["Close back into 90-95"],
  },
  stock: {
    stockThesisId: "ST-TEST",
    stockThesisVersion: 1,
    thesis: "Test thesis",
    currentHypothesis: "Wait for zone",
    levels: thesis.levels,
    riskRules: thesis.riskRules,
  },
  beliefFingerprint: "fp",
  confidence: "verified" as const,
} satisfies ThesisT0Freeze;

const operative = buildStockFileOperativePrompt();
assert.match(operative, /FIVE LANES/);
assert.match(operative, /SELF-CONTAINED HANDOFF/);
assert.match(operative, /FORBIDDEN responses/);

assert.match(formatAnalyzeT0Section(null, "PLAN-099"), /NO PERSISTED T0/);
assert.match(formatAnalyzeT0Section(freeze, "PLAN-099"), /t0_id:T0-TEST-1/);

const pkg = buildStockFileAnalyzePackage({
  thesis,
  plans: [plan],
  mtaePresets: presets,
  activeEvidence: [],
  thesisT0Freezes: [freeze],
});

assert.match(pkg, /=== TEST ANALYZE ===/);
assert.match(pkg, /MATRIX OPERATIVE PROMPT/);
assert.match(pkg, /MATRIX MECHANICS/);
assert.match(pkg, /MTAE PROTOCOL/);
assert.match(pkg, /MTAE REQUEST/);
assert.match(pkg, /stockProfileId:ST-TEST/);
assert.match(pkg, /attach_exactly:6M \+ 3M \+ 1M \+ 1W/);
assert.match(pkg, /ACTIVE SCOUT · PLAN-099/);
assert.match(pkg, /verdict:wait/);
assert.match(pkg, /technical-assessment/);
assert.match(pkg, /decision-update/);
assert.match(pkg, /SCOPED APPLY CONTRACT/);
assert.match(pkg, /t0_id:T0-TEST-1/);
assert.match(pkg, /active_plans:1/);
assert.match(pkg, /participationBlocker:Price above zone/);
assert.match(pkg, /=== LATEST ACCEPTED MTAE ===/);
assert.match(pkg, /Not assessed/i);
assert.ok(!pkg.includes("active_scouts:0"));
assert.match(pkg, /=== END TEST ANALYZE ===/);

const pkgNoT0 = buildStockFileAnalyzePackage({
  thesis,
  plans: [plan],
  mtaePresets: presets,
  activeEvidence: [],
  thesisT0Freezes: [],
});
assert.match(pkgNoT0, /NO PERSISTED T0/);

const mtae = {
  id: "MTAE-1",
  stockProfileId: "ST-TEST",
  ticker: "TEST",
  timeframeMapId: "swing-6m",
  timeframeRoles: presets[0].roles,
  perTimeframe: [
    {
      timeframe: "6M",
      trend: "bullish",
      trendConfidence: 70,
      structure: {},
      supports: [
        {
          rank: 1,
          price: 90,
          reason: "shelf",
          confidence: 70,
          provenance: {
            sourceKind: "volume_profile",
            purpose: "structural",
            analysisRange: "2025-09-01→2026-03-01",
            timeframe: "6M",
          },
        },
      ],
      resistances: [],
      battleZones: [],
      structuralInvalidation: "close below 85",
      contradictions: [],
      summary: "uptrend",
      participation: {
        volumeBehavior: {
          state: "expanding",
          directionalBias: "buying",
          priceVolumeRelationship: "confirming",
          relativeVolume: "high",
          interpretation: "advances on volume",
          confidence: 72,
        },
      },
    },
  ],
  integrated: {
    structureSpine: "bullish",
    opportunityNote: "pullback",
    battleZoneRanking: [],
    executionContext: "1W",
    contradictions: [],
    participationSynthesis: {
      dominantCondition: "accumulation",
      buyingEvidence: ["expanding volume"],
      sellingEvidence: [],
      unresolvedSignals: [],
      confidence: 70,
    },
  },
  technicalSummary: {
    trend: "bullish",
    structureNote: "channel",
    structuralInvalidation: "close below 85",
    contradictions: [],
    confidence: 70,
  },
  createdAt: "2026-01-02T00:00:00.000Z",
} as MtaeAssessment;

const pkgMtae = buildStockFileAnalyzePackage({
  thesis,
  plans: [plan],
  mtaePresets: presets,
  activeEvidence: [],
  thesisT0Freezes: [freeze],
  latestMtaeAssessment: mtae,
});
assert.match(pkgMtae, /MTAE · TEST · MTAE-1/);
assert.match(pkgMtae, /volumeBehavior/);
assert.match(pkgMtae, /Participation Synthesis/);
assert.match(pkgMtae, /vp:structural@2025-09-01/);

console.log("test-stock-file-analyze: ok");
