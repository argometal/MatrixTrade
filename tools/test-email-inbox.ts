/** Manual test — POST sample email to ARGUS inbox API. Usage: npx tsx tools/test-email-inbox.ts [baseUrl] */
import { readFileSync } from "fs";
import { resolve } from "path";

const baseUrl = process.argv[2] ?? "http://localhost:3000";

function loadToken(): string {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const line = raw.split("\n").find((l) => l.startsWith("ARGUS_INBOX_TOKEN="));
  if (!line) throw new Error("ARGUS_INBOX_TOKEN missing in .env.local");
  return line.slice("ARGUS_INBOX_TOKEN=".length).trim();
}

async function main(): Promise<void> {
  const token = loadToken();
  const body = readFileSync(resolve(process.cwd(), "argus-email-bridge/sample-email-payload.json"), "utf8");
  const uri = `${baseUrl}/api/argus/email-inbox`;

  console.log(`POST ${uri}`);
  const res = await fetch(uri, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });

  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text);

  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
