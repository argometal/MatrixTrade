import type { TradingProposalType } from "./bridge";

export const AI_BRIDGE_BLOCK_TYPES = [
  "stock-case-create",
  "stock-case-delete",
  "evidence-add",
  "scout-assessment",
  "decision-update",
  "layered-entry-update",
  "file-update",
  "scout-plan-create",
  "technical-assessment",
  "technical-calibration",
  "analysis",
  "trade-proposal",
  "trade-close",
  "trade-review",
  "trade-update",
  "attribution",
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
  "Open, adjust, close, and analyze trades in natural language; validate Stock Files and scout decisions — proposals import through AI Bridge → Inbox (human Apply only).";

export const AI_BRIDGE_FLOW =
  "Copy Snapshot → tell your AI what you want → paste its response → Inbox → Apply → Supabase";
