import type { AiBlockType } from "./ai-block";

export type AiBridgeHumanAction = "open" | "adjust" | "close" | "analyze";

export interface AiBridgeHumanActionOption {
  id: AiBridgeHumanAction;
  label: string;
  hint: string;
  /** Internal sample key — not shown in UI labels */
  sampleType: AiBlockType;
}

export const AI_BRIDGE_HUMAN_ACTIONS: AiBridgeHumanActionOption[] = [
  {
    id: "open",
    label: "Open Trade",
    hint: "New entry — id, ticker, entry, stop, shares. Already filled at broker? Ask AI for status open.",
    sampleType: "trade-proposal",
  },
  {
    id: "adjust",
    label: "Adjust Trade",
    hint: "Change stop, target, thesis, or other fields on an existing trade.",
    sampleType: "trade-update",
  },
  {
    id: "close",
    label: "Close Trade",
    hint: "Exit price required. Pending but already closed at broker? AI adds confirmExternalClose.",
    sampleType: "trade-close",
  },
  {
    id: "analyze",
    label: "Analyze Trade",
    hint: "Notes on thesis, psychology, lessons — or post-close review with quality scores.",
    sampleType: "analysis",
  },
];

export const AI_BRIDGE_HUMAN_ACTION_LABELS = AI_BRIDGE_HUMAN_ACTIONS.map((a) => a.label);
