import { cache } from "react";
import { listAiNotes } from "./ai-notes";
import { fetchBridgeInbox, getBridgeConfig } from "./bridge";
import { buildMatrixMechanicsBrief } from "./matrix-mechanics-brief";
import { getMarketEvidence } from "./market-evidence";
import type { MarketEvidence } from "./market-evidence-types";
import type { ControlPanelData } from "./control-panel-types";
import { getPlans } from "./plans";
import { getPlaybooks } from "./playbooks";
import { getSetups } from "./setups";
import { getSnapshotRevisionState } from "./snapshot-revision-read";
import {
  mechanicsSnapshotItem,
  playbookSnapshotItems,
  scoutDeskSnapshotItems,
  stockProfileSnapshotItems,
  tradesListSnapshotItems,
} from "./snapshot-packages";
import { getSyncHistory } from "./sync-history";
import { checkWorkerReachable } from "./system-status";
import { getExperiment, getMonthlyRisk, getTrades } from "./storage";
import { getStockTheses } from "./stock-theses";
import { isActiveStockThesisStatus } from "./stock-thesis-types";
import { getTradesStoreMode } from "./trades-json";
import { listAllPendingInboxItems } from "./trading-inbox-storage";
import { resolveInboxBackendLabel } from "./trading-inbox-submit";
import type { TradePlan } from "./plan-types";
import type { StockThesis } from "./stock-thesis-types";

function groupActiveEvidence(rows: MarketEvidence[]): Map<string, MarketEvidence[]> {
  const superseded = new Set(rows.map((row) => row.supersededBy).filter(Boolean) as string[]);
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

function isActiveScoutPlan(plan: TradePlan): boolean {
  return plan.status === "watching" || plan.status === "ready";
}

function buildThesisEntries(
  theses: StockThesis[],
  playbooks: Awaited<ReturnType<typeof getPlaybooks>>,
  plans: TradePlan[],
  evidenceByProfile: Map<string, MarketEvidence[]>
): ControlPanelData["stockFile"]["theses"] {
  return theses.map((thesis) => ({
    thesis,
    snapshotItems: stockProfileSnapshotItems({
      thesis,
      playbooks,
      plans,
      activeEvidence: evidenceByProfile.get(thesis.id.toUpperCase()) ?? [],
    }),
  }));
}

function buildPlanEntries(
  activePlans: TradePlan[],
  playbooks: Awaited<ReturnType<typeof getPlaybooks>>,
  activeTheses: StockThesis[],
  monthly: Awaited<ReturnType<typeof getMonthlyRisk>>,
  experiment: Awaited<ReturnType<typeof getExperiment>>,
  marketEvidence: MarketEvidence[]
): ControlPanelData["scouting"]["planEntries"] {
  return activePlans.map((plan) => {
    const focusThesis = activeTheses.find((t) => t.id === plan.stockThesisId);
    return {
      plan,
      snapshotItems: scoutDeskSnapshotItems({
        playbooks,
        stockTheses: activeTheses,
        plans: activePlans,
        monthly,
        experiment,
        marketEvidence,
        focusThesis,
        focusPlan: plan,
      }).filter((item) => item.id === "scout-plan" || item.id === "mechanics"),
    };
  });
}

export const loadControlPanelData = cache(async (): Promise<ControlPanelData> => {
  const bridge = getBridgeConfig();
  const [
    experiment,
    monthly,
    trades,
    setups,
    playbooks,
    plans,
    stockTheses,
    revision,
    workerStatus,
    syncHistory,
    aiNotes,
    marketEvidence,
    workerInbox,
  ] = await Promise.all([
    getExperiment(),
    getMonthlyRisk(),
    getTrades(),
    getSetups(),
    getPlaybooks(),
    getPlans(),
    getStockTheses(),
    getSnapshotRevisionState(),
    checkWorkerReachable(),
    getSyncHistory(),
    listAiNotes(20),
    getMarketEvidence(),
    fetchBridgeInbox(),
  ]);

  const pendingInbox = await listAllPendingInboxItems(workerInbox);
  const snapshotRevision = workerStatus.snapshotRevision ?? revision?.revision ?? 0;
  const lastSync = syncHistory.find((entry) => entry.ok);
  const systemNotes = {
    tradesStore: getTradesStoreMode(),
    bridgeConfigured: bridge.configured,
    workerReachable: workerStatus.reachable,
    inboxBackend: resolveInboxBackendLabel(),
    lastSyncAt: lastSync?.at ?? null,
  };

  const activeTheses = stockTheses.filter((t) => isActiveStockThesisStatus(t.status));
  const activePlans = plans.filter(isActiveScoutPlan);
  const evidenceByProfile = groupActiveEvidence(marketEvidence);

  const mechanicsSnapshot = mechanicsSnapshotItem();
  const playbookSnapshots = playbookSnapshotItems(playbooks, trades);
  const exchangeInput = {
    experiment,
    monthly,
    trades,
    setups,
    playbooks,
    snapshotRevision,
    priorAiNotes: aiNotes,
    plans,
    stockTheses,
    systemNotes,
  };

  const scoutingOverview = scoutDeskSnapshotItems({
    playbooks,
    stockTheses: activeTheses,
    plans,
    monthly,
    experiment,
    marketEvidence,
    focusThesis: activeTheses[0],
    focusPlan: activePlans[0],
  });

  const stockThesesEntries = buildThesisEntries(
    activeTheses,
    playbooks,
    plans,
    evidenceByProfile
  );

  const scoutingThesisEntries = activeTheses.map((thesis) => ({
    thesis,
    snapshotItems: scoutDeskSnapshotItems({
      playbooks,
      stockTheses: activeTheses,
      plans,
      monthly,
      experiment,
      marketEvidence,
      focusThesis: thesis,
    }).filter((item) => item.id === "scout-ticker" || item.id === "mechanics"),
  }));

  const scoutingPlanEntries = buildPlanEntries(
    activePlans,
    playbooks,
    activeTheses,
    monthly,
    experiment,
    marketEvidence
  );

  const tradeSnapshots = tradesListSnapshotItems(exchangeInput);
  const focusThesis = activeTheses[0];

  return {
    playbooks,
    activeTheses,
    activePlans,
    pendingInboxCount: pendingInbox.length,
    trainAi: {
      mechanicsBrief: buildMatrixMechanicsBrief(),
      mechanicsSnapshot,
      playbookSnapshotItems: playbookSnapshots,
      connectOptions: {
        window: "system",
        intent: "general",
        snapshotTitle: "Matrix Mechanics snapshot",
        snapshotDescription: "Full rules, block types, Apply gate — paste once per AI session",
        snapshotItems: [mechanicsSnapshot, ...playbookSnapshots],
      },
    },
    playbook: {
      snapshotItems: playbookSnapshots,
      connectOptions: {
        window: "playbook",
        intent: "general",
        snapshotTitle: "Playbook snapshot",
        snapshotDescription: "Strategies, checklists, P/L and win rate per playbook",
        snapshotItems: playbookSnapshots,
      },
    },
    stockFile: {
      theses: stockThesesEntries,
      connectOptions: {
        window: "stock-thesis",
        intent: "update-file",
        ticker: focusThesis?.ticker,
        stockProfileId: focusThesis?.id,
        snapshotTitle: focusThesis
          ? `${focusThesis.ticker} · profile`
          : "Stock file snapshot",
        snapshotDescription: "Thesis, levels, invalidation, evidence",
        snapshotItems: focusThesis
          ? stockThesesEntries.find((entry) => entry.thesis.id === focusThesis.id)?.snapshotItems ??
            []
          : [],
      },
    },
    scouting: {
      overviewSnapshotItems: scoutingOverview,
      planEntries: scoutingPlanEntries,
      thesisEntries: scoutingThesisEntries,
      connectOptions: {
        window: "planning",
        intent: "validate-scout",
        ticker: activePlans[0]?.ticker ?? focusThesis?.ticker,
        planId: activePlans[0]?.id,
        snapshotTitle: "Scout desk overview",
        snapshotDescription: "All playbooks, stock files, scouts, monthly risk room",
        snapshotItems: scoutingOverview,
      },
    },
    trade: {
      snapshotItems: tradeSnapshots,
      connectOptions: {
        window: "trades-hub",
        intent: "open-trade",
        snapshotTitle: "Trades snapshot",
        snapshotDescription: "All trades summary, experiment, monthly room",
        snapshotItems: tradeSnapshots,
      },
    },
  };
});
