import path from "path";
import { buildNoteUri, resolveVaultPath } from "./obsidian";
import type { ExperimentRules, Trade } from "./types";

export function enrichTrade(trade: Trade, rules: ExperimentRules): Trade {
  const id = trade.id.toUpperCase();
  const ticker = trade.ticker.trim().toUpperCase();
  const rel = `${rules.obsidianVaultPath}/${rules.tradesFolder}/${id}-${ticker}.md`.replace(/\\/g, "/");

  return {
    ...trade,
    id,
    ticker,
    obsidianNote: buildNoteUri(id, ticker, rules),
    notePath: rel,
  };
}

export function absoluteNotePath(trade: Trade, rules: ExperimentRules): string {
  return path.join(resolveVaultPath(rules), rules.tradesFolder, `${trade.id}-${trade.ticker}.md`);
}
