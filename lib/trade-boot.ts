import { buildMatrixMechanicsBrief } from "./matrix-mechanics-brief";
import { sampleAiBlock } from "./ai-block";

import { formatTradeProspectLabel, type TradeProspect } from "./trade-prospects";

export const TRADE_BOOT_REQUEST = `Return ONE AI Block only — plain JSON or a single \`\`\`json fenced block.
Use straight ASCII double quotes only — never curly “smart” quotes.

Block type: trade-proposal

EXECUTION LAYER — only after Scouting Desk approves (go / probe converted):
- id: suggested trade id from context (e.g. H004)
- ticker, entry, stop, shares required
- optional: target, thesis, playbookId, direction (long|short), setupId

Rules:
- Respect monthly loss room and Stock File invalidation from context.
- Do not invent a trade without scout approval when a PLAN is linked.
- Return exactly one block. Paste in MatrixTrade Control → Update → Accept — never auto-apply.
- If context is insufficient, ask ONE clarifying question.`;

export interface TradeBootContext {
  suggestedTradeId: string;
  playbooks: Array<{ id: string; name: string }>;
  monthlyLossRoom?: number;
  scoutPrefill?: {
    planId?: string;
    ticker?: string;
    entry?: string;
    stop?: string;
    target?: string;
    playbookId?: string;
  };
  /** All active scouts — user may execute any one. */
  prospects?: TradeProspect[];
}

function formatPlaybookHint(playbooks: TradeBootContext["playbooks"]): string {
  if (playbooks.length === 0) return "(none loaded)";
  return playbooks.map((p) => `${p.id} — ${p.name}`).join("\n");
}

function formatScoutPrefill(prefill: NonNullable<TradeBootContext["scoutPrefill"]>): string {
  const lines = ["=== SCOUT PREFILL (from Scouting Desk) ==="];
  if (prefill.planId) lines.push(`planId: ${prefill.planId}`);
  if (prefill.ticker) lines.push(`ticker: ${prefill.ticker}`);
  if (prefill.entry) lines.push(`plannedEntry: ${prefill.entry}`);
  if (prefill.stop) lines.push(`stopPrice: ${prefill.stop}`);
  if (prefill.target) lines.push(`targetPrice: ${prefill.target}`);
  if (prefill.playbookId) lines.push(`playbookId: ${prefill.playbookId}`);
  lines.push("");
  lines.push("Use these levels unless the user explicitly changes them in chat.");
  return lines.join("\n");
}

function formatProspectsRoster(prospects: TradeProspect[]): string {
  const lines = ["=== ACTIVE SCOUT PROSPECTS (pick one to execute) ==="];
  for (const p of prospects) {
    lines.push(`- ${formatTradeProspectLabel(p)}`);
  }
  lines.push("");
  lines.push("Paste trade-proposal in Control → Update (Scout war room has boot package).");
  return lines.join("\n");
}

export function buildTradeBootPackage(ctx: TradeBootContext): string {
  const mechanics = buildMatrixMechanicsBrief();
  const sample = sampleAiBlock("trade-proposal");
  const monthlyLine =
    ctx.monthlyLossRoom !== undefined
      ? `Monthly loss room remaining: $${ctx.monthlyLossRoom.toFixed(2)}`
      : "Monthly loss room: (load from Matrix context if needed)";

  const sections = [
    mechanics,
    "",
    "=== TRADE BOOT — execution proposal ===",
    "",
    "Layer 4 only: open a trade after Playbook + Stock File + Scout gate.",
    "Discuss sizing, emotion, and final checks in your AI chat. Return ONE trade-proposal block.",
    "",
    `Suggested trade id: ${ctx.suggestedTradeId}`,
    monthlyLine,
    "",
    "Playbooks:",
    formatPlaybookHint(ctx.playbooks),
  ];

  if (ctx.prospects && ctx.prospects.length > 0) {
    sections.push("", formatProspectsRoster(ctx.prospects));
  }

  if (ctx.scoutPrefill?.planId || ctx.scoutPrefill?.ticker) {
    sections.push("", formatScoutPrefill(ctx.scoutPrefill));
  }

  sections.push(
    "",
    "Example:",
    sample,
    "",
    "=== REQUEST ===",
    TRADE_BOOT_REQUEST
  );

  return sections.join("\n");
}
