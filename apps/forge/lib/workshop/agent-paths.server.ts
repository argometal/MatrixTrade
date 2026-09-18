import fs from "node:fs";
import path from "node:path";

/** Folder that contains TBCompanion/ and MouseSimulator/ (monolith or apps/forge copy). */
export function resolveWorkshopAgentsRoot(): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "workshop-agents"),
    path.join(cwd, "apps", "forge", "workshop-agents"),
    path.join(cwd, "..", "..", "workshop-agents"),
  ];
  for (const root of candidates) {
    if (fs.existsSync(path.join(root, "TBCompanion", "server.js"))) return root;
  }
  return candidates[0];
}

export function tbcAgentDir(): string {
  return path.join(resolveWorkshopAgentsRoot(), "TBCompanion");
}

export function mouseAgentDir(): string {
  return path.join(resolveWorkshopAgentsRoot(), "MouseSimulator");
}

export function forgeAgentPidFile(): string {
  return path.join(resolveWorkshopAgentsRoot(), ".forge-agent-pids.json");
}

export function resolveNodeExecutable(agentRoot: string): string {
  const portable = path.join(agentRoot, "runtime", "node", "node.exe");
  if (fs.existsSync(portable)) return portable;
  return process.platform === "win32" ? "node.exe" : "node";
}
