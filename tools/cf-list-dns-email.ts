/** List MX/TXT DNS records for argometal.dev zone via Cloudflare API */
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

async function main(): Promise<void> {
  const token = loadToken();
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?per_page=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = (await res.json()) as {
    success: boolean;
    result: Array<{ type: string; name: string; content: string; priority?: number; proxied?: boolean }>;
    errors?: unknown[];
  };
  if (!json.success) throw new Error(JSON.stringify(json.errors ?? json));
  console.log("DNS records (MX/TXT/CNAME for email):");
  for (const r of json.result.filter(
    (x) => x.type === "MX" || x.type === "TXT" || (x.type === "CNAME" && x.name.includes("_domainkey"))
  )) {
    console.log(`${r.type}\t${r.name}\tprio=${r.priority ?? ""}\t${r.content}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
