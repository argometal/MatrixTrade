import type { TradingProposalType } from "./bridge";

export const AI_BRIDGE_BLOCK_TYPES = [
  "analysis",
  "trade-proposal",
  "trade-close",
  "trade-review",
  "trade-update",
  "playbook-create",
  "playbook-update",
] as const satisfies readonly TradingProposalType[];

export const AI_BRIDGE_APPLY_READY = [...AI_BRIDGE_BLOCK_TYPES] as const;

export const AI_BRIDGE_PARSER_ONLY = [] as const satisfies readonly TradingProposalType[];

export type AiBridgeBlockType = (typeof AI_BRIDGE_BLOCK_TYPES)[number];

export function isApplyImplemented(type: TradingProposalType): boolean {
  return (AI_BRIDGE_APPLY_READY as readonly string[]).includes(type);
}

export function getApplyStatusLabel(type: TradingProposalType): string {
  return isApplyImplemented(type) ? "Apply ready" : "Supported by parser · Apply pending";
}

export const AI_BRIDGE_CAPABILITIES =
  "Analyze trades, create trades, update trades, close trades, review trades, add notes, and manage playbooks — via AI Blocks imported through Inbox (human Apply only).";

export const AI_BRIDGE_FLOW =
  "MatrixTrade → Copy Snapshot → your AI → AI Block → Import → Inbox → Apply → Supabase";
