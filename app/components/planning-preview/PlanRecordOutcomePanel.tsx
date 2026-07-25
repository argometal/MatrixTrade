"use client";

import { useState, useTransition } from "react";
import { recordPlanOutcomeAction } from "@/app/actions";
import { AUTOMATIC_EXECUTION_ENABLED } from "@/lib/plan-outcome-types";
import type { TradePlan } from "@/lib/plan-types";
import { PLAN_OUTCOME_STATUSES } from "@/lib/plan-outcome-types";

/** Record Outcome for terminal/expired plans — explicit human confirmation required. */
export function PlanRecordOutcomePanel({ plan }: { plan: TradePlan }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(Boolean(plan.outcome?.recordedAt));

  if (done && plan.outcome?.recordedAt) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
        Outcome recorded · {plan.outcome.status ?? "legacy"} · realizedR{" "}
        {plan.outcome.realizedResultR ?? 0}
        {plan.outcome.theoreticalResultR !== undefined &&
        plan.outcome.theoreticalResultR !== null
          ? ` · theoreticalR ${plan.outcome.theoreticalResultR}`
          : ""}
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
          Plan outcome ≠ account P/L. No fictitious Trade is created. Armed ≠ submitted
          (automaticExecutionEnabled={String(AUTOMATIC_EXECUTION_ENABLED)}).
        </p>
      </div>

      <label className="block text-xs text-zinc-300">
        Outcome classification
        <select
          name="status"
          required
          defaultValue="theoretical_loss"
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
        >
          {PLAN_OUTCOME_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" name="entryTriggered" value="true" defaultChecked />
          Entry triggered?
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" name="tradeExecuted" value="true" />
          Real trade executed?
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" name="stopTriggered" value="true" defaultChecked />
          Stop triggered after entry?
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" name="targetTriggered" value="true" />
          Target triggered after entry?
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs text-zinc-300">
          Theoretical result (R)
          <input
            name="theoreticalResultR"
            type="number"
            step="any"
            defaultValue={-1}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block text-xs text-zinc-300">
          Realized result (R)
          <input
            name="realizedResultR"
            type="number"
            step="any"
            defaultValue={0}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

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
