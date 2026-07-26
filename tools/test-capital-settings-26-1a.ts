/**
 * Prompt 26-1A — Settings → Capital (independent of trading snapshots)
 * Run: npm run test:capital-settings
 */
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildCapitalConfigurationCreateProposal,
  buildCapitalConfigurationUpdateProposal,
  proposalMixesExternalPosition,
  validatePreparedCapitalProposal,
} from "../lib/capital-settings-proposal";
import {
  buildCapitalSettingsSnapshotText,
  capitalSettingsSnapshotItems,
  snapshotContainsAccountCapitalConfig,
} from "../lib/capital-settings-snapshot";
import { createCapitalConfiguration } from "../lib/capital-configuration";
import { __setCapitalPlannerStoreForTests } from "../lib/capital-planner-store";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import { scoutDeskSnapshotItems, stockProfileSnapshotItems } from "../lib/snapshot-packages";
import { tradesListSnapshotItems } from "../lib/snapshot-packages";
import { mtaeControlSnapshotItems, mtaeTickerRequestItem } from "../lib/mtae-snapshot";
import { resolveUiWindowId } from "../lib/ui-window-ids";
import { PREVIEW_NAV_SECTIONS } from "../lib/preview-nav";
import { validateProposalPayload, parseTradingInboxPayload } from "../lib/bridge";
import { scanExternalPositionNeutrality } from "./scan-external-position-neutrality";

function reset() {
  __setCapitalPlannerStoreForTests({
    configuration: null,
    ledgerEvents: [],
    reservations: [],
  });
}

async function main() {
  await scanExternalPositionNeutrality();

  // 1 — Capital Settings route exists
  {
    const page = path.join(
      process.cwd(),
      "app/(trading)/(preview)/settings/capital/page.tsx"
    );
    await fs.access(page);
    assert.equal(resolveUiWindowId("/settings/capital"), "UI·capital-settings");
    const nav = PREVIEW_NAV_SECTIONS.flatMap((s) => [...s.items]);
    assert.ok(nav.some((i) => i.href === "/settings/capital"));
  }

  // 2 / 3 — Active configuration loads; no config → Unconfigured not zero
  {
    reset();
    const emptyText = buildCapitalSettingsSnapshotText({ configuration: null });
    assert.match(emptyText, /Unconfigured/);
    assert.doesNotMatch(emptyText, /settledCashBase: 0/);

    await createCapitalConfiguration({
      settledCashBase: 1000,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      liquidityBuffer: 0,
      source: "broker_snapshot",
      externalCreditsIncludedInCash: false,
    });
    const { getActiveCapitalConfiguration } = await import(
      "../lib/capital-configuration"
    );
    const cfg = await getActiveCapitalConfiguration();
    assert.ok(cfg);
    assert.equal(cfg!.settledCashBase, 1000);
    const text = buildCapitalSettingsSnapshotText({ configuration: cfg });
    assert.match(text, /settledCashBase: 1000/);
  }

  // 4 — Configure Capital generates valid create proposal
  {
    const payload = buildCapitalConfigurationCreateProposal({
      settledCashBase: 50_000,
      settledCashAsOf: "2026-07-26T12:00:00.000Z",
      totalEquityBase: 80_000,
      totalEquityAsOf: "2026-07-26T12:00:00.000Z",
      liquidityBuffer: 0,
      source: "broker_snapshot",
      externalCreditsIncludedInCash: false,
    });
    assert.equal(payload.type, "capital-configuration-create");
    const check = validatePreparedCapitalProposal(payload);
    assert.equal(check.ok, true);
    const parsed = parseTradingInboxPayload(payload);
    assert.ok(parsed);
    assert.equal(validateProposalPayload(parsed!).ok, true);
  }

  // 5 — Update Capital generates valid update with active ID
  {
    const payload = buildCapitalConfigurationUpdateProposal("CAPCFG-DEFAULT", {
      settledCashBase: 48_000,
      settledCashAsOf: "2026-07-26T15:00:00.000Z",
      source: "broker_snapshot",
    });
    assert.equal(payload.type, "capital-configuration-update");
    assert.equal(
      (payload.proposal as Record<string, unknown>).id,
      "CAPCFG-DEFAULT"
    );
    assert.equal(validatePreparedCapitalProposal(payload).ok, true);
  }

  // 6 — Settings proposal helpers do not persist (pure)
  {
    reset();
    buildCapitalConfigurationCreateProposal({
      settledCashBase: 1,
      source: "manual",
      externalCreditsIncludedInCash: false,
      liquidityBuffer: 0,
    });
    const { getActiveCapitalConfiguration } = await import(
      "../lib/capital-configuration"
    );
    assert.equal(await getActiveCapitalConfiguration(), null);
  }

  // 7 — source broker_snapshot remains when typed from screenshot
  {
    const payload = buildCapitalConfigurationCreateProposal({
      settledCashBase: 10,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      source: "broker_snapshot",
      externalCreditsIncludedInCash: false,
      liquidityBuffer: 0,
    });
    assert.equal(
      (payload.proposal as Record<string, unknown>).source,
      "broker_snapshot"
    );
  }

  // 8 — zero liquidity buffer is valid
  {
    const payload = buildCapitalConfigurationCreateProposal({
      settledCashBase: 10,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      liquidityBuffer: 0,
      source: "manual",
      externalCreditsIncludedInCash: false,
    });
    assert.equal(validatePreparedCapitalProposal(payload).ok, true);
  }

  // 9 — cash and equity remain independent in proposal
  {
    const payload = buildCapitalConfigurationCreateProposal({
      settledCashBase: 100,
      totalEquityBase: 999,
      source: "manual",
      externalCreditsIncludedInCash: false,
      liquidityBuffer: 0,
    });
    const p = payload.proposal as Record<string, unknown>;
    assert.equal(p.settledCashBase, 100);
    assert.equal(p.totalEquityBase, 999);
    assert.notEqual(p.settledCashBase, p.totalEquityBase);
  }

  // 10 — external credits flag explicit
  {
    const payload = buildCapitalConfigurationCreateProposal({
      settledCashBase: 1,
      source: "manual",
      externalCreditsIncludedInCash: true,
      liquidityBuffer: 0,
    });
    assert.equal(
      (payload.proposal as Record<string, unknown>)
        .externalCreditsIncludedInCash,
      true
    );
  }

  // 11–13 — ticker / Scout / Trade snapshots exclude capital configuration balances
  {
    const monthly = {
      monthKey: "2026-07",
      monthlyLossLimit: -300,
      baseCap: 300,
      carryoverIn: 0,
      carryoverEnabled: true,
      monthlyAllowance: 300,
      monthlyRoomCap: 300,
      lossUsedThisMonth: 0,
      effectiveLossCap: -300,
      previousMonthLossUsed: 0,
      monthlyRealizedPnL: 0,
      monthlyLossRoom: 300,
      monthlyCapBreached: false,
      closedTradesThisMonth: 0,
      closedTradesPreviousMonth: 0,
      previousMonthKey: "2026-06",
    };
    const experiment = {
      realizedPnL: 0,
      grossLoss: 0,
      closedTrades: 0,
      wins: 0,
      losses: 0,
    };
    const thesis = {
      id: "ST-EXAMPLE-001",
      ticker: "EXAMPLE",
      status: "watching" as const,
      version: 1,
      style: "swing",
      thesis: "Neutral example thesis",
      historicalAnalysis: [],
      levels: {},
      riskRules: { minimumRR: 3, invalidation: "Weekly close below level" },
      currentHypothesis: "Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const scoutItems = scoutDeskSnapshotItems({
      stockTheses: [thesis],
      plans: [],
      playbooks: [],
      monthly,
      experiment,
      marketEvidence: [],
    });
    for (const item of scoutItems) {
      assert.equal(
        snapshotContainsAccountCapitalConfig(item.text),
        false,
        item.id
      );
    }

    const stockItems = stockProfileSnapshotItems({
      thesis,
      plans: [],
      playbooks: [],
      activeEvidence: [],
    });
    for (const item of stockItems) {
      assert.equal(
        snapshotContainsAccountCapitalConfig(item.text),
        false,
        item.id
      );
    }

    const tradeItems = tradesListSnapshotItems({
      experiment,
      monthly,
      trades: [],
    });
    for (const item of tradeItems) {
      assert.equal(
        snapshotContainsAccountCapitalConfig(item.text),
        false,
        item.id
      );
    }

    const mtaeItems = [
      ...mtaeControlSnapshotItems([]),
      mtaeTickerRequestItem({
        stockProfileId: "ST-EXAMPLE-001",
        ticker: "EXAMPLE",
        presets: [],
      }),
    ];
    for (const item of mtaeItems) {
      assert.equal(
        snapshotContainsAccountCapitalConfig(item.text),
        false,
        item.id
      );
    }
  }

  // 14 — dedicated Capital Settings snapshot is opt-in only
  {
    const items = capitalSettingsSnapshotItems({ configuration: null });
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "capital-settings-snapshot");
    assert.match(items[0].text, /opt-in|account-level/i);
  }

  // 15 / 16 — Capital Planner ↔ Settings links; Settings → Control documented in panel
  {
    const planner = await fs.readFile(
      path.join(
        process.cwd(),
        "app/components/planning-preview/CapitalPlannerPanel.tsx"
      ),
      "utf-8"
    );
    assert.match(planner, /\/settings\/capital/);
    assert.match(planner, /Manage capital settings/);

    const settings = await fs.readFile(
      path.join(
        process.cwd(),
        "app/components/settings/CapitalSettingsPanel.tsx"
      ),
      "utf-8"
    );
    assert.match(settings, /\/planning\/capital/);
    assert.match(settings, /View Capital Planner/);
    assert.match(settings, /Open Control|openPanel/);
    assert.doesNotMatch(settings, /writeCapitalPlannerState|createCapitalConfiguration\(/);
    assert.doesNotMatch(settings, /SUPABASE_SERVICE_ROLE|createClient\(|\.from\(/);
  }

  // 17 — neutrality scan covered at start

  // 18 — schema-generated proposal validates through Apply validation
  {
    const payload = buildCapitalConfigurationCreateProposal({
      settledCashBase: 12_000,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      liquidityBuffer: 500,
      source: "imported",
      externalCreditsIncludedInCash: false,
    });
    const parsed = parseTradingInboxPayload(payload);
    assert.equal(validateProposalPayload(parsed!).ok, true);
  }

  // 19 — Capital Configuration and External Position cannot be one block
  {
    assert.equal(
      proposalMixesExternalPosition({
        type: "external-position-create",
        proposal: { ticker: "ABC", shares: 1, averageCost: 1 },
      }),
      true
    );
    assert.equal(
      proposalMixesExternalPosition({
        type: "capital-configuration-create",
        proposal: {
          ticker: "ABC",
          shares: 10,
          averageCost: 5,
          settledCashBase: 1,
        },
      }),
      true
    );
    assert.equal(
      proposalMixesExternalPosition(
        buildCapitalConfigurationCreateProposal({
          settledCashBase: 1,
          source: "manual",
          externalCreditsIncludedInCash: false,
          liquidityBuffer: 0,
        })
      ),
      false
    );
  }

  // 20 — direct Supabase write not exposed in Settings UI
  {
    const settings = await fs.readFile(
      path.join(
        process.cwd(),
        "app/components/settings/CapitalSettingsPanel.tsx"
      ),
      "utf-8"
    );
    assert.match(settings, /Administrative \/ Recovery/);
    assert.match(settings, /capital_planner_state/);
    assert.doesNotMatch(settings, /\.upsert\(|from\("capital_planner/);
  }

  // Mechanics points to Settings → Capital
  {
    const brief = buildMatrixMechanicsBrief();
    assert.match(brief, /CAPITAL CONFIGURATION LOCATION/);
    assert.match(brief, /Settings → Capital/);
    assert.match(brief, /Do not place account balances/);
  }

  __setCapitalPlannerStoreForTests(null);
  console.log("test-capital-settings-26-1a: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
