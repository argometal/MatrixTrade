/**
 * Smoke: Forge Home portal wiring — A = Home, no Open Forge Home, ··· quick-nav.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());

const portal = readFileSync(join(root, "app/apps/components/ForgeHomePortal.tsx"), "utf8");
const nav = readFileSync(join(root, "app/apps/components/ForgePortalNav.tsx"), "utf8");
const exchange = readFileSync(join(root, "app/components/AppExchangeActions.tsx"), "utf8");
const page = readFileSync(join(root, "app/apps/page.tsx"), "utf8");

assert.match(portal, /href="\/apps"/, "A mark / brand must link Home → /apps");
assert.match(portal, /aria-label="ARGUS FORGE Home"/, "Home control labeled");
assert.match(portal, /ForgeQuickNavMenu/, "··· quick nav mounted on portal");
assert.match(portal, /Search across Forge/, "Forge search present");
assert.match(portal, /Applications/, "Applications section present");
assert.match(portal, /Continue/, "Continue section present");
assert.match(portal, /Forge Status/, "Forge Status card present");
assert.doesNotMatch(portal, /Open Forge Home/, "no Open Forge Home CTA copy on portal");
assert.doesNotMatch(nav, /Open Forge Home/, "no Open Forge Home CTA in menu");
assert.match(nav, /Home lives on the A mark/, "menu documents Home = A mark");

assert.match(exchange, /ForgeQuickNavMenu/, "exchange uses ··· menu");
assert.doesNotMatch(exchange, /Open MTA/, "no flat MTA icon link");
assert.doesNotMatch(exchange, /Open ARGUS/, "no flat ARGUS icon link");
assert.doesNotMatch(exchange, /Open ArgusForge/, "no flat AF icon link");
assert.match(exchange, /href="\/apps"/, "exchange A/home hops to Forge Home");

assert.match(page, /ForgeHomePortal/, "apps page renders portal");

console.log("ok: forge-home-nav-chrome");
