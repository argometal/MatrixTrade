import type { AiBridgeHumanAction } from "./ai-bridge-human-actions";

export const AI_BRIDGE_V2_HOW_IT_WORKS = [
  "Choose an action (Open, Adjust, Close, Analyze).",
  "Describe what you want in your own words.",
  "Send to AI Bridge — copies snapshot + your request for your assistant.",
  "Paste your AI's JSON proposal in the review area.",
  "Import to Inbox — nothing is applied yet.",
  "Review and Apply — data writes to Supabase.",
] as const;

export const AI_BRIDGE_V2_WHATS_NEW = [
  "Human actions first — not block type names",
  "AI infers internal block type from natural language",
  "Live snapshot panel with cycle context",
  "Proposal review before Inbox import",
  "Classic view still available via toggle",
] as const;

export const AI_BRIDGE_V2_PROTOCOL = [
  "Understand the user's intent in plain language",
  "Infer the correct action (Open / Adjust / Close / Analyze)",
  "Return exactly one valid AI Block JSON",
  "Never auto-apply — human uses Inbox → Apply",
  "Suggest playbook only when a repeatable pattern is clear",
] as const;

export const AI_BRIDGE_V2_NATURAL_EXAMPLES = [
  "Open a long on GOOGL, entry 175, stop 170, 10 shares",
  "Move my stop on H001 to 95",
  "Close H002 at 172.25 — already out at the broker",
  "Analyze my AMZN trade — thesis held but exit was early",
] as const;

export const AI_BRIDGE_V2_ACTION_MAP: {
  action: string;
  internal: string;
  when: string;
}[] = [
  {
    action: "Open Trade",
    internal: "trade-proposal",
    when: "New entry; status open if already filled at broker",
  },
  {
    action: "Adjust Trade",
    internal: "trade-update",
    when: "Change stop, target, thesis, or other fields",
  },
  {
    action: "Close Trade",
    internal: "trade-close",
    when: "Exit price; confirmExternalClose for external pending fills",
  },
  {
    action: "Analyze Trade",
    internal: "analysis / trade-review",
    when: "Notes or post-close quality review",
  },
];

export const AI_BRIDGE_V2_DEFAULT_CHIPS: Record<AiBridgeHumanAction, string[]> = {
  open: [
    "Open long GOOGL with stop 170 and target 185",
    "Register H003 MSFT entry 420 stop 410, 10 shares",
    "Open NVDA — already filled at broker",
  ],
  adjust: [
    "Move my stop on AMZN to 175",
    "Raise target on H001 to 110",
    "Update thesis on H002 after earnings",
  ],
  close: [
    "Close GOOGL at 335",
    "Close H002 at 172.25",
    "Close H001 — pending but already out at broker",
  ],
  analyze: [
    "Analyze H001 — entry was good, exit too early",
    "Add psychology notes on my TSLA trade",
    "Review H002 with quality scores",
  ],
};

export function buildAiBridgeHandoffText(
  actionLabel: string,
  userMessage: string,
  snapshotText: string
): string {
  return [
    "=== MATRIXTRADE AI BRIDGE HANDOFF ===",
    "",
    `Action: ${actionLabel}`,
    "",
    "=== USER REQUEST ===",
    userMessage.trim() || "(no message — add your request)",
    "",
    "=== INSTRUCTIONS FOR AI ===",
    "Return exactly ONE AI Block as plain JSON or a single ```json fenced block.",
    "Infer the internal type from the action and user message.",
    "Do not auto-apply — the human will Import → Inbox → Apply in MatrixTrade.",
    "",
    "=== SNAPSHOT ===",
    snapshotText,
  ].join("\n");
}
