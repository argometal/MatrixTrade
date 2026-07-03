/**
 * Configure Worker secrets and deploy argus-email-intake.
 * Usage: npx tsx tools/deploy-argus-email-worker.ts <ARGUS_INTAKE_URL>
 */
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { resolve } from "path";

const intakeUrl = process.argv[2];
if (!intakeUrl?.startsWith("https://")) {
  console.error("Usage: npx tsx tools/deploy-argus-email-worker.ts https://YOUR-TUNNEL/api/argus/email-inbox");
  process.exit(1);
}

function loadInboxToken(): string {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const line = raw.split("\n").find((l) => l.startsWith("ARGUS_INBOX_TOKEN="));
  if (!line) throw new Error("ARGUS_INBOX_TOKEN missing in .env.local");
  return line.slice("ARGUS_INBOX_TOKEN=".length).trim();
}

const bridgeDir = resolve(process.cwd(), "argus-email-bridge");
const token = loadInboxToken();
const nodePath = "c:\\Tools\\runtime\\node";
const env = { ...process.env, PATH: `${nodePath};${process.env.PATH ?? ""}` };

function wranglerSecret(name: string, value: string): void {
  execSync(`npx wrangler secret put ${name}`, {
    cwd: bridgeDir,
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
    env,
  });
}

console.log("Setting ARGUS_INBOX_TOKEN...");
wranglerSecret("ARGUS_INBOX_TOKEN", token);
console.log("Setting ARGUS_INTAKE_URL...");
wranglerSecret("ARGUS_INTAKE_URL", intakeUrl);
console.log("Deploying argus-email-intake...");
execSync("npx wrangler deploy", { cwd: bridgeDir, stdio: "inherit", env });
console.log("Done.");
