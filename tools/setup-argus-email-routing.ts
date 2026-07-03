/**
 * Set up Cloudflare zone + Email Routing for argus@argometal.dev → argus-email-intake Worker.
 * Usage: npx tsx tools/setup-argus-email-routing.ts
 */
import { readFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

const ACCOUNT_ID = "3ffd6f47bd13eb74b21db7fc35734dda";
const DOMAIN = "argometal.dev";
const WORKER_NAME = "argus-email-intake";
const ROUTE_ADDRESS = `argus@${DOMAIN}`;

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
): Promise<{ success: boolean; result: T; errors?: unknown[] }> {
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
  return json;
}

async function getZone(token: string): Promise<{ id: string; name: string; status: string; name_servers: string[] } | null> {
  const data = await cf<Array<{ id: string; name: string; status: string; name_servers: string[] }>>(
    token,
    "GET",
    `/zones?name=${DOMAIN}`
  );
  return data.result[0] ?? null;
}

async function createZone(token: string): Promise<{ id: string; status: string; name_servers: string[] } | null> {
  try {
    const data = await cf<{ id: string; status: string; name_servers: string[] }>(token, "POST", "/zones", {
      name: DOMAIN,
      account: { id: ACCOUNT_ID },
      type: "full",
    });
    return data.result;
  } catch (err) {
    console.log(`Zone create via API failed: ${err instanceof Error ? err.message : err}`);
    console.log("Add the zone manually in Cloudflare Dashboard → Add site → argometal.dev");
    return null;
  }
}

async function enableEmailRoutingDns(token: string, zoneId: string): Promise<void> {
  await cf(token, "POST", `/zones/${zoneId}/email/routing/dns`, {});
}

async function listRules(token: string, zoneId: string): Promise<Array<{ id: string; name?: string; matchers: unknown[]; actions: unknown[] }>> {
  const data = await cf<Array<{ id: string; name?: string; matchers: unknown[]; actions: unknown[] }>>(
    token,
    "GET",
    `/zones/${zoneId}/email/routing/rules`
  );
  return data.result;
}

async function createWorkerRule(token: string, zoneId: string): Promise<{ id: string }> {
  const data = await cf<{ id: string }>(token, "POST", `/zones/${zoneId}/email/routing/rules`, {
    name: "ARGUS intake → argus-email-intake",
    enabled: true,
    matchers: [{ type: "literal", field: "to", value: ROUTE_ADDRESS }],
    actions: [{ type: "worker", value: [WORKER_NAME] }],
  });
  return data.result;
}

async function getEmailRoutingStatus(token: string, zoneId: string): Promise<unknown> {
  const data = await cf<unknown>(token, "GET", `/zones/${zoneId}/email/routing`);
  return data.result;
}

async function main(): Promise<void> {
  const token = loadToken();
  console.log(`Setting up Email Routing for ${ROUTE_ADDRESS}\n`);

  let zone = await getZone(token);
  if (!zone) {
    console.log(`Creating zone ${DOMAIN}...`);
    const created = await createZone(token);
    if (!created) {
      console.log("\nCannot continue without a Cloudflare zone. Add argometal.dev in dashboard, then re-run.");
      process.exit(1);
    }
    zone = { id: created.id, name: DOMAIN, status: created.status, name_servers: created.name_servers };
    console.log(`Zone created: ${zone.id} status=${zone.status}`);
  } else {
    console.log(`Zone exists: ${zone.id} status=${zone.status}`);
  }

  console.log("\nNameservers (set at registrar):");
  for (const ns of zone.name_servers) console.log(`  ${ns}`);

  if (zone.status !== "active") {
    console.log("\n⚠ Zone is not active yet — update registrar NS, then re-run this script.");
  }

  console.log("\nEnabling Email Routing DNS records...");
  try {
    await enableEmailRoutingDns(token, zone.id);
    console.log("Email Routing DNS enabled.");
  } catch (err) {
    console.log(`Email Routing DNS: ${err instanceof Error ? err.message : err}`);
  }

  const status = await getEmailRoutingStatus(token, zone.id);
  console.log("\nEmail Routing status:", JSON.stringify(status, null, 2));

  const rules = await listRules(token, zone.id);
  const existing = rules.find((r) =>
    JSON.stringify(r.matchers).includes(ROUTE_ADDRESS) ||
    JSON.stringify(r.actions).includes(WORKER_NAME)
  );

  if (existing) {
    console.log(`\nRouting rule already exists: ${existing.id}`);
  } else {
    console.log("\nCreating routing rule → Worker...");
    const rule = await createWorkerRule(token, zone.id);
    console.log(`Created rule: ${rule.id}`);
  }

  console.log("\nDone. Next: point registrar NS to Cloudflare, wait for active zone, send test to", ROUTE_ADDRESS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
