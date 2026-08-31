"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import type { CapitalAccountSnapshot, CapitalField } from "@/lib/capital-account";
import type { ExternalPosition } from "@/lib/external-position-types";
import {
  isOpenExternalPosition,
  isValuationStale,
} from "@/lib/external-position-types";
import { CAPITAL_ALLOCATION_FLOW } from "@/lib/capital-help";
import { formatCapitalStoreError } from "@/lib/capital-store-recovery";

function money(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function fieldDisplay(field: CapitalField): string {
  if (field.status === "configured") return money(field.value);
  if (field.status === "unknown") return "Unknown";
  return "Unconfigured";
}

function pct(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function valuationLabel(p: ExternalPosition): string {
  if (p.currentPrice === undefined) return "Unconfigured";
  const source = p.valuationSource ?? "unspecified";
  if (isValuationStale(p.lastValuationAt)) return `${source} · Stale`;
  if (source === "manual") return "Manual";
  return source;
}

function CompactSection({
  title,
  children,
  defaultOpen = true,
  tech,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  tech?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [techOpen, setTechOpen] = useState(false);
  const techId = useId();

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
          {title}
        </h2>
        <span className="text-xs text-zinc-500">{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-zinc-800/80 px-3 pb-3 pt-2">
          {children}
          {tech ? (
            <div>
              <button
                type="button"
                id={techId}
                className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
                aria-expanded={techOpen}
                onClick={() => setTechOpen((v) => !v)}
              >
                {techOpen ? "Hide technical notes" : "Technical notes"}
              </button>
              {techOpen ? (
                <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                  {tech}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function FieldGrid({
  items,
}: {
  items: Array<{
    label: string;
    field: CapitalField;
    asOf?: string;
  }>;
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(({ label, field, asOf }) => (
        <div key={label} className="min-w-0">
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
            {label}
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-zinc-100">
            {fieldDisplay(field)}
          </dd>
          {field.status !== "configured" ? (
            <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
              {field.reason}
            </p>
          ) : null}
          {asOf ? (
            <p className="mt-0.5 text-[10px] text-zinc-500">
              as of {new Date(asOf).toLocaleString()}
            </p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function CapitalPlannerPanel({
  account,
  positions,
  focusId,
  capitalError,
  positionsError,
}: {
  account: CapitalAccountSnapshot | null;
  positions: ExternalPosition[];
  focusId?: string;
  capitalError?: string;
  positionsError?: string;
}) {
  const open = positions.filter(isOpenExternalPosition);
  const focus =
    (focusId
      ? positions.find((p) => p.id.toUpperCase() === focusId.toUpperCase())
      : undefined) ?? open[0];

  const capitalErrorDisplay = formatCapitalStoreError(capitalError, "capital");
  const positionsErrorDisplay = formatCapitalStoreError(
    positionsError,
    "external"
  );

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:pb-8"
      data-capital-planner-root
    >
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Scouting Desk · Capital Planner
        </p>
        <h1 className="font-serif text-2xl tracking-tight text-zinc-50 sm:text-4xl">
          Capital Planner
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Model A cash-ledger. Settled cash and equity are independent. Scout
          approval does not auto-reserve capital.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/mxt/scout"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
          >
            ← Scout desk
          </Link>
          <Link
            href="/mxt/scout/capital/allocation"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/20"
          >
            Allocation Board
          </Link>
          <Link
            href="/mxt/settings/capital"
            data-capital-settings-cta
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20"
          >
            Manage capital settings
          </Link>
        </div>
      </header>

      <section
        className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2.5"
        data-allocation-flow-help
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Allocation flow
        </h2>
        <p className="mt-1 text-sm leading-snug text-zinc-300">
          {CAPITAL_ALLOCATION_FLOW}
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          Use Scout Funding Snapshot on a Scout Plan — do not gather identifiers
          manually from separate screens.
        </p>
      </section>

      {capitalErrorDisplay ? (
        <section className="rounded-xl border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
          Capital Account unavailable: {capitalErrorDisplay}
        </section>
      ) : null}

      {account ? (
        <>
          <CompactSection
            title="Account"
            tech={`Completeness: ${account.completeness.status} · reconciliation: ${account.reconciliationStatus}${account.cashSource ? ` · cash source: ${account.cashSource}` : ""}`}
          >
            <FieldGrid
              items={[
                {
                  label: "Total equity",
                  field: account.totalEquity,
                  asOf: account.totalEquityAsOf,
                },
                {
                  label: "Settled cash",
                  field: account.settledCash,
                  asOf: account.settledCashAsOf,
                },
                { label: "Liquidity buffer", field: account.liquidityBuffer },
                { label: "Available capital", field: account.availableCapital },
                {
                  label: "Deployable capital",
                  field: account.deployableCapital,
                },
              ]}
            />
          </CompactSection>

          <CompactSection
            title="Allocations"
            tech="Model A: invested Scout capital is informational and is not subtracted again from settled cash."
          >
            <FieldGrid
              items={[
                {
                  label: "Reserved for Scouts",
                  field: account.reservedCapital,
                },
                { label: "Committed", field: account.committedCapital },
                {
                  label: "Invested in open Trades",
                  field: account.investedScoutCapital,
                },
                {
                  label: "Available for new Scouts",
                  field: account.availableCapital,
                },
              ]}
            />
          </CompactSection>

          <CompactSection
            title="External Positions"
            tech="Cost basis method: average_cost. Missing price → market value Unknown (not cost basis). Excluded from MTA experiment metrics."
          >
            {positionsErrorDisplay ? (
              <p className="text-sm text-amber-200">
                External Positions unavailable: {positionsErrorDisplay}
              </p>
            ) : null}
            <FieldGrid
              items={[
                {
                  label: "Cost basis",
                  field: account.investedExternalCapital,
                },
                {
                  label: "Marked market value",
                  field: account.externalMarketValue,
                },
                {
                  label: "Pending settlement",
                  field: account.pendingSettlementProceeds,
                },
                {
                  label: "Settled proceeds",
                  field: account.settledExternalProceeds,
                },
                {
                  label: "Potential release (not cash)",
                  field: account.potentialExternalCapitalRelease,
                },
              ]}
            />
          </CompactSection>

          <CompactSection
            title="Scout Funding"
            tech="Scout approval alone does not fund. Prepare capital-reservation-create from Scout Funding Snapshot, then Control → Apply."
          >
            {account.reservations.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No capital reservations yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-zinc-300">
                {account.reservations.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-2.5 py-2"
                  >
                    <div className="font-medium text-zinc-100">
                      {r.id} · {r.planId}
                      {r.ticker ? ` · ${r.ticker}` : ""}
                    </div>
                    <div className="text-xs text-zinc-400">
                      requested {money(r.requestedCapital)} · reserved{" "}
                      {money(r.reservedCapital)} · {r.status} ·{" "}
                      {r.fundingDecision}
                    </div>
                    {r.blockingReasons.length > 0 ? (
                      <div className="text-xs text-amber-200/80">
                        Blockers: {r.blockingReasons.join("; ")}
                      </div>
                    ) : null}
                    {r.expiresAt ? (
                      <div className="text-[11px] text-zinc-500">
                        expires {new Date(r.expiresAt).toLocaleString()}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CompactSection>

          {account.notes.length > 0 && (
            <ul className="space-y-1 text-xs text-zinc-500">
              {account.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      <CompactSection
        title="External Position detail"
        defaultOpen={positions.length > 0}
        tech="Excluded from MTA experiment metrics. Create via Control → Apply → external-position-create."
      >
        {positionsErrorDisplay ? null : positions.length === 0 ? (
          <p className="text-sm text-zinc-500">No External Positions yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-3 font-medium">Ticker</th>
                  <th className="py-2 pr-3 font-medium">Shares</th>
                  <th className="py-2 pr-3 font-medium">Avg cost</th>
                  <th className="py-2 pr-3 font-medium">Price</th>
                  <th className="py-2 pr-3 font-medium">Valuation</th>
                  <th className="py-2 pr-3 font-medium">Market value</th>
                  <th className="py-2 pr-3 font-medium">Unrealized</th>
                  <th className="py-2 pr-3 font-medium">Liquidity</th>
                  <th className="py-2 font-medium">Exit plan</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-zinc-900/80 ${
                      focus?.id === p.id ? "bg-zinc-900/50" : ""
                    }`}
                  >
                    <td className="py-2 pr-3">
                      <Link
                        href={`/mxt/scout/capital?position=${p.id}`}
                        className="inline-flex rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-100 hover:bg-zinc-800"
                      >
                        {p.ticker}
                      </Link>
                      <div className="text-[11px] text-zinc-500">{p.id}</div>
                    </td>
                    <td className="py-2 pr-3 text-zinc-300">{p.shares}</td>
                    <td className="py-2 pr-3 text-zinc-300">
                      {money(p.averageCost)}
                    </td>
                    <td className="py-2 pr-3 text-zinc-300">
                      {money(p.currentPrice)}
                    </td>
                    <td className="py-2 pr-3 text-zinc-400">
                      {valuationLabel(p)}
                    </td>
                    <td className="py-2 pr-3 text-zinc-300">
                      {p.currentMarketValue === undefined
                        ? "Unknown"
                        : money(p.currentMarketValue)}
                    </td>
                    <td className="py-2 pr-3 text-zinc-300">
                      {money(p.unrealizedPnL)}{" "}
                      <span className="text-zinc-500">
                        ({pct(p.unrealizedPnLPercent)})
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-zinc-300">
                      {p.liquidityStatus}
                    </td>
                    <td className="py-2 text-zinc-300">
                      {p.exitPlan?.status ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CompactSection>

      {focus && (
        <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            {focus.ticker} · {focus.id}
          </h2>
          <ul className="space-y-1 text-sm text-zinc-300">
            <li>Cost basis: {money(focus.costBasis)}</li>
            <li>
              Market value:{" "}
              {focus.currentMarketValue === undefined
                ? "Unknown"
                : money(focus.currentMarketValue)}
            </li>
            <li>Valuation: {valuationLabel(focus)}</li>
            <li>Treatment: {focus.capitalTreatment}</li>
            <li>Status: {focus.status}</li>
            <li>
              Sale proceeds (informational):{" "}
              {money(focus.cumulativeSaleProceeds)}
            </li>
          </ul>
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-wide text-zinc-500">
              Reduction / settlement
            </h3>
            {focus.reductions.length === 0 ? (
              <p className="text-sm text-zinc-500">No reductions yet.</p>
            ) : (
              <ul className="space-y-2 text-sm text-zinc-300">
                {focus.reductions.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-zinc-900 px-2 py-1.5"
                  >
                    {r.sharesReduced} sh @ {money(r.executionPrice)} · proceeds{" "}
                    {money(r.proceeds)} ·{" "}
                    {r.settlementStatus === "pending_settlement"
                      ? "Pending settlement"
                      : r.settlementStatus}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
