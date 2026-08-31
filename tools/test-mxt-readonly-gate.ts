/**
 * Prompt #12D — read-only persistence gate smoke test.
 */
require("./register-local-env.cjs");

import assert from "node:assert/strict";
import { createSupabasePlansStore } from "../lib/plans-store/supabase";
import { isMxtReadOnlyMode } from "../lib/mxt-readonly";

async function main() {
  process.env.MXT_READ_ONLY = "1";
  assert.equal(isMxtReadOnlyMode(), true);
  const store = createSupabasePlansStore();
  await assert.rejects(
    () =>
      store.upsert({
        id: "PLAN-RO-TEST",
        ticker: "TEST",
        status: "watching",
        analysisTimeframes: ["1D"],
        entryTimeframe: "1D",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    /MXT_READ_ONLY/
  );
  console.log("test-mxt-readonly-gate: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
