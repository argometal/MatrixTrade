/**
 * MXT 017-P14B-06 — isolated H001 Accept E2E (memory MAF; no canonical mutation).
 * Run: npx tsx --env-file=.env.local tools/test-mxt-017-p14b-h001-accept-e2e.ts
 * (env-file optional — falls back to P14B-01 fixture evidence)
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "path";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import { applyAttribution } from "../lib/maf-apply";
import { validateAttributionProposal } from "../lib/maf-validate";
import {
  getMafExperimentByTradeId,
  getMafExperiments,
} from "../lib/maf-store";
import {
  __setMafExperimentsStoreForTests,
  createMemoryMafExperimentsStore,
  MAF_EXPERIMENTS_JSON_PATH,
} from "../lib/maf-experiments-store";
import {
  __setTradesStoreForTests,
  createMemoryTradesStore,
} from "../lib/trades-json";
import {
  __setObservationsStoreForTests,
  createMemoryObservationsStore,
} from "../lib/observations-store";
import {
  __setLearningOutcomesStoreForTests,
  createMemoryLearningOutcomesStore,
} from "../lib/learning-outcomes-store";
import { getTradeById } from "../lib/storage";
import { attachMafToInsightsCaseRows } from "../lib/insights-maf-join";
import {
  formatAcceptedMafUi,
  formatHistoricalReconstructionUi,
} from "../lib/insights-maf-ui";
import { buildHistoricalCaseAttribution } from "../lib/historical-case-attribution";
import type { InsightsCaseRow } from "../lib/insights-case-spine-types";
import type { ObservationRecord } from "../lib/observation-types";
import type { Trade } from "../lib/types";

const AMZN_NOTE =
  "The intent was to enter on the decline. Entry was not near a sufficiently strong structural location; price swept the stops.";

function fixtureH001(): Trade {
  return {
    id: "H001",
    ticker: "AMZN",
    status: "closed",
    entry: 240,
    stop: 230,
    target: 270,
    exit: 225.9,
    shares: 8,
    direction: "long",
    riskRewardPlanned: 3,
    riskRewardActual: -1.41,
    qualityEntry: 2,
    mistakes: ["fomo", "chased"],
    lesson: "Wait for weekly close above resistance.",
    actionItem: "No entries on earnings week.",
    planHistoricallyAbsent: true,
    playbookId: "asymmetric-support-entry",
    playbookHistoricallyAbsent: false,
    reviewedAt: "2026-07-03T05:21:52.923Z",
    datesReconstructed: true,
    createdAt: "2025-11-01T00:00:00.000Z",
    closedAt: "2025-11-05T00:00:00.000Z",
    notes: AMZN_NOTE,
  };
}

function obsFor(trade: Trade): ObservationRecord {
  return {
    id: "OBS-AMZN-001",
    tradeId: trade.id,
    ticker: trade.ticker,
    status: "observing",
    startedAt: trade.closedAt ?? trade.createdAt,
    endsAt: "2026-02-03T00:00:00.000Z",
    durationDays: 90,
    createdAt: trade.closedAt ?? trade.createdAt,
    lastUpdatedAt: trade.closedAt ?? trade.createdAt,
  };
}

/** Explicit human-Accept simulation — product never auto-Accepts. */
function h001AttributionProposal(
  humanApproved: boolean
): Record<string, unknown> {
  return {
    type: "attribution",
    proposal: {
      tradeId: "H001",
      humanApproved,
      primaryDragComponent: "entry_quality",
      summary:
        "Historical AMZN H001: reconstructed review marks entry/timing/location weakness. No Plan/T0 — other components not_applicable.",
      components: [
        {
          component: "entry_quality",
          classification: "failure",
          aiInterpretationConfidence: 75,
          reasoning:
            "qualityEntry=2 and mistake chased; reconstructed review supports poor entry location/timing.",
          evidenceRefs: ["qualityEntry", "mistakes.chased", "humanReconstruction"],
        },
        {
          component: "timing_quality",
          classification: "failure",
          aiInterpretationConfidence: 70,
          reasoning: "Mistake fomo recorded on review.",
          evidenceRefs: ["mistakes.fomo"],
        },
        {
          component: "zone_quality",
          classification: "failure",
          aiInterpretationConfidence: 65,
          reasoning:
            "Human reconstruction notes entry was not near a sufficiently strong structural location.",
          evidenceRefs: ["humanReconstruction"],
        },
        {
          component: "thesis_quality",
          classification: "not_applicable",
          aiInterpretationConfidence: 90,
          reasoning: "No contemporaneous Scout/Plan/T0 thesis freeze.",
          evidenceRefs: ["planHistoricallyAbsent"],
        },
        {
          component: "stop_quality",
          classification: "inconclusive",
          aiInterpretationConfidence: 55,
          reasoning: "Insufficient evidence to rate stop quality.",
          evidenceRefs: ["trade.stop", "trade.exit"],
        },
        {
          component: "execution_quality",
          classification: "not_applicable",
          aiInterpretationConfidence: 85,
          reasoning: "No Plan execution instruction.",
          evidenceRefs: ["planHistoricallyAbsent"],
        },
        {
          component: "trade_management_quality",
          classification: "inconclusive",
          aiInterpretationConfidence: 50,
          reasoning: "No management notes beyond exit.",
          evidenceRefs: ["trade.exit"],
        },
        {
          component: "capital_allocation_quality",
          classification: "not_applicable",
          aiInterpretationConfidence: 80,
          reasoning: "No capital-allocation evidence.",
          evidenceRefs: [],
        },
      ],
    },
  };
}

function histCaseRow(trade: Trade): InsightsCaseRow {
  const hist = buildHistoricalCaseAttribution({
    trade,
    reconstructionNote: trade.notes,
  });
  return {
    planId: "HIST:H001",
    caseId: "H001",
    ticker: trade.ticker,
    date: trade.closedAt ?? trade.createdAt,
    playbookId: trade.playbookId ?? null,
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
    realizedR: trade.riskRewardActual ?? null,
    realizedPnL: null,
    counterfactualR: null,
    t0Available: false,
    missingInputs: ["t0_freeze"],
    diagnosisReason: hist.summary,
    evidenceSummary: "",
    caseHref: `/mxt/trades/${trade.id}`,
    diagnosis: {
      planId: "HIST:H001",
      classification: { kind: "unclassified", value: "INDETERMINATE" },
      equationId: "HIST-ATTRIBUTION",
      inputsUsed: [],
      missingInputs: ["t0_freeze"],
      reason: hist.summary,
    },
    linkage: {
      tradeId: trade.id,
      planThesis: "UNLINKED",
      planPlaybook: trade.playbookId ? "linked" : "UNLINKED",
      tradePlan: "UNLINKED",
    },
    historicalAttribution: hist,
    mafAttribution: null,
  };
}

async function hashFile(filePath: string): Promise<string> {
  try {
    const buf = await fs.readFile(filePath);
    return createHash("sha256").update(buf).digest("hex");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return "ENOENT";
    throw err;
  }
}

async function tryCanonicalH001Read(): Promise<{
  trade: Trade | null;
  source: string;
}> {
  const prevStore = process.env.TRADES_STORE;
  const prevRo = process.env.MXT_READ_ONLY;
  try {
    __setTradesStoreForTests(null);
    process.env.TRADES_STORE = "supabase-readonly";
    process.env.MXT_READ_ONLY = "1";
    if (
      !process.env.SUPABASE_URL?.trim() ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ) {
      return { trade: null, source: "no-supabase-env" };
    }
    const trade = await getTradeById("H001");
    if (!trade) return { trade: null, source: "supabase-readonly-miss" };
    return { trade: { ...trade }, source: "supabase-readonly-read" };
  } catch (err) {
    return {
      trade: null,
      source: `supabase-read-failed:${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    if (prevStore === undefined) delete process.env.TRADES_STORE;
    else process.env.TRADES_STORE = prevStore;
    if (prevRo === undefined) delete process.env.MXT_READ_ONLY;
    else process.env.MXT_READ_ONLY = prevRo;
    __setTradesStoreForTests(null);
  }
}

async function main() {
  delete process.env.MXT_READ_ONLY;
  delete process.env.TRADES_STORE;
  if (!process.env.NODE_ENV) {
    Object.assign(process.env, { NODE_ENV: "test" });
  }

  const mafJsonBefore = await hashFile(MAF_EXPERIMENTS_JSON_PATH);
  const canonical = await tryCanonicalH001Read();
  const trade = canonical.trade ?? fixtureH001();
  const evidenceSource = canonical.trade
    ? canonical.source
    : "fixture-p14b01";

  assert.equal(trade.id.toUpperCase(), "H001");
  assert.equal(trade.ticker.toUpperCase(), "AMZN");
  assert.ok(trade.planHistoricallyAbsent === true || !trade.planId);

  // Isolate product stores for Apply — memory only
  const tradesMem = createMemoryTradesStore([trade]);
  const mafMem = createMemoryMafExperimentsStore([]);
  const obsMem = createMemoryObservationsStore([obsFor(trade)]);
  const loMem = createMemoryLearningOutcomesStore([]);
  __setTradesStoreForTests(tradesMem);
  __setMafExperimentsStoreForTests(mafMem, "memory");
  __setObservationsStoreForTests(obsMem, "memory");
  __setLearningOutcomesStoreForTests(loMem, "memory");

  const block = h001AttributionProposal(true);
  const parsed = parseTradingInboxPayload(block);
  assert.ok(parsed);
  assert.equal(parsed!.type, "attribution");
  const bridge = validateProposalPayload(parsed!);
  assert.equal(bridge.ok, true, JSON.stringify(bridge));
  const mafVal = validateAttributionProposal(
    block.proposal as Record<string, unknown>
  );
  assert.equal(mafVal.ok, true, JSON.stringify(mafVal));

  // B — negative: validated but NOT Accepted → no persistence
  assert.equal(mafMem.rows.length, 0);
  assert.equal(await getMafExperimentByTradeId("H001"), undefined);
  const negJoined = attachMafToInsightsCaseRows([histCaseRow(trade)], []);
  assert.equal(negJoined[0]!.mafAttribution, null);
  const negUi = formatAcceptedMafUi(negJoined[0]!.mafAttribution);
  assert.equal(negUi.acceptedLine, "Accepted MAF · —");

  // A — explicit isolated Accept (harness calls applyAttribution = Accept path)
  const applied = await applyAttribution({
    ...(block.proposal as Record<string, unknown>),
    humanApproved: true,
  });
  assert.ok(!applied.errors?.length, JSON.stringify(applied.errors));
  assert.ok(applied.experiment);
  assert.equal(applied.experiment!.tradeId?.toUpperCase(), "H001");
  assert.equal(applied.experiment!.humanApproved, true);
  assert.equal(applied.experiment!.primaryDragComponent, "entry_quality");
  assert.equal(applied.experiment!.status, "concluded");
  assert.equal(mafMem.rows.length, 1);

  // Facade real lookup
  const byTrade = await getMafExperimentByTradeId("H001");
  assert.ok(byTrade);
  assert.equal(byTrade!.id, applied.experiment!.id);
  const all = await getMafExperiments();
  assert.equal(all.length, 1);

  // Join HIST:H001
  const joined = attachMafToInsightsCaseRows(
    [histCaseRow(trade)],
    all
  );
  assert.equal(joined[0]!.mafAttribution?.mafExperimentId, byTrade!.id);
  assert.equal(
    joined[0]!.mafAttribution?.primaryDragComponent,
    "entry_quality"
  );

  // UI representation
  const ui = formatAcceptedMafUi(joined[0]!.mafAttribution);
  assert.equal(ui.present, true);
  assert.equal(ui.acceptedLine, `Accepted MAF · ${byTrade!.id}`);
  assert.equal(ui.primaryDragLine, "Primary drag · Entry quality");
  const recon = formatHistoricalReconstructionUi(
    joined[0]!.historicalAttribution
  );
  assert.ok(recon);
  assert.equal(recon!.label, "Historical Reconstruction · not accepted");

  // C — isolation
  const mafJsonAfter = await hashFile(MAF_EXPERIMENTS_JSON_PATH);
  assert.equal(
    mafJsonAfter,
    mafJsonBefore,
    "canonical data/maf-experiments.json must be unchanged"
  );
  assert.equal(tradesMem.rows.length, 1);
  assert.equal((await loMem.readAll()).length, 0);
  // no Plan/T0 fabricated — proposal has no planId
  assert.equal(
    (block.proposal as { planId?: string }).planId,
    undefined
  );

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        evidenceSource,
        experimentId: byTrade!.id,
        tradeId: "H001",
        humanApproved: true,
        acceptedUi: ui.acceptedLine,
        reconstructionLabel: recon!.label,
        mafJsonUnchanged: mafJsonBefore === mafJsonAfter,
        harness: {
          trades: "memory",
          maf: "memory",
          observations: "memory",
          learningOutcomes: "memory",
        },
      },
      null,
      2
    )
  );
  console.log("test-mxt-017-p14b-h001-accept-e2e: PASS");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    __setTradesStoreForTests(null);
    __setMafExperimentsStoreForTests(null, null);
    __setObservationsStoreForTests(null, null);
    __setLearningOutcomesStoreForTests(null, null);
  });
