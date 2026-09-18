import type { TbcTile } from "./tbc-types";

export function resolveMacros(text: string, macros: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => macros[name] ?? `{{${name}}}`);
}

export type TileRunMode = "url" | "local";

export function classifyTile(tile: TbcTile, macros: Record<string, string>): TileRunMode {
  const kind = (tile.kind || "open").toLowerCase();
  const target = resolveMacros(tile.target ?? "", macros);
  if (kind === "url") return "url";
  if (/^https?:\/\//i.test(target)) return "url";
  return "local";
}

export function runUrlTile(tile: TbcTile, macros: Record<string, string>): void {
  const kind = (tile.kind || "open").toLowerCase();
  let url = resolveMacros(tile.target ?? "", macros);
  if (kind === "url" || /^https?:\/\//i.test(url)) {
    if (!/^https?:\/\//i.test(url)) throw new Error("Invalid URL");
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  throw new Error("Not a URL tile");
}

/** Default local TBC agent base (user can override in UI later). */
export function tbcAgentBase(port = 4010): string {
  return `http://127.0.0.1:${port}`;
}

export function tbcRunTileUrl(tileId: string, port = 4010): string {
  return `${tbcAgentBase(port)}/api/run?id=${encodeURIComponent(tileId)}`;
}
