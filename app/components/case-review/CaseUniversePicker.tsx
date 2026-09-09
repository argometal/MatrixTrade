"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { InsightsCaseRow } from "@/lib/insights-case-spine-types";

type CaseUniversePickerRow = Pick<
  InsightsCaseRow,
  | "planId"
  | "ticker"
  | "caseHref"
  | "family"
  | "caseDSubtype"
  | "t0Available"
  | "lifecycle"
>;

function optionLabel(row: CaseUniversePickerRow): string {
  const family = row.caseDSubtype ? `D:${row.caseDSubtype}` : row.family;
  return `${row.ticker} · ${row.planId} · ${row.lifecycle.status} · ${family}`;
}

export function CaseUniversePicker({
  rows,
  currentPlanId,
  label = "All Cases",
}: {
  rows: CaseUniversePickerRow[];
  currentPlanId?: string | null;
  label?: string;
}) {
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const tickerCmp = a.ticker.localeCompare(b.ticker);
        if (tickerCmp !== 0) return tickerCmp;
        return a.planId.localeCompare(b.planId);
      }),
    [rows]
  );

  const initial =
    sorted.find((row) => row.planId === currentPlanId)?.planId ??
    sorted[0]?.planId ??
    "";
  const [selectedPlanId, setSelectedPlanId] = useState(initial);
  const selected =
    sorted.find((row) => row.planId === selectedPlanId) ??
    sorted.find((row) => row.planId === currentPlanId) ??
    sorted[0] ??
    null;

  if (sorted.length === 0 || !selected) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor="case-universe-picker"
          className="text-[11px] font-medium uppercase tracking-wide text-zinc-500"
        >
          {label}
        </label>
        <select
          id="case-universe-picker"
          value={selected.planId}
          onChange={(event) => setSelectedPlanId(event.target.value)}
          className="min-w-[14rem] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        >
          {sorted.map((row) => (
            <option key={row.planId} value={row.planId}>
              {optionLabel(row)}
            </option>
          ))}
        </select>
        <Link
          href={selected.caseHref}
          className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-200 hover:border-violet-400/60 hover:bg-violet-500/15"
        >
          Open Case
        </Link>
      </div>
    </div>
  );
}
