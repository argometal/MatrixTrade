"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import { useControlPanel } from "@/app/components/control-panel/MatrixControlPanelProvider";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import type { CapitalAccountSnapshot } from "@/lib/capital-account";
import {
  buildCapitalConfigurationCreateProposal,
  buildCapitalConfigurationUpdateProposal,
  capitalSettingsFormWarnings,
  computeDirtyFields,
  formValuesFromConfiguration,
  hasDirtyFields,
  proposalMixesExternalPosition,
  validateCapitalSettingsFormValues,
  validatePreparedCapitalProposal,
  validateUpdateTimestampCoupling,
  type CapitalSettingsDirtyFields,
  type CapitalSettingsFormValues,
} from "@/lib/capital-settings-proposal";
import {
  capitalSettingsPrivateSnapshotItem,
  capitalSettingsStatusSnapshotItems,
} from "@/lib/capital-settings-snapshot";
import type {
  CapitalConfigSource,
  CapitalConfiguration,
} from "@/lib/capital-types";

function displayMoney(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "Unconfigured";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function displayText(v: string | undefined): string {
  return v && v.trim() ? v : "Unconfigured";
}

const SOURCES: CapitalConfigSource[] = [
  "broker_snapshot",
  "manual",
  "imported",
  "other",
];

const EMPTY_FORM: CapitalSettingsFormValues = {
  source: "broker_snapshot",
  externalCreditsIncludedInCash: false,
  liquidityBuffer: 0,
};

export function CapitalSettingsPanel({
  configuration,
  configurationError,
  account,
  accountError,
  storeMode,
  storeModeError,
  sqlMigrationAvailable,
  sqlMigrationError,
}: {
  configuration: CapitalConfiguration | null;
  configurationError?: string;
  account: CapitalAccountSnapshot | null;
  accountError?: string;
  storeMode?: string;
  storeModeError?: string;
  sqlMigrationAvailable?: boolean;
  sqlMigrationError?: string;
}) {
  const { openPanel } = useControlPanel();
  const configUnavailable = Boolean(configurationError);
  const hasActive = Boolean(
    !configUnavailable && configuration && configuration.status === "active"
  );

  const [mode, setMode] = useState<"idle" | "create" | "update">("idle");
  const [original, setOriginal] = useState<CapitalSettingsFormValues>(EMPTY_FORM);
  const [form, setForm] = useState<CapitalSettingsFormValues>(EMPTY_FORM);
  const [proposalJson, setProposalJson] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [privateConfirmed, setPrivateConfirmed] = useState(false);
  const [privateCopyMsg, setPrivateCopyMsg] = useState("");

  const dirtyFields: CapitalSettingsDirtyFields = useMemo(
    () => (mode === "update" ? computeDirtyFields(original, form) : {}),
    [mode, original, form]
  );
  const dirty = hasDirtyFields(dirtyFields);

  const statusSnapshotItems = useMemo(
    () =>
      capitalSettingsStatusSnapshotItems({
        configuration: configUnavailable ? null : configuration,
        account,
        accountError,
      }),
    [configuration, configUnavailable, account, accountError]
  );

  const privateSnapshot = useMemo(
    () =>
      capitalSettingsPrivateSnapshotItem({
        configuration: configUnavailable ? null : configuration,
        account,
        accountError,
      }),
    [configuration, configUnavailable, account, accountError]
  );

  const formWarnings = capitalSettingsFormWarnings(form);

  function resetDirtyFromConfig(cfg: CapitalConfiguration | null) {
    const values = cfg ? formValuesFromConfiguration(cfg) : EMPTY_FORM;
    setOriginal(values);
    setForm(values);
  }

  function setNumberField(
    key: "settledCashBase" | "totalEquityBase" | "liquidityBuffer",
    raw: string
  ) {
    if (raw.trim() === "") {
      setForm((f) => {
        const next = { ...f };
        delete next[key];
        return next;
      });
      return;
    }
    const n = Number(raw);
    setForm((f) => ({ ...f, [key]: n }));
  }

  function setTimestampField(
    key: "settledCashAsOf" | "totalEquityAsOf",
    raw: string
  ) {
    setForm((f) => ({ ...f, [key]: raw }));
  }

  function prepareProposal():
    | { ok: true; text: string }
    | { ok: false; message: string } {
    if (mode === "update") {
      if (!hasActive || !configuration) {
        return {
          ok: false,
          message: "Update unavailable — no active configuration loaded.",
        };
      }
      if (!dirty) {
        return { ok: false, message: "No changes detected." };
      }
      const coupling = validateUpdateTimestampCoupling(dirtyFields);
      if (!coupling.ok) {
        return { ok: false, message: coupling.errors.join("; ") };
      }
      const formCheck = validateCapitalSettingsFormValues(form, {
        mode: "update",
        dirtyFields,
      });
      if (!formCheck.ok) {
        return { ok: false, message: formCheck.errors.join("; ") };
      }
      const payload = buildCapitalConfigurationUpdateProposal({
        activeId: configuration.id,
        values: form,
        dirtyFields,
      });
      if (proposalMixesExternalPosition(payload)) {
        return {
          ok: false,
          message:
            "Invalid: Capital Configuration must not mix External Position fields.",
        };
      }
      const check = validatePreparedCapitalProposal(payload);
      if (!check.ok) {
        return { ok: false, message: `Validation failed: ${check.errors.join("; ")}` };
      }
      return { ok: true, text: JSON.stringify(payload, null, 2) };
    }

    // create
    if (configUnavailable) {
      return {
        ok: false,
        message:
          "Configuration source unavailable — recovery mode: use Control → Apply with a hand-authored proposal, or retry after the store recovers.",
      };
    }
    const formCheck = validateCapitalSettingsFormValues(form, { mode: "create" });
    if (!formCheck.ok) {
      return { ok: false, message: formCheck.errors.join("; ") };
    }
    const payload = buildCapitalConfigurationCreateProposal(form);
    if (proposalMixesExternalPosition(payload)) {
      return {
        ok: false,
        message:
          "Invalid: Capital Configuration must not mix External Position fields.",
      };
    }
    const check = validatePreparedCapitalProposal(payload);
    if (!check.ok) {
      return { ok: false, message: `Validation failed: ${check.errors.join("; ")}` };
    }
    return { ok: true, text: JSON.stringify(payload, null, 2) };
  }

  function generateProposal() {
    const result = prepareProposal();
    if (!result.ok) {
      setProposalJson("");
      setStatusMsg(result.message);
      return;
    }
    setProposalJson(result.text);
    setStatusMsg(
      "Proposal prepared — not persisted. Copy and open Control → Apply."
    );
  }

  async function copyProposal() {
    const result = prepareProposal();
    if (!result.ok) {
      setProposalJson("");
      setStatusMsg(result.message);
      return;
    }
    setProposalJson(result.text);
    const ok = await copyText(result.text);
    setStatusMsg(ok ? "Copied Apply proposal to clipboard." : "Copy failed.");
  }

  async function copyPrivateSnapshot() {
    if (!privateConfirmed) {
      setPrivateCopyMsg("Confirm inclusion of private values first.");
      return;
    }
    const ok = await copyText(privateSnapshot.text);
    setPrivateCopyMsg(
      ok
        ? "Private snapshot copied. Do not attach to ticker analysis or shared prompts."
        : "Copy failed."
    );
  }

  const proposalActionsDisabled =
    mode === "update" ? !dirty : mode === "idle" || configUnavailable;

  const storeModeDisplay = storeModeError
    ? "Unknown"
    : storeMode ?? "Unknown";
  const sqlDisplay = sqlMigrationError
    ? "Unknown"
    : sqlMigrationAvailable === undefined
      ? "Unknown"
      : sqlMigrationAvailable
        ? "yes (`supabase/capital-planner.sql`)"
        : "no";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Settings · Capital
        </p>
        <h1 className="font-serif text-3xl tracking-tight text-zinc-50">
          Capital Settings
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Account-level capital configuration and policy. Global system state —
          not ticker evidence. Settings prepares proposals; Control → Apply
          validates and persists.
        </p>
        <div className="flex flex-wrap gap-3 pt-1 text-sm">
          <Link
            href="/planning/capital"
            className="text-zinc-300 underline-offset-4 hover:underline"
          >
            View Capital Planner
          </Link>
          <button
            type="button"
            className="text-zinc-300 underline-offset-4 hover:underline"
            onClick={() => openPanel({ step: "apply" })}
          >
            Open Apply
          </button>
          <SnapshotButton
            title="Capital Settings status snapshot"
            description="Default account-level status — balances omitted; not attached to ticker packages"
            items={statusSnapshotItems}
          />
        </div>
        <div className="space-y-2 rounded border border-zinc-800 p-3 text-xs text-zinc-400">
          <p className="text-amber-200/90">
            Contains private account-level financial values. Do not attach to
            ticker analysis, public reports, or shared prompts.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={privateConfirmed}
              onChange={(e) => {
                setPrivateConfirmed(e.target.checked);
                setPrivateCopyMsg("");
              }}
            />
            Include private values
          </label>
          <button
            type="button"
            disabled={!privateConfirmed}
            className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-100 disabled:opacity-40"
            onClick={() => void copyPrivateSnapshot()}
          >
            Private full snapshot
          </button>
          {privateCopyMsg ? (
            <p className="text-amber-200/80">{privateCopyMsg}</p>
          ) : null}
        </div>
      </header>

      {/* A. Current Configuration */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-200">
          Current Configuration
        </h2>
        {configUnavailable ? (
          <p className="text-sm text-amber-200/90">
            Current configuration unavailable: {configurationError}
          </p>
        ) : !hasActive ? (
          <p className="text-sm text-amber-200/90">
            Unconfigured — no active Capital Configuration. Use Configure
            Capital below, then Control → Apply.
          </p>
        ) : (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ["Accounting model", configuration!.accountingModel],
                ["Base currency", configuration!.baseCurrency],
                ["Settled cash", displayMoney(configuration!.settledCashBase)],
                [
                  "Settled cash as-of",
                  displayText(configuration!.settledCashAsOf),
                ],
                ["Total equity", displayMoney(configuration!.totalEquityBase)],
                [
                  "Total equity as-of",
                  displayText(configuration!.totalEquityAsOf),
                ],
                [
                  "Liquidity buffer",
                  configuration!.liquidityBuffer === undefined
                    ? "Unconfigured"
                    : displayMoney(configuration!.liquidityBuffer),
                ],
                ["Source", configuration!.source],
                [
                  "External credits included in cash",
                  configuration!.externalCreditsIncludedInCash
                    ? "true"
                    : "false",
                ],
                ["Status", configuration!.status],
                [
                  "Last updated",
                  new Date(configuration!.updatedAt).toLocaleString(),
                ],
                [
                  "Completeness",
                  accountError
                    ? "unavailable"
                    : (account?.completeness.status ?? "Unknown"),
                ],
                [
                  "Reconciliation",
                  accountError
                    ? "unavailable"
                    : (account?.reconciliationStatus ?? "Unknown"),
                ],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="border-t border-zinc-800 pt-2">
                <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
                  {label}
                </dt>
                <dd className="mt-1 text-sm text-zinc-100">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {accountError ? (
          <p className="text-xs text-amber-200/80">
            Capital Account unavailable: {accountError}
          </p>
        ) : null}
      </section>

      {/* B. Configuration Guide */}
      <section className="space-y-3 text-sm text-zinc-300">
        <h2 className="text-sm font-medium text-zinc-200">
          Configuration Guide
        </h2>
        <div className="space-y-3 text-zinc-400">
          <div>
            <h3 className="text-zinc-200">Settled Cash</h3>
            <p>
              Cash currently settled and usable at the broker. Do not include
              pending settlement. Do not derive it from account equity.
            </p>
          </div>
          <div>
            <h3 className="text-zinc-200">Total Equity</h3>
            <p>
              Broker account total value including cash and marked positions.
              Informational for account-level equity. Never substitute for
              settled cash.
            </p>
          </div>
          <div>
            <h3 className="text-zinc-200">Liquidity Buffer</h3>
            <p>
              Cash intentionally excluded from new deployment. Zero is valid
              when the full cash balance is dedicated to MTA.
            </p>
          </div>
          <div>
            <h3 className="text-zinc-200">Source</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <code className="text-zinc-300">broker_snapshot</code> — values
                copied from a broker screen, statement, export or API snapshot.
              </li>
              <li>
                <code className="text-zinc-300">manual</code> — established
                manually without an authoritative broker snapshot.
              </li>
              <li>
                <code className="text-zinc-300">imported</code> — loaded from an
                external data file or system.
              </li>
              <li>
                <code className="text-zinc-300">other</code> — use only with
                explanation in Apply notes (
                <code className="text-zinc-300">sourceNote</code> is not a
                persisted field).
              </li>
            </ul>
            <p className="mt-2">
              Manually typing a value from a broker screenshot still uses source{" "}
              <code className="text-zinc-300">broker_snapshot</code>. Input
              method is not the same as economic data source.
            </p>
          </div>
          <div>
            <h3 className="text-zinc-200">
              External Credits Included in Cash
            </h3>
            <p>
              <code className="text-zinc-300">true</code>: broker cash already
              includes settled External Position proceeds.{" "}
              <code className="text-zinc-300">false</code>: Capital Planner may
              add settled external ledger credits not yet included. Prevents
              double counting.
            </p>
          </div>
          <div>
            <h3 className="text-zinc-200">
              Capital Configuration vs External Position
            </h3>
            <p>
              Capital Configuration records account cash/equity policy and
              balances. External Position records shares, cost basis and
              valuation of a holding outside Scout→Trade. Never combine both
              into one Apply block.
            </p>
          </div>
          <div>
            <h3 className="text-zinc-200">Updates</h3>
            <p>
              Update proposals include only changed fields. Changing settled
              cash or total equity requires a matching fresh as-of timestamp
              (not invented automatically).
            </p>
          </div>
        </div>
      </section>

      {/* C. Checklist */}
      <section className="space-y-2 text-sm text-zinc-400">
        <h2 className="text-sm font-medium text-zinc-200">
          Required Input Checklist
        </h2>
        <p className="text-zinc-300">For initial configuration:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>settled cash + settled cash as-of</li>
          <li>total equity (recommended) + total equity as-of</li>
          <li>liquidity buffer</li>
          <li>source</li>
          <li>whether external credits are already included in cash</li>
        </ul>
        <p className="pt-2 text-zinc-300">For updates:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>active configuration ID</li>
          <li>only the fields being changed</li>
          <li>fresh as-of timestamp when a balance changes</li>
        </ul>
      </section>

      {/* D. Errors */}
      <section className="space-y-2 text-sm text-zinc-400">
        <h2 className="text-sm font-medium text-zinc-200">Errors to avoid</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Do not infer cash from equity.</li>
          <li>
            Do not infer average cost from current market value or percentage
            gain.
          </li>
          <li>Do not treat pending settlement as cash.</li>
          <li>Do not count settled external proceeds twice.</li>
          <li>Do not put ticker-specific holdings in Capital Configuration.</li>
          <li>Do not create a second active configuration accidentally.</li>
          <li>Do not update Supabase manually during normal operation.</li>
          <li>Do not persist from Settings without Apply.</li>
          <li>Do not include account balances in ticker snapshots.</li>
          <li>
            Do not attach the private Capital Settings snapshot to ticker
            analysis or shared prompts.
          </li>
        </ul>
      </section>

      {/* Guided proposal */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-200">
          Guided proposal preparation
        </h2>
        <p className="text-xs text-zinc-500">
          Settings never writes to the store. Copy the proposal and Accept in
          Control → Apply. Update proposals emit changed fields only.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={hasActive || configUnavailable}
            className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-100 disabled:opacity-40"
            onClick={() => {
              setMode("create");
              setOriginal(EMPTY_FORM);
              setForm({ ...EMPTY_FORM });
              setProposalJson("");
              setStatusMsg("");
            }}
          >
            Configure Capital
          </button>
          <button
            type="button"
            disabled={!hasActive}
            className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-100 disabled:opacity-40"
            onClick={() => {
              setMode("update");
              resetDirtyFromConfig(configuration);
              setProposalJson("");
              setStatusMsg("");
            }}
          >
            Update Capital
          </button>
          <button
            type="button"
            className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300"
            onClick={() => {
              setMode("idle");
              resetDirtyFromConfig(hasActive ? configuration : null);
              setProposalJson("");
              setStatusMsg("");
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={proposalActionsDisabled}
            className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-100 disabled:opacity-40"
            onClick={() => void copyProposal()}
          >
            Copy Apply Proposal
          </button>
          <button
            type="button"
            className="rounded border border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5 text-sm text-emerald-100"
            onClick={() => openPanel({ step: "apply" })}
          >
            Open Control
          </button>
        </div>

        {(mode === "create" || mode === "update") && (
          <div className="space-y-3 rounded border border-zinc-800 p-4">
            <p className="text-xs text-zinc-500">
              {mode === "create"
                ? "Preparing capital-configuration-create"
                : `Preparing capital-configuration-update · ${configuration?.id} · dirty: ${
                    dirty
                      ? Object.keys(dirtyFields)
                          .filter((k) => dirtyFields[k as keyof CapitalSettingsDirtyFields])
                          .join(", ")
                      : "none"
                  }`}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-zinc-400">
                Settled cash
                <input
                  type="number"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
                  value={form.settledCashBase ?? ""}
                  onChange={(e) =>
                    setNumberField("settledCashBase", e.target.value)
                  }
                />
              </label>
              <label className="text-xs text-zinc-400">
                Settled cash as-of (ISO)
                <input
                  type="text"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
                  placeholder="2026-07-26T00:00:00.000Z"
                  value={form.settledCashAsOf ?? ""}
                  onChange={(e) =>
                    setTimestampField("settledCashAsOf", e.target.value)
                  }
                />
              </label>
              <label className="text-xs text-zinc-400">
                Total equity
                <input
                  type="number"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
                  value={form.totalEquityBase ?? ""}
                  onChange={(e) =>
                    setNumberField("totalEquityBase", e.target.value)
                  }
                />
              </label>
              <label className="text-xs text-zinc-400">
                Total equity as-of (ISO)
                <input
                  type="text"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
                  value={form.totalEquityAsOf ?? ""}
                  onChange={(e) =>
                    setTimestampField("totalEquityAsOf", e.target.value)
                  }
                />
              </label>
              <label className="text-xs text-zinc-400">
                Liquidity buffer (0 valid)
                <input
                  type="number"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
                  value={form.liquidityBuffer ?? ""}
                  onChange={(e) =>
                    setNumberField("liquidityBuffer", e.target.value)
                  }
                />
              </label>
              <label className="text-xs text-zinc-400">
                Source
                <select
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
                  value={form.source}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      source: e.target.value as CapitalConfigSource,
                    }))
                  }
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-400 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.externalCreditsIncludedInCash}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      externalCreditsIncludedInCash: e.target.checked,
                    }))
                  }
                />
                External credits already included in settled cash
              </label>
            </div>
            {formWarnings.map((w) => (
              <p key={w} className="text-xs text-amber-200/80">
                {w}
              </p>
            ))}
            <button
              type="button"
              disabled={proposalActionsDisabled}
              className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-100 disabled:opacity-40"
              onClick={generateProposal}
            >
              Generate proposal JSON
            </button>
          </div>
        )}

        {statusMsg ? (
          <p className="text-xs text-amber-200/90">{statusMsg}</p>
        ) : null}
        {proposalJson ? (
          <pre className="overflow-x-auto rounded border border-zinc-800 bg-zinc-950/80 p-3 text-[11px] text-zinc-300">
            {proposalJson}
          </pre>
        ) : null}
      </section>

      {/* Administrative — always reachable */}
      <section className="space-y-2 border-t border-zinc-800 pt-6">
        <button
          type="button"
          className="text-sm text-zinc-300 underline-offset-4 hover:underline"
          onClick={() => setAdminOpen((v) => !v)}
        >
          Administrative / Recovery {adminOpen ? "▾" : "▸"}
        </button>
        {adminOpen ? (
          <div className="space-y-2 text-xs text-zinc-500">
            <p>
              Direct Supabase modification is for recovery and diagnostics only.
              Normal mutations must use Control → Apply.
            </p>
            <p>
              Table:{" "}
              <code className="text-zinc-400">public.capital_planner_state</code>
            </p>
            <pre className="overflow-x-auto rounded border border-zinc-900 p-2 text-[11px] text-zinc-400">{`select id, payload, updated_at
from public.capital_planner_state
where id = 'default';`}</pre>
            <p>Store / backend mode: {storeModeDisplay}</p>
            {storeModeError ? (
              <p className="text-amber-200/80">
                Store mode error: {storeModeError}
              </p>
            ) : null}
            <p>SQL migration available: {sqlDisplay}</p>
            {sqlMigrationError ? (
              <p className="text-amber-200/80">
                Migration check error: {sqlMigrationError}
              </p>
            ) : null}
            <p>
              Active configuration ID:{" "}
              {configUnavailable
                ? "unavailable"
                : (configuration?.id ?? "Unconfigured")}
            </p>
            <p className="text-amber-200/80">
              No destructive editor. No privileged database credentials. No
              arbitrary JSON replacement. Settled ledger events are not
              deletable here.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
