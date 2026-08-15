/**
 * Home Intelligence runbook quick-access ranking.
 */
import assert from "node:assert/strict";
import type { Runbook, RunbookProgress } from "../lib/argus/types";
import { buildV2HomeRunbookAccess } from "../lib/argus/v2/home-runbook-access";

function rb(partial: Partial<Runbook> & Pick<Runbook, "id" | "title">): Runbook {
  return {
    items: [{ id: "i1", text: "Check", done: false, doneAt: "", type: "item", subtasks: [] }],
    linkedEntityIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

const runbooks = [
  rb({ id: "r-old", title: "Old template", updatedAt: "2026-06-01T00:00:00.000Z" }),
  rb({ id: "r-hot", title: "Hot checklist", updatedAt: "2026-08-10T00:00:00.000Z" }),
  rb({ id: "r-multi", title: "Multi-scope", updatedAt: "2026-07-01T00:00:00.000Z" }),
];

const progress: RunbookProgress[] = [
  {
    id: "r-multi:e1",
    runbookId: "r-multi",
    entityId: "e1",
    checks: {},
    closed: false,
    updatedAt: "2026-08-14T00:00:00.000Z",
  },
  {
    id: "r-multi:e2",
    runbookId: "r-multi",
    entityId: "e2",
    checks: {},
    closed: false,
    updatedAt: "2026-08-13T00:00:00.000Z",
  },
  {
    id: "r-hot:e1",
    runbookId: "r-hot",
    entityId: "e1",
    checks: {},
    closed: false,
    updatedAt: "2026-08-12T00:00:00.000Z",
  },
];

const access = buildV2HomeRunbookAccess(runbooks, progress, 5);
assert.equal(access.recent[0].id, "r-multi", "most recent activity wins recent list");
assert.equal(access.frequent[0].id, "r-multi", "most scopes wins frequent list");
assert.ok(access.frequent[0].meta.includes("2 scopes"));
assert.ok(access.recent.some((row) => row.id === "r-hot"));

const empty = buildV2HomeRunbookAccess([], [], 5);
assert.deepEqual(empty, { recent: [], frequent: [] });

const homeClient = require("node:fs").readFileSync(
  require("node:path").join(process.cwd(), "app/argus/v2/components/V2HomeClient.tsx"),
  "utf8"
);
assert.match(
  homeClient,
  /<aside[\s\S]*V2HomeRunbooksAccess/,
  "Home Runbooks sit in the side column, not above the Treemap"
);
assert.doesNotMatch(
  homeClient,
  /intelligence"[\s\S]*V2HomeRunbooksAccess[\s\S]*V2HomeIntelligencePanel/,
  "Home Runbooks must not stack on top of the Treemap panel"
);

console.log("ok: home-runbook-access");
