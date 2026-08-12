/**
 * Smoke: Topic Chronicle shows tags + Open Event; Links inspect has clear Open CTAs.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());
const stream = readFileSync(join(root, "lib/argus/v2/evidence-stream.ts"), "utf8");
const loaders = readFileSync(join(root, "lib/argus/v2/topic-loaders.ts"), "utf8");
const topic = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicDetailPanel.tsx"),
  "utf8"
);
const list = readFileSync(
  join(root, "app/argus/v2/components/V2ChronicleSelectableList.tsx"),
  "utf8"
);

assert.match(stream, /tags\?: string\[\]/, "evidence stream carries tags");
assert.match(stream, /sourceEventHref\?: string/, "evidence stream carries Event href");
assert.match(loaders, /sourceEventHref:/, "Topic rollup sets sourceEventHref");
assert.match(topic, /Open Event/, "Topic Chronicle/inspect expose Open Event");
assert.match(topic, /View Event Chronicle/, "Links inspect has View Event Chronicle CTA");
assert.match(topic, /item\.tags\?\.slice/, "Topic Chronicle renders tag chips");
assert.match(list, /footer\?:/, "Chronicle list supports footer outside primary href");

console.log("ok: topic-chronicle-tags-event-link");
