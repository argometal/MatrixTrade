import Link from "next/link";
import { notFound } from "next/navigation";
import { closeTradeAction, openTradeAction, updateTradeMetaAction } from "@/app/actions";
import { calculateTradeResult } from "@/lib/calculate";
import {
  computeHoldDays,
  computeRMultiple,
  computeRiskAmount,
  isTradeReviewed,
  MISTAKE_LABELS,
} from "@/lib/review";
import { getPlaybookName, getPlaybooks } from "@/lib/playbooks";
import { getSetupName, getSetups } from "@/lib/setups";
import { formatMonthlyLossRoom } from "@/lib/monthly-risk";
import { getExperiment, getMonthlyRisk, getTrades } from "@/lib/storage";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

export default async function TradeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ metaOk?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const tradeId = id.toUpperCase();
  const [trades, experiment, monthly, setups, playbooks] = await Promise.all([
    getTrades(),
    getExperiment(),
    getMonthlyRisk(),
    getSetups(),
    getPlaybooks(),
  ]);
  const trade = trades.find((t) => t.id === tradeId);

  if (!trade) notFound();

  const result = calculateTradeResult(trade);
  const rMultiple = computeRMultiple(trade);
  const risk = computeRiskAmount(trade);
  const holdDays = computeHoldDays(trade);
  const setupName = getSetupName(setups, trade.setupId);
  const playbookName = getPlaybookName(playbooks, trade.playbookId);
  const reviewed = isTradeReviewed(trade);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {query.metaOk && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          ✓ {decodeURIComponent(query.metaOk)}
        </div>
      )}
      <header>
        <Link href="/trades" className="text-sm text-zinc-500 hover:underline">
          ← Back to trades
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {trade.id} · {trade.ticker}
        </h1>
        <p className="text-sm capitalize text-zinc-500">Status: {trade.status}</p>
        {trade.inconsistent && (
          <p className="mt-1 text-sm text-amber-600">⚠ inconsistent trade data</p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-200 bg-white p-6 text-sm shadow-sm">
        <Detail label="Entry" value={trade.entry.toFixed(2)} />
        <Detail label="Stop" value={trade.stop.toFixed(2)} />
        <Detail label="Shares" value={String(trade.shares)} />
        <Detail label="Target" value={trade.target?.toFixed(2) ?? "—"} />
        <Detail label="Exit" value={trade.exit?.toFixed(2) ?? "—"} />
        <Detail label="Result" value={result !== null ? formatUsd(result) : "—"} />
        {risk !== null && <Detail label="Risk" value={formatUsd(-risk)} />}
        {rMultiple !== null && (
          <Detail
            label="R-multiple"
            value={`${rMultiple >= 0 ? "+" : ""}${rMultiple.toFixed(2)}R`}
          />
        )}
        {holdDays !== null && trade.status === "closed" && (
          <Detail label="Hold" value={`${holdDays}d`} />
        )}
        {setupName && <Detail label="Setup" value={setupName} />}
        <Detail label="Playbook" value={playbookName ?? "Unassigned"} />
        {trade.direction && <Detail label="Direction" value={trade.direction} />}
      </dl>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Assign playbook
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Manual assignment — optional risk fields for later analysis.
        </p>
        <form action={updateTradeMetaAction.bind(null, trade.id)} className="mt-3 space-y-3">
          <label className="block text-sm">
            <span className="font-medium">Playbook</span>
            <select
              name="playbookId"
              defaultValue={trade.playbookId ?? "__none__"}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="__none__">Unassigned</option>
              {playbooks.map((pb) => (
                <option key={pb.id} value={pb.id}>
                  {pb.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Setup tag</span>
            <select
              name="setupId"
              defaultValue={trade.setupId ?? "__none__"}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="__none__">— None —</option>
              {setups.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Setup note</span>
            <input
              name="setup"
              type="text"
              defaultValue={trade.setup ?? ""}
              placeholder="Optional free-text setup description"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Direction</span>
            <select
              name="direction"
              defaultValue={trade.direction ?? ""}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <OptionalField label="Planned risk ($)" name="plannedRisk" defaultValue={trade.plannedRisk} />
            <OptionalField label="Actual risk ($)" name="actualRisk" defaultValue={trade.actualRisk} />
            <OptionalField label="R:R planned" name="riskRewardPlanned" defaultValue={trade.riskRewardPlanned} />
            <OptionalField label="R:R actual" name="riskRewardActual" defaultValue={trade.riskRewardActual} />
          </div>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Save assignment
          </button>
        </form>
      </section>

      {trade.status === "closed" && (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Review</h2>
            <Link
              href={`/trades/${trade.id}/review`}
              className="text-sm font-medium text-zinc-900 underline"
            >
              {reviewed ? "Edit review" : "Start review →"}
            </Link>
          </div>
          {reviewed ? (
            <dl className="mt-3 space-y-2 text-sm">
              {trade.mistakes?.length ? (
                <div>
                  <dt className="text-xs text-zinc-400">Mistakes</dt>
                  <dd>{trade.mistakes.map((m) => MISTAKE_LABELS[m]).join(", ")}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-zinc-400">Quality</dt>
                <dd>
                  E{trade.qualityEntry} · X{trade.qualityExit} · M{trade.qualityMgmt}
                </dd>
              </div>
              {trade.lesson && (
                <div>
                  <dt className="text-xs text-zinc-400">Lesson</dt>
                  <dd>{trade.lesson}</dd>
                </div>
              )}
              {trade.actionItem && (
                <div>
                  <dt className="text-xs text-zinc-400">Action</dt>
                  <dd>{trade.actionItem}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-amber-700">Review pending — close the learning loop.</p>
          )}
        </section>
      )}

      <a
        href={trade.obsidianNote}
        className="inline-block text-sm text-blue-600 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Obsidian note →
      </a>
      {trade.notePath && (
        <p className="text-xs text-zinc-500">
          Note: <code className="rounded bg-zinc-100 px-1">{trade.notePath}</code>
        </p>
      )}
      {trade.lessons && (
        <p className="text-sm text-zinc-600">{trade.lessons}</p>
      )}

      {trade.status === "pending" && (
        <form action={openTradeAction.bind(null, trade.id)}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Mark as open
          </button>
        </form>
      )}

      {trade.status !== "closed" && (
        <form action={closeTradeAction.bind(null, trade.id)} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Close trade</h2>
          <p className="text-xs text-zinc-500">
            Experiment P/L: {formatUsd(experiment.realizedPnL)} · Monthly room:{" "}
            {formatMonthlyLossRoom(monthly.monthlyLossRoom)}
          </p>
          <label className="block text-sm">
            <span className="font-medium">Exit price</span>
            <input
              name="exit"
              type="number"
              step="0.01"
              min="0"
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Close & calculate P/L
          </button>
        </form>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function OptionalField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <input
        name={name}
        type="number"
        step="0.01"
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
      />
    </label>
  );
}
