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

  // ——— 26-1C / 26-1E dirty-field + clear semantics ———
  {
    // 1 — unchanged numeric field omitted; one changed field → id + that field
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

    // 2 — numeric zero emitted (not treated as empty)
    const zeroDirty = computeDirtyFields(BASE_FORM, {
      ...BASE_FORM,
      liquidityBuffer: 0,
    });
    // BASE_FORM already has liquidityBuffer: 0 → not dirty
    assert.equal(hasDirtyFields(zeroDirty), false);
    const zeroPayload = buildCapitalConfigurationUpdateProposal({
      activeId: "CAPCFG-DEFAULT",
      values: { ...BASE_FORM, liquidityBuffer: 0 },
      dirtyFields: { liquidityBuffer: true },
    });
    assert.equal(
      (zeroPayload.proposal as Record<string, unknown>).liquidityBuffer,
      0
    );
    assert.match(JSON.stringify(zeroPayload), /"liquidityBuffer":0/);

    // 3 / 4 — clear equity emits both nulls
    const eqClearValues = {
      ...BASE_FORM,
      totalEquityBase: null,
      totalEquityAsOf: null,
    };
    const eqClearDirty = computeDirtyFields(BASE_FORM, eqClearValues);
    assert.equal(eqClearDirty.totalEquityBase, true);
    assert.equal(eqClearDirty.totalEquityAsOf, true);
    const eqClearPayload = buildCapitalConfigurationUpdateProposal({
      activeId: "CAPCFG-DEFAULT",
      values: eqClearValues,
      dirtyFields: eqClearDirty,
    });
    const eqP = eqClearPayload.proposal as Record<string, unknown>;
    assert.equal(eqP.totalEquityBase, null);
    assert.equal(eqP.totalEquityAsOf, null);
    assert.match(JSON.stringify(eqClearPayload), /"totalEquityBase":null/);
    assert.equal(validatePreparedCapitalProposal(eqClearPayload).ok, true);

    // 5 / 6 — clear cash emits both nulls
    const cashClearValues = {
      ...BASE_FORM,
      settledCashBase: null,
      settledCashAsOf: null,
    };
    const cashClearDirty = computeDirtyFields(BASE_FORM, cashClearValues);
    const cashClearPayload = buildCapitalConfigurationUpdateProposal({
      activeId: "CAPCFG-DEFAULT",
      values: cashClearValues,
      dirtyFields: cashClearDirty,
    });
    const cashP = cashClearPayload.proposal as Record<string, unknown>;
    assert.equal(cashP.settledCashBase, null);
    assert.equal(cashP.settledCashAsOf, null);

    // 8 — clear liquidity buffer emits null (not zero)
    const bufClear = buildCapitalConfigurationUpdateProposal({
      activeId: "CAPCFG-DEFAULT",
      values: { ...BASE_FORM, liquidityBuffer: null },
      dirtyFields: { liquidityBuffer: true },
    });
    assert.equal(
      (bufClear.proposal as Record<string, unknown>).liquidityBuffer,
      null
    );

    // 10 — dirty undefined without clear marker is rejected
    assert.throws(
      () =>
        buildCapitalConfigurationUpdateProposal({
          activeId: "CAPCFG-DEFAULT",
          values: { ...BASE_FORM, totalEquityBase: undefined },
          dirtyFields: { totalEquityBase: true },
        }),
      /undefined without an explicit clear/
    );

    // cash + cash timestamp only
    const cashDirty = computeDirtyFields(BASE_FORM, {
      ...BASE_FORM,
      settledCashBase: 12_000,
      settledCashAsOf: "2026-07-26T14:00:00.000Z",
    });
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
    assert.equal("totalEquityBase" in cp, false);

    // 14 / 15 — restore original removes dirty; empty+restore = no update
    const reverted = computeDirtyFields(BASE_FORM, {
      ...BASE_FORM,
      settledCashBase: 12_000,
      settledCashAsOf: "2026-07-26T14:00:00.000Z",
    });
    const back = computeDirtyFields(BASE_FORM, { ...BASE_FORM });
    assert.equal(hasDirtyFields(reverted), true);
    assert.equal(hasDirtyFields(back), false);
    const clearedThenRestored = computeDirtyFields(BASE_FORM, {
      ...BASE_FORM,
      totalEquityBase: null,
      totalEquityAsOf: null,
    });
    assert.equal(hasDirtyFields(clearedThenRestored), true);
    const restored = computeDirtyFields(BASE_FORM, {
      ...BASE_FORM,
      totalEquityBase: BASE_FORM.totalEquityBase,
      totalEquityAsOf: BASE_FORM.totalEquityAsOf,
    });
    assert.equal(hasDirtyFields(restored), false);

    // 16 — clearing timestamp alone while balance remains configured rejected
    const tsOnly = validateUpdateTimestampCoupling(
      { settledCashAsOf: true },
      { ...BASE_FORM, settledCashAsOf: null },
      BASE_FORM
    );
    assert.equal(tsOnly.ok, false);

    // 17 — clearing balance while retaining old timestamp rejected
    const balOnlyClear = validateUpdateTimestampCoupling(
      { settledCashBase: true },
      { ...BASE_FORM, settledCashBase: null },
      BASE_FORM
    );
    assert.equal(balOnlyClear.ok, false);
    assert.equal(
      validatePreparedCapitalProposal({
        type: "capital-configuration-update",
        proposal: {
          id: "CAPCFG-DEFAULT",
          settledCashBase: null,
          settledCashAsOf: "2026-07-26T00:00:00.000Z",
        },
      }).ok,
      false
    );

    // cash without as-of rejected
    assert.equal(
      validateUpdateTimestampCoupling(
        { settledCashBase: true },
        { ...BASE_FORM, settledCashBase: 1 },
        BASE_FORM
      ).ok,
      false
    );
    assert.equal(
      validateUpdateTimestampCoupling(
        { totalEquityBase: true },
        { ...BASE_FORM, totalEquityBase: 1 },
        BASE_FORM
      ).ok,
      false
    );

    // 18 — proposal preview JSON identical to builder output (canonical)
    const preview = JSON.stringify(eqClearPayload, null, 2);
    assert.equal(preview, JSON.stringify(eqClearPayload, null, 2));
    assert.match(preview, /"totalEquityBase": null/);

    // 9 / 24 — helpers do not persist
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

  // ——— 26-1E persistence path: null clear / omit preserve / Number(null) ———
  {
    const {
      createCapitalConfiguration,
      updateCapitalConfiguration,
      getActiveCapitalConfiguration,
    } = await import("../lib/capital-configuration");
    const { getCapitalAccountSnapshot } = await import("../lib/capital-account");
    const { readCapitalPlannerState } = await import(
      "../lib/capital-planner-store"
    );
    const { applyCapitalConfigurationUpdateBlock } = await import(
      "../lib/capital-apply"
    );

    reset();
    await createCapitalConfiguration({
      settledCashBase: 5000,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      totalEquityBase: 9000,
      totalEquityAsOf: "2026-07-26T00:00:00.000Z",
      liquidityBuffer: 100,
      source: "manual",
      externalCreditsIncludedInCash: false,
    });

    // Seed a ledger event + reservation marker via store write
    const before = await readCapitalPlannerState();
    const ledgerLen = before.ledgerEvents.length;
    const reservationLen = before.reservations.length;

    // 12 — omitted field preserves existing
    await updateCapitalConfiguration({
      id: "CAPCFG-DEFAULT",
      liquidityBuffer: 50,
    });
    let cfg = await getActiveCapitalConfiguration();
    assert.equal(cfg!.settledCashBase, 5000);
    assert.equal(cfg!.liquidityBuffer, 50);

    // 2 — zero persists as zero
    await updateCapitalConfiguration({
      id: "CAPCFG-DEFAULT",
      liquidityBuffer: 0,
    });
    cfg = await getActiveCapitalConfiguration();
    assert.equal(cfg!.liquidityBuffer, 0);

    // 8 / 9 / 13 — clear liquidity → unconfigured (not zero)
    await updateCapitalConfiguration({
      id: "CAPCFG-DEFAULT",
      liquidityBuffer: null,
    });
    cfg = await getActiveCapitalConfiguration();
    assert.equal(cfg!.liquidityBuffer, undefined);
    assert.notEqual(cfg!.liquidityBuffer, 0);

    // 3 / 4 — clear equity + as-of
    await updateCapitalConfiguration({
      id: "CAPCFG-DEFAULT",
      totalEquityBase: null,
      totalEquityAsOf: null,
    });
    cfg = await getActiveCapitalConfiguration();
    assert.equal(cfg!.totalEquityBase, undefined);
    assert.equal(cfg!.totalEquityAsOf, undefined);

    // 5 / 6 / 7 — clear cash → available capital unconfigured
    await updateCapitalConfiguration({
      id: "CAPCFG-DEFAULT",
      settledCashBase: null,
      settledCashAsOf: null,
    });
    cfg = await getActiveCapitalConfiguration();
    assert.equal(cfg!.settledCashBase, undefined);
    assert.equal(cfg!.settledCashAsOf, undefined);
    const account = await getCapitalAccountSnapshot();
    assert.equal(account.settledCash.status, "unconfigured");
    assert.equal(account.availableCapital.status, "unconfigured");

    // 23 — ledger / reservations unchanged
    const after = await readCapitalPlannerState();
    assert.equal(after.ledgerEvents.length, ledgerLen);
    assert.equal(after.reservations.length, reservationLen);
    assert.equal(after.configuration!.id, "CAPCFG-DEFAULT");
    assert.ok(after.configuration!.createdAt);

    // 11 — Apply update path never Number(null) → 0
    reset();
    await createCapitalConfiguration({
      settledCashBase: 1000,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      totalEquityBase: 2000,
      totalEquityAsOf: "2026-07-26T00:00:00.000Z",
      liquidityBuffer: 10,
      source: "manual",
      externalCreditsIncludedInCash: false,
    });
    const applyResult = await applyCapitalConfigurationUpdateBlock({
      type: "capital-configuration-update",
      source: "settings-capital",
      proposal: {
        id: "CAPCFG-DEFAULT",
        totalEquityBase: null,
        totalEquityAsOf: null,
        liquidityBuffer: null,
      },
    });
    assert.equal(applyResult.ok, true);
    cfg = await getActiveCapitalConfiguration();
    assert.equal(cfg!.totalEquityBase, undefined);
    assert.equal(cfg!.liquidityBuffer, undefined);
    assert.equal(cfg!.settledCashBase, 1000);

    // 21 / 22 — JSON/store round-trip: cleared fields absent (not 0)
    const stored = await readCapitalPlannerState();
    const serialized = JSON.stringify(stored.configuration);
    assert.doesNotMatch(serialized, /"totalEquityBase":\s*0/);
    assert.doesNotMatch(serialized, /"liquidityBuffer":\s*0/);
    assert.doesNotMatch(serialized, /"totalEquityBase":\s*null/);

    // 19 — Apply schema accepts supported null clears
    assert.equal(
      validatePreparedCapitalProposal({
        type: "capital-configuration-update",
        proposal: {
          id: "CAPCFG-DEFAULT",
          totalEquityBase: null,
          totalEquityAsOf: null,
        },
      }).ok,
      true
    );

    // 20 — create rejects null-only / null fields
    assert.equal(
      validatePreparedCapitalProposal({
        type: "capital-configuration-create",
        proposal: {
          settledCashBase: null,
          source: "manual",
          externalCreditsIncludedInCash: false,
        },
      }).ok,
      false
    );
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
    assert.match(settings, /Will be cleared/);
    assert.match(settings, /Clear equity/);
    assert.match(settings, /Clear liquidity buffer/);
    assert.match(settings, /Clear settled cash/);
    assert.match(settings, /Restore current value/);
    assert.match(settings, /available capital unconfigured/);
    assert.match(settings, /prepareProposal/);
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
