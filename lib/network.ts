import { execFile } from "child_process";
import os from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface LocalAddress {
  name: string;
  address: string;
  url: string;
}

const DEFAULT_PORT = Number(process.env.PORT) || 3000;

function isIpv4(entry: os.NetworkInterfaceInfo): boolean {
  return String(entry.family) === "IPv4";
}

function adapterSortKey(name: string, address: string): number {
  const lower = name.toLowerCase();
  if (address.startsWith("127.") || lower.includes("loopback")) return 100;
  if (
    lower.includes("virtual") ||
    lower.includes("vethernet") ||
    lower.includes("hyper-v") ||
    lower.includes("vmware") ||
    lower.includes("virtualbox")
  ) {
    return 90;
  }
  if (
    lower.includes("tap") ||
    lower.includes("tun") ||
    lower.includes("tailscale") ||
    lower.includes("wireguard") ||
    lower.includes("vpn")
  ) {
    return 80;
  }
  if (
    lower.includes("wi-fi") ||
    lower.includes("wifi") ||
    lower.includes("wlan") ||
    lower.includes("wireless")
  ) {
    return 0;
  }
  if (lower.includes("ethernet") || lower.includes("eth")) return 10;
  return 50;
}

export function getAllLocalAddresses(port = DEFAULT_PORT): LocalAddress[] {
  const nets = os.networkInterfaces();
  const seen = new Set<string>();
  const addresses: Array<LocalAddress & { sortKey: number }> = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (!isIpv4(net) || net.internal) continue;
      if (seen.has(net.address)) continue;
      seen.add(net.address);

      addresses.push({
        name,
        address: net.address,
        url: `http://${net.address}:${port}`,
        sortKey: adapterSortKey(name, net.address),
      });
    }
  }

  return addresses
    .sort((a, b) => a.sortKey - b.sortKey || a.name.localeCompare(b.name))
    .map(({ name, address, url }) => ({ name, address, url }));
}

/** @deprecated Use getAllLocalAddresses()[0] */
export function getLocalIp(): string {
  const addresses = getAllLocalAddresses();
  return addresses[0]?.address ?? "127.0.0.1";
}

export function getMobileUrl(port = DEFAULT_PORT): string {
  const addresses = getAllLocalAddresses(port);
  return addresses[0]?.url ?? `http://127.0.0.1:${port}`;
}

export async function isFirewallRuleActive(): Promise<boolean | null> {
  if (process.platform !== "win32") {
    return null;
  }

  try {
    const { stdout } = await execFileAsync(
      "netsh",
      ["advfirewall", "firewall", "show", "rule", "name=MatrixTrade Dev 3000"],
      { timeout: 5000, windowsHide: true, maxBuffer: 1024 * 64 }
    );
    return stdout.includes("Allow") && stdout.includes("3000");
  } catch {
    return false;
  }
}

export async function getIpconfigDiagnostics(): Promise<string | null> {
  if (process.platform !== "win32") {
    return null;
  }

  try {
    const { stdout } = await execFileAsync("ipconfig", [], {
      timeout: 8000,
      windowsHide: true,
      maxBuffer: 1024 * 512,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

/** Parse ipconfig output for extra IPv4 lines when Node interfaces miss some. */
export function parseIpconfigAddresses(text: string, port = DEFAULT_PORT): LocalAddress[] {
  const results: LocalAddress[] = [];
  const seen = new Set<string>();
  let currentAdapter = "Unknown adapter";

  for (const line of text.split(/\r?\n/)) {
    const adapterMatch = line.match(/^([^:]+):$/);
    if (adapterMatch && !line.includes(".")) {
      currentAdapter = adapterMatch[1].trim();
      continue;
    }

    const v4Match =
      line.match(/IPv4 Address[^:]*:\s*([\d.]+)/i) ||
      line.match(/IPv4 Address[^:]*:\s*([\d.]+)\(.*\)/i);
    if (!v4Match) continue;

    const address = v4Match[1].trim();
    if (address.startsWith("127.") || seen.has(address)) continue;
    seen.add(address);

    results.push({
      name: `${currentAdapter} (ipconfig)`,
      address,
      url: `http://${address}:${port}`,
    });
  }

  return results;
}

export function mergeAddresses(
  primary: LocalAddress[],
  fallback: LocalAddress[]
): LocalAddress[] {
  const seen = new Set(primary.map((item) => item.address));
  const merged = [...primary];

  for (const item of fallback) {
    if (seen.has(item.address)) continue;
    seen.add(item.address);
    merged.push(item);
  }

  return merged;
}

export async function getConnectAddresses(port = DEFAULT_PORT): Promise<LocalAddress[]> {
  const primary = getAllLocalAddresses(port);
  if (primary.length > 0) {
    return primary;
  }

  const ipconfig = await getIpconfigDiagnostics();
  if (!ipconfig) {
    return [];
  }

  return parseIpconfigAddresses(ipconfig, port);
}
