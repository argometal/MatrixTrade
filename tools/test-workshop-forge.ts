import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());

const files = [
  "lib/workshop/agent-launcher.server.ts",
  "app/api/forge/workshop/agents/route.ts",
  "app/forge/workshop/page.tsx",
  "apps/forge/workshop-agents/TBCompanion/server.js",
  "workshop-agents/MouseSimulator/server.js",
  "workshop-agents/README.md",
];

for (const f of files) {
  assert.ok(readFileSync(join(root, f), "utf8").length > 10, `missing ${f}`);
}

const tbcServer = readFileSync(
  join(root, "workshop-agents/TBCompanion/server.js"),
  "utf8"
);
assert.match(tbcServer, /applyForgeCors/, "TBCompanion agent has Forge CORS");

console.log("ok: workshop-forge");
