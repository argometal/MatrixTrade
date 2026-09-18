"use client";

import { useState } from "react";
import { AF_TEXT } from "@/lib/argusforge/af03-visible-ontology";
import { forgeWorkshopAgentAction } from "@/lib/workshop/agent-client";
import type { TbcConfig } from "@/lib/workshop/tbc-types";
import type { MouseProfile } from "@/lib/workshop/mouse-types";

export function AgentsPanel({
  agentPort,
  mousePort,
  tbcBase,
  mouseBase,
  tbcConfig,
  mouseProfiles,
  onAgentMessage,
  canLaunchFromServer,
  downloads,
}: {
  agentPort: number;
  mousePort: number;
  tbcBase: string;
  mouseBase: string;
  tbcConfig: TbcConfig;
  mouseProfiles: MouseProfile[];
  onAgentMessage: (msg: string, err?: string) => void;
  canLaunchFromServer: boolean;
  downloads: { name: string; href: string }[];
}) {
  const [busy, setBusy] = useState<"tbc" | "mouse" | null>(null);

  async function run(action: "start" | "stop", agent: "tbc" | "mouse") {
    setBusy(agent);
    try {
      if (action === "start" && agent === "tbc") {
        await forgeWorkshopAgentAction("write-config", "tbc", { config: tbcConfig });
      }
      if (action === "start" && agent === "mouse") {
        await forgeWorkshopAgentAction("write-config", "mouse", { mouseProfiles });
      }
      const r = await forgeWorkshopAgentAction(action, agent, {
        config: tbcConfig,
        mouseProfiles,
      });
      if (!r.ok) onAgentMessage("", r.error ?? "Failed");
      else onAgentMessage(r.message ?? "OK");
    } catch (e) {
      onAgentMessage("", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">Local agents (Windows · from Forge)</h2>
      <p className={`text-xs ${AF_TEXT.metadata}`}>
        {canLaunchFromServer
          ? "Forge en esta PC puede lanzar el .exe o node en workshop-agents."
          : "Forge online: descarga el agente, ejecútalo en Windows; el navegador habla con http://127.0.0.1 (CORS incluye *.vercel.app)."}
      </p>
      {downloads.length ? (
        <ul className={`space-y-1 text-xs ${AF_TEXT.metadata}`}>
          {downloads.map((d) => (
            <li key={d.href}>
              <a href={d.href} className="text-sky-400 underline" download>
                Descargar {d.name}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-3 rounded-xl border border-zinc-800 p-3">
        <h3 className="text-xs font-semibold text-lime-300">TBCompanion (port {agentPort})</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy === "tbc"}
            onClick={() => run("start", "tbc")}
            className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 disabled:opacity-40"
          >
            {busy === "tbc" ? "…" : "Start from Forge"}
          </button>
          <button
            type="button"
            disabled={busy === "tbc"}
            onClick={() => run("stop", "tbc")}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 disabled:opacity-40"
          >
            Stop
          </button>
        </div>
        <a href={tbcBase} target="_blank" rel="noreferrer" className="text-xs text-sky-400 underline">
          Open agent UI · {tbcBase}
        </a>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-800 p-3">
        <h3 className="text-xs font-semibold text-sky-300">Mouse Simulator (port {mousePort})</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy === "mouse"}
            onClick={() => run("start", "mouse")}
            className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 disabled:opacity-40"
          >
            {busy === "mouse" ? "…" : "Start from Forge"}
          </button>
          <button
            type="button"
            disabled={busy === "mouse"}
            onClick={() => run("stop", "mouse")}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 disabled:opacity-40"
          >
            Stop
          </button>
        </div>
        <a href={mouseBase} target="_blank" rel="noreferrer" className="text-xs text-sky-400 underline">
          Agent health · {mouseBase}
        </a>
      </div>

      <p className={`text-[11px] ${AF_TEXT.metadata}`}>
        GitHub:{" "}
        <a href="https://github.com/argometal/TBCompanion" className="text-lime-400 underline" target="_blank" rel="noreferrer">
          TBCompanion
        </a>
        {" · "}
        <a href="https://github.com/argometal/MouseSimulator" className="text-lime-400 underline" target="_blank" rel="noreferrer">
          MouseSimulator
        </a>
        . Doc: <code className="text-zinc-500">md/argusforge/workshop-local-tools-contract.md</code>
      </p>
    </section>
  );
}
