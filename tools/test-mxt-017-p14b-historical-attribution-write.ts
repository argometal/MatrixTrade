/**
 * MXT 017-P14B-01 — historical attribution write loop (evidence → proposal → Validate).
 * Does NOT Accept / persist canonical MAF.
 * Run: npx tsx tools/test-mxt-017-p14b-historical-attribution-write.ts
 */
import assert from "node:assert/strict";
import {
  formatHistoricalAttributionEvidenceBrief,
  historicalAttributionEvidenceLabel,
} from "../lib/historical-attribution-evidence";
import { isHistoricalTradeCandidate } from "../lib/historical-case-attribution";
import { validateAttributionProposal } from "../lib/maf-validate";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import { tradeSnapshotItems } from "../lib/snapshot-trade-packages";
import type { ObservationRecord } from "../lib/observation-types";
import type { Trade } from "../lib/types";
import { VISIBLE_SNAPSHOT_MENU_LABELS } from "../lib/visible-snapshot-menu";

const AMZN_NOTE =
  "The intent was to enter on the decline. Entry was not near a sufficiently strong structural location; price swept the stops.";

function amznH001(overrides: Partial<Trade> = {}): Trade {
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
    ...overrides,
  };
}

const obsH001: ObservationRecord = {
  id: "OBS-AMZN-001",
  tradeId: "H001",
  ticker: "AMZN",
  status: "observing",
  startedAt: "2025-11-05T00:00:00.000Z",
  endsAt: "2026-02-03T00:00:00.000Z",
  durationDays: 90,
  createdAt: "2025-11-05T00:00:00.000Z",
  lastUpdatedAt: "2025-11-05T00:00:00.000Z",
};

function proposalFromH001Evidence(): Record<string, unknown> {
  // Only classify components supported by review/mistakes/reconstruction.
  // Thesis/stop/execution/management/capital without Plan/T0 → not_applicable or inconclusive.
  return {
    type: "attribution",
    proposal: {
      tradeId: "H001",
      primaryDragComponent: "entry_quality",
      summary:
        "Historical AMZN H001: reconstructed review marks entry/timing/location weakness. No Plan/T0 — other components not_applicable.",
      components: [
        {
          component: "entry_quality",
          classification: "failure",
          aiInterpretationConfidence: 75,
          reasoning:
            "qualityEntry=2 and mistake chased; reconstructed review supports poor entry location/timing vs a strong structure.",
          evidenceRefs: ["qualityEntry", "mistakes.chased", "humanReconstruction"],
        },
        {
          component: "timing_quality",
          classification: "failure",
          aiInterpretationConfidence: 70,
          reasoning: "Mistake fomo recorded on review — timing pressure into the entry.",
          evidenceRefs: ["mistakes.fomo"],
        },
        {
          component: "zone_quality",
          classification: "failure",
          aiInterpretationConfidence: 65,
          reasoning:
            "Human reconstruction notes entry was not near a sufficiently strong structural location (reconstructed — not T0 zone).",
          evidenceRefs: ["humanReconstruction"],
        },
        {
          component: "thesis_quality",
          classification: "not_applicable",
          aiInterpretationConfidence: 90,
          reasoning: "No contemporaneous Scout/Plan/T0 thesis freeze for this pre-MXT trade.",
          evidenceRefs: ["planHistoricallyAbsent", "t0.absent_pre_mxt"],
        },
        {
          component: "stop_quality",
          classification: "inconclusive",
          aiInterpretationConfidence: 55,
          reasoning:
            "Stop/exit geometry exist, but without Plan stop or post-stop conclusion there is insufficient evidence to rate stop quality.",
          evidenceRefs: ["trade.stop", "trade.exit"],
        },
        {
          component: "execution_quality",
          classification: "not_applicable",
          aiInterpretationConfidence: 85,
          reasoning: "No Plan execution instruction to compare against fills.",
          evidenceRefs: ["planHistoricallyAbsent"],
        },
        {
          component: "trade_management_quality",
          classification: "inconclusive",
          aiInterpretationConfidence: 50,
          reasoning: "No management notes beyond exit; insufficient evidence.",
          evidenceRefs: ["trade.exit"],
        },
        {
          component: "capital_allocation_quality",
          classification: "not_applicable",
          aiInterpretationConfidence: 80,
          reasoning: "No capital-allocation evidence on this historical record.",
          evidenceRefs: [],
        },
      ],
    },
  };
}

function main() {
  const trade = amznH001();
  assert.equal(isHistoricalTradeCandidate(trade), true);

  const brief = formatHistoricalAttributionEvidenceBrief({
    trade,
    observation: obsH001,
    reconstructionNote: AMZN_NOTE,
  });

  const requiredSnippets = [
    "tradeId:H001",
    "entry:240",
    "stop:230",
    "target:270",
    "exit:225.9",
    "qualityEntry:2",
    "mistakes:fomo,chased",
    "lesson:Wait for weekly close above resistance.",
    "actionItem:No entries on earnings week.",
    "planHistoricallyAbsent:yes",
    "t0:absent_pre_mxt",
    "datesReconstructed:yes",
    "observationId:OBS-AMZN-001",
    "status:observing",
    "NOT accepted MAF",
    'type": "attribution"',
    "tradeId alone",
  ];
  for (const s of requiredSnippets) {
    assert.ok(brief.includes(s), `evidence brief missing: ${s}`);
  }
  assert.ok(!brief.includes("fabricatedT0:true"));
  assert.equal(brief.includes("fabricatedT0:false"), true);

  const items = tradeSnapshotItems({
    trade,
    setups: [],
    playbooks: [],
    observation: obsH001,
  });
  const histItem = items.find((i) => i.id === "historical-attribution-evidence");
  assert.ok(histItem, "snapshot menu must expose historical attribution evidence");
  assert.equal(histItem!.label, historicalAttributionEvidenceLabel(trade));
  assert.ok(histItem!.text.includes("qualityEntry:2"));
  assert.ok(
    VISIBLE_SNAPSHOT_MENU_LABELS.includes(
      "{TICKER} · {ID} historical attribution evidence"
    )
  );

  const block = proposalFromH001Evidence();
  const parsed = parseTradingInboxPayload(block);
  assert.ok(parsed, "inbox payload parse");
  assert.equal(parsed!.type, "attribution");
  const bridge = validateProposalPayload(parsed!);
  assert.equal(bridge.ok, true, `bridge validate: ${JSON.stringify(bridge)}`);

  const validated = validateAttributionProposal(
    block.proposal as Record<string, unknown>
  );
  assert.equal(validated.ok, true, `maf validate: ${JSON.stringify(validated)}`);
  if (validated.ok) {
    assert.equal(validated.value.tradeId, "H001");
    assert.equal(validated.value.planId, undefined);
    assert.equal(validated.value.primaryDragComponent, "entry_quality");
    assert.ok(validated.value.components.length >= 3);
    const entry = validated.value.components.find(
      (c) => c.component === "entry_quality"
    );
    assert.equal(entry?.classification, "failure");
    const thesis = validated.value.components.find(
      (c) => c.component === "thesis_quality"
    );
    assert.equal(thesis?.classification, "not_applicable");
  }

  console.log("test-mxt-017-p14b-historical-attribution-write: PASS");
  console.log(
    JSON.stringify(
      {
        tradeId: "H001",
        validate: "PASS",
        accept: "NOT_EXECUTED",
        components: (block.proposal as { components: unknown[] }).components.length,
      },
      null,
      2
    )
  );
}

main();
