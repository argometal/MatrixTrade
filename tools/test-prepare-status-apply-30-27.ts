/**
 * 30-27 — Prepare status update → clipboard + Control Apply handoff.
 * Run: npm run test:prepare-status-apply
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTROL_APPLY_DRAFT_KEY,
  clearControlApplyDraft,
  consumeControlApplyDraft,
  stashControlApplyDraft,
} from "../lib/control-apply-draft";

const root = join(__dirname, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

{
  // sessionStorage stub for Node
  const store = new Map<string, string>();
  (globalThis as { sessionStorage?: Storage }).sessionStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;
  (globalThis as { window?: unknown }).window = globalThis;

  stashControlApplyDraft('{"type":"decision-update"}');
  assert.equal(
    store.get(CONTROL_APPLY_DRAFT_KEY),
    '{"type":"decision-update"}'
  );
  const once = consumeControlApplyDraft();
  assert.equal(once, '{"type":"decision-update"}');
  assert.equal(consumeControlApplyDraft(), null);
  stashControlApplyDraft("  ");
  assert.equal(store.has(CONTROL_APPLY_DRAFT_KEY), false);
  stashControlApplyDraft("{ ok: true }");
  clearControlApplyDraft();
  assert.equal(store.has(CONTROL_APPLY_DRAFT_KEY), false);
}

{
  const planning = read("app/components/planning-preview/PreviewPlanning.tsx");
  assert.match(planning, /useControlPanel/);
  assert.match(planning, /stashControlApplyDraft/);
  assert.match(planning, /openPanel\(\{\s*step:\s*"apply",\s*applyJson:\s*json/);
  assert.match(planning, /const copied = await copyText\(json\)/);
  assert.match(planning, /setOperationalClipboardOk\(copied\)/);
  assert.match(
    planning,
    /JSON copied — Control → Apply opened\. Validate → Accept\./
  );
  assert.match(planning, /Clipboard blocked/);
  assert.match(planning, /data-scout-operational-copy-json/);
  assert.match(planning, /Copy JSON/);
  assert.match(planning, /data-scout-operational-apply-link/);
  assert.match(planning, /Open Apply/);
  assert.doesNotMatch(planning, /href=\"\/control\"/);
  // Must not claim copied when clipboard fails
  assert.doesNotMatch(
    planning,
    /copied\s*\?\s*"Proposal ready — JSON copied[\s\S]*clipboard blocked/
  );
}

{
  const provider = read(
    "app/components/control-panel/MatrixControlPanelProvider.tsx"
  );
  assert.match(provider, /applyJson\?: string/);
  assert.match(provider, /stashControlApplyDraft\(applyJson\)/);
  assert.match(provider, /consumePendingApplyJson/);
}

{
  const apply = read("app/components/control-panel/ControlPanelUpdate.tsx");
  assert.match(apply, /consumeControlApplyDraft/);
  assert.match(apply, /consumePendingApplyJson/);
  assert.match(apply, /setApplyInput\(draft\)/);
}

{
  const draft = read("lib/control-apply-draft.ts");
  assert.match(draft, /CONTROL_APPLY_DRAFT_KEY/);
  assert.match(draft, /sessionStorage/);
}

console.log("test-prepare-status-apply-30-27: ok");
