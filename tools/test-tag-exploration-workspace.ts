/**
 * Tags exploration: evidence map answers "why does this tag exist?"
 * without inventing scores or leaving the workspace data model.
 */
import assert from "node:assert/strict";
import type { ArgusData, Entity, InboxItem, Log } from "../lib/argus/types";
import {
  buildV2FocusTagPortfolio,
  buildV2TagEvidenceMap,
} from "../lib/argus/v2/loaders";

function entity(partial: Partial<Entity> & Pick<Entity, "id" | "name" | "type">): Entity {
  return {
    notes: "",
    linkedEntityIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  } as Entity;
}

const org = entity({ id: "o1", name: "Exxon", type: "company" });
const project = entity({ id: "p1", name: "Exxon Project", type: "project", linkedEntityIds: ["o1"] });
const person = entity({ id: "h1", name: "Alex", type: "person" });

const log: Log = {
  id: "l1",
  title: "Follow-up call",
  body: "Discussed delays",
  date: "2026-08-01",
  kind: "note",
  topics: ["supply-risk"],
  entityIds: ["o1", "p1", "h1"],
  private: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
} as Log;

const inbox: InboxItem = {
  id: "i1",
  subject: "Risk note",
  from: "ops@example.com",
  rawText: "supply",
  receivedAt: "2026-08-05T12:00:00.000Z",
  status: "pending",
  topics: ["supply-risk"],
  linkedEntityIds: ["p1"],
  private: false,
  createdAt: "2026-08-05T12:00:00.000Z",
} as InboxItem;

const data = {
  entities: [org, project, person],
  logs: [log],
  inboxItems: [],
  attachments: [],
  runbooks: [],
  signalTags: ["supply-risk", "watch-empty"],
  version: 3 as const,
} satisfies ArgusData;

const map = buildV2TagEvidenceMap(data, [inbox], true);
const ctx = map["supply-risk"];
assert.ok(ctx, "evidence context for supply-risk");
assert.equal(ctx.evidence.length, 2, "note + email evidence");
assert.ok(ctx.organizations.some((e) => e.id === "o1"));
assert.ok(ctx.projects.some((e) => e.id === "p1"));
assert.ok(ctx.people.some((e) => e.id === "h1"));
assert.ok(map["watch-empty"], "Focus-only tag still has a context shell");
assert.equal(map["watch-empty"].evidence.length, 0);

const portfolio = buildV2FocusTagPortfolio(data, [inbox], true, "2026-08-08");
const first = portfolio[0];
assert.ok(first);
// Exploration sort is not Focus-first: supply-risk (has evidence) should outrank empty Focus-only
// when scores differ — supply-risk has activity.
assert.equal(first.name, "supply-risk");

console.log("ok: tag-exploration-workspace");
