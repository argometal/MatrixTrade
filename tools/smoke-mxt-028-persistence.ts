/**
 * MXT 028 deploy smoke — persistence against live Supabase (non-TSLA).
 * Does not manufacture TSLA/OLE evidence.
 *
 * Run:
 *   npx tsx tools/smoke-mxt-028-persistence.ts
 *
 * Uses TRADES_STORE=supabase (writable). Cleans up smoke row when possible.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();
// Force writable Matrix store for smoke (not supabase-readonly).
process.env.TRADES_STORE = "supabase";
delete process.env.MXT_READ_ONLY;
process.env.IMPROVEMENT_HYPOTHESES_STORE = "supabase";

const SMOKE_ID = "IH-SMOKE-001";

async function main() {
  const {
    getImprovementHypotheses,
    getImprovementHypothesisById,
    upsertImprovementHypothesis,
    getImprovementHypothesesStoreMode,
  } = await import("../lib/improvement-hypothesis-store");
  const { linkPlanToImprovementHypothesis } = await import(
    "../lib/improvement-hypothesis-apply"
  );
  const { getPlaybooks } = await import("../lib/playbooks");

  console.log("storeMode=", getImprovementHypothesesStoreMode());

  const playbooksBefore = await getPlaybooks();
  const beforeIds = new Set(playbooksBefore.map((p) => p.id));

  const now = new Date().toISOString();
  await upsertImprovementHypothesis({
    id: SMOKE_ID,
    status: "testing",
    ticker: "SMOKE",
    componentId: "entry_quality",
    candidateLabel: "Smoke technique",
    candidateKind: "technique",
    applicability: "deploy smoke only — not a product Case",
    changeUnderTest: "Persistence round-trip for MXT 028 deploy smoke",
    originPlanId: "PLAN-SMOKE-ORIGIN",
    originMafExperimentId: "MAF-SMOKE-000",
    evidencePlanIds: [],
    authorizedForTestingAt: now,
    createdAt: now,
    updatedAt: now,
    source: "deploy_smoke_028",
  });

  const fresh = await getImprovementHypothesisById(SMOKE_ID);
  assert.ok(fresh, "fresh read after upsert");
  assert.equal(fresh.status, "testing");
  assert.equal(fresh.ticker, "SMOKE");
  assert.equal(fresh.originPlanId, "PLAN-SMOKE-ORIGIN");

  const all = await getImprovementHypotheses();
  assert.ok(
    all.some((h) => h.id === SMOKE_ID),
    "appears in readAll after fresh read"
  );

  const originBlocked = await linkPlanToImprovementHypothesis({
    hypothesisId: SMOKE_ID,
    planId: "PLAN-SMOKE-ORIGIN",
  });
  assert.ok(
    originBlocked.errors?.some((e) => /originating Case/i.test(e)),
    "origin cannot be independent evidence"
  );

  const playbooksAfter = await getPlaybooks();
  assert.equal(playbooksAfter.length, playbooksBefore.length);
  for (const p of playbooksAfter) {
    assert.ok(beforeIds.has(p.id), "no playbook ids invented");
  }

  // Soft cleanup — leave marker deleted by overwriting status rejected + note
  await upsertImprovementHypothesis({
    ...fresh,
    status: "rejected",
    notes: "deploy_smoke_028 cleanup — safe to ignore/delete",
    evidenceVerdictSetAt: new Date().toISOString(),
    evidenceVerdictNote: "smoke cleanup",
    updatedAt: new Date().toISOString(),
  });

  console.log("MXT 028 persistence smoke: PASS");
  console.log(
    JSON.stringify({
      id: SMOKE_ID,
      persisted: true,
      originBlock: true,
      playbookUnchanged: true,
      backendHint:
        "table if improvement_hypotheses exists, else mxt-artifacts storage",
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
