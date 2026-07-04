import type { AiNote } from "./ai-notes-types";
import type { Playbook } from "./playbook-types";
import { DEFAULT_AI_BLOCK_REQUEST } from "./ai-block";
import { buildSmartSnapshot, type SmartSnapshotInput } from "./smart-snapshot";
import type { Experiment, Trade } from "./types";

export interface AiBlockSnapshotSystemNotes {
  tradesStore: string;
  bridgeConfigured: boolean;
  workerReachable: boolean;
  inboxBackend: string;
  lastSyncAt?: string | null;
}

function formatSystemNotesSection(notes: AiBlockSnapshotSystemNotes): string {
  const lines = [
    "=== SYSTEM ===",
    `trades_store:${notes.tradesStore}`,
    `bridge:${notes.bridgeConfigured ? "configured" : "missing"}`,
    `worker:${notes.workerReachable ? "reachable" : "offline"}`,
    `inbox:${notes.inboxBackend}`,
  ];
  if (notes.lastSyncAt) {
    lines.push(`last_sync:${notes.lastSyncAt}`);
  }
  return lines.join("\n");
}

export interface AiBlockSnapshotInput extends SmartSnapshotInput {
  systemNotes: AiBlockSnapshotSystemNotes;
}

export function buildAiBlockSnapshot(input: AiBlockSnapshotInput): string {
  const base = buildSmartSnapshot({
    ...input,
    options: input.options ?? { setups: input.setups },
  });

  const systemSection = formatSystemNotesSection(input.systemNotes);
  return [
    base,
    "",
    systemSection,
    "",
    "=== REQUEST ===",
    DEFAULT_AI_BLOCK_REQUEST.trim(),
  ].join("\n");
}

export function buildAiBlockSnapshotFromParts(
  experiment: Experiment,
  trades: Trade[],
  input: Omit<AiBlockSnapshotInput, "experiment" | "trades">
): string {
  return buildAiBlockSnapshot({ experiment, trades, ...input });
}
