import type { AiNote } from "./ai-notes-types";
import { buildAiContextPackage } from "./ai-context";
import type { Playbook } from "./playbook-types";
import type { Experiment, Trade } from "./types";
import type { SmartSnapshotInput } from "./smart-snapshot";

export interface AiBlockSnapshotSystemNotes {
  tradesStore: string;
  bridgeConfigured: boolean;
  workerReachable: boolean;
  inboxBackend: string;
  lastSyncAt?: string | null;
}

export interface AiBlockSnapshotInput extends SmartSnapshotInput {
  systemNotes: AiBlockSnapshotSystemNotes;
}

export function buildAiBlockSnapshot(input: AiBlockSnapshotInput): string {
  return buildAiContextPackage({
    scope: "exchange",
    exchange: input,
  });
}

export function buildAiBlockSnapshotFromParts(
  experiment: Experiment,
  trades: Trade[],
  input: Omit<AiBlockSnapshotInput, "experiment" | "trades">
): string {
  return buildAiBlockSnapshot({ experiment, trades, ...input });
}
