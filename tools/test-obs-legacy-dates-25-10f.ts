/**
 * Prompt 25-10F — legacy date correction + observation-update contract.
 * Run: npm run test:obs-legacy-dates
 */
import assert from "node:assert/strict";
import { buildApplySchemaContractText } from "../lib/apply-schema-contract";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import {
  addCalendarDaysIso,
  applyLegacyDateCorrection,
  buildLegacyDateCorrectionExample,
  isClosedLegacyTradeForDateCorrection,
  validateLegacyDateCorrectionProposal,
} from "../lib/legacy-date-correction";
import { POST_STOP_STUDY_DAYS } from "../lib/asymmetry-types";
import { buildMafProtocolBrief } from "../lib/maf-brief";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import { resolveObservationApplyTarget } from "../lib/observation-apply";
import { applyObservationUpdate } from "../lib/observation";
import {
  OBSERVATION_UPDATE_ALLOWED_KEYS,
  validateObservationUpdateProposal,
} from "../lib/observation-validate";
import type { ObservationRecord } from "../lib/observation-types";
import type { Trade } from "../lib/types";

function makeLegacyH001(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "H001",
    ticker: "AMZN",
    status: "closed",
    entry: 240,
    stop: 230,
    target: 270,
    shares: 10,
    exit: 230,
    createdAt: "2026-01-10T00:00:00.000Z",
    closedAt: "2026-01-20T00:00:00.000Z",
    playbookHistoricallyAbsent: true,
    planHistoricallyAbsent: true,
    lossClassification: "pending_study",
    thesis: "[reconstructed] AMZN swing",
    riskRewardPlanned: 3,
    reviewedAt: "2026-01-21T00:00:00.000Z",
    qualityEntry: 3,
    qualityExit: 3,
    qualityMgmt: 3,
    postStopStudy: {
      enabled: true,
      durationDays: 90,
      startedAt: "2026-01-20T00:00:00.000Z",
      endsAt: "2026-04-20T00:00:00.000Z",
      originalTradeId: "H001",
      originalEntry: 240,
      originalStop: 230,
    },
    ...overrides,
  } as Trade;
}

// ---------------------------------------------------------------------------
// A. Legacy date correction
// ---------------------------------------------------------------------------
{
  const trade = makeLegacyH001();
  assert.equal(isClosedLegacyTradeForDateCorrection(trade), true);

  const closedAt = "2026-06-25T00:00:00.000Z";
  const endsAt = addCalendarDaysIso(closedAt, POST_STOP_STUDY_DAYS);
  assert.equal(endsAt, "2026-09-23T00:00:00.000Z");

  const ok = validateLegacyDateCorrectionProposal(trade, {
    datesReconstructed: true,
    dateCorrectionNote:
      "Legacy dates corrected from human-reconstructed trade chronology. Exact broker timestamps unavailable.",
    createdAt: closedAt,
    closedAt,
  });
  assert.equal(ok.ok, true, ok.ok ? "" : ok.errors.join("; "));

  const missingNote = validateLegacyDateCorrectionProposal(trade, {
    datesReconstructed: true,
    createdAt: closedAt,
    closedAt,
  });
  assert.equal(missingNote.ok, false);
  assert.ok(
    missingNote.ok === false &&
      missingNote.errors.some((e) => e.includes("dateCorrectionNote"))
  );

  const openTrade = makeLegacyH001({ status: "open", closedAt: undefined });
  const rejectOpen = validateLegacyDateCorrectionProposal(openTrade, {
    datesReconstructed: true,
    dateCorrectionNote: "nope",
    closedAt,
  });
  assert.equal(rejectOpen.ok, false);

  const linkedModern = makeLegacyH001({
    playbookHistoricallyAbsent: false,
    planHistoricallyAbsent: false,
    playbookId: "secular-trend-continuation",
    planId: "PLAN-AMZN-001",
    thesis: "linked",
    riskRewardPlanned: 3,
    lossClassification: "pending_study",
    postStopStudy: makeLegacyH001().postStopStudy,
  });
  // Fully linked → assessTradeLegacy tier "linked" → reject
  const rejectLinked = validateLegacyDateCorrectionProposal(linkedModern, {
    datesReconstructed: true,
    dateCorrectionNote: "should fail",
    closedAt,
  });
  assert.equal(
    rejectLinked.ok,
    false,
    "non-legacy closed trade must reject datesReconstructed"
  );

  const corrected = applyLegacyDateCorrection(trade, {
    datesReconstructed: true,
    dateCorrectionNote:
      "Legacy dates corrected from human-reconstructed trade chronology. Exact broker timestamps unavailable.",
    createdAt: closedAt,
    closedAt,
  });
  assert.equal(corrected.createdAt, closedAt);
  assert.equal(corrected.closedAt, closedAt);
  assert.equal(corrected.status, "closed");
  assert.equal(corrected.datesReconstructed, true);
  assert.equal(corrected.entry, 240);
  assert.equal(corrected.stop, 230);
  assert.equal(corrected.target, 270);
  assert.equal(corrected.shares, 10);
  assert.equal(corrected.exit, 230);
  assert.equal(corrected.lossClassification, "pending_study");
  assert.equal(corrected.thesis, trade.thesis);
  assert.equal(corrected.reviewedAt, trade.reviewedAt);
  assert.equal(corrected.postStopStudy?.startedAt, closedAt);
  assert.equal(corrected.postStopStudy?.endsAt, endsAt);
  assert.equal(corrected.postStopStudy?.durationDays, 90);
  assert.ok(corrected.dateCorrectionAudit?.length === 1);
  assert.equal(
    corrected.dateCorrectionAudit?.[0].previousCreatedAt,
    "2026-01-10T00:00:00.000Z"
  );
  assert.equal(
    corrected.dateCorrectionAudit?.[0].previousClosedAt,
    "2026-01-20T00:00:00.000Z"
  );

  const example = buildLegacyDateCorrectionExample("H001");
  const parsed = parseTradingInboxPayload(example);
  assert.ok(parsed);
  const v = validateProposalPayload(parsed!);
  assert.equal(
    v.ok,
    true,
    v.ok ? "" : (v as { errors: string[] }).errors.join("; ")
  );
  const exampleEnds = String(
    (example.proposal as { postStopStudy: { endsAt: string } }).postStopStudy
      .endsAt
  );
  assert.equal(exampleEnds, endsAt);
}

// ---------------------------------------------------------------------------
// B. observation-update validation + merge semantics
// ---------------------------------------------------------------------------
{
  const missingId = validateObservationUpdateProposal({
    targetReached: false,
    maxPrice: 255,
  });
  assert.equal(missingId.ok, false);
  assert.ok(
    missingId.ok === false &&
      missingId.errors.some((e) => e.includes("observationId"))
  );

  const missingMeasurable = validateObservationUpdateProposal({
    tradeId: "H001",
  });
  assert.equal(missingMeasurable.ok, false);
  assert.ok(
    missingMeasurable.ok === false &&
      missingMeasurable.errors.some((e) => e.includes("measurable"))
  );

  const badTargetAt = validateObservationUpdateProposal({
    tradeId: "H001",
    targetReachedAt: "2026-08-10T15:30:00.000Z",
  });
  assert.equal(badTargetAt.ok, false);
  assert.ok(
    badTargetAt.ok === false &&
      badTargetAt.errors.some((e) => e.includes("targetReachedAt"))
  );

  const partial = validateObservationUpdateProposal({
    tradeId: "H001",
    targetReached: false,
    maxPrice: 255,
    mfe: 15,
    mfeMaeUnit: "price",
    status: "observing",
    notes:
      "Human-stated latestObservedPrice 232 on 2026-07-25. Study remains active.",
  });
  assert.equal(partial.ok, true);

  const invented = validateObservationUpdateProposal({
    tradeId: "H001",
    targetReached: false,
    latestObservedPrice: 232,
  });
  assert.equal(invented.ok, false);
  assert.ok(
    invented.ok === false &&
      invented.errors.some((e) => e.includes("unknown"))
  );

  const seed: ObservationRecord = {
    id: "OBS-AMZN-001",
    tradeId: "H001",
    ticker: "AMZN",
    status: "observing",
    startedAt: "2026-06-25T00:00:00.000Z",
    endsAt: "2026-09-23T00:00:00.000Z",
    durationDays: 90,
    referenceEntry: 240,
    referenceStop: 230,
    referenceTargets: [270],
    maxPrice: 250,
    mfe: 10,
    mfeMaeUnit: "price",
    createdAt: "2026-07-01T00:00:00.000Z",
    lastUpdatedAt: "2026-07-01T00:00:00.000Z",
  };

  // Idempotent unique-by-tradeId target
  const byTrade = resolveObservationApplyTarget({
    tradeId: "H001",
    byTrade: [seed],
    byPlan: undefined,
  });
  assert.equal(byTrade.ok, true);
  assert.ok(byTrade.ok && byTrade.existing?.id === "OBS-AMZN-001");
  assert.ok(byTrade.ok && byTrade.createVia === null);

  // Create when none
  const createVia = resolveObservationApplyTarget({
    tradeId: "H001",
    byTrade: [],
  });
  assert.equal(createVia.ok, true);
  assert.ok(createVia.ok && createVia.createVia === "trade");

  // Reject duplicate / ambiguous
  const amb = resolveObservationApplyTarget({
    tradeId: "H001",
    byTrade: [seed, { ...seed, id: "OBS-AMZN-002" }],
  });
  assert.equal(amb.ok, false);

  // Update by observationId
  const byObs = resolveObservationApplyTarget({
    observationId: "OBS-AMZN-001",
    byId: seed,
    byTrade: [],
  });
  assert.equal(byObs.ok, true);
  assert.ok(byObs.ok && byObs.existing?.id === "OBS-AMZN-001");

  // Partial merge leaves omitted unchanged; status observing does not conclude
  const merged = applyObservationUpdate(seed, {
    targetReached: false,
    maxPrice: 255,
    mfe: 15,
    status: "observing",
    notes: "latest 232 on 2026-07-25",
  });
  assert.equal(merged.maxPrice, 255);
  assert.equal(merged.mfe, 15);
  assert.equal(merged.referenceEntry, 240);
  assert.equal(merged.referenceStop, 230);
  assert.equal(merged.status, "observing");
  assert.equal(merged.minPrice, undefined);
  assert.notEqual(merged.status, "concluded");

  // Existing targetReached allows targetReachedAt on update
  const withTarget: ObservationRecord = { ...seed, targetReached: true };
  const atOk = validateObservationUpdateProposal(
    {
      observationId: "OBS-AMZN-001",
      targetReachedAt: "2026-08-10T15:30:00.000Z",
    },
    withTarget
  );
  assert.equal(atOk.ok, true);

  // Bridge sample parses
  const block = {
    type: "observation-update",
    source: "ai-block",
    proposal: {
      tradeId: "H001",
      targetReached: false,
      maxPrice: 255,
      mfe: 15,
      mfeMaeUnit: "price",
      status: "observing",
      notes: "latestObservedPrice 232 @ 2026-07-25",
    },
  };
  const parsedObs = parseTradingInboxPayload(block);
  assert.ok(parsedObs);
  const obsV = validateProposalPayload(parsedObs!);
  assert.equal(
    obsV.ok,
    true,
    obsV.ok ? "" : (obsV as { errors: string[] }).errors.join("; ")
  );
}

// ---------------------------------------------------------------------------
// C. Snapshot / schema exposure
// ---------------------------------------------------------------------------
{
  const contract = buildApplySchemaContractText();
  assert.ok(contract.includes("=== LEGACY DATE CORRECTION"));
  assert.ok(contract.includes("=== OBSERVATION-UPDATE ==="));
  assert.ok(contract.includes("datesReconstructed"));
  assert.ok(contract.includes("dateCorrectionNote"));
  assert.ok(contract.includes("observationId"));
  assert.ok(contract.includes("thesisInvalidated"));
  assert.ok(contract.includes("maxPrice"));
  assert.ok(contract.includes("status: observing | concluded"));
  assert.ok(contract.includes('"tradeId": "H001"'));
  for (const key of OBSERVATION_UPDATE_ALLOWED_KEYS) {
    assert.ok(
      contract.includes(key),
      `contract missing allowed key ${key}`
    );
  }

  const brief = buildMatrixMechanicsBrief();
  assert.ok(brief.includes("Observation may be partial"));
  assert.ok(brief.includes("observation ≠ attribution") || brief.includes("observation ≠ attribution".replace("≠", "!=")) || /observation.*attribution/i.test(brief));
  assert.ok(brief.includes("datesReconstructed"));

  const maf = buildMafProtocolBrief();
  assert.ok(maf.includes("May be partial"));
  assert.ok(maf.includes("Observation ≠ attribution") || maf.includes("observation"));
  assert.ok(maf.includes("90-day"));
}

console.log("test-obs-legacy-dates-25-10f: ok");
