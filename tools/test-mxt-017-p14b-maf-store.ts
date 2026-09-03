/**
 * MXT 017-P14B-02 — canonical MAF persistence (JSON vs Supabase gate).
 * Run: npx tsx tools/test-mxt-017-p14b-maf-store.ts
 */
import assert from "node:assert/strict";
import { applyAttribution } from "../lib/maf-apply";
import { validateAttributionProposal } from "../lib/maf-validate";
import {
  getMafExperimentById,
  getMafExperimentByPlanId,
  getMafExperimentByTradeId,
  getMafExperiments,
  nextMafExperimentId,
  upsertMafExperiment,
} from "../lib/maf-store";
import {
  __setMafExperimentsStoreForTests,
  assertJsonMafExperimentWritesAllowed,
  createJsonMafExperimentsStore,
  createMemoryMafExperimentsStore,
  getMafExperimentsStoreMode,
  mafExperimentRowToRecord,
  mafExperimentToRow,
} from "../lib/maf-experiments-store";
import { resolveMafEvidenceSource } from "../lib/insights-maf-join";
import type { MafExperiment } from "../lib/maf-types";
import { assertMxtPersistenceWriteAllowed } from "../lib/mxt-readonly";

function sampleExperiment(overrides: Partial<MafExperiment> = {}): MafExperiment {
  return {
    id: "MAF-TEST-001",
    tradeId: "H999",
    ticker: "TEST",
    status: "attributed",
    evidence: {
      fillStatus: "filled",
      executedEntry: 100,
      executedStop: 95,
      sources: { trade: true },
    },
    attributions: [
      {
        component: "entry_quality",
        classification: "failure",
        aiInterpretationConfidence: 70,
        reasoning: "test",
      },
    ],
    primaryDragComponent: "entry_quality",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    source: "attribution",
    ...overrides,
  };
}

function resetMemory(seed: MafExperiment[] = []) {
  const mem = createMemoryMafExperimentsStore(seed);
  __setMafExperimentsStoreForTests(mem, "memory");
  return mem;
}

async function main() {
  const prev = {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    MAF_EXPERIMENTS_STORE: process.env.MAF_EXPERIMENTS_STORE,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    TRADES_STORE: process.env.TRADES_STORE,
    MXT_READ_ONLY: process.env.MXT_READ_ONLY,
    NODE_ENV: process.env.NODE_ENV,
  };

  function restoreEnv() {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    __setMafExperimentsStoreForTests(null, null);
  }

  try {
    // 1) Memory read/write same backend
    {
      const mem = resetMemory();
      const row = sampleExperiment();
      await upsertMafExperiment(row);
      assert.equal(mem.rows.length, 1);
      assert.equal((await getMafExperiments()).length, 1);
      assert.equal((await getMafExperimentById("MAF-TEST-001"))?.ticker, "TEST");
      assert.equal((await getMafExperimentByTradeId("H999"))?.id, "MAF-TEST-001");
      assert.equal(await getMafExperimentByPlanId("PLAN-X"), undefined);
    }

    // 2) Mapping round-trip preserves attribution contract
    {
      const exp = sampleExperiment({
        planId: "PLAN-1",
        ruleHints: [
          {
            component: "stop_quality",
            classification: "weak",
            aiInterpretationConfidence: 60,
            reasoning: "hint",
          },
        ],
        humanApproved: true,
        summary: "sum",
      });
      const back = mafExperimentRowToRecord(mafExperimentToRow(exp));
      assert.equal(back.id, "MAF-TEST-001");
      assert.equal(back.tradeId, "H999");
      assert.equal(back.planId, "PLAN-1");
      assert.equal(back.attributions[0]?.component, "entry_quality");
      assert.equal(back.primaryDragComponent, "entry_quality");
      assert.equal(back.ruleHints?.[0]?.component, "stop_quality");
      assert.equal(back.humanApproved, true);
    }

    // 3) Validator unchanged
    {
      const parsed = validateAttributionProposal({
        tradeId: "H001",
        components: [
          {
            component: "entry_quality",
            classification: "failure",
            aiInterpretationConfidence: 70,
            reasoning: "review",
          },
        ],
        primaryDragComponent: "entry_quality",
      });
      assert.equal(parsed.ok, true);
    }

    // 4) next id helper
    {
      const id = nextMafExperimentId(
        [sampleExperiment({ id: "MAF-AMZN-001" })],
        "AMZN"
      );
      assert.equal(id, "MAF-AMZN-002");
    }

    // 5) Mode: Matrix supabase gate selects supabase (no silent JSON)
    {
      __setMafExperimentsStoreForTests(null, null);
      process.env.TRADES_STORE = "supabase";
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
      delete process.env.MAF_EXPERIMENTS_STORE;
      delete process.env.VERCEL;
      delete process.env.VERCEL_ENV;
      assert.equal(getMafExperimentsStoreMode(), "supabase");
      assert.equal(resolveMafEvidenceSource(), "supabase");
    }

    // 6) supabase-readonly also selects supabase mode (writes blocked separately)
    {
      __setMafExperimentsStoreForTests(null, null);
      process.env.TRADES_STORE = "supabase-readonly";
      process.env.MXT_READ_ONLY = "1";
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
      delete process.env.MAF_EXPERIMENTS_STORE;
      assert.equal(getMafExperimentsStoreMode(), "supabase");
      assert.throws(
        () => assertMxtPersistenceWriteAllowed("maf_experiments.upsert"),
        /MXT_READ_ONLY/
      );
    }

    // 7) Readonly Apply attribution fails observably (no silent JSON write)
    {
      const mem = resetMemory();
      process.env.MXT_READ_ONLY = "1";
      process.env.TRADES_STORE = "supabase-readonly";
      // Pin memory for identity lookups? applyAttribution needs trade from storage.
      // Use a store that throws on upsert like supabase readonly.
      const blocked = createMemoryMafExperimentsStore();
      const origUpsert = blocked.upsert.bind(blocked);
      blocked.upsert = async (row) => {
        assertMxtPersistenceWriteAllowed("maf_experiments.upsert");
        return origUpsert(row);
      };
      __setMafExperimentsStoreForTests(blocked, "memory");

      // Without a real trade, apply fails earlier — exercise upsert path via facade:
      await assert.rejects(
        () => upsertMafExperiment(sampleExperiment({ id: "MAF-RO-001" })),
        /MXT_READ_ONLY/
      );
      assert.equal(blocked.rows.length, 0);
      assert.equal(mem.rows.length, 0);
    }

    // 8) JSON forced mode (non-Vercel)
    {
      __setMafExperimentsStoreForTests(null, null);
      delete process.env.VERCEL;
      delete process.env.VERCEL_ENV;
      delete process.env.TRADES_STORE;
      delete process.env.MXT_READ_ONLY;
      process.env.MAF_EXPERIMENTS_STORE = "json";
      assert.equal(getMafExperimentsStoreMode(), "json");
      assert.equal(resolveMafEvidenceSource(), "local_json");
      assert.doesNotThrow(() => assertJsonMafExperimentWritesAllowed());
    }

    // 9) Vercel forbids JSON writes
    {
      __setMafExperimentsStoreForTests(null, null);
      process.env.VERCEL = "1";
      process.env.VERCEL_ENV = "production";
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
      process.env.TRADES_STORE = "supabase";
      delete process.env.MAF_EXPERIMENTS_STORE;
      assert.equal(getMafExperimentsStoreMode(), "supabase");
      assert.throws(
        () => assertJsonMafExperimentWritesAllowed(),
        /cannot write on Vercel|Supabase/
      );
      await assert.rejects(
        () =>
          createJsonMafExperimentsStore().upsert(sampleExperiment({ id: "MAF-V-1" })),
        /cannot write on Vercel|Supabase/
      );
    }

    // 10) applyAttribution under pinned memory (semantics unchanged; isolated)
    {
      delete process.env.VERCEL;
      delete process.env.VERCEL_ENV;
      delete process.env.MXT_READ_ONLY;
      delete process.env.TRADES_STORE;
      const mem = resetMemory();
      // Trade missing → errors (unchanged semantics)
      const missing = await applyAttribution({
        tradeId: "NO-SUCH-TRADE",
        components: [
          {
            component: "entry_quality",
            classification: "failure",
            aiInterpretationConfidence: 70,
            reasoning: "x",
          },
        ],
      });
      assert.ok(missing.errors?.length);
      assert.equal(mem.rows.length, 0);
    }

    console.log("test-mxt-017-p14b-maf-store: PASS");
  } finally {
    restoreEnv();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
