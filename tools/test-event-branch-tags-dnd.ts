/**
 * Smoke: Event Tags — drag branch Tags onto Linked to this Event.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const binder = readFileSync(join(root, "app/argus/v2/components/V2BinderTagsTab.tsx"), "utf8");
const eventPanel = readFileSync(
  join(root, "app/argus/v2/browse/events/components/V2EventDetailPanel.tsx"),
  "utf8"
);
const eventEd = readFileSync(
  join(root, "app/argus/v2/browse/events/components/V2EventTagEditor.tsx"),
  "utf8"
);
const help = readFileSync(join(root, "lib/argus/v2/help-topics.ts"), "utf8");

assert.match(binder, /ARGUS_BINDER_TAG_MIME/, "MIME type for binder Tag drag");
assert.match(binder, /onAttachTag\?/, "Binder Tags tab accepts attach callback");
assert.match(binder, /draggableToAttach/, "Branch rows can expose drag handle");
assert.match(binder, /Drop to link this Tag/, "Drop zone hint when dragging");
assert.match(binder, /Drag ⠿ from Tags in this branch/, "Idle drag hint on Linked section");

assert.match(eventEd, /V2EventTagEditorHandle/, "Editor exposes attach handle");
assert.match(eventEd, /attachTag:/, "Editor attachTag API");
assert.match(eventEd, /forwardRef/, "Editor is forwardRef for drop wiring");

assert.match(eventPanel, /eventTagEditorRef/, "Event detail holds editor ref");
assert.match(eventPanel, /onAttachTag=\{\(tag\) => eventTagEditorRef/, "Event wires branch drop → editor");
assert.match(eventPanel, /ref=\{eventTagEditorRef\}/, "Event Tag editor receives ref");

assert.match(help, /Drag ⠿ onto Linked to this Event/, "Help documents branch → Linked drag");

console.log("ok: event-branch-tags-dnd");
