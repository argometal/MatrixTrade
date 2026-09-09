require("./register-local-env.cjs");

import { buildCaseSnapshot } from "../lib/case-snapshot";

async function run() {
  const caseIds = process.argv.slice(2);
  const targets = caseIds.length > 0 ? caseIds : ["PLAN-001"];
  for (const caseId of targets) {
    const text = await buildCaseSnapshot(caseId);
    if (!text) {
      process.stdout.write(
        `=== CASE SNAPSHOT ===\n\nCASE ID: ${caseId}\nSTATUS: UNAVAILABLE\nREASON: Case identity not found in current canonical Case universe.\n\n=== END CASE SNAPSHOT ===\n`
      );
      continue;
    }
    process.stdout.write(`${text}\n`);
  }
}

void run();
