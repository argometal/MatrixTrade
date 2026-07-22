import assert from "node:assert/strict";
import {
  compareScoutCasesByPlannedRR,
  formatScoutCasePlannedRR,
  sortScoutCasesByPlannedRR,
} from "../lib/scout-case-sort";

const sorted = sortScoutCasesByPlannedRR([
  { ticker: "AMZN", plannedRR: 2.1 },
  { ticker: "TSLA", plannedRR: 5.0 },
  { ticker: "SHOP" },
  { ticker: "NFLX", plannedRR: 3.4 },
  { ticker: "ORPH", orphan: true, plannedRR: 9 },
  { ticker: "MSFT", plannedRR: 3.4 },
]);

assert.deepEqual(
  sorted.map((c) => c.ticker),
  ["TSLA", "MSFT", "NFLX", "AMZN", "SHOP", "ORPH"],
  "highest R first; missing R before orphans; ticker tie-break"
);

assert.equal(compareScoutCasesByPlannedRR({ ticker: "A", plannedRR: 2 }, { ticker: "B", plannedRR: 4 }), 2);
assert.equal(formatScoutCasePlannedRR(3.25), "3.3R");
assert.equal(formatScoutCasePlannedRR(undefined), null);

console.log("test-scout-case-sort: ok");
