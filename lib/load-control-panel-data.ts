import { cache } from "react";
import { buildMatrixMechanicsBrief } from "./matrix-mechanics-brief";
import { getMarketEvidence } from "./market-evidence";
import type { MarketEvidence } from "./market-evidence-types";
import type { ControlPanelData } from "./control-panel-types";
import { buildMtaeProtocolBrief } from "./mtae-brief";
import { mtaeControlSnapshotItems, mtaeTickerRequestItem } from "./mtae-snapshot";
import { getMtaeTimeframeMaps } from "./mtae-store";
import { getPlans } from "./plans";
import { getPlaybooks } from "./playbooks";
import {
  mechanicsSnapshotItem,
  playbookSnapshotItems,
  scoutDeskSnapshotItems,
  stockProfileSnapshotItems,
} from "./snapshot-packages";
import { getExperiment, getMonthlyRisk, getTrades } from "./storage";
import { getStockTheses } from "./stock-theses";
import { isActiveStockThesisStatus } from "./stock-thesis-types";
import { listAllPendingInboxItems } from "./trading-inbox-storage";
import type { TradePlan } from "./plan-types";
import type { StockThesis } from "./stock-thesis-types";
import type { MtaeTimeframeMapPreset } from "./mtae-types";
import { fetchBridgeInbox } from "./bridge";

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
  evidenceByProfile: Map<string, MarketEvidence[]>,
  mtaePresets: MtaeTimeframeMapPreset[]
): ControlPanelData["stockFile"]["theses"] {
  return theses.map((thesis) => ({
    thesis,
    snapshotItems: [
      mtaeTickerRequestItem({
        stockProfileId: thesis.id,
        ticker: thesis.ticker,
        presets: mtaePresets,
      }),
      ...stockProfileSnapshotItems({
        thesis,
        playbooks,
        plans,
        activeEvidence: evidenceByProfile.get(thesis.id.toUpperCase()) ?? [],
      }),
    ],
  }));
}

export const loadControlPanelData = cache(async (): Promise<ControlPanelData> => {
  const [
    experiment,
    monthly,
    trades,
    playbooks,
    plans,
    stockTheses,
    marketEvidence,
    workerInbox,
    mtaePresets,
  ] = await Promise.all([
    getExperiment(),
    getMonthlyRisk(),
    getTrades(),
    getPlaybooks(),
    getPlans(),
    getStockTheses(),
    getMarketEvidence(),
    fetchBridgeInbox(),
    getMtaeTimeframeMaps(),
  ]);

  const pendingInbox = await listAllPendingInboxItems(workerInbox);
  const activeTheses = stockTheses.filter((t) => isActiveStockThesisStatus(t.status));
  const activePlans = plans.filter(isActiveScoutPlan);
  const evidenceByProfile = groupActiveEvidence(marketEvidence);

  const mechanicsSnapshot = mechanicsSnapshotItem();
  const playbookSnapshots = playbookSnapshotItems(playbooks, trades);
  const mtaeSnapshots = mtaeControlSnapshotItems(mtaePresets);

  const scoutingSnapshots = scoutDeskSnapshotItems({
    playbooks,
    stockTheses: activeTheses,
    plans,
    monthly,
    experiment,
    marketEvidence,
  }).filter((item) => item.id === "scout-desk");

  return {
    playbooks,
    activeThesisCount: activeTheses.length,
    activePlanCount: activePlans.length,
    pendingInboxCount: pendingInbox.length,
    trainAi: {
      mechanicsBrief: buildMatrixMechanicsBrief(),
      snapshotItems: [mechanicsSnapshot],
    },
    mtae: {
      protocolBrief: buildMtaeProtocolBrief(mtaePresets),
      snapshotItems: mtaeSnapshots,
    },
    playbook: {
      snapshotItems: playbookSnapshots,
    },
    stockFile: {
      theses: buildThesisEntries(activeTheses, playbooks, plans, evidenceByProfile, mtaePresets),
    },
    scouting: {
      snapshotItems: scoutingSnapshots,
    },
  };
});
