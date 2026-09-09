import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

const page = readFileSync(
  join(root, "app/(trading)/(preview)/planning/case/page.tsx"),
  "utf8"
);
const client = readFileSync(
  join(root, "app/components/case-review/CaseReviewClient.tsx"),
  "utf8"
);

assert.match(page, /buildFocusedCaseReport/);
assert.match(page, /focusedCaseReport=\{focusedCaseReport\}/);
assert.match(client, /function OpportunityPathPanel/);
assert.match(client, /data-case-opportunity-path/);
assert.match(client, /data-case-opportunity-checkpoint/);
assert.match(client, /<h2 className="text-sm font-medium text-zinc-200">Opportunity Path<\/h2>/);
assert.match(client, /Opportunity Path describes what happened after the original/);

console.log("test-case-review-opportunity-path-wiring: PASS");
