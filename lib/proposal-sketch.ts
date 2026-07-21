import { describeProposal, validateProposalPayload, type TradingInboxPayload } from "@/lib/bridge";
import { validateOptionalInitialScoutContract } from "@/lib/scout-contract";

export type ProposalSketchField = {
  label: string;
  value: string;
  tone?: "default" | "risk" | "reward" | "neutral" | "accent";
};

export type ProposalSketch = {
  headline: string;
  summary: string;
  action: string;
  fields: ProposalSketchField[];
  expectation?: "up" | "down" | "neutral";
};

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function money(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  const abs = Math.abs(value);
  return value < 0 ? `-$${abs.toFixed(0)}` : `$${abs.toFixed(0)}`;
}

function actionLabel(type: TradingInboxPayload["type"]): string {
  switch (type) {
    case "trade-proposal":
      return "Open trade";
    case "trade-update":
      return "Adjust trade";
    case "trade-close":
      return "Close trade";
    case "trade-review":
      return "Review trade";
    case "attribution":
      return "Attribute experiment";
    case "analysis":
      return "Add analysis";
    case "decision-update":
      return "Scout decision";
    case "scout-assessment":
      return "Scout assessment";
    case "file-update":
      return "Update stock file";
    case "stock-case-create":
      return "New stock profile";
    case "stock-case-delete":
      return "Delete stock profile";
    case "evidence-add":
      return "Add evidence";
    case "layered-entry-update":
      return "Layered entry update";
    case "playbook-create":
      return "New playbook";
    case "playbook-update":
      return "Update playbook";
    default:
      return "Proposal";
  }
}

export function buildProposalSketch(payload: TradingInboxPayload): ProposalSketch {
  const p = payload.proposal;
  const fields: ProposalSketchField[] = [];
  let expectation: ProposalSketch["expectation"] = "neutral";

  switch (payload.type) {
    case "trade-proposal": {
      const entry = num(p.entry);
      const stop = num(p.stop);
      const target = num(p.target);
      const shares = num(p.shares);
      const ticker = String(p.ticker ?? "—").toUpperCase();
      const status = String(p.status ?? "pending").toLowerCase();

      if (ticker) fields.push({ label: "Ticker", value: ticker, tone: "accent" });
      if (entry !== undefined) fields.push({ label: "Entry", value: `$${entry}` });
      if (stop !== undefined) fields.push({ label: "Stop", value: `$${stop}`, tone: "risk" });
      if (target !== undefined) fields.push({ label: "Target", value: `$${target}`, tone: "reward" });
      if (shares !== undefined) fields.push({ label: "Shares", value: String(shares) });
      fields.push({ label: "Status", value: status });

      if (entry !== undefined && stop !== undefined && shares !== undefined) {
        const risk = Math.abs(entry - stop) * shares;
        fields.push({ label: "Risk", value: money(risk) ?? "—", tone: "risk" });
        if (target !== undefined) {
          const reward = Math.abs(target - entry) * shares;
          fields.push({ label: "Reward", value: money(reward) ?? "—", tone: "reward" });
          if (risk > 0) {
            fields.push({ label: "R:R", value: (reward / risk).toFixed(1) });
          }
          expectation = target >= entry ? "up" : "down";
        }
      }
      break;
    }
    case "trade-close": {
      fields.push({ label: "Trade", value: String(p.id ?? "—") });
      if (p.exit !== undefined) fields.push({ label: "Exit", value: `$${p.exit}` });
      if (p.confirmExternalClose === true) {
        fields.push({ label: "Note", value: "External close confirm" });
      }
      expectation = "down";
      break;
    }
    case "trade-update": {
      fields.push({ label: "Trade", value: String(p.id ?? "—"), tone: "accent" });
      if (p.stop !== undefined) fields.push({ label: "Stop", value: `$${p.stop}`, tone: "risk" });
      if (p.target !== undefined) fields.push({ label: "Target", value: `$${p.target}`, tone: "reward" });
      if (p.entry !== undefined) fields.push({ label: "Entry", value: `$${p.entry}` });
      if (p.shares !== undefined) fields.push({ label: "Shares", value: String(p.shares) });
      if (p.status !== undefined) fields.push({ label: "Status", value: String(p.status) });
      if (p.playbookId !== undefined) fields.push({ label: "Playbook", value: String(p.playbookId) });
      if (p.planId !== undefined) fields.push({ label: "Plan", value: String(p.planId) });
      if (p.plannedRisk !== undefined) fields.push({ label: "Planned risk", value: `$${p.plannedRisk}` });
      if (p.exitReason !== undefined) fields.push({ label: "Exit reason", value: String(p.exitReason) });
      if (p.lossClassification !== undefined) {
        fields.push({ label: "Loss class", value: String(p.lossClassification) });
      }
      break;
    }
    case "decision-update": {
      const verdict = String(p.verdict ?? "—");
      fields.push({ label: "Plan", value: String(p.planId ?? "—"), tone: "accent" });
      if (p.verdict !== undefined) fields.push({ label: "Verdict", value: verdict, tone: "accent" });
      if (p.plannedEntry !== undefined) fields.push({ label: "Entry", value: `$${p.plannedEntry}` });
      if (p.stopPrice !== undefined) fields.push({ label: "Stop", value: `$${p.stopPrice}`, tone: "risk" });
      if (p.targetPrice !== undefined) fields.push({ label: "Target", value: `$${p.targetPrice}`, tone: "reward" });
      if (verdict === "go" || verdict === "probe") expectation = "up";
      if (verdict === "no") expectation = "down";
      break;
    }
    case "scout-assessment": {
      fields.push({ label: "Ticker", value: String(p.ticker ?? "—").toUpperCase(), tone: "accent" });
      fields.push({ label: "Verdict", value: String(p.verdict ?? "—"), tone: "accent" });
      break;
    }
    case "file-update":
    case "stock-case-create": {
      fields.push({ label: "Profile", value: String(p.ticker ?? p.id ?? "—").toUpperCase(), tone: "accent" });
      if (p.currentHypothesis) {
        fields.push({ label: "Hypothesis", value: String(p.currentHypothesis) });
      }
      if (p.status) fields.push({ label: "Status", value: String(p.status) });
      if (p.initialScout && typeof p.initialScout === "object" && !Array.isArray(p.initialScout)) {
        const scout = p.initialScout as Record<string, unknown>;
        const scoutCheck = validateOptionalInitialScoutContract(scout);
        if (!scoutCheck.ok) {
          fields.push({ label: "Scout contract", value: scoutCheck.errors[0] ?? "Incomplete", tone: "risk" });
        } else if (scoutCheck.plannedEntry !== undefined) {
          fields.push({ label: "Entry", value: `$${scoutCheck.plannedEntry}` });
          fields.push({ label: "Stop", value: `$${scoutCheck.stopPrice}`, tone: "risk" });
          fields.push({ label: "Target", value: `$${scoutCheck.targetPrice}`, tone: "reward" });
          if (scoutCheck.rr !== undefined) {
            fields.push({ label: "R:R", value: scoutCheck.rr.toFixed(2) });
          }
        } else {
          fields.push({ label: "Scout", value: "No initialScout (optional)" });
        }
      }
      break;
    }
    case "stock-case-delete": {
      fields.push({ label: "Profile", value: String(p.id ?? "—").toUpperCase(), tone: "accent" });
      fields.push({
        label: "Confirm",
        value: p.confirmDelete === true ? "DELETE confirmed" : "Missing confirmDelete",
        tone: p.confirmDelete === true ? "risk" : "risk",
      });
      if (p.reason) fields.push({ label: "Reason", value: String(p.reason) });
      break;
    }
    case "evidence-add": {
      fields.push({ label: "Ticker", value: String(p.ticker ?? "—").toUpperCase(), tone: "accent" });
      fields.push({ label: "Category", value: String(p.category ?? "—") });
      if (p.confidence !== undefined) fields.push({ label: "Confidence", value: `${p.confidence}%` });
      break;
    }
    case "attribution": {
      fields.push({
        label: "Trade",
        value: String(p.tradeId ?? p.experimentId ?? "—").toUpperCase(),
        tone: "accent",
      });
      if (p.planId) fields.push({ label: "Plan", value: String(p.planId).toUpperCase() });
      const comps = Array.isArray(p.components) ? p.components.length : 0;
      fields.push({ label: "Components", value: String(comps) });
      if (p.primaryDragComponent) {
        fields.push({
          label: "Primary drag",
          value: String(p.primaryDragComponent),
          tone: "risk",
        });
      }
      break;
    }
    default:
      break;
  }

  return {
    headline: describeProposal(payload),
    summary: describeProposal(payload),
    action: actionLabel(payload.type),
    fields,
    expectation,
  };
}
