/**
 * Phone viewport chrome — shell must match header/tabbar tokens (no double padding).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const css = readFileSync(join(root, "app/globals.css"), "utf8");
const trading = readFileSync(join(root, "app/(trading)/layout.tsx"), "utf8");
const shell = readFileSync(join(root, "app/(trading)/PreviewRouteLayout.tsx"), "utf8");
const planMap = readFileSync(
  join(root, "app/components/planning-preview/PlanLevelsSidePanel.tsx"),
  "utf8"
);
const header = readFileSync(join(root, "app/components/preview/PreviewMobileHeader.tsx"), "utf8");
const nav = readFileSync(join(root, "app/components/preview/PreviewMobileNav.tsx"), "utf8");
const rootLayout = readFileSync(join(root, "app/layout.tsx"), "utf8");

assert.match(css, /--mt-mobile-header:\s*3\.5rem/, "header token");
assert.match(css, /--mt-mobile-tabbar:\s*4\.5rem/, "tabbar token");
assert.match(css, /html\s*\{[\s\S]*overflow-x:\s*hidden/, "html locks horizontal scroll");
assert.match(css, /body\s*\{[\s\S]*overflow-x:\s*hidden/, "body locks horizontal scroll");

assert.match(rootLayout, /viewportFit:\s*"cover"/, "root viewport-fit cover");
assert.match(rootLayout, /max-w-\[100vw\]/, "root body max width");

assert.doesNotMatch(
  trading,
  /pt-14 pb-\[calc\(4\.5rem/,
  "trading layout must not double-pad fixed shell"
);
assert.match(trading, /min-h-dvh/, "trading uses dvh");
assert.match(trading, /overflow-x-hidden/, "trading locks x overflow");

assert.match(shell, /--mt-mobile-header/, "preview shell uses header token");
assert.match(shell, /--mt-mobile-tabbar/, "preview shell uses tabbar token");
assert.doesNotMatch(shell, /3\.75rem/, "old undersized bottom offset removed");

assert.match(planMap, /--mt-mobile-header/, "plan map aligns to header token");
assert.match(planMap, /--mt-mobile-tabbar/, "plan map aligns to tabbar token");

assert.match(header, /h-\[var\(--mt-mobile-header\)\]/, "header height = token");
assert.match(nav, /--mt-mobile-tabbar/, "nav height = token");

console.log("ok: phone-viewport-chrome");
