/**
 * Smoke: ARGUS Logo / A mark = Home; Main nav no longer duplicates Home.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ARGUS_HOME_HREF,
  buildV2NavSections,
  isArgusHomePath,
} from "../lib/argus/v2/nav-items";

const root = join(process.cwd());
const sidebar = readFileSync(join(root, "app/argus/v2/components/V2Sidebar.tsx"), "utf8");
const mobile = readFileSync(join(root, "app/argus/v2/components/V2MobileMenuProvider.tsx"), "utf8");

assert.equal(ARGUS_HOME_HREF, "/argus/v2");
assert.equal(isArgusHomePath("/argus/v2"), true);
assert.equal(isArgusHomePath("/argus/v2/"), true);
assert.equal(isArgusHomePath("/argus/v2/inbox"), false);

const sections = buildV2NavSections({ inbox: 0, network: 0, topics: 0 });
const mainLabels = sections.find((s) => s.title === "Main")?.items.map((i) => i.label) ?? [];
assert.ok(!mainLabels.includes("Home"), "Home must not be a Main nav row");
assert.ok(mainLabels.includes("Inbox"), "Inbox remains in Main");

assert.match(sidebar, /href=\{ARGUS_HOME_HREF\}/, "sidebar Logo links Home");
assert.match(sidebar, /aria-label="Argus Home"/, "sidebar Home labeled");
assert.match(sidebar, /Logo \/ A mark = Home/, "sidebar documents Logo = Home");
assert.doesNotMatch(
  sidebar,
  /Home nav row is the single entry/,
  "old brand-only comment must be gone"
);

assert.match(mobile, /href=\{ARGUS_HOME_HREF\}/, "mobile drawer Logo links Home");
assert.match(mobile, /aria-label="Argus Home"/, "mobile Home labeled");

console.log("ok: argus-logo-home-nav");
