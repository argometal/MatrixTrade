import { promises as fs } from "fs";
import { buildNoteUri, resolveVaultPath, writeTradeFile } from "./obsidian";
import type { ExperimentRules, Trade } from "./types";

/**
 * Obsidian is local-only. Skips when vault path is unavailable (e.g. Vercel).
 * Set OBSIDIAN_SYNC=false to disable even when vault exists.
 */
export async function syncObsidianTradeIfLocal(
  trade: Trade,
  rules: ExperimentRules,
  bodyOverride?: string
): Promise<void> {
  if (process.env.OBSIDIAN_SYNC?.trim().toLowerCase() === "false") {
    return;
  }

  const vaultPath = resolveVaultPath(rules);
  try {
    await fs.access(vaultPath);
  } catch {
    return;
  }

  const id = trade.id.toUpperCase();
  const ticker = trade.ticker.toUpperCase();

  await writeTradeFile(
    {
      ...trade,
      obsidianNote: buildNoteUri(id, ticker, rules),
      notePath: trade.notePath!,
    },
    rules,
    bodyOverride
  );
}
