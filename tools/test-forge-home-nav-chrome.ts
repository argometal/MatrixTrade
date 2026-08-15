/**
 * Smoke: Forge Home portal wiring — A mark opens systems (replaces ···); no duplicate chrome A.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());

const portal = readFileSync(join(root, "app/apps/components/ForgeHomePortal.tsx"), "utf8");
const nav = readFileSync(join(root, "app/apps/components/ForgePortalNav.tsx"), "utf8");
const exchange = readFileSync(join(root, "app/components/AppExchangeActions.tsx"), "utf8");
const chrome = readFileSync(join(root, "app/components/AppChromeActions.tsx"), "utf8");
const page = readFileSync(join(root, "app/apps/page.tsx"), "utf8");

assert.match(portal, /href="\/apps"/, "brand A / wordmark must link Home → /apps");
assert.match(portal, /aria-label="ARGUS FORGE Home"/, "Home control labeled");
assert.match(portal, /ForgeQuickNavMenu/, "systems menu mounted on portal");
assert.match(portal, /Search across Forge/, "Forge search present");
assert.match(portal, /Applications/, "Applications section present");
assert.match(portal, /Continue/, "Continue section present");
assert.match(portal, /Forge Status/, "Forge Status card present");
assert.doesNotMatch(portal, /Open Forge Home/, "no Open Forge Home CTA copy on portal");
assert.doesNotMatch(nav, /Open Forge Home/, "no Open Forge Home CTA in menu");

assert.match(nav, /ForgeHomeMark size=\{dark \? 22 : 26\}/, "menu trigger is triangular A mark");
assert.match(nav, /aria-label="Open systems"/, "A mark opens systems menu");
assert.match(nav, /Forge Home/, "menu includes Forge Home row");
assert.doesNotMatch(nav, />···</, "··· trigger removed from systems menu");

assert.match(exchange, /ForgeQuickNavMenu/, "exchange uses A systems menu");
assert.doesNotMatch(exchange, /Open MTA/, "no flat MTA icon link");
assert.doesNotMatch(exchange, /Open ARGUS/, "no flat ARGUS icon link");
assert.doesNotMatch(exchange, /Open ArgusForge/, "no flat AF icon link");
assert.doesNotMatch(
  exchange,
  /href="\/apps"[\s\S]*ForgeQuickNavMenu|aria-label="ARGUS FORGE Home"/,
  "exchange no longer has a second standalone A home link"
);
assert.match(chrome, /ForgeQuickNavMenu/, "legacy chrome uses A systems menu");
assert.doesNotMatch(chrome, /aria-label="ARGUS FORGE Home"/, "legacy chrome has no second A home link");

assert.match(page, /ForgeHomePortal/, "apps page renders portal");

console.log("ok: forge-home-nav-chrome");
