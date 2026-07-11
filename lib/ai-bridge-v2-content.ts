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

export const AI_BRIDGE_V2_RULES = [
  "You speak in actions, not JSON.",
  "AI decides the correct internal block type.",
  "One response = one AI Block.",
  "You review everything in Inbox.",
  "You apply. Never auto-apply.",
  "Supabase is the source of truth.",
] as const;

export const AI_BRIDGE_V2_FLOW_STEPS = [
  { icon: "📋", label: "You copy Snapshot" },
  { icon: "🤖", label: "AI analyzes" },
  { icon: "📦", label: "AI responds AI Block" },
  { icon: "📥", label: "You review in Inbox" },
  { icon: "✓", label: "You apply to Supabase" },
] as const;

export type AiBridgeRequestPill =
  | "open"
  | "adjust"
  | "close"
  | "analyze-portfolio"
  | "review-performance"
  | "other";

export const AI_BRIDGE_V2_REQUEST_PILLS: {
  id: AiBridgeRequestPill;
  label: string;
  placeholder: string;
}[] = [
  { id: "open", label: "Open a trade", placeholder: "Open long GOOGL with stop 335 and target 450" },
  { id: "adjust", label: "Adjust a trade", placeholder: "Move my stop on AMZN to 175" },
  { id: "close", label: "Close a trade", placeholder: "Close GOOGL at 335" },
  { id: "analyze-portfolio", label: "Analyze portfolio", placeholder: "Analyze my open trades and risk exposure" },
  {
    id: "review-performance",
    label: "Review performance",
    placeholder: "Review my cycle performance and playbook stats",
  },
  { id: "other", label: "Other request", placeholder: "Ask anything about your trading context" },
];

export const AI_BRIDGE_V2_HUMAN_ACTION_CARDS = [
  {
    title: "Open Trade",
    icon: "↗",
    color: "emerald",
    description: "Start a new trade idea or record a filled entry.",
  },
  {
    title: "Adjust Trade",
    icon: "↔",
    color: "blue",
    description: "Update stop, target, size, thesis, etc.",
  },
  {
    title: "Close Trade",
    icon: "✕",
    color: "red",
    description: "Record exit for an existing trade.",
  },
  {
    title: "Analyze",
    icon: "◎",
    color: "violet",
    description: "Review portfolio, playbooks, performance.",
  },
  {
    title: "Other",
    icon: "⋯",
    color: "zinc",
    description: "Ask anything about your trading.",
  },
] as const;

export const AI_BRIDGE_V2_BLOCK_EXAMPLES = `// trade-proposal
{ "type": "trade-proposal", "proposal": { "id": "H002", "ticker": "GOOGL", "entry": 175, "stop": 170, "shares": 10 } }

// trade-update
{ "type": "trade-update", "proposal": { "id": "H001", "stop": 95, "target": 110 } }

// trade-close
{ "type": "trade-close", "proposal": { "id": "H001", "exit": 108.5 } }

// analysis
{ "type": "analysis", "proposal": { "id": "H001", "thesis": "Trend intact.", "lessons": "Held too short." } }`;

export const AI_BRIDGE_V2_AUTO_INCLUDE_OPTIONS = [
  "Trades",
  "Playbooks",
  "Statistics",
  "Notes",
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
  requestLabel: string,
  userMessage: string,
  snapshotText: string
): string {
  return [
    "=== MATRIXTRADE AI BRIDGE HANDOFF ===",
    "",
    `Request: ${requestLabel}`,
    "",
    "=== USER REQUEST ===",
    userMessage.trim() || "(no message — add your request)",
    "",
    "=== INSTRUCTIONS FOR AI ===",
    "Return exactly ONE AI Block as plain JSON or a single ```json fenced block.",
    "Infer the internal type from the user's intent.",
    "Do not auto-apply — the human will Import → Inbox → Apply in MatrixTrade.",
    "",
    "=== SNAPSHOT ===",
    snapshotText,
  ].join("\n");
}
