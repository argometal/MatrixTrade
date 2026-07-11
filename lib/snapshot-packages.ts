import { computeAllPlaybookStats } from "./analytics";
import { buildAiContextPackage } from "./ai-context";
import { buildMatrixMechanicsSnapshot } from "./matrix-mechanics-snapshot";
import type { MarketEvidence } from "./market-evidence-types";
import type { Playbook } from "./playbook-types";
import type { TradePlan } from "./plan-types";
import type { StockThesis } from "./stock-thesis-types";
import type { SnapshotMenuItem } from "./snapshot-types";
import type { MonthlyRisk } from "./monthly-risk";
import type { Experiment, Trade } from "./types";
import type { SmartSnapshotInput } from "./smart-snapshot";
import type { AiContextSystemNotes } from "./ai-context";

export function mechanicsSnapshotItem(): SnapshotMenuItem {
  return {
    id: "mechanics",
    label: "Matrix Mechanics snapshot",
    description: "Full rules, block types, Apply gate — paste once per AI session",
    text: buildMatrixMechanicsSnapshot(),
  };
}

export function dashboardSnapshotItems(
  exchange: SmartSnapshotInput & { systemNotes?: AiContextSystemNotes }
): SnapshotMenuItem[] {
  return [
    {
      id: "dashboard",
      label: "Dashboard snapshot",
      description: "Budget, experiment, attention queue, trades overview",
      text: buildAiContextPackage({ scope: "dashboard", exchange }),
    },
    mechanicsSnapshotItem(),
  ];
}

export function playbookSnapshotItems(
  playbooks: Playbook[],
  trades: Trade[]
): SnapshotMenuItem[] {
  const stats = computeAllPlaybookStats(playbooks, trades);
  return [
    {
      id: "playbook",
      label: "Playbook snapshot",
      description: "Strategies, checklists, P/L and win rate per playbook",
      text: buildAiContextPackage({
        scope: "playbook",
        playbooks,
        playbookStats: stats,
      }),
    },
    mechanicsSnapshotItem(),
  ];
}

export function scoutDeskSnapshotItems(input: {
  playbooks: Playbook[];
  stockTheses: StockThesis[];
  plans: TradePlan[];
  monthly: MonthlyRisk;
  experiment: Experiment;
  marketEvidence: MarketEvidence[];
  focusThesis?: StockThesis;
  focusPlan?: TradePlan;
}): SnapshotMenuItem[] {
  const activeTheses = input.stockTheses;
  const evidenceByProfile = groupActiveEvidence(input.marketEvidence);
  const items: SnapshotMenuItem[] = [
    {
      id: "scout-desk",
      label: "Scout desk overview",
      description: "All playbooks, stock files, scouts, monthly risk room",
      text: buildAiContextPackage({
        scope: "scouting",
        playbooks: input.playbooks,
        stockTheses: activeTheses,
        plans: input.plans,
        monthly: input.monthly,
        experiment: input.experiment,
      }),
    },
  ];

  const thesis = input.focusThesis ?? activeTheses[0];
  if (thesis) {
    items.push({
      id: "scout-ticker",
      label: `${thesis.ticker} snapshot`,
      description: "Stock profile, evidence, scouts for this ticker",
      text: buildAiContextPackage({
        scope: "scouting-ticker",
        focusThesis: thesis,
        playbooks: input.playbooks,
        plans: input.plans,
        monthly: input.monthly,
        activeEvidence: evidenceByProfile.get(thesis.id.toUpperCase()) ?? [],
      }),
    });
  }

  const plan = input.focusPlan;
  if (plan) {
    const planThesis = activeTheses.find((t) => t.id === plan.stockThesisId);
    items.push({
      id: "scout-plan",
      label: `${plan.id} scout snapshot`,
      description: "This scout plan — levels, decision, probe, linked profile",
      text: buildAiContextPackage({
        scope: "scout-plan",
        focusPlan: plan,
        focusThesis: planThesis,
        playbooks: input.playbooks,
      }),
    });
  }

  items.push(mechanicsSnapshotItem());
  return items;
}

export function stockProfileSnapshotItems(input: {
  thesis: StockThesis;
  playbooks: Playbook[];
  plans: TradePlan[];
  activeEvidence: MarketEvidence[];
}): SnapshotMenuItem[] {
  const tickerPlans = input.plans.filter((p) => p.stockThesisId === input.thesis.id);
  return [
    {
      id: "profile",
      label: `${input.thesis.ticker} profile snapshot`,
      description: "Thesis, levels, invalidation, evidence, synthesis",
      text: buildAiContextPackage({
        scope: "stock-file",
        focusThesis: input.thesis,
        playbooks: input.playbooks,
        activeEvidence: input.activeEvidence,
      }),
    },
    {
      id: "profile-scouts",
      label: "Linked scouts",
      description: `Active scout plans for ${input.thesis.ticker}`,
      text: buildAiContextPackage({
        scope: "stock-scouts",
        focusThesis: input.thesis,
        plans: tickerPlans,
      }),
    },
    mechanicsSnapshotItem(),
  ];
}

export function tradesListSnapshotItems(
  exchange: SmartSnapshotInput & { systemNotes?: AiContextSystemNotes }
): SnapshotMenuItem[] {
  return [
    {
      id: "trades-list",
      label: "Trades snapshot",
      description: "All trades summary, experiment, monthly room",
      text: buildAiContextPackage({ scope: "trades-list", exchange }),
    },
    mechanicsSnapshotItem(),
  ];
}

function groupActiveEvidence(rows: MarketEvidence[]): Map<string, MarketEvidence[]> {
  const superseded = new Set(rows.map((r) => r.supersededBy).filter(Boolean) as string[]);
  const map = new Map<string, MarketEvidence[]>();
  for (const row of rows) {
    if (row.supersededBy || superseded.has(row.id)) continue;
    const key = row.stockProfileId.toUpperCase();
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return map;
}
