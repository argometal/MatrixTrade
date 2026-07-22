"use client";

import type { TradePlan } from "@/lib/plan-types";
import type { StockThesis } from "@/lib/stock-thesis-types";
import {
  buildFamilyBFillProjections,
  synthesizeFamilyBAssessment,
  validateFamilyBPlan,
  toBullTrendLayerRole,
} from "@/lib/family-b-assessment";
import { BULL_TREND_STATE_LABELS } from "@/lib/family-b-types";
import { isSecularTrendContinuationPlaybook } from "@/lib/playbook-family-b";
import { FamilyBChecklist } from "@/app/components/playbook/FamilyBChecklist";

/** Scout Family B bull-trend panel — only for secular-trend-continuation. */
export function FamilyBBullTrendPanel({
  plan,
  thesis,
  compact = false,
}: {
  plan: TradePlan;
  thesis?: StockThesis | null;
  compact?: boolean;
}) {
  if (!isSecularTrendContinuationPlaybook(plan.playbookId)) return null;

  const assessment = synthesizeFamilyBAssessment({
    playbookId: plan.playbookId,
    assessment: plan.familyBAssessment,
    plan,
    thesis,
  });
  const { errors, warnings } = validateFamilyBPlan({
    playbookId: plan.playbookId,
    plan,
    thesis,
    assessment,
    minimumRR: thesis?.riskRules?.minimumRR,
  });
  const fillStates = buildFamilyBFillProjections(plan);
  const le = plan.layeredEntry;

  return (
    <section
      className={
        compact
          ? "rounded-xl border border-sky-500/35 bg-sky-950/25 p-3"
          : "rounded-xl border border-sky-500/35 bg-sky-950/25 p-4"
      }
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">
        Family B · Bull trend continuation
      </p>
      <p className="mt-1 text-[11px] text-sky-100/55">
        Levels proposed by human/AI · MtA calculates R · Scout GO/WAIT/NO unchanged
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg border border-sky-500/20 bg-zinc-950/40 px-2 py-1.5">
          <dt className="text-sky-500/80">Entry state</dt>
          <dd className="font-medium text-sky-100">
            {BULL_TREND_STATE_LABELS[assessment.state]}
          </dd>
        </div>
        <div className="rounded-lg border border-sky-500/20 bg-zinc-950/40 px-2 py-1.5">
          <dt className="text-sky-500/80">Trend integrity</dt>
          <dd className="text-sky-100/90">{assessment.trendIntegrity}</dd>
        </div>
        <div className="rounded-lg border border-sky-500/20 bg-zinc-950/40 px-2 py-1.5">
          <dt className="text-sky-500/80">Extension</dt>
          <dd className="text-sky-100/90">{assessment.extension}</dd>
        </div>
        <div className="rounded-lg border border-sky-500/20 bg-zinc-950/40 px-2 py-1.5">
          <dt className="text-sky-500/80">Primary target</dt>
          <dd className="tabular-nums text-sky-100">
            {le?.primaryTargetPrice ?? plan.targetPrice ?? "—"}
          </dd>
        </div>
        <div className="rounded-lg border border-sky-500/20 bg-zinc-950/40 px-2 py-1.5">
          <dt className="text-sky-500/80">Common / strategy stop</dt>
          <dd className="tabular-nums text-sky-100">
            {le?.commonStopPrice ?? plan.stopPrice ?? "—"}
          </dd>
        </div>
        <div className="rounded-lg border border-sky-500/20 bg-zinc-950/40 px-2 py-1.5">
          <dt className="text-sky-500/80">Min R</dt>
          <dd className="text-sky-100">{thesis?.riskRules?.minimumRR ?? "—"}</dd>
        </div>
      </dl>

      {le?.limits?.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-[11px]">
            <thead>
              <tr className="text-sky-500/70">
                <th className="pb-1 pr-2">Role</th>
                <th className="pb-1 pr-2">Entry</th>
                <th className="pb-1 pr-2">Alloc</th>
                <th className="pb-1 pr-2">R</th>
                <th className="pb-1">Risk $</th>
              </tr>
            </thead>
            <tbody className="text-sky-100/85">
              {le.limits.map((limit, i) => (
                <tr key={`${limit.price}-${i}`} className="border-t border-sky-900/50">
                  <td className="py-1 pr-2">
                    {toBullTrendLayerRole(limit.role) ?? `L${i + 1}`}
                  </td>
                  <td className="py-1 pr-2 font-mono">{limit.price}</td>
                  <td className="py-1 pr-2">{limit.allocationPercent}%</td>
                  <td className="py-1 pr-2 font-mono">
                    {limit.derived?.rr !== undefined ? `${limit.derived.rr.toFixed(2)}R` : "—"}
                  </td>
                  <td className="py-1 font-mono">
                    {limit.derived?.plannedRiskAmount !== undefined
                      ? `$${limit.derived.plannedRiskAmount.toFixed(0)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-xs text-sky-100/50">
          No layered entry yet — propose starter / preferred / deep via Analyze → Apply.
        </p>
      )}

      {fillStates.length > 0 ? (
        <ul className="mt-3 space-y-1 text-[11px] text-sky-100/70">
          {fillStates.map((s) => (
            <li key={s.label} className="flex justify-between gap-2">
              <span>{s.label}</span>
              <span className="font-mono text-sky-100/50">
                {s.limitsFilled > 0
                  ? `avg ${s.averageEntry.toFixed(2)} · ${s.blendedRR?.toFixed(1) ?? s.combinedRR?.toFixed(1) ?? "—"}R`
                  : "no chase"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
        <div>
          <p className="font-semibold text-emerald-400/80">Evidence for</p>
          <ul className="mt-1 space-y-0.5 text-sky-100/70">
            {(assessment.evidenceFor.length ? assessment.evidenceFor : ["—"]).map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-amber-400/80">Evidence against</p>
          <ul className="mt-1 space-y-0.5 text-sky-100/70">
            {(assessment.evidenceAgainst.length ? assessment.evidenceAgainst : ["—"]).map(
              (e) => (
                <li key={e}>· {e}</li>
              )
            )}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-zinc-400">Unresolved</p>
          <ul className="mt-1 space-y-0.5 text-sky-100/70">
            {(assessment.unresolved.length ? assessment.unresolved : ["—"]).map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
        </div>
      </div>

      {errors.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-red-300">
          {errors.map((e) => (
            <li key={e}>✗ {e}</li>
          ))}
        </ul>
      ) : null}
      {warnings.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-amber-200/85">
          {warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      ) : null}

      {!compact ? (
        <div className="mt-4">
          <FamilyBChecklist playbookId={plan.playbookId} compact />
        </div>
      ) : null}
    </section>
  );
}
