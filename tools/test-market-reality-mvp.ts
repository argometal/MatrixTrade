/**
 * Prompt #12C — Market Reality MVP validation (A–L core).
 * Run: npx tsx tools/test-market-reality-mvp.ts
 */
import assert from "node:assert/strict";
import {
  summarizeMarketRealityWindow,
  computeRelativeVolumeSeries,
} from "../lib/market-reality-derive";
import { fetchYahooDailyOhlcv } from "../lib/market-reality-yahoo";
import {
  ensureMarketRealityForPlan,
  buildMarketRealityViewModel,
  geometryFromPlanAndThesis,
  buildExAnteLegacyPacket,
} from "../lib/market-reality";
import {
  setMarketRealityWindowsForTests,
  listMarketRealityWindowsForRead,
} from "../lib/market-reality-store";
import { MARKET_REALITY_SOURCE_YAHOO } from "../lib/market-reality-types";
import {
  createMemoryThesisT0Store,
  setThesisT0StoreForTests,
  getThesisT0Store,
} from "../lib/thesis-t0-store";
import { getPlanById } from "../lib/plans";
import { getStockThesisById } from "../lib/stock-theses";

function ok(label: string) {
  console.log(`PASS ${label}`);
}

async function main() {
  // --- Derive: UNKNOWN when levels missing; YES/NO when present ---
  {
    const bars = [
      {
        timestamp: "2026-07-11T00:00:00.000Z",
        open: 300,
        high: 350,
        low: 295,
        close: 345,
        volume: 1_000_000,
      },
      {
        timestamp: "2026-07-14T00:00:00.000Z",
        open: 345,
        high: 360,
        low: 330,
        close: 355,
        volume: 2_000_000,
      },
    ];
    const unknown = summarizeMarketRealityWindow(bars, {
      plannedEntry: null,
      supportLow: null,
      supportHigh: null,
      stop: null,
      target: null,
    });
    assert.equal(unknown.entryLevelReached, "UNKNOWN");
    assert.equal(unknown.thesisZoneReached, "UNKNOWN");
    assert.equal(unknown.stopLevelReached, "UNKNOWN");
    assert.equal(unknown.targetReached, "UNKNOWN");
    assert.equal(unknown.mfePrice, null);
    assert.equal(unknown.windowHigh, 360);

    const geo = {
      plannedEntry: 348,
      supportLow: 340,
      supportHigh: 355,
      stop: 320,
      target: 430,
    };
    const sum = summarizeMarketRealityWindow(bars, geo);
    assert.equal(sum.entryLevelReached, "YES");
    assert.equal(sum.thesisZoneReached, "YES");
    assert.equal(sum.stopLevelReached, "YES"); // low 295 reaches 320
    assert.equal(sum.targetReached, "NO");
    assert.ok(sum.mfePrice != null && sum.mfePrice > 0);
    ok("F. unavailable → UNKNOWN; reachable levels YES/NO");
  }

  // --- Relative volume ---
  {
    const bars = Array.from({ length: 25 }, (_, i) => ({
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: i === 24 ? 5_000_000 : 1_000_000,
    }));
    const rv = computeRelativeVolumeSeries(bars, 20);
    assert.equal(rv.points[0].relativeVolume, null);
    assert.equal(rv.points[19].relativeVolume, null);
    assert.ok(rv.points[24].relativeVolume != null);
    assert.ok(Math.abs(rv.points[24].relativeVolume! - 5) < 0.01);
    ok("B/Volume relative: baseline then ratio");
  }

  // --- Yahoo live fetch (A, B, C) ---
  {
    const fetched = await fetchYahooDailyOhlcv({
      ticker: "TSLA",
      fromIso: "2026-07-10T00:00:00.000Z",
      toIso: "2026-07-17T23:59:59.000Z",
    });
    assert.equal(fetched.source, MARKET_REALITY_SOURCE_YAHOO);
    assert.equal(fetched.timeframe, "1d");
    assert.ok(fetched.bars.length > 0, "expected TSLA daily bars");
    for (const b of fetched.bars) {
      assert.ok(Number.isFinite(b.open));
      assert.ok(Number.isFinite(b.high));
      assert.ok(Number.isFinite(b.low));
      assert.ok(Number.isFinite(b.close));
      assert.ok(Number.isFinite(b.volume) && b.volume >= 0);
      assert.ok(b.timestamp);
    }
    ok("A/B/C. Yahoo OHLCV+Volume+provenance");
  }

  // --- Case binding + no T0 write (D, E) ---
  {
    const freezeStore = createMemoryThesisT0Store();
    setThesisT0StoreForTests(freezeStore);
    const before = await getThesisT0Store().readAll();

    setMarketRealityWindowsForTests([]);
    const plan = await getPlanById("PLAN-001");
    assert.ok(plan, "PLAN-001 must exist in local seed");
    assert.equal(plan.ticker, "TSLA");
    assert.equal(plan.decision?.id, "DEC-tsla-pilot-wait");

    const thesis = plan.stockThesisId
      ? await getStockThesisById(plan.stockThesisId)
      : undefined;
    assert.ok(thesis, "ST-TSLA-001 expected");
    assert.equal(thesis.id, "ST-TSLA-001");

    const ensured = await ensureMarketRealityForPlan({
      planId: "PLAN-001",
      forceRefresh: true,
    });
    assert.ok(
      ensured.planWindow || ensured.retrospectiveWindow,
      "at least one Case window"
    );
    const win = ensured.planWindow ?? ensured.retrospectiveWindow!;
    assert.equal(win.planId, "PLAN-001");
    assert.equal(win.ticker, "TSLA");
    assert.equal(win.source, MARKET_REALITY_SOURCE_YAHOO);
    assert.equal(win.timeframe, "1d");
    assert.ok(win.bars.every((b) => Number.isFinite(b.volume)));

    const mem = await listMarketRealityWindowsForRead();
    assert.ok(mem.some((w) => w.planId === "PLAN-001"));

    const after = await getThesisT0Store().readAll();
    assert.deepEqual(after, before);
    ok("D/E. Case bind; T0 freezes unchanged");

    const geo = geometryFromPlanAndThesis(plan, thesis);
    const vm = buildMarketRealityViewModel({
      window: win,
      geometry: geo,
      exAnteIntegrity: "supported_legacy",
    });
    assert.equal(vm.available, true);
    assert.ok(vm.summary);
    assert.equal(vm.exAnteIntegrity, "supported_legacy");
    const ex = buildExAnteLegacyPacket(plan, thesis);
    assert.equal(ex.integrity, "supported_legacy");
    assert.equal(ex.decisionId, "DEC-tsla-pilot-wait");
    ok("Case 1 Reality view model");

    setMarketRealityWindowsForTests(null);
    setThesisT0StoreForTests(null);
  }

  // --- No warehouse: windows are Case-scoped ids only ---
  {
    setMarketRealityWindowsForTests([]);
    await ensureMarketRealityForPlan({ planId: "PLAN-001" });
    const rows = await listMarketRealityWindowsForRead();
    for (const r of rows) {
      assert.ok(r.planId);
      assert.ok(r.windowKind);
      assert.ok(r.bars.length < 500, "Case window not a mass dump");
    }
    setMarketRealityWindowsForTests(null);
    ok("No mass market database shape");
  }

  console.log("\nAll #12C market-reality MVP checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
