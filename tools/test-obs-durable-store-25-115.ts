/**
 * Prompt 25-115 — durable Observation persistence (no observations.json on Vercel).
 * Run: npm run test:obs-durable-store
 */
import assert from "node:assert/strict";
import { buildLearningAttentionItems } from "../lib/learning-attention";
import { applyObservationUpdateProposal } from "../lib/observation-apply";
import {
  getObservationByTradeId,
  getObservations,
  upsertObservation,
} from "../lib/observation-store";
import {
  __setObservationsStoreForTests,
  assertJsonObservationWritesAllowed,
  createJsonObservationsStore,
  createMemoryObservationsStore,
  getObservationsStoreMode,
  OBSERVATIONS_JSON_PATH,
  observationToRow,
  observationRowToRecord,
} from "../lib/observations-store";
import type { ObservationRecord } from "../lib/observation-types";
import type { Trade } from "../lib/types";

const h001Trade = {
  id: "H001",
  ticker: "AMZN",
  status: "closed",
  entry: 240,
  stop: 230,
  target: 270,
  shares: 10,
  exit: 230,
  createdAt: "2026-06-25T00:00:00.000Z",
  closedAt: "2026-06-25T00:00:00.000Z",
  lossClassification: "pending_study",
  postStopStudy: {
    enabled: true,
    durationDays: 90,
    startedAt: "2026-06-25T00:00:00.000Z",
    endsAt: "2026-09-23T00:00:00.000Z",
    originalTradeId: "H001",
    originalEntry: 240,
    originalStop: 230,
  },
} as Trade;

const originalProposal = {
  tradeId: "H001",
  targetReached: false,
  maxPrice: 255,
  mfe: 15,
  mfeMaeUnit: "price",
  status: "observing",
  dataSource: "ai",
  notes:
    "Human-stated observation: maximum price reached 255, target 270 was not reached, and price was approximately 232 on 2026-07-25. The 90-day study remains active; no thesis invalidation or terminal event is being asserted.",
};

function resetMemory() {
  const mem = createMemoryObservationsStore();
  __setObservationsStoreForTests(mem, "memory");
  return mem;
}

async function main() {
  // -------------------------------------------------------------------------
  // Mode: Vercel never uses JSON; JSON write guard throws (no EROFS swallow)
  // -------------------------------------------------------------------------
  {
    const prev = {
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      OBSERVATIONS_STORE: process.env.OBSERVATIONS_STORE,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      TRADES_STORE: process.env.TRADES_STORE,
    };

    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    process.env.TRADES_STORE = "supabase";
    delete process.env.OBSERVATIONS_STORE;
    __setObservationsStoreForTests(null, null);

    assert.equal(getObservationsStoreMode(), "supabase");
    assert.throws(
      () => assertJsonObservationWritesAllowed(),
      /cannot write on Vercel|Supabase/
    );
    await assert.rejects(
      () =>
        createJsonObservationsStore().upsert({
          id: "OBS-TEST-001",
          ticker: "TEST",
          status: "observing",
          startedAt: "2026-06-25T00:00:00.000Z",
          endsAt: "2026-09-23T00:00:00.000Z",
          durationDays: 90,
          createdAt: "2026-06-25T00:00:00.000Z",
          lastUpdatedAt: "2026-06-25T00:00:00.000Z",
        }),
      /cannot write on Vercel/
    );

    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    __setObservationsStoreForTests(null, null);
  }

  // -------------------------------------------------------------------------
  // Create by tradeId → durable read-back; Needs Attention closes
  // -------------------------------------------------------------------------
  {
    const mem = resetMemory();
    const beforeAttn = buildLearningAttentionItems([h001Trade], [], []);
    assert.ok(
      beforeAttn.some((i) => i.id === "observation-H001"),
      "ATTN-OBSERVATION-H001 present before OBS"
    );

    const result = await applyObservationUpdateProposal(
      { ...originalProposal },
      { getTradeById: async () => h001Trade }
    );
    assert.ok(!result.errors, result.errors?.join("; "));
    assert.ok(result.observation);
    assert.equal(result.observation!.tradeId, "H001");
    assert.equal(result.observation!.status, "observing");
    assert.equal(result.observation!.maxPrice, 255);
    assert.equal(result.observation!.mfe, 15);
    assert.equal(result.observation!.targetReached, false);

    const readBack = await getObservationByTradeId("H001");
    assert.ok(readBack, "durable read-back");
    assert.equal(readBack!.id, result.observation!.id);
    assert.equal(readBack!.maxPrice, 255);
    assert.equal(mem.rows.length, 1);

    const afterAttn = buildLearningAttentionItems(
      [h001Trade],
      await getObservations(),
      []
    );
    assert.ok(
      !afterAttn.some((i) => i.id === "observation-H001"),
      "ATTN-OBSERVATION-H001 clears after durable OBS"
    );

    assert.equal(h001Trade.status, "closed");
    assert.equal(h001Trade.lossClassification, "pending_study");
    assert.equal(h001Trade.entry, 240);
  }

  // -------------------------------------------------------------------------
  // Idempotent update by tradeId — no duplicate; omitted fields preserved
  // -------------------------------------------------------------------------
  {
    resetMemory();
    const first = await applyObservationUpdateProposal(
      { ...originalProposal },
      { getTradeById: async () => h001Trade }
    );
    assert.ok(first.observation);
    const id = first.observation!.id;

    const second = await applyObservationUpdateProposal(
      {
        tradeId: "H001",
        mae: 8,
        mfeMaeUnit: "price",
        notes: "Updated MAE only; omit maxPrice/mfe",
      },
      { getTradeById: async () => h001Trade }
    );
    assert.ok(second.observation);
    assert.equal(second.observation!.id, id);
    assert.equal(second.observation!.maxPrice, 255, "omitted maxPrice preserved");
    assert.equal(second.observation!.mfe, 15, "omitted mfe preserved");
    assert.equal(second.observation!.mae, 8);
    assert.equal(second.observation!.status, "observing");
    assert.equal((await getObservations()).length, 1, "no duplicate OBS");
  }

  // -------------------------------------------------------------------------
  // Duplicate ObservationRecord rejected
  // -------------------------------------------------------------------------
  {
    const mem = resetMemory();
    const base: ObservationRecord = {
      id: "OBS-AMZN-001",
      tradeId: "H001",
      ticker: "AMZN",
      status: "observing",
      startedAt: "2026-06-25T00:00:00.000Z",
      endsAt: "2026-09-23T00:00:00.000Z",
      durationDays: 90,
      createdAt: "2026-06-25T00:00:00.000Z",
      lastUpdatedAt: "2026-06-25T00:00:00.000Z",
    };
    await upsertObservation(base);
    await assert.rejects(
      () => upsertObservation({ ...base, id: "OBS-AMZN-002" }),
      /Duplicate ObservationRecord/
    );
    assert.equal(mem.rows.length, 1);
  }

  // -------------------------------------------------------------------------
  // Mapping round-trip (Supabase row shape)
  // -------------------------------------------------------------------------
  {
    const record: ObservationRecord = {
      id: "OBS-AMZN-001",
      tradeId: "H001",
      ticker: "AMZN",
      status: "observing",
      startedAt: "2026-06-25T00:00:00.000Z",
      endsAt: "2026-09-23T00:00:00.000Z",
      durationDays: 90,
      targetReached: false,
      maxPrice: 255,
      mfe: 15,
      mfeMaeUnit: "price",
      dataSource: "ai",
      notes: "x",
      createdAt: "2026-06-25T00:00:00.000Z",
      lastUpdatedAt: "2026-07-25T00:00:00.000Z",
    };
    const round = observationRowToRecord(observationToRow(record));
    assert.equal(round.id, record.id);
    assert.equal(round.tradeId, record.tradeId);
    assert.equal(round.maxPrice, 255);
    assert.equal(round.mfe, 15);
    assert.equal(round.status, "observing");
  }

  assert.ok(OBSERVATIONS_JSON_PATH.endsWith("observations.json"));

  __setObservationsStoreForTests(null, null);
  console.log("test-obs-durable-store-25-115: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
