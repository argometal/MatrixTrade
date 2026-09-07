import { buildCaseSnapshot } from "../lib/case-snapshot";

async function run() {
  const planIds = process.argv.slice(2);
  const targets = planIds.length > 0 ? planIds : ["PLAN-001"];
  for (const planId of targets) {
    const text = await buildCaseSnapshot(planId);
    if (!text) {
      process.stdout.write(
        `=== CASE SNAPSHOT ===\n\nPLAN ID: ${planId}\nSTATUS: UNAVAILABLE\nREASON: Plan not found in current canonical plan store.\n\n=== END CASE SNAPSHOT ===\n`
      );
      continue;
    }
    process.stdout.write(`${text}\n`);
  }
}

void run();
