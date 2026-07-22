import { computeAllPlaybookStats } from "./analytics";
import { buildAiContextPackage } from "./ai-context";
import { buildMatrixMechanicsSnapshot } from "./matrix-mechanics-snapshot";
import type { MarketEvidence } from "./market-evidence-types";
import type { Playbook } from "./playbook-types";
import type { TradePlan } from "./plan-types";
import type { StockThesis } from "./stock-thesis-types";
import type { SnapshotMenuItem } from "./snapshot-types";
import { wrapSnapshotText } from "./snapshot-verification";
import type { MtaeAssessment } from "./mtae-types";
import { formatMtaeAssessmentSnapshot } from "./mtae-momentum-format";
import type { MonthlyRisk } from "./monthly-risk";
import type { Experiment, Trade } from "./types";
import type { SmartSnapshotInput } from "./smart-snapshot";
import type { AiContextSystemNotes } from "./ai-context";

export function mechanicsSnapshotItem(): SnapshotMenuItem {
  return {
    id: "mechanics",
    label: "MtA Mechanics snapshot",
    description: "Full rules, block types, Apply gate — paste once per AI session",
    text: wrapSnapshotText("MtA Mechanics snapshot", buildMatrixMechanicsSnapshot()),
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
      text: wrapSnapshotText("Dashboard snapshot", buildAiContextPackage({ scope: "dashboard", exchange })),
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
      text: wrapSnapshotText(
        "Playbook snapshot",
        buildAiContextPackage({
          scope: "playbook",
          playbooks,
          playbookStats: stats,
        })
      ),
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
      text: wrapSnapshotText(
        "Scout desk overview",
        buildAiContextPackage({
          scope: "scouting",
          playbooks: input.playbooks,
          stockTheses: activeTheses,
          plans: input.plans,
          monthly: input.monthly,
          experiment: input.experiment,
        })
      ),
    },
  ];

  const thesis = input.focusThesis ?? activeTheses[0];
  if (thesis) {
    items.push({
      id: "scout-ticker",
      label: `${thesis.ticker} · stock snapshot`,
      description: "Stock profile, evidence, scouts for this ticker",
      text: wrapSnapshotText(
        `${thesis.ticker} stock snapshot`,
        buildAiContextPackage({
          scope: "scouting-ticker",
          focusThesis: thesis,
          playbooks: input.playbooks,
          plans: input.plans,
          monthly: input.monthly,
          activeEvidence: evidenceByProfile.get(thesis.id.toUpperCase()) ?? [],
        })
      ),
    });
  }

  const plan = input.focusPlan;
  if (plan) {
    const planThesis = activeTheses.find((t) => t.id === plan.stockThesisId);
    items.push({
      id: "scout-plan",
      label: `${plan.ticker} · ${plan.id} scout`,
      description: "This scout plan — levels, decision, probe, linked profile",
      text: wrapSnapshotText(
        `${plan.ticker} · ${plan.id} scout snapshot`,
        buildAiContextPackage({
          scope: "scout-plan",
          focusPlan: plan,
          focusThesis: planThesis,
          playbooks: input.playbooks,
        })
      ),
    });
  }

  // No separate Mechanics menu item here — desk packages already prefix the brief,
  // and Control → Mechanics brief is the one place for the full constitution.
  return items;
}

export function stockProfileSnapshotItems(input: {
  thesis: StockThesis;
  playbooks: Playbook[];
  plans: TradePlan[];
  activeEvidence: MarketEvidence[];
  latestMtaeAssessment?: MtaeAssessment | null;
}): SnapshotMenuItem[] {
  const tickerPlans = input.plans.filter((p) => p.stockThesisId === input.thesis.id);
  const items: SnapshotMenuItem[] = [
    {
      id: "profile",
      label: `${input.thesis.ticker} · profile`,
      description: "Thesis, levels, invalidation, evidence, synthesis",
      text: wrapSnapshotText(
        `${input.thesis.ticker} profile snapshot`,
        buildAiContextPackage({
          scope: "stock-file",
          focusThesis: input.thesis,
          playbooks: input.playbooks,
          activeEvidence: input.activeEvidence,
        })
      ),
    },
    {
      id: "profile-scouts",
      label: `${input.thesis.ticker} · linked scouts`,
      description: `Active scout plans for ${input.thesis.ticker}`,
      text: wrapSnapshotText(
        `${input.thesis.ticker} linked scouts`,
        buildAiContextPackage({
          scope: "stock-scouts",
          focusThesis: input.thesis,
          plans: tickerPlans,
        })
      ),
    },
  ];
  if (input.latestMtaeAssessment) {
    items.push({
      id: "profile-mtae",
      label: `${input.thesis.ticker} · MTAE assessment`,
      description: "Structure + Momentum / Expansion (technical context only)",
      text: wrapSnapshotText(
        `${input.thesis.ticker} MTAE assessment`,
        formatMtaeAssessmentSnapshot(input.latestMtaeAssessment)
      ),
    });
  } else {
    items.push({
      id: "profile-mtae",
      label: `${input.thesis.ticker} · MTAE assessment`,
      description: "Momentum / Expansion — Not assessed",
      text: wrapSnapshotText(
        `${input.thesis.ticker} MTAE assessment`,
        `=== MTAE ASSESSMENT · ${input.thesis.ticker} ===\nNot assessed — run technical-assessment to populate momentumAssessment.`
      ),
    });
  }
  items.push(mechanicsSnapshotItem());
  return items;
}

export function tradesListSnapshotItems(
  exchange: SmartSnapshotInput & { systemNotes?: AiContextSystemNotes }
): SnapshotMenuItem[] {
  return [
    {
      id: "trades-list",
      label: "Trades snapshot",
      description: "All trades summary, experiment, monthly room",
      text: wrapSnapshotText(
        "Trades snapshot",
        buildAiContextPackage({ scope: "trades-list", exchange })
      ),
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
