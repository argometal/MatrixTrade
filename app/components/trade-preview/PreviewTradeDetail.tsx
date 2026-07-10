import Link from "next/link";
import {
  closeTradeAction,
  openTradeAction,
  updateTradeMetaAction,
} from "@/app/actions";
import { calculateTradeResult } from "@/lib/calculate";
import { formatMonthlyLossRoom } from "@/lib/monthly-risk";
import type { Playbook } from "@/lib/playbook-types";
import { getPlaybookName } from "@/lib/playbooks";
import type { Setup } from "@/lib/setup-types";
import { getSetupName } from "@/lib/setups";
import {
  computeHoldDays,
  computeRMultiple,
  computeRiskAmount,
  isTradeReviewed,
  MISTAKE_LABELS,
} from "@/lib/review";
import type { Experiment, Trade } from "@/lib/types";
import type { MonthlyRisk } from "@/lib/monthly-risk";
import { formatUsd, pnlTone } from "@/app/components/legacy/LegacyTradeDetailPage";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

export function PreviewTradeDetail({
  trade,
  experiment,
  monthly,
  setups,
  playbooks,
  metaOk,
}: {
  trade: Trade;
  experiment: Experiment;
  monthly: MonthlyRisk;
  setups: Setup[];
  playbooks: Playbook[];
  metaOk?: string;
}) {
  const result = calculateTradeResult(trade);
  const rMultiple = computeRMultiple(trade);
  const risk = computeRiskAmount(trade);
  const holdDays = computeHoldDays(trade);
  const setupName = getSetupName(setups, trade.setupId);
  const playbookName = getPlaybookName(playbooks, trade.playbookId);
  const reviewed = isTradeReviewed(trade);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <Link href="/trades" className="text-sm text-zinc-500 hover:text-violet-400">
            ← Trades
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-zinc-100">
            {trade.id} · {trade.ticker}
          </h1>
          <p className="mt-0.5 text-sm capitalize text-zinc-500">Status: {trade.status}</p>
          {trade.inconsistent && (
            <p className="mt-1 text-sm text-amber-400">⚠ inconsistent trade data</p>
          )}
        </header>

        <div className="mx-auto max-w-lg space-y-6 px-4 py-4 lg:px-6 lg:py-6">
          {metaOk && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
              ✓ {decodeURIComponent(metaOk)}
            </div>
          )}

          <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm">
            <Detail label="Entry" value={trade.entry.toFixed(2)} />
            <Detail label="Stop" value={trade.stop.toFixed(2)} />
            <Detail label="Shares" value={String(trade.shares)} />
            <Detail label="Target" value={trade.target?.toFixed(2) ?? "—"} />
            <Detail label="Exit" value={trade.exit?.toFixed(2) ?? "—"} />
            <Detail
              label="Result"
              value={result !== null ? formatUsd(result) : "—"}
              valueClass={result !== null ? pnlTone(result) : undefined}
            />
            {risk !== null && (
              <Detail label="Risk" value={formatUsd(-risk)} valueClass="text-red-400" />
            )}
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

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Assign playbook
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Manual assignment — optional risk fields for later analysis.
            </p>
            <form action={updateTradeMetaAction.bind(null, trade.id)} className="mt-3 space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-zinc-300">Playbook</span>
                <select
                  name="playbookId"
                  defaultValue={trade.playbookId ?? "__none__"}
                  className={inputClass}
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
                <span className="font-medium text-zinc-300">Setup tag</span>
                <select
                  name="setupId"
                  defaultValue={trade.setupId ?? "__none__"}
                  className={inputClass}
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
                <span className="font-medium text-zinc-300">Setup note</span>
                <input
                  name="setup"
                  type="text"
                  defaultValue={trade.setup ?? ""}
                  placeholder="Optional free-text setup description"
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-300">Direction</span>
                <select
                  name="direction"
                  defaultValue={trade.direction ?? ""}
                  className={inputClass}
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
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                Save assignment
              </button>
            </form>
          </section>

          {trade.status === "closed" && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Review
                </h2>
                <Link
                  href={`/trades/${trade.id}/review`}
                  className="text-sm font-medium text-violet-400 hover:text-violet-300"
                >
                  {reviewed ? "Edit review" : "Start review →"}
                </Link>
              </div>
              {reviewed ? (
                <dl className="mt-3 space-y-2 text-sm text-zinc-300">
                  {trade.mistakes?.length ? (
                    <div>
                      <dt className="text-xs text-zinc-500">Mistakes</dt>
                      <dd>{trade.mistakes.map((m) => MISTAKE_LABELS[m]).join(", ")}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-xs text-zinc-500">Quality</dt>
                    <dd>
                      E{trade.qualityEntry} · X{trade.qualityExit} · M{trade.qualityMgmt}
                    </dd>
                  </div>
                  {trade.lesson && (
                    <div>
                      <dt className="text-xs text-zinc-500">Lesson</dt>
                      <dd>{trade.lesson}</dd>
                    </div>
                  )}
                  {trade.actionItem && (
                    <div>
                      <dt className="text-xs text-zinc-500">Action</dt>
                      <dd>{trade.actionItem}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="mt-2 text-sm text-amber-400">
                  Review pending — close the learning loop.
                </p>
              )}
            </section>
          )}

          <a
            href={trade.obsidianNote}
            className="inline-block text-sm text-violet-400 hover:text-violet-300 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Obsidian note →
          </a>
          {trade.notePath && (
            <p className="text-xs text-zinc-500">
              Note: <code className="rounded bg-zinc-800 px-1 text-zinc-400">{trade.notePath}</code>
            </p>
          )}
          {trade.lessons && <p className="text-sm text-zinc-400">{trade.lessons}</p>}

          {trade.status === "pending" && (
            <form action={openTradeAction.bind(null, trade.id)}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
              >
                Mark as open
              </button>
            </form>
          )}

          {trade.status !== "closed" && (
            <form
              action={closeTradeAction.bind(null, trade.id)}
              className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
            >
              <h2 className="text-sm font-semibold text-zinc-200">Close trade</h2>
              <p className="text-xs text-zinc-500">
                Experiment P/L: {formatUsd(experiment.realizedPnL)} · Monthly room:{" "}
                {formatMonthlyLossRoom(monthly.monthlyLossRoom)}
              </p>
              <label className="block text-sm">
                <span className="font-medium text-zinc-300">Exit price</span>
                <input name="exit" type="number" step="0.01" min="0" required className={inputClass} />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                Close & calculate P/L
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={`mt-0.5 font-medium tabular-nums text-zinc-100 ${valueClass ?? ""}`}>
        {value}
      </dd>
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
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <input
        name={name}
        type="number"
        step="0.01"
        defaultValue={defaultValue ?? ""}
        className={inputClass}
      />
    </label>
  );
}
