"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  SCOUT_ALLOCATION_FUNDING_LABELS,
  SCOUT_ALLOCATION_RELATIONSHIP_LABELS,
} from "@/lib/scout-allocation-types";
import { useScoutAllocationSelection } from "./ScoutAllocationProvider";

function moneyOrUnconfigured(
  value: number | undefined,
  reason?: string
): { text: string; reason?: string } {
  if (value !== undefined && Number.isFinite(value)) {
    return {
      text: value.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    };
  }
  return { text: "Unconfigured", reason };
}

export function ScoutAllocationImpact({
  planId,
  onFocusPlan,
}: {
  planId: string | undefined;
  onFocusPlan?: (planId: string) => void;
}) {
  const {
    candidates,
    simulation,
    impactsByPlanId,
    isSelected,
    add,
    remove,
    selectionOrder,
    relationshipsFor,
    availableCapital,
    availableRiskRoom,
  } = useScoutAllocationSelection();
  const [affectedOpen, setAffectedOpen] = useState(false);

  const candidate = useMemo(
    () => candidates.find((c) => c.planId === planId),
    [candidates, planId]
  );

  const pairs = useMemo(
    () => (planId ? relationshipsFor(planId) : []),
    [planId, relationshipsFor]
  );

  const orderSensitivePairs = pairs.filter(
    (p) => p.relationship === "order_sensitive"
  );
  const competingOrExclusive = pairs.filter(
    (p) =>
      p.relationship === "competing" ||
      p.relationship === "mutually_exclusive" ||
      p.relationship === "order_sensitive"
  );

  if (!planId || !candidate) return null;

  const selected = isSelected(planId);
  const impact = impactsByPlanId.get(planId);
  const isAlreadyReserved = selected && impact?.relationship === "already_reserved";
  const capitalReq =
    typeof candidate.requestedCapital === "number"
      ? candidate.requestedCapital
      : undefined;
  const riskReq =
    typeof candidate.estimatedRisk === "number"
      ? candidate.estimatedRisk
      : undefined;

  const baseCapitalCell = moneyOrUnconfigured(
    capitalReq,
    "No canonical capitalRequired yet"
  );
  const baseRiskCell = moneyOrUnconfigured(
    riskReq,
    "No canonical estimatedRisk yet"
  );
  const capitalCell = isAlreadyReserved
    ? { ...baseCapitalCell, text: `Already reserved ${baseCapitalCell.text}` }
    : baseCapitalCell;
  const riskCell = isAlreadyReserved
    ? { ...baseRiskCell, text: `Already reserved ${baseRiskCell.text}` }
    : baseRiskCell;
  const fundingLabel =
    SCOUT_ALLOCATION_FUNDING_LABELS[candidate.fundingDecision];

  const relationshipSummary =
    orderSensitivePairs.length > 0
      ? "Order sensitive"
      : competingOrExclusive.filter(
          (p) => p.relationship === "competing" || p.relationship === "mutually_exclusive"
        ).length > 0
      ? `Competes with ${competingOrExclusive.filter(
          (p) => p.relationship === "competing" || p.relationship === "mutually_exclusive"
        ).length} Scout${
          competingOrExclusive.filter(
            (p) => p.relationship === "competing" || p.relationship === "mutually_exclusive"
          ).length === 1
            ? ""
            : "s"
        }`
      : pairs.some((p) => p.relationship === "compatible")
      ? "Compatible with other Scouts"
      : pairs.some((p) => p.relationship === "unassessed")
      ? "Unassessed"
      : "No conflicts detected";

  const boardHref =
    selectionOrder.length > 0
      ? `/planning/capital/allocation?selected=${encodeURIComponent(
          selectionOrder.join(",")
        )}`
      : "/planning/capital/allocation";

  const capitalAfter = isAlreadyReserved
    ? {
        text: "No additional capital consumed",
      }
    : moneyOrUnconfigured(
        selected ? simulation.remainingCapital : availableCapital,
        selected ? undefined : "Available capital not configured"
      );
  const riskAfter = isAlreadyReserved
    ? {
        text: "No additional risk consumed",
      }
    : moneyOrUnconfigured(
        selected ? simulation.remainingRiskRoom : availableRiskRoom,
        selected ? undefined : "Risk room not configured"
      );

  const affectedFromSim = simulation.affected;

  return (
    <div
      className="mt-3 rounded-xl border border-current/20 bg-black/15 px-3 py-2.5"
      data-scout-allocation-impact
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
          Allocation impact
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={boardHref}
            className="rounded-md border border-current/25 px-2 py-1 text-[10px] font-medium opacity-90 hover:opacity-100"
          >
            Simulate
          </Link>
          <button
            type="button"
            data-scout-allocation-toggle
            onClick={() => (selected ? remove(planId) : add(planId))}
            className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-100 hover:bg-emerald-500/20"
          >
            {selected ? "Remove from allocation" : "Add to allocation"}
          </button>
          <Link
            href={boardHref}
            className="rounded-md border border-current/25 px-2 py-1 text-[10px] font-medium opacity-90 hover:opacity-100"
          >
            Open Allocation Board
          </Link>
        </div>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {(
          [
            ["Capital required", capitalCell],
            ["Estimated risk", riskCell],
            [
              "Funding now",
              { text: fundingLabel } as { text: string; reason?: string },
            ],
            [
              "Relationship",
              { text: relationshipSummary } as {
                text: string;
                reason?: string;
              },
            ],
          ] as const
        ).map(([label, cell]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wide opacity-60">
              {label}
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums">{cell.text}</dd>
            {cell.text === "Unconfigured" && cell.reason ? (
              <p className="mt-0.5 text-[10px] leading-snug opacity-60">
                {cell.reason}
              </p>
            ) : null}
          </div>
        ))}
      </dl>

      {selected ? (
        <dl className="mt-2 grid grid-cols-2 gap-2 border-t border-current/15 pt-2 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-[10px] uppercase tracking-wide opacity-60">
              Capital after
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {capitalAfter.text}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide opacity-60">
              Risk room after
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums">{riskAfter.text}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide opacity-60">
              Affected Scouts
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {affectedFromSim.length}
            </dd>
          </div>
        </dl>
      ) : null}

      {impact?.selected && impact.order !== undefined ? (
        <p className="mt-1.5 text-[10px] opacity-70">
          Selection order #{impact.order}
        </p>
      ) : null}

      {(affectedFromSim.length > 0 || competingOrExclusive.length > 0) && (
        <div className="mt-2 border-t border-current/15 pt-1.5" data-scout-affected-preview>
          <button
            type="button"
            onClick={() => setAffectedOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 py-1 text-left text-xs opacity-90 hover:opacity-100"
            aria-expanded={affectedOpen}
          >
            <span>
              Affected Scouts ·{" "}
              {selected
                ? competingOrExclusive.length
                : competingOrExclusive.length}
            </span>
            <span>{affectedOpen ? "▾" : "▸"}</span>
          </button>
          {affectedOpen ? (
            <ul className="mt-1 space-y-1.5 text-xs">
              {competingOrExclusive.map((p) => (
                <li
                  key={p.otherPlanId}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-current/10 bg-black/10 px-2 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => onFocusPlan?.(p.otherPlanId)}
                    className="font-medium text-left hover:underline"
                  >
                    {p.otherPlanId}
                    <span className="ml-1 opacity-60">
                      {p.otherTicker}
                    </span>
                  </button>
                  <span className="text-[10px] opacity-80">
                    {SCOUT_ALLOCATION_FUNDING_LABELS[p.otherBaseline]} →{" "}
                    {SCOUT_ALLOCATION_FUNDING_LABELS[p.focusThenOther.otherDecision]}
                    <span className="ml-1 opacity-70">
                      · {SCOUT_ALLOCATION_RELATIONSHIP_LABELS[p.relationship]}
                    </span>
                  </span>
                  {p.relationship === "order_sensitive" ? (
                    <span className="mt-1 w-full text-[10px] leading-snug opacity-80">
                      <span className="font-medium text-zinc-200">
                        Impact if this Scout is selected first:
                      </span>{" "}
                      {p.focusPlanId}{" "}
                      {SCOUT_ALLOCATION_FUNDING_LABELS[p.focusThenOther.focusDecision]}
                      {" · "}
                      {p.otherPlanId}{" "}
                      {SCOUT_ALLOCATION_FUNDING_LABELS[p.focusThenOther.otherDecision]}
                      <br />
                      <span className="font-medium text-zinc-200">
                        Reverse order:
                      </span>{" "}
                      {p.otherPlanId}{" "}
                      {SCOUT_ALLOCATION_FUNDING_LABELS[p.otherThenFocus.otherDecision]}
                      {" · "}
                      {p.focusPlanId}{" "}
                      {SCOUT_ALLOCATION_FUNDING_LABELS[p.otherThenFocus.focusDecision]}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
