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
  formValuesFromConfiguration,
  proposalMixesExternalPosition,
  validatePreparedCapitalProposal,
  type CapitalSettingsFormValues,
} from "@/lib/capital-settings-proposal";
import { capitalSettingsSnapshotItems } from "@/lib/capital-settings-snapshot";
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

export function CapitalSettingsPanel({
  configuration,
  account,
  storeMode,
  sqlMigrationAvailable,
}: {
  configuration: CapitalConfiguration | null;
  account: CapitalAccountSnapshot | null;
  storeMode: string;
  sqlMigrationAvailable: boolean;
}) {
  const { openPanel } = useControlPanel();
  const hasActive = Boolean(configuration && configuration.status === "active");
  const [mode, setMode] = useState<"idle" | "create" | "update">("idle");
  const [form, setForm] = useState<CapitalSettingsFormValues>(() =>
    configuration
      ? formValuesFromConfiguration(configuration)
      : {
          source: "broker_snapshot",
          externalCreditsIncludedInCash: false,
          liquidityBuffer: 0,
        }
  );
  const [proposalJson, setProposalJson] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [adminOpen, setAdminOpen] = useState(false);

  const snapshotItems = useMemo(
    () => capitalSettingsSnapshotItems({ configuration, account }),
    [configuration, account]
  );

  function setNumberField(
    key: keyof CapitalSettingsFormValues,
    raw: string
  ) {
    if (raw.trim() === "") {
      setForm((f) => {
        const next = { ...f };
        delete (next as Record<string, unknown>)[key];
        return next;
      });
      return;
    }
    const n = Number(raw);
    setForm((f) => ({ ...f, [key]: n }));
  }

  function generateProposal() {
    const payload =
      mode === "create" || (!hasActive && mode === "idle")
        ? buildCapitalConfigurationCreateProposal(form)
        : buildCapitalConfigurationUpdateProposal(
            configuration!.id,
            form
          );

    if (proposalMixesExternalPosition(payload)) {
      setStatusMsg(
        "Invalid: Capital Configuration must not mix External Position fields."
      );
      return;
    }
    const check = validatePreparedCapitalProposal(payload);
    if (!check.ok) {
      setStatusMsg(`Validation failed: ${check.errors.join("; ")}`);
      return;
    }
    const text = JSON.stringify(payload, null, 2);
    setProposalJson(text);
    setStatusMsg("Proposal prepared — not persisted. Copy and open Control → Apply.");
  }

  async function copyProposal() {
    if (!proposalJson) {
      generateProposal();
    }
    const text =
      proposalJson ||
      JSON.stringify(
        hasActive
          ? buildCapitalConfigurationUpdateProposal(configuration!.id, form)
          : buildCapitalConfigurationCreateProposal(form),
        null,
        2
      );
    const check = validatePreparedCapitalProposal(JSON.parse(text));
    if (!check.ok) {
      setStatusMsg(`Cannot copy: ${check.errors.join("; ")}`);
      return;
    }
    setProposalJson(text);
    const ok = await copyText(text);
    setStatusMsg(ok ? "Copied Apply proposal to clipboard." : "Copy failed.");
  }

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
            title="Capital Settings snapshot"
            description="Opt-in account-level snapshot — not attached to ticker packages"
            items={snapshotItems}
          />
        </div>
      </header>

      {/* A. Current Configuration */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-200">
          Current Configuration
        </h2>
        {!hasActive ? (
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
                  account?.completeness.status ?? "Unknown",
                ],
                [
                  "Reconciliation",
                  account?.reconciliationStatus ?? "Unknown",
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
                explanation.
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
        </ul>
      </section>

      {/* Guided proposal */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-200">
          Guided proposal preparation
        </h2>
        <p className="text-xs text-zinc-500">
          Settings never writes to the store. Copy the proposal and Accept in
          Control → Apply.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={hasActive}
            className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-100 disabled:opacity-40"
            onClick={() => {
              setMode("create");
              setForm({
                source: "broker_snapshot",
                externalCreditsIncludedInCash: false,
                liquidityBuffer: 0,
              });
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
              if (configuration) {
                setForm(formValuesFromConfiguration(configuration));
              }
              setProposalJson("");
              setStatusMsg("");
            }}
          >
            Update Capital
          </button>
          <button
            type="button"
            className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-100"
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
                : `Preparing capital-configuration-update · ${configuration?.id}`}
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
                    setForm((f) => ({
                      ...f,
                      settledCashAsOf: e.target.value,
                    }))
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
                    setForm((f) => ({
                      ...f,
                      totalEquityAsOf: e.target.value,
                    }))
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
            <button
              type="button"
              className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-100"
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

      {/* Administrative */}
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
              Table: <code className="text-zinc-400">public.capital_planner_state</code>
            </p>
            <pre className="overflow-x-auto rounded border border-zinc-900 p-2 text-[11px] text-zinc-400">{`select id, payload, updated_at
from public.capital_planner_state
where id = 'default';`}</pre>
            <p>Store / backend mode: {storeMode}</p>
            <p>
              SQL migration available:{" "}
              {sqlMigrationAvailable ? "yes (`supabase/capital-planner.sql`)" : "no"}
            </p>
            <p>
              Active configuration ID:{" "}
              {configuration?.id ?? "Unconfigured"}
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
