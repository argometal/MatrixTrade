import Link from "next/link";
import type { CapitalAccountSnapshot, CapitalField } from "@/lib/capital-account";
import type { ExternalPosition } from "@/lib/external-position-types";
import {
  isOpenExternalPosition,
  isValuationStale,
} from "@/lib/external-position-types";

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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Scouting Desk · Capital Planner
        </p>
        <h1 className="font-serif text-3xl tracking-tight text-zinc-50 sm:text-4xl">
          Capital Planner
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Model A cash-ledger foundation. Settled cash and account equity are
          independent. Scout approval does not auto-reserve capital.
        </p>
        <div className="flex flex-wrap gap-3 pt-1 text-sm">
          <Link
            href="/planning"
            className="text-zinc-300 underline-offset-4 hover:underline"
          >
            ← Scout desk
          </Link>
        </div>
      </header>

      {capitalError ? (
        <section className="rounded border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
          Capital Account unavailable: {capitalError}
        </section>
      ) : null}

      {account ? (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-200">Account</h2>
            <p className="text-xs text-zinc-500">
              Completeness: {account.completeness.status} · reconciliation:{" "}
              {account.reconciliationStatus}
              {account.cashSource ? ` · cash source: ${account.cashSource}` : ""}
            </p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(
                [
                  ["Total equity", account.totalEquity, account.totalEquityAsOf],
                  ["Settled cash", account.settledCash, account.settledCashAsOf],
                  ["Liquidity buffer", account.liquidityBuffer, undefined],
                  ["Available capital", account.availableCapital, undefined],
                  ["Deployable capital", account.deployableCapital, undefined],
                ] as const
              ).map(([label, field, asOf]) => (
                <div key={label} className="border-t border-zinc-800 pt-2">
                  <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm text-zinc-100">
                    {fieldDisplay(field)}
                  </dd>
                  {field.status !== "configured" ? (
                    <p className="mt-0.5 text-[10px] text-zinc-500">
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
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-200">Allocations</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["Reserved for Scouts", account.reservedCapital],
                  ["Committed", account.committedCapital],
                  ["Invested in open Trades", account.investedScoutCapital],
                  ["Available for new Scouts", account.availableCapital],
                ] as const
              ).map(([label, field]) => (
                <div key={label} className="border-t border-zinc-800 pt-2">
                  <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm text-zinc-100">
                    {fieldDisplay(field)}
                  </dd>
                  {field.status !== "configured" ? (
                    <p className="mt-0.5 text-[10px] text-zinc-500">
                      {field.reason}
                    </p>
                  ) : null}
                </div>
              ))}
            </dl>
            <p className="text-xs text-zinc-500">
              Model A: invested Scout capital is informational and is not
              subtracted again from settled cash.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-200">
              External Positions
            </h2>
            {positionsError ? (
              <p className="text-sm text-amber-200">
                External Positions unavailable: {positionsError}
              </p>
            ) : null}
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(
                [
                  ["Cost basis", account.investedExternalCapital],
                  ["Marked market value", account.externalMarketValue],
                  ["Pending settlement", account.pendingSettlementProceeds],
                  ["Settled proceeds", account.settledExternalProceeds],
                  [
                    "Potential release (not cash)",
                    account.potentialExternalCapitalRelease,
                  ],
                ] as const
              ).map(([label, field]) => (
                <div key={label} className="border-t border-zinc-800 pt-2">
                  <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm text-zinc-100">
                    {fieldDisplay(field)}
                  </dd>
                  {field.status !== "configured" ? (
                    <p className="mt-0.5 text-[10px] text-zinc-500">
                      {field.reason}
                    </p>
                  ) : null}
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-200">Scout Funding</h2>
            {account.reservations.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No capital reservations. Scout approval alone does not fund —
                use{" "}
                <code className="text-zinc-400">capital-reservation-create</code>
                .
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-zinc-300">
                {account.reservations.map((r) => (
                  <li key={r.id} className="border-t border-zinc-900 pt-2">
                    <div className="font-medium text-zinc-100">
                      {r.id} · {r.planId}
                      {r.ticker ? ` · ${r.ticker}` : ""}
                    </div>
                    <div>
                      requested {money(r.requestedCapital)} · reserved{" "}
                      {money(r.reservedCapital)} · {r.status} ·{" "}
                      {r.fundingDecision}
                    </div>
                    {r.blockingReasons.length > 0 ? (
                      <div className="text-amber-200/80">
                        Blockers: {r.blockingReasons.join("; ")}
                      </div>
                    ) : null}
                    {r.expiresAt ? (
                      <div className="text-zinc-500">
                        expires {new Date(r.expiresAt).toLocaleString()}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {account.notes.length > 0 && (
            <ul className="space-y-1 text-xs text-zinc-500">
              {account.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-zinc-200">
              External Position detail
            </h2>
            <p className="text-xs text-zinc-500">
              Cost basis method: average_cost. Missing price → market value
              Unknown (not cost basis).
            </p>
          </div>
          <span className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
            Excluded from MTA experiment metrics
          </span>
        </div>

        {positionsError ? null : positions.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No External Positions yet. Create via Control → Apply →{" "}
            <code className="text-zinc-300">external-position-create</code>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
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
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/planning/capital?position=${p.id}`}
                        className="font-medium text-zinc-100 underline-offset-4 hover:underline"
                      >
                        {p.ticker}
                      </Link>
                      <div className="text-[11px] text-zinc-500">{p.id}</div>
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-300">{p.shares}</td>
                    <td className="py-2.5 pr-3 text-zinc-300">
                      {money(p.averageCost)}
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-300">
                      {money(p.currentPrice)}
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-400">
                      {valuationLabel(p)}
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-300">
                      {p.currentMarketValue === undefined
                        ? "Unknown"
                        : money(p.currentMarketValue)}
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-300">
                      {money(p.unrealizedPnL)}{" "}
                      <span className="text-zinc-500">
                        ({pct(p.unrealizedPnLPercent)})
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-300">
                      {p.liquidityStatus}
                    </td>
                    <td className="py-2.5 text-zinc-300">
                      {p.exitPlan?.status ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {focus && (
        <section className="space-y-4 border-t border-zinc-800 pt-6">
          <h2 className="text-sm font-medium text-zinc-200">
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
                  <li key={r.id} className="border-t border-zinc-900 pt-2">
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
