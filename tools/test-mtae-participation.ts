/**
 * Smoke: MTAE Participation Phase A validate.
 * Run: npx tsx tools/test-mtae-participation.ts
 */
import assert from "node:assert/strict";
import { AI_BLOCK_SAMPLES } from "../lib/ai-block";
import {
  validateTechnicalAssessmentProposal,
  validateTechnicalCalibrationProposal,
} from "../lib/mtae-validate";

const sample = AI_BLOCK_SAMPLES["technical-assessment"] as {
  proposal: Record<string, unknown>;
};
const ok = validateTechnicalAssessmentProposal(sample.proposal);
assert.equal(ok.ok, true, ok.ok ? "" : (ok as { errors: string[] }).errors.join("; "));
if (ok.ok) {
  const tf0 = ok.value.perTimeframe[0];
  assert.ok(tf0.participation?.volumeBehavior);
  assert.equal(tf0.participation?.movementCharacter?.primary, "orderly_correction");
  assert.equal(
    tf0.participation?.largeParticipantFootprint?.signal,
    "possible_accumulation"
  );
  assert.equal(ok.value.integrated.participationSynthesis?.dominantCondition, "correction");

assert.equal(ok.value.integrated.momentumAssessment?.expansionPotential, "moderate");
assert.equal(ok.value.integrated.momentumAssessment?.scoutImplication, "require_better_entry");
assert.equal(ok.value.perTimeframe[0].participation?.movementCharacter?.state, "contracting");

}

const legacy = validateTechnicalAssessmentProposal({
  stockProfileId: "ST-X-001",
  ticker: "X",
  timeframeRoles: {
    strategic_tf: "6M",
    opportunity_tf: "3M",
    refinement_tf: "1M",
    execution_tf: "1W",
  },
  perTimeframe: [
    {
      timeframe: "6M",
      trend: "bullish",
      trendConfidence: 60,
      structure: {},
      supports: [{ rank: 1, price: 10, reason: "shelf", confidence: 60 }],
      resistances: [{ rank: 1, price: 20, reason: "high", confidence: 55 }],
      battleZones: [
        {
          id: "bz1",
          low: 11,
          high: 12,
          reachProbability: "medium",
          asymmetryQuality: "good",
          technicalImportance: 50,
          reason: "fight",
        },
      ],
      structuralInvalidation: "Close below 9",
      contradictions: [],
      summary: "Legacy geometry-only TF still valid.",
    },
  ],
  integrated: {
    structureSpine: "up",
    opportunityNote: "zone",
    executionContext: "wait",
    battleZoneRanking: [],
    contradictions: [],
  },
  technicalSummary: {
    trend: "bullish",
    structureNote: "ok",
    structuralInvalidation: "Close below 9",
    contradictions: [],
    confidence: 55,
  },
});
assert.equal(legacy.ok, true, legacy.ok ? "" : legacy.errors.join("; "));
if (legacy.ok) {
  assert.equal(legacy.value.integrated.momentumAssessment, undefined);
}

const banned = validateTechnicalAssessmentProposal({
  ...sample.proposal,
  technicalSummary: {
    ...(sample.proposal.technicalSummary as Record<string, unknown>),
    whalesAreBuying: true,
  },
});
assert.equal(banned.ok, false);

const overclaim = validateTechnicalCalibrationProposal({
  assessmentId: "MTAE-X-001",
  stockProfileId: "ST-X-001",
  ticker: "X",
  errorType: "participant_footprint_overclaim",
  fieldPath: "participation.largeParticipantFootprint",
  aiValue: "possible_accumulation",
  humanValue: "indeterminate",
  reason: "Insufficient repeated defense",
});
assert.equal(overclaim.ok, true);

const footprintBan = validateTechnicalAssessmentProposal({
  stockProfileId: "ST-X-001",
  ticker: "X",
  timeframeRoles: {
    strategic_tf: "6M",
    opportunity_tf: "3M",
    refinement_tf: "1M",
    execution_tf: "1W",
  },
  perTimeframe: [
    {
      timeframe: "6M",
      trend: "bullish",
      trendConfidence: 60,
      structure: {},
      supports: [{ rank: 1, price: 10, reason: "shelf", confidence: 60 }],
      resistances: [{ rank: 1, price: 20, reason: "high", confidence: 55 }],
      battleZones: [
        {
          id: "bz1",
          low: 11,
          high: 12,
          reachProbability: "medium",
          asymmetryQuality: "good",
          technicalImportance: 50,
          reason: "fight",
        },
      ],
      structuralInvalidation: "Close below 9",
      contradictions: [],
      summary: "test",
      participation: {
        largeParticipantFootprint: {
          signal: "possible_accumulation",
          evidence: ["high volume"],
          confidence: 50,
          whalesAreBuying: true,
        },
      },
    },
  ],
  integrated: {
    structureSpine: "up",
    opportunityNote: "zone",
    executionContext: "wait",
    battleZoneRanking: [],
    contradictions: [],
  },
  technicalSummary: {
    trend: "bullish",
    structureNote: "ok",
    structuralInvalidation: "Close below 9",
    contradictions: [],
    confidence: 55,
  },
});
assert.equal(footprintBan.ok, false);


const expansionOnly = validateTechnicalAssessmentProposal({
  stockProfileId: "ST-PG-001",
  ticker: "PG",
  asOfPrice: 149,
  timeframeRoles: {
    strategic_tf: "6M",
    opportunity_tf: "3M",
    refinement_tf: "1M",
    execution_tf: "1W",
  },
  perTimeframe: [
    {
      timeframe: "1W",
      trend: "neutral",
      trendConfidence: 55,
      structure: { range: true },
      supports: [{ rank: 1, price: 140, reason: "shelf", confidence: 60 }],
      resistances: [{ rank: 1, price: 160, reason: "supply", confidence: 58 }],
      battleZones: [
        {
          id: "bz-pg-1",
          low: 140,
          high: 145,
          reachProbability: "medium",
          asymmetryQuality: "good",
          technicalImportance: 70,
          reason: "Support band",
        },
      ],
      structuralInvalidation: "Weekly close below 125",
      contradictions: [],
      summary: "Range rotation with limited expansion; structure not invalidated.",
      participation: {
        movementCharacter: {
          state: "stagnant",
          directionalEfficiency: "low",
          rangeProgression: "stable",
          evidence: [
            "substantial weekly candle overlap",
            "limited directional follow-through",
            "time spent without meaningful price progress",
          ],
          confidence: 70,
        },
      },
    },
  ],
  integrated: {
    structureSpine: "Higher-TF structure broadly valid; major supports ~125 and 140–145",
    opportunityNote: "Targets ~160 / 170 / 180 remain technical references only",
    executionContext: "Do not chase; wait for optimized asymmetry if capital is considered",
    battleZoneRanking: [],
    contradictions: [],
    momentumAssessment: {
      expansionPotential: "low",
      currentState: "range_rotation",
      capitalEfficiencyConcern: true,
      rationale: [
        "Weekly overlap and limited expansion near 149",
        "Structure valid but capital may stagnate without a deeper optimized entry",
      ],
      scoutImplication: "require_better_entry",
      confidence: 72,
    },
  },
  technicalSummary: {
    trend: "bullish",
    structureNote: "Structure intact; expansion capacity currently low/uncertain",
    majorSupport: 125,
    majorResistance: 160,
    primaryBattleZone: { low: 140, high: 145 },
    probableTarget: 160,
    extendedTarget: 180,
    structuralInvalidation: "Weekly close below 125",
    contradictions: ["Valid structure with stagnant expansion"],
    confidence: 65,
  },
});
assert.equal(
  expansionOnly.ok,
  true,
  expansionOnly.ok ? "" : expansionOnly.errors.join("; ")
);
if (expansionOnly.ok) {
  assert.equal(expansionOnly.value.integrated.momentumAssessment?.currentState, "range_rotation");
  assert.equal(
    expansionOnly.value.perTimeframe[0].participation?.movementCharacter?.primary,
    undefined
  );
}

console.log("mtae participation + momentum: ok");
