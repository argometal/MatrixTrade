/**
 * Events Orphans / Linked triage — homologated with Topics Orphans / Inbox Orphans.
 */
import assert from "node:assert/strict";
import {
  buildV2EventTriageCounts,
  eventRowIsOrphan,
  filterV2EventRows,
  resolveV2EventBrowseParams,
  type V2EventRow,
} from "../lib/argus/v2/event-browse-utils";

function row(partial: Partial<V2EventRow> & Pick<V2EventRow, "id" | "name">): V2EventRow {
  return {
    dateLabel: "JAN 1",
    timeLabel: "All day",
    typeLabel: "Event",
    attendeeInitials: [],
    isUpcoming: false,
    sortDate: "2026-01-01",
    scopeLinkIds: [],
    isOrphan: true,
    ...partial,
  };
}

const orphan = row({ id: "e1", name: "Lonely", isOrphan: true, scopeLinkIds: [] });
const linked = row({
  id: "e2",
  name: "Wired",
  isOrphan: false,
  scopeLinkIds: ["t1"],
  sortDate: "2026-02-01",
});
const archived = row({
  id: "e3",
  name: "Old",
  isOrphan: false,
  lifecycleStatus: "archived",
  scopeLinkIds: [],
  sortDate: "2025-01-01",
});

assert.equal(eventRowIsOrphan(orphan), true);
assert.equal(eventRowIsOrphan(linked), false);
assert.equal(eventRowIsOrphan(archived), false);

const counts = buildV2EventTriageCounts([orphan, linked, archived]);
assert.equal(counts.orphans, 1);
assert.equal(counts.linked, 1);
assert.equal(counts.archived, 1);

const orphans = filterV2EventRows([orphan, linked, archived], "orphans", "all");
assert.deepEqual(
  orphans.map((r) => r.id),
  ["e1"]
);

const latest = filterV2EventRows([orphan, linked, archived], "all", "all");
assert.deepEqual(
  latest.map((r) => r.id),
  ["e2", "e1", "e3"],
  "latest first"
);

assert.deepEqual(resolveV2EventBrowseParams("upcoming", undefined), {
  triage: "all",
  when: "upcoming",
});
assert.deepEqual(resolveV2EventBrowseParams("orphans", "past"), {
  triage: "orphans",
  when: "past",
});
assert.deepEqual(resolveV2EventBrowseParams("empty", undefined), {
  triage: "orphans",
  when: "all",
});

console.log("ok: event-orphans-homologate");
