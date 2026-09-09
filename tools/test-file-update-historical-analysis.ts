import assert from "node:assert/strict";
import { verifyApplyPersistence } from "../lib/apply-verify";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import { applyStockFileInboxUpdate, getStockThesisById } from "../lib/stock-theses";
import { __setStockThesesStoreForTests, createMemoryStockThesesStore } from "../lib/stock-theses-store";
import type { StockThesis } from "../lib/stock-thesis-types";

const seed: StockThesis = {
  id: "ST-MSFT-001",
  ticker: "MSFT",
  status: "watching",
  version: 1,
  style: "swing",
  thesis: "seed thesis",
  currentHypothesis: "seed hypothesis",
  historicalAnalysis: [{ timeframe: "1W", summary: "seed" }],
  levels: {},
  riskRules: {
    minimumRR: 3,
    invalidation: "Weekly close below 335",
  },
  notes: "seed notes",
  createdAt: "2026-07-12T07:06:12.043Z",
  updatedAt: "2026-07-12T07:06:12.043Z",
};

async function main() {
  __setStockThesesStoreForTests(createMemoryStockThesesStore([seed]));
  try {
    const payload = {
      type: "file-update" as const,
      source: "ai-block",
      proposal: {
        id: "ST-MSFT-001",
        historicalAnalysis: [
          { timeframe: "legacy-origin", summary: "MSFT analysis originated around late June near 390-400." },
          { timeframe: "legacy-outcome", summary: "Price later reached the anticipated 350 area, then advanced and exceeded 450." },
        ],
        notes: "Human-confirmed legacy history preserved without reconstructing T0.",
      },
    };

    const parsed = parseTradingInboxPayload(payload);
    assert.ok(parsed, "payload should parse");
    assert.deepEqual(validateProposalPayload(parsed), { ok: true });

    const result = await applyStockFileInboxUpdate("ST-MSFT-001", parsed.proposal);
    assert.ok(!result.errors?.length, result.errors?.join("; "));

    const reloaded = await getStockThesisById("ST-MSFT-001");
    assert.ok(reloaded);
    assert.equal(reloaded?.version, 2);
    assert.equal(reloaded?.historicalAnalysis.length, 2);
    assert.equal(reloaded?.historicalAnalysis[0]?.timeframe, "legacy-origin");
    assert.match(reloaded?.notes ?? "", /Human-confirmed legacy history preserved/);
    assert.match(reloaded?.notes ?? "", /AI import/);

    const verify = await verifyApplyPersistence(parsed);
    assert.equal(verify.ok, true, verify.detail);
  } finally {
    __setStockThesesStoreForTests(null);
  }

  console.log("test-file-update-historical-analysis: PASS");
}

void main();
