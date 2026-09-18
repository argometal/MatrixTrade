"use client";

import { AF_TEXT } from "@/lib/argusforge/af03-visible-ontology";
import type { AgentHealth } from "@/lib/workshop/agent-client";

export function AgentStatusBar({
  health,
  agentBase,
  onSync,
  syncing,
  onStartAgent,
  starting,
}: {
  health: AgentHealth | null;
  agentBase: string;
  onSync: () => void;
  syncing: boolean;
  onStartAgent: () => void;
  starting: boolean;
}) {
  const online = health?.ok;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${online ? "bg-lime-400" : "bg-zinc-600"}`}
          aria-hidden
        />
        <span className="text-xs text-zinc-200">
          TBC agent {online ? "online" : "offline"}
          {health?.name ? ` · ${health.name}` : ""}
        </span>
        {!online && health?.error ? (
          <span className={`text-[10px] ${AF_TEXT.metadata}`}>({health.error})</span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={agentBase}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-zinc-500 underline hover:text-lime-300"
        >
          {agentBase}
        </a>
        {!online ? (
          <button
            type="button"
            disabled={starting}
            onClick={onStartAgent}
            className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-200 disabled:opacity-40"
          >
            {starting ? "Starting…" : "Start TBC from Forge"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={!online || syncing}
          onClick={onSync}
          className="rounded-lg border border-lime-500/30 bg-lime-500/10 px-2 py-1 text-[10px] font-semibold text-lime-300 disabled:opacity-40"
        >
          {syncing ? "Syncing…" : "Sync config → agent"}
        </button>
      </div>
    </div>
  );
}
