import { cache } from "react";
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
import { tradeForensicSnapshotItem } from "./snapshot-trade-packages";
import { getTradesStoreMode } from "./trades-json";
import { listAllPendingInboxItems } from "./trading-inbox-storage";
import { resolveInboxBackendLabel } from "./trading-inbox-submit";
import type { TradePlan } from "./plan-types";
import type { StockThesis } from "./stock-thesis-types";
import { fetchBridgeInbox, getBridgeConfig } from "./bridge";
import { listAiNotes } from "./ai-notes";

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

  const scoutingSnapshots = scoutDeskSnapshotItems({
    playbooks,
    stockTheses: activeTheses,
    plans,
    monthly,
    experiment,
    marketEvidence,
  }).filter((item) => item.id === "scout-desk" || item.id === "mechanics");

  const closedTrades = trades
    .filter((t) => t.status === "closed")
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));

  const tradeEntries = closedTrades.map((trade) => ({
    trade,
    snapshotItems: [tradeForensicSnapshotItem({ trade, playbooks, plans, theses: stockTheses })],
  }));

  return {
    playbooks,
    activeThesisCount: activeTheses.length,
    activePlanCount: activePlans.length,
    pendingInboxCount: pendingInbox.length,
    trainAi: {
      mechanicsBrief: buildMatrixMechanicsBrief(),
      snapshotItems: [mechanicsSnapshot, ...playbookSnapshots.filter((item) => item.id === "playbook")],
    },
    playbook: {
      snapshotItems: playbookSnapshots,
    },
    stockFile: {
      theses: buildThesisEntries(activeTheses, playbooks, plans, evidenceByProfile),
    },
    scouting: {
      snapshotItems: scoutingSnapshots,
    },
    trade: {
      snapshotItems: tradesListSnapshotItems(exchangeInput),
      closedTrades: tradeEntries,
    },
  };
});
