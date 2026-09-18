"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TbcConfig } from "@/lib/workshop/tbc-types";
import {
  defaultTbcConfig,
  loadToolboxConfig,
  parseTbcConfigJson,
  saveToolboxConfig,
} from "@/lib/workshop/tbc-store";
import { loadMouseProfiles, saveMouseProfiles } from "@/lib/workshop/mouse-store";
import type { MouseProfile } from "@/lib/workshop/mouse-types";
import { classifyTile, runUrlTile, tbcAgentBase, tbcRunTileUrl } from "@/lib/workshop/tbc-run";
import {
  fetchTbcAgentHealth,
  forgeWorkshopAgentAction,
  pushConfigToTbcAgent,
  runTileOnTbcAgent,
  type AgentHealth,
} from "@/lib/workshop/agent-client";
import { AF_TEXT } from "@/lib/argusforge/af03-visible-ontology";
import { AgentStatusBar } from "./AgentStatusBar";
import { ToolboxEditor } from "./ToolboxEditor";
import { MouseEditor } from "./MouseEditor";
import { AgentsPanel } from "./AgentsPanel";
import {
  fetchWorkshopRuntime,
  pickTbcDownload,
  type WorkshopRuntimeInfo,
} from "@/lib/workshop/workshop-runtime.client";

type Tab = "toolbox" | "mouse" | "agents";

const MOUSE_AGENT_PORT = 4011;

export function WorkshopClient() {
  const [tab, setTab] = useState<Tab>("toolbox");
  const [cfg, setCfg] = useState<TbcConfig>(() => loadToolboxConfig());
  const [pageId, setPageId] = useState(cfg.pages[0]?.id ?? "");
  const [mouseProfiles, setMouseProfiles] = useState<MouseProfile[]>(() => loadMouseProfiles());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentHealth, setAgentHealth] = useState<AgentHealth | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [startingTbc, setStartingTbc] = useState(false);
  const [runtime, setRuntime] = useState<WorkshopRuntimeInfo>({
    canLaunchFromServer: false,
    downloads: [],
  });

  const page = useMemo(
    () => cfg.pages.find((p) => p.id === pageId) ?? cfg.pages[0],
    [cfg.pages, pageId]
  );

  const macros = cfg.macros ?? {};
  const agentPort = cfg.port ?? 4010;
  const tbcBase = tbcAgentBase(agentPort);
  const mouseBase = tbcAgentBase(MOUSE_AGENT_PORT);

  const persistCfg = useCallback((next: TbcConfig) => {
    setCfg(next);
    saveToolboxConfig(next);
  }, []);

  useEffect(() => {
    fetchWorkshopRuntime().then(setRuntime);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const h = await fetchTbcAgentHealth(tbcBase);
      if (!cancelled) setAgentHealth(h);
    }
    poll();
    const id = window.setInterval(poll, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [tbcBase]);

  async function onStartTbcFromForge() {
    setStartingTbc(true);
    setError(null);
    try {
      if (!runtime.canLaunchFromServer) {
        const href = pickTbcDownload(runtime.downloads);
        if (href) {
          window.open(href, "_blank", "noopener,noreferrer");
          setStatus("Descarga y ejecuta TBCompanion en esta PC; vuelve aquí y espera el punto verde.");
        } else {
          setError("No hay EXE en el deploy. Ejecuta scripts/build-workshop-tbc-portable.ps1 y vuelve a desplegar.");
        }
        return;
      }
      await forgeWorkshopAgentAction("write-config", "tbc", { config: cfg });
      const start = await forgeWorkshopAgentAction("start", "tbc", { config: cfg });
      if (!start.ok) throw new Error(start.error ?? "Start failed");
      setStatus(start.message ?? "TBC agent starting — wait a few seconds.");
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 750));
        const h = await fetchTbcAgentHealth(tbcBase);
        setAgentHealth(h);
        if (h.ok) {
          setStatus("TBC agent online from Forge.");
          break;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start TBC");
    } finally {
      setStartingTbc(false);
    }
  }

  async function onSyncToAgent() {
    setSyncing(true);
    setError(null);
    try {
      await pushConfigToTbcAgent(tbcBase, cfg);
      setStatus("Config synced to TBC agent (tbc.config.json on this PC).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  function onExportToolbox() {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tbc.config.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Exported tbc.config.json");
  }

  function onImportToolbox(file: File) {
    file
      .text()
      .then((text) => {
        const next = parseTbcConfigJson(text);
        persistCfg(next);
        setPageId(next.pages[0]?.id ?? "");
        setStatus(`Imported “${next.name}”.`);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }

  async function onRunTile(tileId: string) {
    const tile = page?.tiles.find((t) => t.id === tileId);
    if (!tile) return;
    setError(null);
    try {
      if (classifyTile(tile, macros) === "url") {
        runUrlTile(tile, macros);
        setStatus(`Opened ${tile.label} in browser.`);
        return;
      }
      if (agentHealth?.ok) {
        const result = await runTileOnTbcAgent(tbcBase, tileId);
        if (result.ok) {
          setStatus(`Ran “${tile.label}” on this PC via agent.`);
          return;
        }
        setError(result.error ?? "Agent run failed");
        return;
      }
      window.open(tbcRunTileUrl(tileId, agentPort), "_blank", "noopener,noreferrer");
      setStatus("Agent offline — opened run URL in new tab (start TBC if it failed).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <p className={`text-sm ${AF_TEXT.metadata}`}>
        Workshop en Forge (online o local). La ejecución real es el agente TBCompanion en tu Windows — el navegador
        sincroniza con <code className="text-zinc-500">127.0.0.1:4010</code>.
      </p>

      <AgentStatusBar
        health={agentHealth}
        agentBase={tbcBase}
        onSync={onSyncToAgent}
        syncing={syncing}
        onStartAgent={onStartTbcFromForge}
        starting={startingTbc}
      />

      <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-0.5">
        {(
          [
            ["toolbox", "Toolbox"],
            ["mouse", "Mouse"],
            ["agents", "Local agents"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold ${
              tab === id ? "bg-lime-500/15 text-lime-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {status ? (
        <p className="rounded-xl border border-lime-500/25 bg-lime-950/30 px-3 py-2 text-xs text-lime-200">{status}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">{error}</p>
      ) : null}

      {tab === "toolbox" ? (
        <ToolboxEditor
          cfg={cfg}
          page={page}
          pageId={pageId}
          onPageId={setPageId}
          onChange={persistCfg}
          onExport={onExportToolbox}
          onImport={onImportToolbox}
          onReset={() => {
            const d = defaultTbcConfig();
            persistCfg(d);
            setPageId(d.pages[0]?.id ?? "");
            setStatus("Reset to sample config.");
          }}
          onRunTile={onRunTile}
          agentOnline={!!agentHealth?.ok}
        />
      ) : null}

      {tab === "mouse" ? (
        <MouseEditor
          profiles={mouseProfiles}
          onChange={(next) => {
            setMouseProfiles(next);
            saveMouseProfiles(next);
          }}
          agentBase={mouseBase}
        />
      ) : null}

      {tab === "agents" ? (
        <AgentsPanel
          agentPort={agentPort}
          mousePort={MOUSE_AGENT_PORT}
          tbcBase={tbcBase}
          mouseBase={mouseBase}
          tbcConfig={cfg}
          mouseProfiles={mouseProfiles}
          onAgentMessage={(msg, err) => {
            if (err) setError(err);
            else if (msg) setStatus(msg);
          }}
          canLaunchFromServer={runtime.canLaunchFromServer}
          downloads={runtime.downloads}
        />
      ) : null}
    </div>
  );
}
