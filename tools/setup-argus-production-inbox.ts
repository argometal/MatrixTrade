/**
 * Point ARGUS email Worker at Vercel production and sync required Vercel env vars.
 *
 * Prerequisites:
 *   1. Run supabase/argus-inbox.sql, argus-journal.sql, and argus-protection.sql in Supabase SQL editor
 *   2. .env.local has SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ARGUS_INBOX_TOKEN
 *
 * Usage:
 *   npx tsx tools/setup-argus-production-inbox.ts
 *   npx tsx tools/setup-argus-production-inbox.ts --skip-vercel
 */
import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import { resolve } from "path";
import { execSync } from "child_process";

const PRODUCTION_APP = process.env.ARGUS_PRODUCTION_URL?.trim() || "https://matrix-trade-theta.vercel.app";
const INTAKE_URL = `${PRODUCTION_APP.replace(/\/$/, "")}/api/argus/email-inbox`;

function loadEnvLocal(): Record<string, string> {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) out[key] = value;
  }
  return out;
}

function runVercel(args: string[]): void {
  const vercel = resolve(process.cwd(), "tools", "vercel-env.bat");
  const result = spawnSync("cmd.exe", ["/c", vercel, ...args], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function updateEnv(name: string, value: string, target: string, sensitive = false): void {
  const args = ["env", "update", name, target, "--value", value, "--yes"];
  if (sensitive) args.push("--sensitive");
  console.log(`Updating Vercel ${name} (${target})...`);
  runVercel(args);
}

async function main(): Promise<void> {
  const skipVercel = process.argv.includes("--skip-vercel");
  const env = loadEnvLocal();

  const supabaseUrl = env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const inboxToken = env.ARGUS_INBOX_TOKEN;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local");
  }
  if (!inboxToken) {
    throw new Error("ARGUS_INBOX_TOKEN required in .env.local");
  }

  console.log("=== ARGUS production inbox (cloud-first) ===");
  console.log(`Intake URL: ${INTAKE_URL}`);
  console.log(`Inbox UI:   ${PRODUCTION_APP}/argus/inbox`);
  console.log("");

  if (!skipVercel) {
    for (const target of ["production", "preview"]) {
      updateEnv("SUPABASE_URL", supabaseUrl, target);
      updateEnv("SUPABASE_SERVICE_ROLE_KEY", supabaseKey, target, true);
      updateEnv("ARGUS_INBOX_STORE", "supabase", target);
      updateEnv("ARGUS_JOURNAL_STORE", "supabase", target);
      updateEnv("ARGUS_INBOX_TOKEN", inboxToken, target, true);
      if (env.ARGUS_PASSWORD) updateEnv("ARGUS_PASSWORD", env.ARGUS_PASSWORD, target, true);
    }
    console.log("\nRedeploy Vercel production after env sync.");
  }

  console.log("\nDeploying Worker → Vercel production...");
  execSync(`npx tsx tools/deploy-argus-email-worker.ts ${INTAKE_URL}`, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, PATH: `c:\\Tools\\runtime\\node;${process.env.PATH ?? ""}` },
  });

  console.log("\nDone. Verify:");
  console.log("  1. Run supabase/argus-setup.sql in Supabase SQL editor (once) — or argus-inbox.sql + argus-journal.sql + argus-protection.sql in order");
  console.log("  2. npx tsx tools/verify-argus-inbox-schema.ts");
  console.log(`  3. npx tsx tools/test-email-inbox.ts ${PRODUCTION_APP}`);
  console.log("  4. Send real email to argus@argometal.dev");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
