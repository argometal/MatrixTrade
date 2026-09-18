"use client";

import type { TbcConfig, TbcPage, TbcTile } from "@/lib/workshop/tbc-types";
import { classifyTile } from "@/lib/workshop/tbc-run";
import { AF_TEXT } from "@/lib/argusforge/af03-visible-ontology";

function newTileId() {
  return `tile_${Date.now().toString(36)}`;
}

export function ToolboxEditor({
  cfg,
  page,
  pageId,
  onPageId,
  onChange,
  onExport,
  onImport,
  onReset,
  onRunTile,
  agentOnline,
}: {
  cfg: TbcConfig;
  page: TbcPage | undefined;
  pageId: string;
  onPageId: (id: string) => void;
  onChange: (next: TbcConfig) => void;
  onExport: () => void;
  onImport: (f: File) => void;
  onReset: () => void;
  onRunTile: (id: string) => void;
  agentOnline: boolean;
}) {
  const macros = cfg.macros ?? {};

  function updatePage(mutator: (p: TbcPage) => TbcPage) {
    if (!page) return;
    onChange({
      ...cfg,
      pages: cfg.pages.map((p) => (p.id === page.id ? mutator(p) : p)),
    });
  }

  function addPage() {
    const title = window.prompt("Page title", "New page");
    if (!title?.trim()) return;
    const id = `page_${Date.now().toString(36)}`;
    const next: TbcPage = { id, title: title.trim(), tiles: [] };
    onChange({ ...cfg, pages: [...cfg.pages, next] });
    onPageId(id);
  }

  function addTile() {
    const label = window.prompt("Tile label", "New tile");
    if (!label?.trim()) return;
    const tile: TbcTile = {
      id: newTileId(),
      label: label.trim(),
      kind: "url",
      target: "https://",
      icon: "▢",
    };
    updatePage((p) => ({ ...p, tiles: [...p.tiles, tile] }));
  }

  function updateTile(tileId: string, patch: Partial<TbcTile>) {
    updatePage((p) => ({
      ...p,
      tiles: p.tiles.map((t) => (t.id === tileId ? { ...t, ...patch } : t)),
    }));
  }

  function removeTile(tileId: string) {
    if (!window.confirm("Remove this tile?")) return;
    updatePage((p) => ({ ...p, tiles: p.tiles.filter((t) => t.id !== tileId) }));
  }

  function onMacrosBlur(raw: string) {
    try {
      const parsed = JSON.parse(raw || "{}") as Record<string, string>;
      onChange({ ...cfg, macros: parsed });
    } catch {
      /* keep previous until valid */
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExport}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-lime-500/30"
        >
          Export tbc.config.json
        </button>
        <label className="cursor-pointer rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-lime-500/30">
          Import JSON
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onImport(f);
            }}
          />
        </label>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500"
        >
          Reset sample
        </button>
        <button
          type="button"
          onClick={addPage}
          className="rounded-lg border border-lime-500/30 bg-lime-500/10 px-3 py-1.5 text-xs font-semibold text-lime-300"
        >
          + Page
        </button>
        <button
          type="button"
          onClick={addTile}
          disabled={!page}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40"
        >
          + Tile
        </button>
      </div>

      <details className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-zinc-300">Macros (JSON)</summary>
        <textarea
          key={JSON.stringify(cfg.macros)}
          defaultValue={JSON.stringify(cfg.macros ?? {}, null, 2)}
          onBlur={(e) => onMacrosBlur(e.target.value)}
          rows={5}
          className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 font-mono text-[11px] text-zinc-300"
        />
        <p className={`mt-1 text-[10px] ${AF_TEXT.metadata}`}>
          Use {"{{MACRO}}"} in targets. Machine paths often come from env TBC_MACRO_* on the agent PC.
        </p>
      </details>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {cfg.pages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPageId(p.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
              p.id === pageId ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:bg-zinc-900"
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>

      {page?.subtitle ? <p className={`text-xs ${AF_TEXT.metadata}`}>{page.subtitle}</p> : null}

      <div className="space-y-3">
        {page?.tiles.map((tile) => {
          const mode = classifyTile(tile, macros);
          return (
            <div
              key={tile.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3"
              style={{ borderLeftWidth: 3, borderLeftColor: tile.accent ?? "#52525b" }}
            >
              <div className="flex flex-wrap items-start gap-2">
                <input
                  value={tile.icon ?? ""}
                  onChange={(e) => updateTile(tile.id, { icon: e.target.value })}
                  className="w-10 rounded border border-zinc-800 bg-zinc-950 px-1 text-center text-sm"
                  title="Icon"
                />
                <input
                  value={tile.label}
                  onChange={(e) => updateTile(tile.id, { label: e.target.value })}
                  className="min-w-[8rem] flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
                />
                <select
                  value={tile.kind ?? "open"}
                  onChange={(e) => updateTile(tile.id, { kind: e.target.value })}
                  className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300"
                >
                  <option value="url">url</option>
                  <option value="open">open</option>
                  <option value="multi">multi</option>
                  <option value="folder">folder</option>
                </select>
                <span className={`self-center text-[10px] ${mode === "url" ? "text-lime-400" : "text-amber-300"}`}>
                  {mode === "url" ? "Browser" : "Agent"}
                </span>
                <button
                  type="button"
                  onClick={() => onRunTile(tile.id)}
                  className="rounded-lg bg-lime-500/15 px-2 py-1 text-xs font-medium text-lime-300"
                >
                  Run
                </button>
                <button
                  type="button"
                  onClick={() => removeTile(tile.id)}
                  className="rounded px-2 py-1 text-xs text-rose-400"
                >
                  Delete
                </button>
              </div>
              <input
                value={tile.target ?? ""}
                onChange={(e) => updateTile(tile.id, { target: e.target.value })}
                placeholder="target or URL"
                className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300"
              />
              {!agentOnline && mode !== "url" ? (
                <p className={`mt-1 text-[10px] text-amber-200/80`}>Start TBC agent to run this tile.</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className={`text-[11px] ${AF_TEXT.metadata}`}>
        {cfg.name} · port {cfg.port ?? 4010} · {cfg.pages.length} page(s)
      </p>
    </section>
  );
}
