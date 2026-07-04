/**
 * Create/update permanent Cloudflare Tunnel for ARGUS email intake.
 * Hostname: intake.argometal.dev → http://localhost:3002
 *
 * Usage:
 *   npx tsx tools/setup-argus-named-tunnel.ts
 *   npx tsx tools/setup-argus-named-tunnel.ts --deploy-worker
 */
import { randomBytes } from "crypto";
import { execSync } from "child_process";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

const ACCOUNT_ID = "3ffd6f47bd13eb74b21db7fc35734dda";
const ZONE_ID = "89a2c5dfe14ed90d4968162c3f98e2ee";
const DOMAIN = "argometal.dev";
const TUNNEL_NAME = "argus-intake";
const HOSTNAME = `intake.${DOMAIN}`;
const LOCAL_SERVICE = "http://localhost:3002";
const INTAKE_PATH = "/api/argus/email-inbox";
const INTAKE_URL = `https://${HOSTNAME}${INTAKE_PATH}`;

const CLOUDFLARED_DIR = resolve(process.cwd(), "argus-email-bridge", "cloudflared");
const CREDENTIALS_FILE = join(CLOUDFLARED_DIR, `${TUNNEL_NAME}.json`);
const TOKEN_FILE = join(CLOUDFLARED_DIR, `${TUNNEL_NAME}.token`);
const CONFIG_FILE = join(CLOUDFLARED_DIR, "config.yml");

function loadToken(): string {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (apiToken) return apiToken;

  const path = join(homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config", "default.toml");
  const raw = readFileSync(path, "utf8");
  const match = raw.match(/^oauth_token\s*=\s*"([^"]+)"/m);
  if (!match) throw new Error("wrangler oauth_token not found (or set CLOUDFLARE_API_TOKEN)");
  return match[1];
}

async function cf<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { success: boolean; result: T; errors?: unknown[] };
  if (!json.success) {
    throw new Error(`${method} ${path} failed: ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.result;
}

type Tunnel = { id: string; name: string; status?: string };

async function listTunnels(token: string): Promise<Tunnel[]> {
  return cf<Tunnel[]>(token, "GET", `/accounts/${ACCOUNT_ID}/cfd_tunnel?name=${encodeURIComponent(TUNNEL_NAME)}`);
}

async function createTunnel(token: string): Promise<Tunnel> {
  const tunnelSecret = randomBytes(32).toString("base64");
  return cf<Tunnel>(token, "POST", `/accounts/${ACCOUNT_ID}/cfd_tunnel`, {
    name: TUNNEL_NAME,
    tunnel_secret: tunnelSecret,
  });
}

async function ensureTunnel(token: string): Promise<Tunnel> {
  const existing = await listTunnels(token);
  const match = existing.find((t) => t.name === TUNNEL_NAME);
  if (match) {
    console.log(`Tunnel exists: ${match.id} (${match.name})`);
    return match;
  }
  const created = await createTunnel(token);
  console.log(`Created tunnel: ${created.id} (${created.name})`);
  return created;
}

async function putConfiguration(token: string, tunnelId: string): Promise<void> {
  await cf(token, "PUT", `/accounts/${ACCOUNT_ID}/cfd_tunnel/${tunnelId}/configurations`, {
    config: {
      ingress: [
        { hostname: HOSTNAME, service: LOCAL_SERVICE, originRequest: {} },
        { service: "http_status:404" },
      ],
    },
  });
  console.log(`Ingress configured: ${HOSTNAME} → ${LOCAL_SERVICE}`);
}

async function ensureDnsRoute(token: string, tunnelId: string): Promise<void> {
  const cnameTarget = `${tunnelId}.cfargotunnel.com`;
  const cloudflared = "c:\\Tools\\runtime\\cloudflared.exe";

  try {
    const records = await cf<Array<{ id: string; type: string; name: string; content: string }>>(
      token,
      "GET",
      `/zones/${ZONE_ID}/dns_records?type=CNAME&name=${encodeURIComponent(HOSTNAME)}`
    );
    const existing = records.find((r) => r.name === HOSTNAME || r.name === `${HOSTNAME}.`);
    if (existing) {
      if (existing.content === cnameTarget) {
        console.log(`DNS OK: ${HOSTNAME} → ${cnameTarget}`);
        return;
      }
      await cf(token, "PATCH", `/zones/${ZONE_ID}/dns_records/${existing.id}`, {
        type: "CNAME",
        name: "intake",
        content: cnameTarget,
        proxied: true,
      });
      console.log(`DNS updated: ${HOSTNAME} → ${cnameTarget}`);
      return;
    }

    await cf(token, "POST", `/zones/${ZONE_ID}/dns_records`, {
      type: "CNAME",
      name: "intake",
      content: cnameTarget,
      proxied: true,
    });
    console.log(`DNS created: ${HOSTNAME} → ${cnameTarget}`);
  } catch (err) {
    console.warn(`Zone DNS API failed (${String(err)}). Trying cloudflared route dns...`);
    execSync(`"${cloudflared}" tunnel route dns ${tunnelId} ${HOSTNAME}`, {
      stdio: "inherit",
    });
    console.log(`DNS routed via cloudflared: ${HOSTNAME}`);
  }
}

async function fetchRunToken(token: string, tunnelId: string): Promise<string> {
  const result = await cf<string>(token, "GET", `/accounts/${ACCOUNT_ID}/cfd_tunnel/${tunnelId}/token`);
  return result;
}

function writeLocalConfig(tunnelId: string, credentials: unknown, runToken: string): void {
  mkdirSync(CLOUDFLARED_DIR, { recursive: true });
  writeFileSync(CREDENTIALS_FILE, `${JSON.stringify(credentials, null, 2)}\n`, "utf8");
  writeFileSync(TOKEN_FILE, runToken, "utf8");
  writeFileSync(
    CONFIG_FILE,
    `# Generated by tools/setup-argus-named-tunnel.ts — do not commit credentials\n` +
      `tunnel: ${tunnelId}\n` +
      `credentials-file: ${CREDENTIALS_FILE.replace(/\\/g, "/")}\n\n` +
      `ingress:\n` +
      `  - hostname: ${HOSTNAME}\n` +
      `    service: ${LOCAL_SERVICE}\n` +
      `  - service: http_status:404\n`,
    "utf8"
  );
}

function deployWorker(): void {
  const nodePath = "c:\\Tools\\runtime\\node";
  const env = { ...process.env, PATH: `${nodePath};${process.env.PATH ?? ""}` };
  execSync(`npx tsx tools/deploy-argus-email-worker.ts ${INTAKE_URL}`, {
    cwd: process.cwd(),
    stdio: "inherit",
    env,
  });
}

async function main(): Promise<void> {
  const deployWorkerFlag = process.argv.includes("--deploy-worker");
  const token = loadToken();

  const tunnel = await ensureTunnel(token);
  await putConfiguration(token, tunnel.id);
  try {
    await ensureDnsRoute(token, tunnel.id);
  } catch (err) {
    console.warn(`DNS step skipped (${String(err)}). If intake.argometal.dev already resolves, continue.`);
  }

  let runToken = "";
  try {
    runToken = await fetchRunToken(token, tunnel.id);
  } catch (err) {
    throw new Error(`Could not fetch tunnel run token: ${String(err)}`);
  }

  writeLocalConfig(tunnel.id, { TunnelID: tunnel.id, AccountTag: ACCOUNT_ID }, runToken);

  console.log("\n=== ARGUS permanent intake tunnel ===");
  console.log(`Hostname:   ${HOSTNAME}`);
  console.log(`Intake URL: ${INTAKE_URL}`);
  console.log(`Local:      ${LOCAL_SERVICE}`);
  console.log(`Config:     ${CONFIG_FILE}`);
  console.log(`Run token:  ${TOKEN_FILE}`);
  console.log("\nStart stack:");
  console.log("  .\\tools\\run-argus-intake-stack.ps1");
  console.log("\nOptional quick tunnel (dev only):");
  console.log("  cloudflared tunnel --url http://localhost:3002");

  if (deployWorkerFlag) {
    console.log("\nDeploying Worker secrets...");
    deployWorker();
  } else {
    console.log("\nUpdate Worker when ready:");
    console.log(`  npx tsx tools/deploy-argus-email-worker.ts ${INTAKE_URL}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
