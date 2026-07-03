/** List Cloudflare zones and email routing rules (uses wrangler OAuth token). */
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

function loadOAuthToken(): string {
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
  const token = loadOAuthToken();
  const zones = (await cfGet("/zones?per_page=50", token)) as Array<{ id: string; name: string; status: string }>;
  console.log("Zones:");
  for (const z of zones) {
    console.log(`  ${z.name} (${z.id}) status=${z.status}`);
    try {
      const rules = (await cfGet(`/zones/${z.id}/email/routing/rules`, token)) as Array<{
        id: string;
        name: string;
        enabled: boolean;
        actions: unknown[];
        matchers: unknown[];
      }>;
      if (rules.length > 0) {
        console.log(`    Email routing rules: ${rules.length}`);
        for (const r of rules.slice(0, 5)) {
          console.log(`      - ${r.name ?? r.id} enabled=${r.enabled}`);
        }
      }
      const addresses = (await cfGet(`/zones/${z.id}/email/routing/addresses`, token)) as Array<{
        email: string;
        verified: boolean;
      }>;
      if (addresses.length > 0) {
        console.log(`    Routing addresses:`);
        for (const a of addresses) {
          console.log(`      - ${a.email} verified=${a.verified}`);
        }
      }
    } catch {
      console.log("    (no email routing or zone not eligible)");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
