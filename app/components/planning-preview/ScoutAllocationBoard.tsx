"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  SCOUT_ALLOCATION_FUNDING_LABELS,
  SCOUT_ALLOCATION_PORTFOLIO_LABELS,
  SCOUT_ALLOCATION_RELATIONSHIP_LABELS,
  type ScoutAllocationRelationship,
} from "@/lib/scout-allocation-types";
import {
  buildScoutAllocationSnapshotPackage,
  formatScoutAllocationSnapshotText,
} from "@/lib/scout-allocation-snapshot";
import {
  activeReservationIds,
  useScoutAllocationSelection,
} from "./ScoutAllocationProvider";
import type { CapitalReservation } from "@/lib/capital-types";

function money(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "Unconfigured";
  }
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

const GROUP_ORDER: ScoutAllocationRelationship[] = [
  "compatible",
  "competing",
  "order_sensitive",
  "mutually_exclusive",
  "blocked_independently",
  "unassessed",
  "already_reserved",
];

export function ScoutAllocationBoard({
  reservations,
}: {
  reservations: CapitalReservation[];
}) {
  const {
    selectionOrder,
    simulation,
    candidates,
    impactsByPlanId,
    availableCapital,
    availableRiskRoom,
    add,
    remove,
    move,
    clear,
    isSelected,
    relationshipsFor,
  } = useScoutAllocationSelection();
  const [copied, setCopied] = useState(false);

  const focusId = selectionOrder[0] ?? candidates[0]?.planId;
  const pairs = useMemo(
    () => (focusId ? relationshipsFor(focusId) : []),
    [focusId, relationshipsFor]
  );

  const pairByOtherPlanId = useMemo(() => {
    const m = new Map<string, (typeof pairs)[number]>();
    for (const p of pairs) m.set(p.otherPlanId, p);
    return m;
  }, [pairs]);

  const groups = useMemo(() => {
    const map = new Map<ScoutAllocationRelationship, typeof candidates>();
    for (const rel of GROUP_ORDER) map.set(rel, []);
    for (const c of candidates) {
      const rel =
        c.planId === focusId
          ? "unassessed"
          : pairByOtherPlanId.get(c.planId)?.relationship ?? "unassessed";
      const list = map.get(rel) ?? [];
      list.push(c);
      map.set(rel, list);
    }
    return map;
  }, [candidates, focusId, pairByOtherPlanId]);

  async function copySnapshot() {
    const pkg = buildScoutAllocationSnapshotPackage({
      result: simulation,
      selectedPlanIds: selectionOrder,
      selectionOrder,
      existingReservationIds: activeReservationIds(reservations),
      relationships: pairs,
    });
    const text = formatScoutAllocationSnapshotText(pkg);
    const ok = await navigator.clipboard.writeText(text).then(
      () => true,
      () => false
    );
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const summaryCells: Array<[string, string]> = [
    ["Available capital", money(availableCapital)],
    ["Available risk room", money(availableRiskRoom)],
    ["Already reserved", money(simulation.alreadyReservedCapital)],
    ["New allocation", money(simulation.newSelectedCapital)],
    ["Total selected", money(simulation.totalSelectedExposure)],
    ["Capital remaining", money(simulation.remainingCapital)],
    ["Already reserved risk", money(simulation.alreadyReservedRisk)],
    ["New risk", money(simulation.newSelectedRisk)],
    ["Risk remaining", money(simulation.remainingRiskRoom)],
    [
      "Portfolio status",
      SCOUT_ALLOCATION_PORTFOLIO_LABELS[simulation.portfolioStatus],
    ],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 pb-[calc(4rem+env(safe-area-inset-bottom))]" data-scout-allocation-board>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">
            <Link href="/mxt/planning" className="hover:underline">
              Scout
            </Link>
            <span className="mx-1.5 opacity-40">/</span>
            <Link href="/mxt/planning/capital" className="hover:underline">
              Capital Planner
            </Link>
            <span className="mx-1.5 opacity-40">/</span>
            Allocation Board
          </p>
          <h1 className="mt-1 text-xl font-semibold text-zinc-100">
            Scout Allocation Board
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Advisory simulation only — does not reserve capital or create
            trades.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copySnapshot()}
            data-scout-allocation-snapshot
            className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-500/20"
          >
            {copied ? "Copied" : "Copy Allocation Snapshot"}
          </button>
          <button
            type="button"
            onClick={clear}
            className="rounded-lg border border-zinc-600 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Clear selection
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Header summary</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
          {summaryCells.map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-2.5 py-2"
            >
              <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
                {label}
              </dt>
              <dd className="mt-0.5 font-medium tabular-nums text-zinc-100">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          Selected Scouts ({selectionOrder.length})
        </h2>
        {selectionOrder.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">
            No Scouts selected. Add from Scout Desk or the list below.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {simulation.selected.map((row) => (
              <li
                key={row.planId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs"
              >
                <div>
                  <span className="font-medium text-zinc-100">
                    #{row.order} {row.ticker}
                  </span>
                  <span className="ml-2 text-zinc-500">{row.planId}</span>
                  <p className="mt-0.5 text-zinc-400">
                    Cap {money(row.requestedCapital)} · Risk{" "}
                    {money(row.estimatedRisk)} ·{" "}
                    {SCOUT_ALLOCATION_FUNDING_LABELS[row.afterDecision]}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => move(row.planId, "up")}
                    className="rounded border border-zinc-700 px-2 py-1 text-[10px]"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => move(row.planId, "down")}
                    className="rounded border border-zinc-700 px-2 py-1 text-[10px]"
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(row.planId)}
                    className="rounded border border-rose-500/40 px-2 py-1 text-[10px] text-rose-200"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          Relationship groups
        </h2>
        <div className="mt-3 space-y-3">
          {GROUP_ORDER.map((rel) => {
            const list = groups.get(rel) ?? [];
            if (list.length === 0) return null;
            return (
              <div key={rel} data-allocation-group={rel}>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  {SCOUT_ALLOCATION_RELATIONSHIP_LABELS[rel]} · {list.length}
                </h3>
                <ul className="mt-1.5 space-y-1">
                  {list.map((c) => {
                    const pair =
                      c.planId === focusId ? undefined : pairByOtherPlanId.get(c.planId);
                    const relationship = pair?.relationship ?? "unassessed";
                    return (
                      <li
                        key={c.planId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800/80 px-2.5 py-1.5 text-xs"
                      >
                        <span>
                          <span className="font-medium text-zinc-200">
                            {c.ticker}
                          </span>
                          <span className="ml-2 text-zinc-500">{c.planId}</span>
                          {pair ? (
                            <span className="ml-2 text-zinc-400">
                              {SCOUT_ALLOCATION_FUNDING_LABELS[pair.otherBaseline]} →{" "}
                              {SCOUT_ALLOCATION_FUNDING_LABELS[pair.focusThenOther.otherDecision]}
                            </span>
                          ) : null}
                          {relationship === "order_sensitive" && pair ? (
                            <span className="ml-2 block text-[10px] text-zinc-500 leading-snug">
                              <span className="font-medium text-zinc-400">
                                Selected first:
                              </span>{" "}
                              {pair.focusThenOther.focusDecision === "fully_funded"
                                ? pair.focusPlanId
                                : pair.focusPlanId}{" "}
                              {SCOUT_ALLOCATION_FUNDING_LABELS[pair.focusThenOther.focusDecision]}
                              {" · "}
                              {pair.otherPlanId}{" "}
                              {SCOUT_ALLOCATION_FUNDING_LABELS[pair.focusThenOther.otherDecision]}
                              <br />
                              <span className="font-medium text-zinc-400">
                                Reverse order:
                              </span>{" "}
                              {pair.otherPlanId}{" "}
                              {SCOUT_ALLOCATION_FUNDING_LABELS[pair.otherThenFocus.otherDecision]}
                              {" · "}
                              {pair.focusPlanId}{" "}
                              {SCOUT_ALLOCATION_FUNDING_LABELS[pair.otherThenFocus.focusDecision]}
                            </span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            isSelected(c.planId)
                              ? remove(c.planId)
                              : add(c.planId)
                          }
                          className="rounded border border-zinc-700 px-2 py-0.5 text-[10px]"
                        >
                          {isSelected(c.planId) ? "Remove" : "Add"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Impact summary</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-[10px] uppercase text-zinc-500">Affected Scouts</dt>
            <dd className="font-medium text-zinc-100">
              {simulation.affected.length}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-zinc-500">Capital deficit</dt>
            <dd className="font-medium text-zinc-100">
              {money(simulation.capitalDeficit)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-zinc-500">Risk deficit</dt>
            <dd className="font-medium text-zinc-100">
              {money(simulation.riskDeficit)}
            </dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-[10px] uppercase text-zinc-500">
              Threshold-crossing Scout
            </dt>
            <dd className="font-medium text-zinc-100">
              {simulation.thresholdCrossingPlanId ?? "None"}
            </dd>
          </div>
        </dl>
        {simulation.affected.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs text-zinc-400">
            {simulation.affected.map((a) => (
              <li key={a.planId}>
                {a.planId}: {SCOUT_ALLOCATION_FUNDING_LABELS[a.beforeDecision]} →{" "}
                {SCOUT_ALLOCATION_FUNDING_LABELS[a.afterDecision]} (
                {SCOUT_ALLOCATION_RELATIONSHIP_LABELS[a.relationship]})
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
