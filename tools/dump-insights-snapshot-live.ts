/**
 * Live-store Insights Snapshot dump (same loaders as stats/page.tsx).
 * Run: npx tsx tools/dump-insights-snapshot-live.ts
 * Not a substitute for browser copy-path validation.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { buildInsightsCaseSpine } from "../lib/insights-case-spine";
import { buildInsightsSnapshotBrief } from "../lib/insights-snapshot";
import { getLearningOutcomes } from "../lib/learning-outcome-store";
import { getMafExperiments } from "../lib/maf-store";
import { getObservations } from "../lib/observation-store";
import { getPlans } from "../lib/plans";
import { getPlaybooks } from "../lib/playbooks";
import { getTrades } from "../lib/storage";
import {
  getTradesStoreMode,
  isSupabaseTradesStore,
} from "../lib/trades-json";

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

async function settled<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    console.error("loader failed:", err);
    return fallback;
  }
}

async function main() {
  console.log("STORE_MODE", {
    tradesStore: process.env.TRADES_STORE ?? "(unset)",
    mode: getTradesStoreMode(),
    isSupabase: isSupabaseTradesStore(),
  });

  const [
    learningOutcomes,
    plans,
    observations,
    mafExperiments,
    caseSpine,
    trades,
    playbooks,
  ] = await Promise.all([
    settled(getLearningOutcomes(), []),
    settled(getPlans(), []),
    settled(getObservations(), []),
    settled(getMafExperiments(), []),
    settled(buildInsightsCaseSpine(), []),
    settled(getTrades(), []),
    settled(getPlaybooks(), []),
  ]);

  const playbookNames = new Map(playbooks.map((p) => [p.id, p.name]));
  const pipelineInput = {
    learningOutcomes,
    plans,
    trades,
    observations,
    mafExperiments,
  };

  console.log("LIVE_STORE_COUNTS", {
    cases: caseSpine.length,
    plans: plans.length,
    los: learningOutcomes.length,
    obs: observations.length,
    maf: mafExperiments.length,
    trades: trades.length,
    playbooks: playbooks.length,
    plan009: plans.find((p) => p.id.toUpperCase() === "PLAN-009")?.id ?? null,
    case009:
      caseSpine.find((c) => c.planId.toUpperCase() === "PLAN-009")?.planId ??
      null,
  });

  const universe = buildInsightsSnapshotBrief({
    pipelineInput,
    caseSpine,
    playbookNames,
  });
  console.log("\n===== UNIVERSE LIVE SNAPSHOT =====\n");
  console.log(universe);

  const tsla = buildInsightsSnapshotBrief({
    pipelineInput,
    caseSpine,
    pipelineFilters: { ticker: "TSLA" },
    caseFilters: { ticker: "TSLA" },
    playbookNames,
  });
  console.log("\n===== TSLA LIVE SNAPSHOT =====\n");
  console.log(tsla);

  const focus001 = buildInsightsSnapshotBrief({
    pipelineInput,
    caseSpine,
    pipelineFilters: { ticker: "TSLA" },
    caseFilters: { ticker: "TSLA" },
    focusPlanId: "PLAN-001",
    playbookNames,
  });
  console.log("\n===== PLAN-001 LIVE TRACE =====\n");
  console.log(focus001);

  const focus009 = buildInsightsSnapshotBrief({
    pipelineInput,
    caseSpine,
    pipelineFilters: { ticker: "TSLA" },
    caseFilters: { ticker: "TSLA" },
    focusPlanId: "PLAN-009",
    playbookNames,
  });
  console.log("\n===== PLAN-009 LIVE TRACE =====\n");
  console.log(focus009);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
