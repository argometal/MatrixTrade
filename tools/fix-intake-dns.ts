/** Create DNS CNAME for permanent ARGUS intake tunnel (one-time). */
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const ZONE_ID = "89a2c5dfe14ed90d4968162c3f98e2ee";
const TUNNEL_ID = "c55d060c-a0c6-4b86-ab9f-1cdc87e7323e";
const CNAME = `${TUNNEL_ID}.cfargotunnel.com`;

function loadToken(): string {
  const path = join(homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config", "default.toml");
  const raw = readFileSync(path, "utf8");
  const match = raw.match(/^oauth_token\s*=\s*"([^"]+)"/m);
  if (!match) throw new Error("wrangler oauth_token not found");
  return match[1];
}

async function cf(method: string, path: string, body?: unknown): Promise<unknown> {
  const token = loadToken();
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!(json as { success: boolean }).success) {
    throw new Error(`${method} ${path}: ${JSON.stringify((json as { errors?: unknown }).errors ?? json)}`);
  }
  return (json as { result: unknown }).result;
}

async function main(): Promise<void> {
  const existing = (await cf(
    "GET",
    `/zones/${ZONE_ID}/dns_records?type=CNAME&name=intake.argometal.dev`
  )) as Array<{ id: string; content: string }>;

  if (existing.length > 0) {
    const rec = existing[0];
    if (rec.content === CNAME) {
      console.log("DNS already correct:", CNAME);
      return;
    }
    await cf("PATCH", `/zones/${ZONE_ID}/dns_records/${rec.id}`, {
      type: "CNAME",
      name: "intake",
      content: CNAME,
      proxied: true,
    });
    console.log("DNS updated to", CNAME);
    return;
  }

  await cf("POST", `/zones/${ZONE_ID}/dns_records`, {
    type: "CNAME",
    name: "intake",
    content: CNAME,
    proxied: true,
  });
  console.log("DNS created:", `intake.argometal.dev → ${CNAME}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
