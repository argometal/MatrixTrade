/** Email Routing DNS status from Cloudflare API */
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const ZONE_ID = "89a2c5dfe14ed90d4968162c3f98e2ee";

function loadToken(): string {
  const path = join(homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config", "default.toml");
  const raw = readFileSync(path, "utf8");
  const match = raw.match(/^oauth_token\s*=\s*"([^"]+)"/m);
  if (!match) throw new Error("wrangler oauth_token not found");
  return match[1];
}

async function cfGet(path: string, token: string): Promise<unknown> {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as { success: boolean; result: unknown; errors?: unknown[] };
  if (!json.success) throw new Error(JSON.stringify(json.errors ?? json));
  return json.result;
}

async function main(): Promise<void> {
  const token = loadToken();
  const dns = await cfGet(`/zones/${ZONE_ID}/email/routing/dns`, token);
  console.log(JSON.stringify(dns, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
