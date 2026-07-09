"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  recordPlanOutcomeAction,
  savePlanAction,
  updatePlanStatusAction,
} from "@/app/actions";
import { buildPlanEnterHref, planNeedsStrategyReview } from "@/lib/plan-helpers";
import {
  PLAN_EXTERNAL_FACTORS,
  PLAN_FAIL_REASON_LABELS,
  PLAN_STATUS_LABELS,
  PLAN_TIMEFRAMES,
  type PlanTimeframe,
  type TradePlan,
} from "@/lib/plan-types";
import type { Playbook } from "@/lib/playbook-types";
import { getPlaybookName } from "@/lib/playbook-helpers";

type FilterId = "all" | "active" | "ready" | "failed" | "expired" | "evaluate";

const statusStyles: Record<string, string> = {
  watching: "bg-sky-500/15 text-sky-300",
  ready: "bg-emerald-500/15 text-emerald-400",
  entered: "bg-violet-500/15 text-violet-300",
  skipped: "bg-zinc-700/50 text-zinc-400",
  failed: "bg-red-500/15 text-red-400",
  expired: "bg-amber-500/15 text-amber-400",
};

function formatLevel(value?: number): string {
  if (value === undefined) return "—";
  return `$${value.toFixed(2)}`;
}

function formatWindow(plan: TradePlan): string {
  if (!plan.validFrom && !plan.validUntil) return "Open";
  const from = plan.validFrom ? new Date(plan.validFrom).toLocaleDateString() : "…";
  const until = plan.validUntil ? new Date(plan.validUntil).toLocaleDateString() : "…";
  return `${from} → ${until}`;
}

export function PreviewPlanning({
  plans,
  playbooks,
  focusPlanId,
}: {
  plans: TradePlan[];
  playbooks: Playbook[];
  focusPlanId?: string;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [outcomePlanId, setOutcomePlanId] = useState<string | null>(
    focusPlanId && plans.some((p) => p.id === focusPlanId && planNeedsStrategyReview(p))
      ? focusPlanId
      : null
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editing = editingId ? plans.find((p) => p.id === editingId) : undefined;

  const filtered = useMemo(() => {
    switch (filter) {
      case "active":
        return plans.filter((p) => p.status === "watching" || p.status === "ready");
      case "ready":
        return plans.filter((p) => p.status === "ready");
      case "failed":
        return plans.filter((p) => p.status === "failed");
      case "expired":
        return plans.filter((p) => p.status === "expired");
      case "evaluate":
        return plans.filter(planNeedsStrategyReview);
      default:
        return plans;
    }
  }, [plans, filter]);

  const defaultFrames: PlanTimeframe[] = ["1D", "1H", "15m", "5m"];

  function openCreate() {
    setEditingId(null);
    setShowForm(true);
    setFormError(null);
  }

  function openEdit(plan: TradePlan) {
    setEditingId(plan.id);
    setShowForm(true);
    setFormError(null);
  }

  function runStatus(planId: string, status: TradePlan["status"]) {
    startTransition(async () => {
      await updatePlanStatusAction(planId, status);
    });
  }

  function submitForm(formData: FormData) {
    startTransition(async () => {
      const result = await savePlanAction(formData);
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      setShowForm(false);
      setEditingId(null);
      setFormError(null);
    });
  }

  function submitOutcome(formData: FormData) {
    if (!outcomePlanId) return;
    startTransition(async () => {
      const result = await recordPlanOutcomeAction(outcomePlanId, formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setOutcomePlanId(null);
      setFormError(null);
    });
  }

  const outcomePlan = outcomePlanId
    ? plans.find((p) => p.id === outcomePlanId)
    : undefined;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Planning</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Scout entries, save levels and timeframes, track what failed — data for strategy
                evaluation and AI analysis.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              New plan
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["active", "Active"],
                ["ready", "Ready"],
                ["evaluate", "Needs review"],
                ["failed", "Failed"],
                ["expired", "Expired"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  filter === id
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="space-y-4 px-4 py-4 lg:px-6">
          {showForm && (
            <section className="rounded-2xl border border-violet-500/30 bg-zinc-900/80 p-5">
              <h2 className="text-sm font-semibold text-zinc-200">
                {editing ? `Edit ${editing.id}` : "New trade plan"}
              </h2>
              <form action={submitForm} className="mt-4 space-y-4">
                {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block text-xs text-zinc-500">
                    Ticker
                    <input
                      name="ticker"
                      required
                      defaultValue={editing?.ticker ?? ""}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>
                  <label className="block text-xs text-zinc-500">
                    Playbook
                    <select
                      name="playbookId"
                      defaultValue={editing?.playbookId ?? ""}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    >
                      <option value="">—</option>
                      {playbooks.map((pb) => (
                        <option key={pb.id} value={pb.id}>
                          {pb.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-zinc-500">
                    Entry timeframe (smallest)
                    <select
                      name="entryTimeframe"
                      defaultValue={editing?.entryTimeframe ?? "5m"}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    >
                      {PLAN_TIMEFRAMES.map((tf) => (
                        <option key={tf} value={tf}>
                          {tf}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <fieldset>
                  <legend className="text-xs text-zinc-500">Analysis timeframes</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PLAN_TIMEFRAMES.map((tf) => {
                      const selected = editing
                        ? editing.analysisTimeframes.includes(tf)
                        : defaultFrames.includes(tf);
                      return (
                        <label
                          key={tf}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                        >
                          <input
                            type="checkbox"
                            name="analysisTimeframes"
                            value={tf}
                            defaultChecked={selected}
                          />
                          {tf}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    [
                      ["plannedEntry", "Planned entry"],
                      ["supportLevel", "Support"],
                      ["stopPrice", "Stop"],
                      ["targetPrice", "Target"],
                    ] as const
                  ).map(([name, label]) => (
                    <label key={name} className="block text-xs text-zinc-500">
                      {label}
                      <input
                        name={name}
                        type="number"
                        step="0.01"
                        defaultValue={
                          editing?.[name] !== undefined ? String(editing[name]) : ""
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                      />
                    </label>
                  ))}
                  <label className="block text-xs text-zinc-500">
                    Planned R:R
                    <input
                      name="plannedRR"
                      type="number"
                      step="0.1"
                      defaultValue={
                        editing?.plannedRR !== undefined ? String(editing.plannedRR) : ""
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs text-zinc-500">
                    Valid from
                    <input
                      name="validFrom"
                      type="datetime-local"
                      defaultValue={
                        editing?.validFrom
                          ? new Date(editing.validFrom).toISOString().slice(0, 16)
                          : ""
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>
                  <label className="block text-xs text-zinc-500">
                    Valid until (auto-expires)
                    <input
                      name="validUntil"
                      type="datetime-local"
                      defaultValue={
                        editing?.validUntil
                          ? new Date(editing.validUntil).toISOString().slice(0, 16)
                          : ""
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>
                </div>

                <label className="block text-xs text-zinc-500">
                  Thesis
                  <textarea
                    name="thesis"
                    rows={2}
                    defaultValue={editing?.thesis ?? ""}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  Chat notes (paste from Assistant — not auto-applied)
                  <textarea
                    name="chatNotes"
                    rows={3}
                    defaultValue={editing?.chatNotes ?? ""}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>

                {formError ? <p className="text-sm text-red-400">{formError}</p> : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {editing ? "Save plan" : "Create plan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setFormError(null);
                    }}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No plans in this view. Create one to track a setup before it becomes a trade.
            </p>
          ) : (
            <ul className="space-y-4">
              {filtered.map((plan) => (
                <li
                  key={plan.id}
                  id={plan.id}
                  className={`rounded-2xl border bg-zinc-900/50 p-5 ${
                    focusPlanId === plan.id
                      ? "border-violet-500/50"
                      : "border-zinc-800"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-zinc-100">
                          {plan.ticker}
                        </h2>
                        <span className="text-sm text-zinc-500">{plan.id}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusStyles[plan.status] ?? "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {PLAN_STATUS_LABELS[plan.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {getPlaybookName(playbooks, plan.playbookId) ?? "No playbook"} · Entry{" "}
                        {plan.entryTimeframe} · Window {formatWindow(plan)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Analyze: {plan.analysisTimeframes.join(", ")}
                      </p>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <p>Entry {formatLevel(plan.plannedEntry)}</p>
                      <p>Stop {formatLevel(plan.stopPrice)} · Target {formatLevel(plan.targetPrice)}</p>
                      {plan.plannedRR !== undefined ? <p>R:R {plan.plannedRR.toFixed(1)}</p> : null}
                    </div>
                  </div>

                  {plan.thesis ? (
                    <p className="mt-3 text-sm text-zinc-400">{plan.thesis}</p>
                  ) : null}

                  {plan.outcome ? (
                    <p className="mt-3 rounded-lg bg-zinc-950/80 px-3 py-2 text-xs text-zinc-500">
                      Strategy valid: {plan.outcome.strategyStillValid ? "yes" : "no"}
                      {plan.outcome.lesson ? ` · ${plan.outcome.lesson}` : ""}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(plan)}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Edit
                    </button>
                    {plan.status === "watching" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => runStatus(plan.id, "ready")}
                        className="rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs font-medium text-emerald-400"
                      >
                        Mark ready
                      </button>
                    ) : null}
                    {plan.status === "ready" || plan.status === "watching" ? (
                      <Link
                        href={buildPlanEnterHref(plan)}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                      >
                        Enter trade →
                      </Link>
                    ) : null}
                    {plan.status === "watching" || plan.status === "ready" ? (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => runStatus(plan.id, "skipped")}
                          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400"
                        >
                          Skip
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              await updatePlanStatusAction(plan.id, "failed");
                              setOutcomePlanId(plan.id);
                            });
                          }}
                          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400"
                        >
                          Mark failed
                        </button>
                      </>
                    ) : null}
                    {planNeedsStrategyReview(plan) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOutcomePlanId(plan.id);
                          setFormError(null);
                        }}
                        className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400"
                      >
                        Evaluate strategy
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {outcomePlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
            <h3 className="text-lg font-semibold text-zinc-100">
              Evaluate · {outcomePlan.ticker} ({outcomePlan.id})
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Was the strategy sound? Record context for AI analysis later.
            </p>
            <form action={submitOutcome} className="mt-4 space-y-4">
              <fieldset>
                <legend className="text-xs text-zinc-500">Strategy still valid?</legend>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="radio" name="strategyStillValid" value="yes" required />
                    Yes — external factors
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="radio" name="strategyStillValid" value="no" required />
                    No — rethink playbook
                  </label>
                </div>
              </fieldset>
              <label className="block text-xs text-zinc-500">
                Reason
                <select
                  name="reason"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="">—</option>
                  {Object.entries(PLAN_FAIL_REASON_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend className="text-xs text-zinc-500">External factors</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PLAN_EXTERNAL_FACTORS.map((factor) => (
                    <label
                      key={factor}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                    >
                      <input type="checkbox" name="externalFactors" value={factor} />
                      {factor}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block text-xs text-zinc-500">
                Lesson (saved for AI export)
                <textarea
                  name="lesson"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              {formError ? <p className="text-sm text-red-400">{formError}</p> : null}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Save evaluation
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomePlanId(null)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
