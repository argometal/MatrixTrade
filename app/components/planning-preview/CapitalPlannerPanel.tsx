import Link from "next/link";
import type {
  CapitalAccountSnapshot,
  CapitalField,
} from "@/lib/capital-account";
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
  return "Unconfigured";
}

function pct(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function valuationLabel(p: ExternalPosition): string {
  if (p.currentPrice === undefined) return "No price";
  const source = p.valuationSource ?? "unspecified";
  const stale = isValuationStale(p.lastValuationAt);
  if (source === "manual" && stale) return "Manual · stale";
  if (source === "manual") return "Manual";
  if (stale) return `${source} · stale`;
  return source;
}

export function CapitalPlannerPanel({
  account,
  positions,
  focusId,
}: {
  account: CapitalAccountSnapshot;
  positions: ExternalPosition[];
  focusId?: string;
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
          Partial capital view. External Positions are connected; Scout
          reservations, committed capital, invested Scout capital, and base
          equity are not wired as complete authoritative sources.
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

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-200">Capital Account</h2>
        <p className="text-xs text-amber-200/80">
          Completeness: {account.completeness.replaceAll("_", " ")}. Unconfigured
          fields are not known zeros.
        </p>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(
            [
              ["Total capital", account.totalCapital],
              ["Settled cash", account.settledCash],
              ["Invested (external)", account.investedExternalCapital],
              ["External market value", account.externalMarketValue],
              ["Pending settlement", account.pendingSettlementProceeds],
              ["Settled external credits", account.settledExternalProceeds],
              ["Potential capital release", account.potentialExternalCapitalRelease],
              ["Deployable capital", account.deployableCapital],
              ["Available capital", account.availableCapital],
              ["Reserved capital", account.reservedCapital],
              ["Committed capital", account.committedCapital],
              ["Invested Scout capital", account.investedScoutCapital],
            ] as const
          ).map(([label, field]) => (
            <div key={label} className="border-t border-zinc-800 pt-2">
              <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
                {label}
              </dt>
              <dd className="mt-1 text-sm text-zinc-100">
                {fieldDisplay(field)}
              </dd>
              {field.status === "unconfigured" ? (
                <p className="mt-0.5 text-[10px] text-zinc-500">{field.reason}</p>
              ) : null}
            </div>
          ))}
        </dl>
        {account.notes.length > 0 && (
          <ul className="space-y-1 text-xs text-zinc-500">
            {account.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
        {account.monthlyRisk && (
          <p className="text-xs text-zinc-500">
            Monthly loss room (Scout risk, unchanged by External Positions):{" "}
            {money(account.monthlyRisk.monthlyLossRoom)}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-zinc-200">
              External Positions
            </h2>
            <p className="text-xs text-zinc-500">
              Capital currently invested outside the Scout → Trade pipeline.
              Cost basis method: average_cost (no tax-lot accuracy).
            </p>
          </div>
          <span className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
            Excluded from MTA experiment metrics
          </span>
        </div>

        {positions.length === 0 ? (
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
                  <th className="py-2 pr-3 font-medium">Exit plan</th>
                  <th className="py-2 font-medium">Review</th>
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
                      {money(p.currentMarketValue)}
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
                    <td className="py-2.5 pr-3 text-zinc-300">
                      {p.exitPlan?.status ?? "—"}
                    </td>
                    <td className="py-2.5 text-zinc-400">
                      {p.reviewAt
                        ? new Date(p.reviewAt).toLocaleDateString()
                        : "—"}
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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium text-zinc-200">
              {focus.ticker} · {focus.id}
            </h2>
            <span className="rounded border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-[11px] text-emerald-200">
              Excluded from MTA experiment metrics
            </span>
            <span className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
              Acquired outside MTA
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-wide text-zinc-500">
                Valuation
              </h3>
              <ul className="space-y-1 text-sm text-zinc-300">
                <li>Shares: {focus.shares}</li>
                <li>Average cost: {money(focus.averageCost)}</li>
                <li>Cost basis method: {focus.costBasisMethod ?? "average_cost"}</li>
                <li>Cost basis (invested): {money(focus.costBasis)}</li>
                <li>Current price: {money(focus.currentPrice)}</li>
                <li>Valuation: {valuationLabel(focus)}</li>
                <li>
                  Last valuation:{" "}
                  {focus.lastValuationAt
                    ? new Date(focus.lastValuationAt).toLocaleString()
                    : "—"}
                </li>
                <li>Market value: {money(focus.currentMarketValue)}</li>
                <li>
                  Unrealized P/L: {money(focus.unrealizedPnL)} (
                  {pct(focus.unrealizedPnLPercent)})
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-wide text-zinc-500">
                Capital impact
              </h3>
              <ul className="space-y-1 text-sm text-zinc-300">
                <li>Treatment: {focus.capitalTreatment}</li>
                <li>Liquidity: {focus.liquidityStatus}</li>
                <li>Source: {focus.acquisitionSource}</li>
                <li>Status: {focus.status}</li>
                <li>
                  Sale proceeds (informational):{" "}
                  {money(focus.cumulativeSaleProceeds)}
                </li>
                <li>
                  Realized P/L (reductions):{" "}
                  {money(focus.cumulativeRealizedPnL)}
                </li>
                <li>
                  Potential capital release:{" "}
                  {money(focus.currentMarketValue ?? focus.costBasis)}
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-wide text-zinc-500">
              Exit plan
            </h3>
            {focus.exitPlan ? (
              <ul className="space-y-1 text-sm text-zinc-300">
                <li>Status: {focus.exitPlan.status}</li>
                <li>
                  Target: {focus.exitPlan.targetShares ?? "—"} sh @{" "}
                  {money(focus.exitPlan.targetPrice)}
                </li>
                <li>
                  Defensive: {money(focus.exitPlan.defensivePrice)} ·{" "}
                  {focus.exitPlan.defensiveAction ?? "—"}
                </li>
                <li>{focus.exitPlan.notes ?? "—"}</li>
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">
                No exit plan. Optional via{" "}
                <code className="text-zinc-400">
                  external-position-exit-plan-update
                </code>
                .
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-wide text-zinc-500">
              Reduction / settlement history
            </h3>
            {focus.reductions.length === 0 ? (
              <p className="text-sm text-zinc-500">No reductions yet.</p>
            ) : (
              <ul className="space-y-2 text-sm text-zinc-300">
                {focus.reductions.map((r) => (
                  <li key={r.id} className="border-t border-zinc-900 pt-2">
                    {r.sharesReduced} sh @ {money(r.executionPrice)} · proceeds{" "}
                    {money(r.proceeds)} · realized {money(r.realizedPnL)} ·{" "}
                    {r.settlementStatus}
                    {r.settledAt
                      ? ` · settled ${new Date(r.settledAt).toLocaleString()}`
                      : ""}{" "}
                    · {new Date(r.executedAt).toLocaleString()}
                    {r.notes ? (
                      <div className="text-zinc-500">{r.notes}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {focus.notes && (
            <div className="space-y-1">
              <h3 className="text-xs uppercase tracking-wide text-zinc-500">
                Notes
              </h3>
              <p className="text-sm text-zinc-300">{focus.notes}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
