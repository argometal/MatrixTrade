import type { TbcConfig } from "./tbc-types";
import type { MouseProfile } from "./mouse-types";

export type AgentHealth = {
  ok: boolean;
  name?: string;
  root?: string;
  error?: string;
};

export async function fetchTbcAgentHealth(baseUrl: string): Promise<AgentHealth> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { ok?: boolean; name?: string; root?: string };
    return { ok: !!data.ok, name: data.name, root: data.root };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Agent unreachable" };
  }
}

export async function pushConfigToTbcAgent(baseUrl: string, config: TbcConfig): Promise<void> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Sync failed (HTTP ${res.status})`);
  }
}

export type ForgeAgentKind = "tbc" | "mouse";

export async function forgeWorkshopAgentAction(
  action: "start" | "stop" | "write-config",
  agent: ForgeAgentKind,
  payload?: { config?: TbcConfig; mouseProfiles?: MouseProfile[] }
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await fetch("/api/forge/workshop/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      agent,
      config: payload?.config,
      mouseProfiles: payload?.mouseProfiles,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
    error?: string;
  };
  if (!res.ok || data.ok === false) {
    return { ok: false, error: data.error || data.message || `HTTP ${res.status}` };
  }
  return { ok: true, message: data.message };
}

export async function runTileOnTbcAgent(baseUrl: string, tileId: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: tileId }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; mode?: string };
  if (!res.ok || data.ok === false) {
    return { ok: false, error: data.error || `Run failed (HTTP ${res.status})` };
  }
  return { ok: true };
}
