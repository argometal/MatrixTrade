/** Save tunnel run token + config (after setup created tunnel). */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

const ACCOUNT_ID = "3ffd6f47bd13eb74b21db7fc35734dda";
const TUNNEL_ID = "c55d060c-a0c6-4b86-ab9f-1cdc87e7323e";
const HOSTNAME = "intake.argometal.dev";

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
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/cfd_tunnel/${TUNNEL_ID}/token`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = (await res.json()) as { success: boolean; result: string; errors?: unknown[] };
  if (!json.success) throw new Error(JSON.stringify(json.errors));

  const dir = resolve(process.cwd(), "argus-email-bridge", "cloudflared");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "argus-intake.token"), json.result, "utf8");
  writeFileSync(
    join(dir, "config.yml"),
    `tunnel: ${TUNNEL_ID}\n\ningress:\n  - hostname: ${HOSTNAME}\n    service: http://localhost:3002\n  - service: http_status:404\n`,
    "utf8"
  );
  console.log("Saved token and config to argus-email-bridge/cloudflared/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
