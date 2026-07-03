/** Inspect Email Routing rules + MX/TXT DNS for argometal.dev */
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const DOMAIN = "argometal.dev";
const ZONE_ID = "89a2c5dfe14ed90d4968162c3f98e2ee";

function loadToken(): string {
  const path = join(homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config", "default.toml");
  const raw = readFileSync(path, "utf8");
  const match = raw.match(/^oauth_token\s*=\s*"([^"]+)"/m);
  if (!match) throw new Error("wrangler oauth_token not found");
  return match[1];
}

async function cfGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as { success: boolean; result: T; errors?: unknown[] };
  if (!json.success) throw new Error(JSON.stringify(json.errors ?? json));
  return json.result;
}

async function main(): Promise<void> {
  const token = loadToken();
  const zone = await cfGet<{ id: string; name: string; status: string; name_servers: string[] }>(
    token,
    `/zones/${ZONE_ID}`
  );
  console.log("Zone:", zone.name, "status=", zone.status);
  console.log("NS:", zone.name_servers.join(", "));

  const routing = await cfGet<{ enabled: boolean; status: string; synced: boolean }>(
    token,
    `/zones/${ZONE_ID}/email/routing`
  );
  console.log("\nEmail Routing:", JSON.stringify(routing, null, 2));

  const rules = await cfGet<
    Array<{ id: string; name: string; enabled: boolean; matchers: unknown[]; actions: unknown[] }>
  >(token, `/zones/${ZONE_ID}/email/routing/rules`);
  console.log("\nRules:");
  for (const r of rules) {
    console.log(JSON.stringify(r, null, 2));
  }

  const records = await cfGet<Array<{ type: string; name: string; content: string; priority?: number }>>(
    token,
    `/zones/${ZONE_ID}/dns_records?per_page=100`
  );
  console.log("\nMX/TXT records:");
  for (const rec of records.filter((r) => r.type === "MX" || r.type === "TXT")) {
    console.log(`${rec.type}\t${rec.name}\t${rec.priority ?? ""}\t${rec.content}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
