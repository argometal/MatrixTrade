/**
 * Prompt 26-1A / 26-1C — Settings → Capital
 * Run: npm run test:capital-settings
 */
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildCapitalConfigurationCreateProposal,
  buildCapitalConfigurationUpdateProposal,
  computeDirtyFields,
  hasDirtyFields,
  proposalMixesExternalPosition,
  validateCapitalSettingsFormValues,
  validatePreparedCapitalProposal,
  validateUpdateTimestampCoupling,
  type CapitalSettingsFormValues,
} from "../lib/capital-settings-proposal";
import {
  buildCapitalSettingsPrivateSnapshotText,
  buildCapitalSettingsStatusSnapshotText,
  CAPITAL_SETTINGS_PRIVATE_SNAPSHOT_ID,
  CAPITAL_SETTINGS_SNAPSHOT_IDS,
  CAPITAL_SETTINGS_STATUS_SNAPSHOT_ID,
  capitalSettingsPrivateSnapshotItem,
  capitalSettingsStatusSnapshotItems,
  snapshotContainsAccountCapitalConfig,
  statusSnapshotContainsPrivateBalances,
} from "../lib/capital-settings-snapshot";
import { createCapitalConfiguration } from "../lib/capital-configuration";
import { __setCapitalPlannerStoreForTests } from "../lib/capital-planner-store";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import {
  scoutDeskSnapshotItems,
  stockProfileSnapshotItems,
  tradesListSnapshotItems,
} from "../lib/snapshot-packages";
import { mtaeControlSnapshotItems, mtaeTickerRequestItem } from "../lib/mtae-snapshot";
import { resolveUiWindowId } from "../lib/ui-window-ids";
import { PREVIEW_NAV_SECTIONS } from "../lib/preview-nav";
import {
  validateProposalPayload,
  parseTradingInboxPayload,
} from "../lib/bridge";
import { scanExternalPositionNeutrality } from "./scan-external-position-neutrality";

function reset() {
  __setCapitalPlannerStoreForTests({
    configuration: null,
    ledgerEvents: [],
    reservations: [],
  });
}

const BASE_FORM: CapitalSettingsFormValues = {
  settledCashBase: 10_000,
  settledCashAsOf: "2026-07-26T00:00:00.000Z",
  totalEquityBase: 20_000,
  totalEquityAsOf: "2026-07-26T00:00:00.000Z",
  liquidityBuffer: 0,
  source: "broker_snapshot",
  externalCreditsIncludedInCash: false,
};

async function readUtf8(rel: string) {
  return fs.readFile(path.join(process.cwd(), rel), "utf-8");
}

async function listTsFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string) {
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
  }
  await walk(dir);
  return out;
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
    const emptyText = buildCapitalSettingsStatusSnapshotText({
      configuration: null,
    });
    assert.match(emptyText, /unconfigured/i);
    assert.equal(statusSnapshotContainsPrivateBalances(emptyText), false);

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
    const status = buildCapitalSettingsStatusSnapshotText({ configuration: cfg });
    assert.match(status, /settledCash: configured/);
    assert.equal(statusSnapshotContainsPrivateBalances(status), false);
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

  // ——— 26-1C dirty-field update tests ———
  {
    // 1 — one changed field → id + that field
    const dirty = computeDirtyFields(BASE_FORM, {
      ...BASE_FORM,
      liquidityBuffer: 250,
    });
    assert.deepEqual(dirty, { liquidityBuffer: true });
    const payload = buildCapitalConfigurationUpdateProposal({
      activeId: "CAPCFG-DEFAULT",
      values: { ...BASE_FORM, liquidityBuffer: 250 },
      dirtyFields: dirty,
    });
    const p = payload.proposal as Record<string, unknown>;
    assert.equal(p.id, "CAPCFG-DEFAULT");
    assert.equal(p.liquidityBuffer, 250);
    assert.equal("settledCashBase" in p, false);
    assert.equal("source" in p, false);
    assert.equal(validatePreparedCapitalProposal(payload).ok, true);

    // 2 — cash + cash timestamp only
    const cashDirty = computeDirtyFields(BASE_FORM, {
      ...BASE_FORM,
      settledCashBase: 12_000,
      settledCashAsOf: "2026-07-26T14:00:00.000Z",
    });
    assert.equal(cashDirty.settledCashBase, true);
    assert.equal(cashDirty.settledCashAsOf, true);
    assert.equal(cashDirty.totalEquityBase, undefined);
    const cashPayload = buildCapitalConfigurationUpdateProposal({
      activeId: "CAPCFG-DEFAULT",
      values: {
        ...BASE_FORM,
        settledCashBase: 12_000,
        settledCashAsOf: "2026-07-26T14:00:00.000Z",
      },
      dirtyFields: cashDirty,
    });
    const cp = cashPayload.proposal as Record<string, unknown>;
    assert.deepEqual(Object.keys(cp).sort(), [
      "id",
      "settledCashAsOf",
      "settledCashBase",
    ]);

    // 3 — unchanged fields omitted
    assert.equal("totalEquityBase" in cp, false);
    assert.equal("liquidityBuffer" in cp, false);
    assert.equal("externalCreditsIncludedInCash" in cp, false);

    // 4 — returning to original removes dirty
    const reverted = computeDirtyFields(BASE_FORM, {
      ...BASE_FORM,
      settledCashBase: 12_000,
      settledCashAsOf: "2026-07-26T14:00:00.000Z",
    });
    const back = computeDirtyFields(BASE_FORM, {
      ...BASE_FORM,
      settledCashBase: BASE_FORM.settledCashBase,
      settledCashAsOf: BASE_FORM.settledCashAsOf,
    });
    assert.equal(hasDirtyFields(reverted), true);
    assert.equal(hasDirtyFields(back), false);

    // 5 — no dirty blocks (coupling helper + hasDirtyFields)
    assert.equal(hasDirtyFields({}), false);

    // 6 — cash without as-of rejected
    const cashOnly = validateUpdateTimestampCoupling({
      settledCashBase: true,
    });
    assert.equal(cashOnly.ok, false);

    // 7 — equity without as-of rejected
    const eqOnly = validateUpdateTimestampCoupling({
      totalEquityBase: true,
    });
    assert.equal(eqOnly.ok, false);

    // 8 — explicit timestamp clearing emits null
    const clearDirty = computeDirtyFields(BASE_FORM, {
      ...BASE_FORM,
      settledCashAsOf: "",
    });
    assert.equal(clearDirty.settledCashAsOf, true);
    const cleared = buildCapitalConfigurationUpdateProposal({
      activeId: "CAPCFG-DEFAULT",
      values: { ...BASE_FORM, settledCashAsOf: "" },
      dirtyFields: clearDirty,
    });
    assert.equal(
      (cleared.proposal as Record<string, unknown>).settledCashAsOf,
      null
    );

    // 9 — helpers do not persist
    reset();
    buildCapitalConfigurationUpdateProposal({
      activeId: "CAPCFG-DEFAULT",
      values: { liquidityBuffer: 1 },
      dirtyFields: { liquidityBuffer: true },
    });
    const { getActiveCapitalConfiguration } = await import(
      "../lib/capital-configuration"
    );
    assert.equal(await getActiveCapitalConfiguration(), null);
  }

  // Form validation hardening
  {
    assert.equal(
      validateCapitalSettingsFormValues({
        ...BASE_FORM,
        settledCashBase: -1,
      }).ok,
      false
    );
    assert.equal(
      validateCapitalSettingsFormValues({
        ...BASE_FORM,
        liquidityBuffer: 0,
      }).ok,
      true
    );
    assert.equal(
      validateCapitalSettingsFormValues({
        ...BASE_FORM,
        liquidityBuffer: 99_999,
      }).ok,
      false
    );
    assert.equal(
      validateCapitalSettingsFormValues({
        source: "manual",
        externalCreditsIncludedInCash: false,
      }).ok,
      false
    );
  }

  // 6 — Settings proposal helpers do not persist (create)
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

  // 11–13 — ticker / Scout / Trade / MTAE snapshots exclude capital balances
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
      assert.equal(
        (CAPITAL_SETTINGS_SNAPSHOT_IDS as readonly string[]).includes(item.id),
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
      assert.equal(
        (CAPITAL_SETTINGS_SNAPSHOT_IDS as readonly string[]).includes(item.id),
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

  // Snapshot modes (26-1C)
  {
    const cfg = {
      id: "CAPCFG-DEFAULT",
      accountingModel: "cash_ledger" as const,
      baseCurrency: "USD" as const,
      settledCashBase: 12345,
      settledCashAsOf: "2026-07-26T12:00:00.000Z",
      totalEquityBase: 54321,
      totalEquityAsOf: "2026-07-26T12:00:00.000Z",
      liquidityBuffer: 100,
      source: "broker_snapshot" as const,
      externalCreditsIncludedInCash: false,
      status: "active" as const,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-26T12:00:00.000Z",
    };

    // 1–4 status snapshot privacy
    const status = buildCapitalSettingsStatusSnapshotText({
      configuration: cfg,
    });
    assert.match(status, /CAPITAL SETTINGS STATUS SNAPSHOT/);
    assert.match(status, /configuration: active/);
    assert.match(status, /settledCash: configured/);
    assert.doesNotMatch(status, /12345/);
    assert.doesNotMatch(status, /54321/);
    assert.doesNotMatch(status, /CAPCFG-DEFAULT/);
    assert.doesNotMatch(status, /2026-07-26T12:00:00/);
    assert.equal(statusSnapshotContainsPrivateBalances(status), false);

    const statusItems = capitalSettingsStatusSnapshotItems({
      configuration: cfg,
    });
    assert.equal(statusItems[0].id, CAPITAL_SETTINGS_STATUS_SNAPSHOT_ID);

    // 5 private snapshot includes values
    const priv = buildCapitalSettingsPrivateSnapshotText({
      configuration: cfg,
    });
    assert.match(priv, /CAPITAL SETTINGS PRIVATE SNAPSHOT/);
    assert.match(priv, /12345/);
    assert.match(priv, /CAPCFG-DEFAULT/);
    assert.equal(
      capitalSettingsPrivateSnapshotItem({ configuration: cfg }).id,
      CAPITAL_SETTINGS_PRIVATE_SNAPSHOT_ID
    );
  }

  // Privacy UI + default header action
  {
    const settings = await readUtf8(
      "app/components/settings/CapitalSettingsPanel.tsx"
    );
    assert.match(settings, /Capital Settings status snapshot/);
    assert.match(settings, /Private full snapshot/);
    assert.match(settings, /Include private values/);
    assert.match(
      settings,
      /Contains private account-level financial values/
    );
    assert.match(settings, /disabled=\{!privateConfirmed\}/);
    assert.match(settings, /capitalSettingsStatusSnapshotItems/);
    assert.doesNotMatch(
      settings,
      /items=\{capitalSettingsPrivateSnapshotItem/
    );
    assert.doesNotMatch(
      settings,
      /writeCapitalPlannerState|createCapitalConfiguration\(/
    );
    assert.doesNotMatch(settings, /SUPABASE_SERVICE_ROLE|createClient\(/);
    assert.match(settings, /Administrative \/ Recovery/);
    assert.match(settings, /capital_planner_state/);
    assert.match(settings, /No changes detected/);
    assert.match(settings, /configurationError/);
    assert.match(settings, /Current configuration unavailable/);
  }

  // Isolated loading page
  {
    const page = await readUtf8(
      "app/(trading)/(preview)/settings/capital/page.tsx"
    );
    assert.match(page, /settleLoad|LoadResult/);
    assert.match(page, /configurationError/);
    assert.match(page, /accountError/);
    assert.match(page, /storeModeError/);
    assert.match(page, /sqlMigrationError/);
    assert.doesNotMatch(page, /getActiveCapitalConfiguration\(\)\s*,\s*\n\s*getCapitalAccountSnapshot\(\)\.catch/);
  }

  // Isolated load panel: Unknown for store/SQL errors; admin remains
  {
    const settings = await readUtf8(
      "app/components/settings/CapitalSettingsPanel.tsx"
    );
    assert.match(settings, /storeModeError[\s\S]*Unknown/);
    assert.match(settings, /sqlMigrationError[\s\S]*Unknown/);
    assert.match(settings, /Configuration Guide/);
    assert.match(settings, /Administrative \/ Recovery/);
  }

  // Architecture: tactical modules do not import capital-settings-snapshot
  {
    const tacticalDirs = [
      "lib/snapshot-packages.ts",
      "lib/snapshot-trade-packages.ts",
      "lib/snapshot-aggregate.ts",
      "lib/mtae-snapshot.ts",
      "lib/mtae-brief.ts",
    ];
    for (const rel of tacticalDirs) {
      const src = await readUtf8(rel);
      assert.doesNotMatch(
        src,
        /capital-settings-snapshot|capitalSettingsStatusSnapshot|capitalSettingsPrivateSnapshot/,
        rel
      );
      assert.doesNotMatch(src, /CapitalConfiguration/, rel);
    }

    // Only Settings surface imports the snapshot builder (plus its own module + tests/docs)
    const appFiles = await listTsFiles(path.join(process.cwd(), "app"));
    const importers: string[] = [];
    for (const file of appFiles) {
      const src = await fs.readFile(file, "utf-8");
      if (
        /from ["']@\/lib\/capital-settings-snapshot["']/.test(src) ||
        /from ["']\.\.\/lib\/capital-settings-snapshot["']/.test(src)
      ) {
        importers.push(path.relative(process.cwd(), file));
      }
    }
    assert.deepEqual(importers, [
      "app/components/settings/CapitalSettingsPanel.tsx",
    ]);
  }

  // 15 / 16 — Capital Planner ↔ Settings links
  {
    const planner = await readUtf8(
      "app/components/planning-preview/CapitalPlannerPanel.tsx"
    );
    assert.match(planner, /\/settings\/capital/);
    assert.match(planner, /Manage capital settings/);

    const settings = await readUtf8(
      "app/components/settings/CapitalSettingsPanel.tsx"
    );
    assert.match(settings, /\/planning\/capital/);
    assert.match(settings, /View Capital Planner/);
    assert.match(settings, /Open Control|openPanel/);
  }

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

    const update = buildCapitalConfigurationUpdateProposal({
      activeId: "CAPCFG-DEFAULT",
      values: {
        settledCashBase: 11_000,
        settledCashAsOf: "2026-07-26T16:00:00.000Z",
      },
      dirtyFields: { settledCashBase: true, settledCashAsOf: true },
    });
    const parsedUpdate = parseTradingInboxPayload(update);
    assert.equal(validateProposalPayload(parsedUpdate!).ok, true);
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

  // 20 — direct Supabase write not exposed
  {
    const settings = await readUtf8(
      "app/components/settings/CapitalSettingsPanel.tsx"
    );
    assert.doesNotMatch(settings, /\.upsert\(|from\("capital_planner/);
  }

  // Mechanics points to Settings → Capital + 26-1C clarifications
  {
    const brief = buildMatrixMechanicsBrief();
    assert.match(brief, /CAPITAL CONFIGURATION LOCATION/);
    assert.match(brief, /Settings → Capital/);
    assert.match(brief, /Do not place account balances/);
    assert.match(brief, /changed fields only/);
    assert.match(brief, /status snapshot omits balances/i);
    assert.match(brief, /private full snapshot requires explicit/i);
  }

  __setCapitalPlannerStoreForTests(null);
  console.log("test-capital-settings-26-1a: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
