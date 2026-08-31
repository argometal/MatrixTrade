/**
 * Prompt #12D — report MXT entity counts from active stores.
 * Run: npm run mxt:data-counts
 */
require("./register-local-env.cjs");

import { getPlans } from "../lib/plans";
import { getStockTheses } from "../lib/stock-theses";
import { readTradesJson } from "../lib/trades-json";
import { getObservationsStore } from "../lib/observations-store";
import { getLearningOutcomesStore } from "../lib/learning-outcomes-store";
import { getThesisT0Store } from "../lib/thesis-t0-store";
import { getMafExperiments } from "../lib/maf-store";
import { isSupabaseTradesStore, getTradesStoreMode } from "../lib/trades-json";
import { isMxtReadOnlyMode } from "../lib/mxt-readonly";

async function main() {
  const [plans, theses, trades, observations, outcomes, freezes, maf] =
    await Promise.all([
      getPlans(),
      getStockTheses(),
      readTradesJson(),
      getObservationsStore().readAll(),
      getLearningOutcomesStore().readAll(),
      getThesisT0Store().readAll(),
      getMafExperiments(),
    ]);

  const scoutDecisions = plans.filter((p) => p.decision?.verdict).length;

  console.log("MXT_DATA_COUNTS");
  console.log("store_mode:", getTradesStoreMode());
  console.log("supabase:", isSupabaseTradesStore());
  console.log("read_only:", isMxtReadOnlyMode());
  console.log("Plans:", plans.length);
  console.log("Stock Theses:", theses.length);
  console.log("Scout Decisions:", scoutDecisions);
  console.log("Trades:", trades.length);
  console.log("Observations:", observations.length);
  console.log("Learning Outcomes:", outcomes.length);
  console.log("MAF:", maf.length);
  console.log("T0 freezes:", freezes.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
