/**
 * Smoke: Topic → Tags provenance hierarchy (binder / Topic-direct / By Event / Trackers).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());
const topic = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicDetailPanel.tsx"),
  "utf8"
);
const binder = readFileSync(join(root, "app/argus/v2/components/V2BinderTagsTab.tsx"), "utf8");
const loaders = readFileSync(join(root, "lib/argus/v2/topic-loaders.ts"), "utf8");
const types = readFileSync(join(root, "lib/argus/v2/topic-browse-utils.ts"), "utf8");

assert.match(topic, /attachedHeading="Topic Tags"/, "Topic Tags binder heading");
assert.match(topic, /provenance=\{\{/, "Topic Tags uses provenance layout");
assert.match(topic, /directHeading:\s*"Tags in this Topic"/, "Tags in this Topic section");
assert.match(topic, /topicDirectEvidenceTagCounts/, "UI reads Topic-direct evidence counts");
assert.match(topic, /byEventHeading:\s*"By Event"/, "By Event section");
assert.match(topic, /event\.eventTags/, "Event Tags row from split field");
assert.match(topic, /event\.noteTags/, "On Notes row from split field");
assert.match(topic, /href:\s*event\.href/, "Open Event uses loader href");
assert.doesNotMatch(
  topic,
  /label:\s*"Notes on this Topic"/,
  "legacy aggregate Notes on this Topic group removed"
);
assert.doesNotMatch(
  topic,
  /evidenceTagCounts\.map\(\(row\) => \(\{/,
  "evidenceTagCounts is not the primary inventory"
);

assert.match(binder, /V2BinderTagProvenance/, "binder tab exports provenance type");
assert.match(binder, /Event Tags/, "By Event shows Event Tags label");
assert.match(binder, /On Notes/, "By Event shows On Notes label");
assert.match(binder, /Open Event/, "Open Event CTA");

assert.match(loaders, /topicDirectEvidenceTagCounts/, "loader exposes Topic-direct slice");
assert.match(loaders, /eventTags,/, "loader exposes Event binder tags");
assert.match(loaders, /noteTags,/, "loader exposes Event Note tags");
assert.match(types, /topicDirectEvidenceTagCounts/, "detail type includes Topic-direct");
assert.match(types, /noteTags:\s*string\[\]/, "detail type includes noteTags");

console.log("ok: topic-tags-provenance-ui");
