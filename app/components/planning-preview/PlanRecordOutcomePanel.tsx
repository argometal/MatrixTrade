"use client";

import { useMemo, useState, useTransition } from "react";
import { recordPlanOutcomeAction } from "@/app/actions";
import {
  AUTOMATIC_EXECUTION_ENABLED,
  NON_EXECUTION_REASONS,
  PLAN_OUTCOME_KINDS,
} from "@/lib/plan-outcome-types";
import { deriveUnexecutedPlanLossServerValues } from "@/lib/plan-outcome-derive";
import type { TradePlan } from "@/lib/plan-types";

/** Record Outcome for terminal/expired Scout plans — UPL event order is human-confirmed. */
export function PlanRecordOutcomePanel({ plan }: { plan: TradePlan }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(Boolean(plan.outcome?.recordedAt));
  const [outcomeKind, setOutcomeKind] = useState<string>("unexecuted_plan_loss");
  const [entryReached, setEntryReached] = useState(true);
  const [stopBeforeTarget, setStopBeforeTarget] = useState(true);
  const [targetBeforeStop, setTargetBeforeStop] = useState(false);

  const preview = useMemo(() => {
    if (outcomeKind !== "unexecuted_plan_loss") {
      return null;
    }
    return deriveUnexecutedPlanLossServerValues(plan);
  }, [plan, outcomeKind]);

  if (done && plan.outcome?.recordedAt) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
        Outcome recorded · {plan.outcome.outcomeKind ?? plan.outcome.status ?? "legacy"} ·
        realizedR {plan.outcome.realizedResultR ?? 0}
        {plan.outcome.theoreticalResultR !== undefined &&
        plan.outcome.theoreticalResultR !== null
          ? ` · counterfactualR ${plan.outcome.theoreticalResultR}`
          : ""}
        {plan.outcome.counterfactualDollarResult !== undefined &&
        plan.outcome.counterfactualDollarResult !== null
          ? ` · counterfactual$ ${plan.outcome.counterfactualDollarResult}`
          : " · counterfactual$ unavailable"}
      </div>
    );
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm"
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const result = await recordPlanOutcomeAction(plan.id, fd);
          if (result.error) {
            setError(result.error);
            return;
          }
          setDone(true);
        });
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
          Record Outcome · {plan.id}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Scout outcome ≠ account P/L. No fictitious Trade. Stock File thesis is not
          invalidated. MAF remains a separate later action. Armed ≠ submitted
          (automaticExecutionEnabled={String(AUTOMATIC_EXECUTION_ENABLED)}).
        </p>
      </div>

      <label className="block text-xs text-zinc-300">
        Outcome kind
        <select
          name="outcomeKind"
          required
          value={outcomeKind}
          onChange={(e) => setOutcomeKind(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
        >
          {PLAN_OUTCOME_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>

      {outcomeKind === "unexecuted_plan_loss" ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                name="entryReached"
                value="true"
                checked={entryReached}
                onChange={(e) => setEntryReached(e.target.checked)}
              />
              Entry reached?
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                name="stopReachedBeforeTarget"
                value="true"
                checked={stopBeforeTarget}
                onChange={(e) => setStopBeforeTarget(e.target.checked)}
              />
              Stop reached before target?
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                name="targetReachedBeforeStop"
                value="true"
                checked={targetBeforeStop}
                onChange={(e) => setTargetBeforeStop(e.target.checked)}
              />
              Target reached before stop?
            </label>
          </div>

          <label className="block text-xs text-zinc-300">
            Non-execution reason
            <select
              name="nonExecutionReason"
              required
              defaultValue="order_not_staged"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
            >
              {NON_EXECUTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          {preview ? (
            <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-300">
              <p className="font-semibold text-zinc-200">Derived preview (server)</p>
              <ul className="mt-1 space-y-0.5">
                <li>Realized R: {preview.realizedR}</li>
                <li>Realized P/L: {preview.realizedPnL}</li>
                <li>Counterfactual R: {preview.counterfactualR}</li>
                <li>
                  Counterfactual dollar result:{" "}
                  {preview.counterfactualDollarResult === null
                    ? "unavailable (no authorizedRiskAmount)"
                    : preview.counterfactualDollarResult}
                </li>
              </ul>
              <p className="mt-2 text-amber-200/90">
                Counterfactual results do not affect account P/L.
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-zinc-400">
          Duplicate creation closes this plan record with excludedFromMetrics — does not
          modify the canonical active plan for the ticker.
        </p>
      )}

      <label className="block text-xs text-zinc-300">
        Evidence refs (comma-separated)
        <input
          name="evidenceRefs"
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          placeholder="chart note, journal link…"
        />
      </label>

      <label className="block text-xs text-zinc-300">
        Notes
        <textarea
          name="notes"
          rows={3}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          placeholder="Human-confirmed event order only — do not invent prices."
        />
      </label>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save outcome"}
      </button>
    </form>
  );
}
