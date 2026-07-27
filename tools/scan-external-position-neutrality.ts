/**
 * Fail if ticker-specific / employment-share terms appear in External Position
 * infrastructure. Patterns are assembled from parts so this file stays neutral.
 *
 * Invoked by tools/test-external-positions-26-13.ts
 * Standalone: npx tsx tools/scan-external-position-neutrality.ts
 */
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** Paths relative to repo root that must stay ticker-neutral. */
const SCAN_TARGETS: string[] = [
  "lib/external-position.ts",
  "lib/external-position-types.ts",
  "lib/external-position-store.ts",
  "lib/external-position-validate.ts",
  "lib/external-position-apply.ts",
  "lib/external-positions-store",
  "lib/capital-account.ts",
  "app/components/planning-preview/CapitalPlannerPanel.tsx",
  "app/(trading)/(preview)/planning/capital",
  "supabase/external-positions.sql",
  "md/matrix/external-positions-26-13.md",
  "tools/test-external-positions-26-13.ts",
  "tools/scan-external-position-neutrality.ts",
  "data/external-positions.json",
  // Apply samples / wiring that must not hard-code issuer tickers for EP
  "lib/ai-block.ts",
  "lib/apply-schema-contract.ts",
  "lib/ai-bridge-types.ts",
  "lib/apply-trading-inbox.ts",
  // Capital Planner foundation (26-15)
  "lib/capital-types.ts",
  "lib/capital-account.ts",
  "lib/capital-configuration.ts",
  "lib/capital-ledger.ts",
  "lib/capital-reservation.ts",
  "lib/capital-planner-store.ts",
  "lib/capital-validate.ts",
  "lib/capital-apply.ts",
  "lib/scout-funding.ts",
  "lib/invested-scout-capital.ts",
  "md/matrix/capital-planner-26-15.md",
  "supabase/capital-planner.sql",
  "tools/test-capital-planner-26-15.ts",
  "data/capital-planner.json",
  // Capital Settings (26-1A)
  "lib/capital-balance-asof.ts",
  "lib/capital-settings-proposal.ts",
  "lib/capital-settings-snapshot.ts",
  "app/components/settings/CapitalSettingsPanel.tsx",
  "app/(trading)/(preview)/settings/capital",
  "md/matrix/capital-settings-26-1a.md",
  "tools/test-capital-settings-26-1a.ts",
];

type ProhibitedRule = { label: string; re: RegExp };

function buildProhibitedRules(): ProhibitedRule[] {
  // Assemble from parts — never store full prohibited literals as contiguous source text.
  const ticker = ["S", "L", "B"].join("");
  const company = ["Schlum", "berger"].join("");
  const employeeStock = ["employee", "stock"].join(" ");
  const employerStock = ["employer", "stock"].join(" ");
  const companyShares = ["company", "shares"].join(" ");
  return [
    { label: ticker, re: new RegExp(`\\b${ticker}\\b`, "i") },
    { label: company, re: new RegExp(company, "i") },
    {
      label: employeeStock,
      re: new RegExp(employeeStock.replace(" ", "\\s+"), "i"),
    },
    {
      label: employerStock,
      re: new RegExp(employerStock.replace(" ", "\\s+"), "i"),
    },
    {
      label: companyShares,
      re: new RegExp(companyShares.replace(" ", "\\s+"), "i"),
    },
  ];
}

async function* walkFiles(relPath: string): AsyncGenerator<string> {
  const abs = path.join(ROOT, relPath);
  let st;
  try {
    st = await fs.stat(abs);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return;
    throw err;
  }
  if (st.isFile()) {
    yield relPath;
    return;
  }
  if (!st.isDirectory()) return;
  const entries = await fs.readdir(abs, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const child = path.join(relPath, entry.name);
    if (entry.isDirectory()) yield* walkFiles(child);
    else if (entry.isFile()) yield child;
  }
}

function matchesProhibited(
  text: string,
  rules: ProhibitedRule[]
): { label: string; line: number; excerpt: string }[] {
  const hits: { label: string; line: number; excerpt: string }[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of rules) {
      if (rule.re.test(line)) {
        hits.push({
          label: rule.label,
          line: i + 1,
          excerpt: line.trim().slice(0, 160),
        });
      }
    }
  }
  return hits;
}

export async function scanExternalPositionNeutrality(): Promise<void> {
  const rules = buildProhibitedRules();
  const violations: string[] = [];

  for (const target of SCAN_TARGETS) {
    for await (const rel of walkFiles(target)) {
      for (const rule of rules) {
        if (rule.re.test(path.basename(rel))) {
          violations.push(
            `${rel}: filename contains prohibited term "${rule.label}"`
          );
        }
      }
      const text = await fs.readFile(path.join(ROOT, rel), "utf-8");
      for (const hit of matchesProhibited(text, rules)) {
        violations.push(
          `${rel}:${hit.line}: prohibited "${hit.label}" — ${hit.excerpt}`
        );
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `External Position infrastructure must stay ticker-neutral.\n${violations.join("\n")}`
  );
}

async function main() {
  await scanExternalPositionNeutrality();
  console.log("scan-external-position-neutrality: ok");
}

const invokedDirectly = process.argv.some((arg) =>
  arg.includes("scan-external-position-neutrality")
);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
