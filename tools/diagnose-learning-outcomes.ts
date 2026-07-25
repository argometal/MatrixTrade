/**
 * Read-only Learning Outcome durability diagnostic.
 *   npm run diagnose:learning-outcomes
 */
import { getLearningOutcomes } from "../lib/learning-outcome-store";
import { getPlans } from "../lib/plans";
import { getTrades } from "../lib/storage";
import { getObservations } from "../lib/observation-store";
import { diagnoseLearningOutcomeDurability } from "../lib/learning-outcome-diagnostics";
import { getLearningOutcomesStoreMode } from "../lib/learning-outcomes-store";
import { sanitizeLearningSyncError } from "../lib/plan-outcome-learning-sync";

async function main() {
  try {
    const mode = getLearningOutcomesStoreMode();
    const [plans, trades, learningOutcomes, observations] = await Promise.all([
      getPlans(),
      getTrades(),
      getLearningOutcomes(),
      getObservations(),
    ]);
    const issues = diagnoseLearningOutcomeDurability({
      plans,
      trades,
      learningOutcomes,
      observations,
    });
    console.log(
      JSON.stringify(
        {
          storeMode: mode,
          plans: plans.length,
          trades: trades.length,
          learningOutcomes: learningOutcomes.length,
          observations: observations.length,
          issueCount: issues.length,
          issues,
          note: "Read-only. Repair plan outcomes via Planning → Retry Learning Sync.",
        },
        null,
        2
      )
    );
  } catch (err) {
    console.error(sanitizeLearningSyncError(err));
    process.exit(1);
  }
}

main();
