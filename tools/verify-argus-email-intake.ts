/**
 * Verify ARGUS email intake chain (local API → tunnel → optional Worker secret hint).
 * Usage:
 *   npx tsx tools/verify-argus-email-intake.ts
 *   npx tsx tools/verify-argus-email-intake.ts https://intake.argometal.dev
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const tunnelBase = process.argv[2]?.replace(/\/api\/argus\/email-inbox\/?$/, "").replace(/\/$/, "");

function loadToken(): string {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const line = raw.split("\n").find((l) => l.startsWith("ARGUS_INBOX_TOKEN="));
  if (!line) throw new Error("ARGUS_INBOX_TOKEN missing in .env.local");
  return line.slice("ARGUS_INBOX_TOKEN=".length).trim();
}

async function probe(label: string, url: string, token: string): Promise<boolean> {
  const body = readFileSync(resolve(process.cwd(), "argus-email-bridge/sample-email-payload.json"), "utf8");
  console.log(`\n[${label}] POST ${url}`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
    });
    const text = await res.text();
    console.log(`  Status: ${res.status}`);
    console.log(`  Body: ${text.slice(0, 200)}`);
    return res.status === 201;
  } catch (err) {
    console.log(`  Error: ${String(err)}`);
    return false;
  }
}

async function head(label: string, url: string): Promise<void> {
  try {
    const res = await fetch(url, { method: "GET" });
    console.log(`[${label}] GET ${url} → ${res.status}`);
  } catch (err) {
    console.log(`[${label}] GET ${url} → error: ${String(err)}`);
  }
}

async function main(): Promise<void> {
  const token = loadToken();
  console.log("ARGUS email intake verification");
  console.log("=".repeat(40));

  const localOk = await probe("local", "http://localhost:3002/api/argus/email-inbox", token);

  if (tunnelBase) {
    const tunnelOk = await probe(
      "tunnel",
      `${tunnelBase}/api/argus/email-inbox`,
      token
    );
    if (!tunnelOk) {
      console.log("\nTunnel failed. Common causes:");
      console.log("  • cloudflared not running (525 on intake.argometal.dev)");
      console.log("  • quick tunnel URL changed — redeploy Worker ARGUS_INTAKE_URL");
      console.log("  • npm run dev not listening on :3002");
    }
  } else {
    await head("named-tunnel", "https://intake.argometal.dev/api/argus/email-inbox");
    console.log("\nPass a tunnel base URL to test tunnel → API:");
    console.log("  npx tsx tools/verify-argus-email-intake.ts https://intake.argometal.dev");
  }

  console.log("\nWorker deploy (after tunnel is healthy):");
  console.log(
    "  npx tsx tools/deploy-argus-email-worker.ts <TUNNEL_BASE>/api/argus/email-inbox"
  );
  console.log("\nReal email test: send to argus@argometal.dev, then open /argus/inbox");

  if (!localOk) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
