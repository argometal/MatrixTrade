/**
 * PROMPT 15-01 — Scout Plan ID architecture
 * Run: npm run test:plan-id-architecture
 */
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  formatPlanId,
  isCanonicalPlanId,
  maxPlanIdNumber,
  nextPlanId,
  parsePlanIdNumber,
  PlanIdCollisionError,
  PLAN_ID_SQL_REGEX,
  rejectClientSuppliedPlanId,
} from "../lib/plan-id";
import { savePlan, getPlanById } from "../lib/plans";
import {
  __setPlansStoreForTests,
  createMemoryPlansStore,
} from "../lib/plans-store";
import {
  createJsonPlansStore,
  __resetPlansJsonLockForTests,
} from "../lib/plans-store/json";
import type { TradePlan } from "../lib/plan-types";
import { validateScoutPlanCreateProposal } from "../lib/scout-plan-create-validate";

function basePlan(overrides: Partial<TradePlan> = {}): TradePlan {
  const now = "2026-08-15T00:00:00.000Z";
  return {
    id: "PLAN-001",
    ticker: "TEST",
    status: "watching",
    analysisTimeframes: ["1D", "5m"],
    entryTimeframe: "5m",
    plannedEntry: 100,
    stopPrice: 95,
    targetPrice: 120,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function saveInput(overrides: Partial<Parameters<typeof savePlan>[0]> = {}) {
  return {
    ticker: "TEST",
    analysisTimeframes: ["1D", "5m"] as TradePlan["analysisTimeframes"],
    entryTimeframe: "5m" as const,
    plannedEntry: 100,
    stopPrice: 95,
    targetPrice: 120,
    ...overrides,
  };
}

async function withMemoryStore<T>(
  seed: TradePlan[],
  fn: () => Promise<T>
): Promise<T> {
  __setPlansStoreForTests(createMemoryPlansStore(seed));
  try {
    return await fn();
  } finally {
    __setPlansStoreForTests(null);
  }
}

async function main() {
  // --- Pure format / parse ---
  assert.equal(formatPlanId(1), "PLAN-001");
  assert.equal(formatPlanId(9), "PLAN-009");
  assert.equal(formatPlanId(999), "PLAN-999");
  assert.equal(formatPlanId(1000), "PLAN-1000");
  assert.equal(formatPlanId(15432), "PLAN-15432");
  assert.equal(parsePlanIdNumber("PLAN-001"), 1);
  assert.equal(parsePlanIdNumber("PLAN-1000"), 1000);
  assert.equal(parsePlanIdNumber("PLAN-ABC"), null);
  assert.equal(isCanonicalPlanId("PLAN-001"), true);
  assert.equal(isCanonicalPlanId("PLAN-1000"), true);
  assert.equal(isCanonicalPlanId("PLAN-01"), true);
  assert.equal(isCanonicalPlanId("PLAN-FUND-001"), false);
  assert.equal(PLAN_ID_SQL_REGEX, "^PLAN-[0-9]+$");

  assert.equal(
    nextPlanId([{ id: "PLAN-001" }, { id: "PLAN-004" }]),
    "PLAN-005"
  );
  assert.equal(nextPlanId([{ id: "PLAN-999" }]), "PLAN-1000");
  assert.equal(nextPlanId([{ id: "PLAN-1000" }]), "PLAN-1001");
  assert.equal(maxPlanIdNumber([{ id: "PLAN-001" }, { id: "PLAN-FUND-001" }]), 1);

  assert.ok(rejectClientSuppliedPlanId({ id: "PLAN-999" }));
  assert.ok(rejectClientSuppliedPlanId({ planId: "PLAN-001" }));
  assert.equal(rejectClientSuppliedPlanId({ ticker: "X" }), null);

  {
    const bad = validateScoutPlanCreateProposal({
      id: "PLAN-999",
      stockFileId: "ST-PG-001",
      ticker: "PG",
      plannedEntry: 140,
      stopPrice: 135,
      targetPrice: 160,
      executionInstruction: "Buy at entry. Stop below. Hold to target.",
    });
    assert.equal(bad.ok, false);
    assert.ok(
      (bad as { errors: string[] }).errors.some((e) => e.includes("proposal.id")),
      (bad as { errors: string[] }).errors.join("; ")
    );
  }

  {
    const bad = validateScoutPlanCreateProposal({
      planId: "PLAN-001",
      stockFileId: "ST-PG-001",
      ticker: "PG",
      plannedEntry: 140,
      stopPrice: 135,
      targetPrice: 160,
      executionInstruction: "Buy at entry. Stop below. Hold to target.",
    });
    assert.equal(bad.ok, false);
    assert.ok(
      (bad as { errors: string[] }).errors.some((e) => e.includes("planId")),
      (bad as { errors: string[] }).errors.join("; ")
    );
  }

  {
    const mig = await fs.readFile(
      path.join(process.cwd(), "supabase/trade-plans-plan-id-seq.sql"),
      "utf-8"
    );
    assert.match(mig, /\^PLAN-\[0-9\]\+\$/);
    assert.match(mig, /allocate_trade_plan_id/);
    assert.match(mig, /trade_plan_id_seq/);
    assert.match(mig, /DEPLOYMENT ORDER/);
    assert.match(mig, /FAIL-CLOSED|fail-closed|no fallback/i);
    const schema = await fs.readFile(
      path.join(process.cwd(), "supabase/trade-plans.sql"),
      "utf-8"
    );
    assert.match(schema, /\^PLAN-\[0-9\]\+\$/);
    assert.doesNotMatch(schema, /\^PLAN-\[0-9\]\{3\}\$/);

    const supabaseStore = await fs.readFile(
      path.join(process.cwd(), "lib/plans-store/supabase.ts"),
      "utf-8"
    );
    const alloc = supabaseStore.slice(
      supabaseStore.indexOf("async allocateNextPlanId"),
      supabaseStore.indexOf("async insert")
    );
    assert.match(alloc, /allocate_trade_plan_id/);
    assert.doesNotMatch(alloc, /nextPlanId|maxPlanIdNumber|padStart/);
  }

  // PLAN-999 → PLAN-1000 via savePlan allocate
  await withMemoryStore([basePlan({ id: "PLAN-999" })], async () => {
    const created = await savePlan(saveInput({ ticker: "AAA" }));
    assert.equal(created.errors, undefined, created.errors?.join("; "));
    assert.equal(created.plan?.id, "PLAN-1000");
  });

  // Gaps: PLAN-001 + PLAN-004 → next PLAN-005
  await withMemoryStore(
    [basePlan({ id: "PLAN-001" }), basePlan({ id: "PLAN-004", ticker: "BBB" })],
    async () => {
      const created = await savePlan(saveInput({ ticker: "CCC" }));
      assert.equal(created.plan?.id, "PLAN-005");
    }
  );

  // Deletion of max ID + high-water semantics
  {
    const store = createMemoryPlansStore([
      basePlan({ id: "PLAN-001" }),
      basePlan({ id: "PLAN-1000" }),
    ]);
    assert.equal(await store.allocateNextPlanId(), "PLAN-1001");

    const store2 = createMemoryPlansStore([basePlan({ id: "PLAN-999" })]);
    await store2.insert(basePlan({ id: "PLAN-1000", ticker: "Z" }));
    assert.equal(await store2.allocateNextPlanId(), "PLAN-1001");

    const afterDeleteMax = createMemoryPlansStore([basePlan({ id: "PLAN-001" })]);
    assert.equal(await afterDeleteMax.allocateNextPlanId(), "PLAN-002");
  }

  // Historical records preserved; update does not renumber
  await withMemoryStore([basePlan({ id: "PLAN-004", thesis: "old" })], async () => {
    const updated = await savePlan(
      saveInput({ id: "PLAN-004", ticker: "TEST", thesis: "new thesis" })
    );
    assert.equal(updated.plan?.id, "PLAN-004");
    assert.equal(updated.plan?.thesis, "new thesis");
    const reloaded = await getPlanById("PLAN-004");
    assert.equal(reloaded?.id, "PLAN-004");
    assert.equal(reloaded?.thesis, "new thesis");
  });

  // Existing id → update path (upsert)
  await withMemoryStore([basePlan({ id: "PLAN-010", thesis: "original" })], async () => {
    const clash = await savePlan(
      saveInput({ id: "PLAN-010", ticker: "OTHER", thesis: "attacker" })
    );
    assert.equal(clash.plan?.id, "PLAN-010");
    assert.equal(clash.plan?.thesis, "attacker");
  });

  // insert-only collision does not overwrite
  {
    const store = createMemoryPlansStore([
      basePlan({ id: "PLAN-010", thesis: "original" }),
    ]);
    await assert.rejects(
      () => store.insert(basePlan({ id: "PLAN-010", thesis: "overwrite" })),
      (err: unknown) => err instanceof PlanIdCollisionError
    );
    const all = await store.readAll();
    assert.equal(all.find((p) => p.id === "PLAN-010")?.thesis, "original");
  }

  // Concurrent allocate: unique ids
  {
    const store = createMemoryPlansStore([basePlan({ id: "PLAN-050" })]);
    const ids = await Promise.all(
      Array.from({ length: 20 }, () => store.allocateNextPlanId())
    );
    const unique = new Set(ids);
    assert.equal(unique.size, 20, `expected 20 unique, got ${ids.join(",")}`);
    assert.ok([...unique].every((id) => isCanonicalPlanId(id)));
    assert.ok(!unique.has("PLAN-050"));
  }

  // Concurrent create via savePlan
  await withMemoryStore([basePlan({ id: "PLAN-100" })], async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => savePlan(saveInput({ ticker: `T${i}` })))
    );
    const ids = results.map((r) => r.plan?.id).filter(Boolean) as string[];
    assert.equal(ids.length, 10);
    assert.equal(new Set(ids).size, 10);
    assert.ok(ids.every((id) => parsePlanIdNumber(id)! > 100));
  });

  // Explicit create with new id is insert-only (collision fails)
  await withMemoryStore([basePlan({ id: "PLAN-200" })], async () => {
    const ok = await savePlan(saveInput({ id: "PLAN-201", ticker: "NEW" }));
    assert.equal(ok.plan?.id, "PLAN-201");
  });
  {
    const store = createMemoryPlansStore([
      basePlan({ id: "PLAN-200" }),
      basePlan({ id: "PLAN-201", thesis: "keep" }),
    ]);
    await assert.rejects(
      () => store.insert(basePlan({ id: "PLAN-201", thesis: "nope" })),
      PlanIdCollisionError
    );
  }

  // JSON store: high-water survives deletion of max row; concurrency
  {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "plan-id-json-"));
    const prev = process.cwd();
    try {
      process.chdir(tmp);
      await fs.mkdir(path.join(tmp, "data"), { recursive: true });
      __resetPlansJsonLockForTests();
      const store = createJsonPlansStore();
      await store.insert(basePlan({ id: "PLAN-001" }));
      await store.insert(basePlan({ id: "PLAN-999" }));
      const a = await store.allocateNextPlanId();
      assert.equal(a, "PLAN-1000");
      await store.insert(basePlan({ id: "PLAN-1000" }));

      await fs.writeFile(
        path.join(tmp, "data", "plans.json"),
        `${JSON.stringify(
          [basePlan({ id: "PLAN-001" }), basePlan({ id: "PLAN-999" })],
          null,
          2
        )}\n`
      );
      const afterDelete = await store.allocateNextPlanId();
      assert.equal(
        afterDelete,
        "PLAN-1001",
        "JSON high-water must not reuse deleted max id"
      );

      __resetPlansJsonLockForTests();
      const store2 = createJsonPlansStore();
      const concurrent = await Promise.all(
        Array.from({ length: 8 }, () => store2.allocateNextPlanId())
      );
      assert.equal(new Set(concurrent).size, 8);

      await assert.rejects(
        () => store2.insert(basePlan({ id: "PLAN-001", thesis: "x" })),
        PlanIdCollisionError
      );
    } finally {
      process.chdir(prev);
      __resetPlansJsonLockForTests();
    }
  }

  // Global allocation (not ticker-scoped)
  await withMemoryStore([basePlan({ id: "PLAN-300", ticker: "AAA" })], async () => {
    const a = await savePlan(saveInput({ ticker: "BBB" }));
    const b = await savePlan(saveInput({ ticker: "CCC" }));
    assert.equal(a.plan?.id, "PLAN-301");
    assert.equal(b.plan?.id, "PLAN-302");
  });

  console.log("test-plan-id-architecture: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
