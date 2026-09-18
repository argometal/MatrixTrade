import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { TbcConfig } from "./tbc-types";
import type { MouseProfile } from "./mouse-types";
import { MOUSE_PROFILES_FILENAME } from "./mouse-types";
import {
  forgeAgentPidFile,
  mouseAgentDir,
  resolveNodeExecutable,
  tbcAgentDir,
} from "./agent-paths.server";
import { resolveMousePortableExe, resolveTbcPortableExe } from "./agent-exe-paths.server";

type AgentKind = "tbc" | "mouse";

type PidStore = Partial<Record<AgentKind, number>>;

function readPidStore(): PidStore {
  const file = forgeAgentPidFile();
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as PidStore;
  } catch {
    return {};
  }
}

function writePidStore(store: PidStore): void {
  fs.mkdirSync(path.dirname(forgeAgentPidFile()), { recursive: true });
  fs.writeFileSync(forgeAgentPidFile(), JSON.stringify(store, null, 2), "utf8");
}

async function healthOk(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean };
    return !!data.ok;
  } catch {
    return false;
  }
}

export function writeTbcConfigOnDisk(config: TbcConfig): string {
  const dir = tbcAgentDir();
  const target = path.join(dir, "tbc.config.json");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, JSON.stringify(config, null, 2), "utf8");
  return target;
}

export function writeMouseProfilesOnDisk(profiles: MouseProfile[]): string {
  const dir = mouseAgentDir();
  const target = path.join(dir, MOUSE_PROFILES_FILENAME);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    target,
    JSON.stringify({ version: 1, profiles }, null, 2),
    "utf8"
  );
  return target;
}

function spawnPortableExe(exePath: string): { ok: boolean; message: string; pid?: number } {
  const child = spawn(exePath, [], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
    env: { ...process.env },
  });
  child.unref();
  const pid = child.pid;
  return { ok: true, message: `Started ${path.basename(exePath)}`, pid };
}

function spawnDetached(agent: AgentKind, cwd: string, script: string): { ok: boolean; message: string; pid?: number } {
  const serverPath = path.join(cwd, script);
  if (!fs.existsSync(serverPath)) {
    return { ok: false, message: `${agent} server not found at ${serverPath}` };
  }
  const node = resolveNodeExecutable(cwd);
  const child = spawn(node, [script], {
    cwd,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: { ...process.env },
  });
  child.unref();
  const pid = child.pid;
  if (pid) {
    const store = readPidStore();
    store[agent] = pid;
    writePidStore(store);
  }
  return { ok: true, message: `${agent} agent starting`, pid };
}

function killStoredPid(agent: AgentKind): { ok: boolean; message: string } {
  const store = readPidStore();
  const pid = store[agent];
  if (!pid) return { ok: true, message: "No tracked PID (agent may already be stopped)" };
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else {
      process.kill(pid, "SIGTERM");
    }
    delete store[agent];
    writePidStore(store);
    return { ok: true, message: `Stopped ${agent} (PID ${pid})` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Stop failed" };
  }
}

export async function startWorkshopAgent(
  agent: AgentKind,
  opts?: { tbcConfig?: TbcConfig; mouseProfiles?: MouseProfile[] }
): Promise<{ ok: boolean; message: string }> {
  if (process.platform !== "win32") {
    return { ok: false, message: "Launch from Forge is supported on local Windows only." };
  }

  if (agent === "tbc") {
    const port = opts?.tbcConfig?.port ?? 4010;
    if (await healthOk(port)) return { ok: true, message: "TBC agent already online" };
    if (opts?.tbcConfig) writeTbcConfigOnDisk(opts.tbcConfig);
    const exe = resolveTbcPortableExe();
    if (exe) {
      const r = spawnPortableExe(exe);
      if (r.pid) {
        const store = readPidStore();
        store.tbc = r.pid;
        writePidStore(store);
      }
      return r;
    }
    const dir = tbcAgentDir();
    return spawnDetached("tbc", dir, "server.js");
  }

  const mousePort = Number(process.env.FORGE_MOUSE_PORT || 4011);
  if (await healthOk(mousePort)) return { ok: true, message: "Mouse agent already online" };
  if (opts?.mouseProfiles) writeMouseProfilesOnDisk(opts.mouseProfiles);
  const mouseExe = resolveMousePortableExe();
  if (mouseExe) {
    const r = spawnPortableExe(mouseExe);
    if (r.pid) {
      const store = readPidStore();
      store.mouse = r.pid;
      writePidStore(store);
    }
    return r;
  }
  const dir = mouseAgentDir();
  return spawnDetached("mouse", dir, "server.js");
}

export async function stopWorkshopAgent(agent: AgentKind): Promise<{ ok: boolean; message: string }> {
  if (process.platform !== "win32") {
    return { ok: false, message: "Stop via Forge is supported on local Windows only." };
  }
  return killStoredPid(agent);
}

export async function workshopAgentLauncherStatus(): Promise<{
  platform: string;
  agentsRoot: string;
  tbcOnline: boolean;
  mouseOnline: boolean;
}> {
  const tbcPort = 4010;
  return {
    platform: process.platform,
    agentsRoot: path.dirname(tbcAgentDir()),
    tbcOnline: await healthOk(tbcPort),
    mouseOnline: await healthOk(4011),
  };
}
