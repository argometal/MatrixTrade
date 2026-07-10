"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveStockThesisAction } from "@/app/actions";
import { buildAiContextPackage } from "@/lib/ai-context";
import type { Playbook } from "@/lib/playbook-types";
import {
  formatStockThesisZone,
  STOCK_THESIS_STATUS_LABELS,
  type StockThesis,
  type StockThesisStatus,
} from "@/lib/stock-thesis-types";

const statusStyles: Record<string, string> = {
  draft: "bg-zinc-700/50 text-zinc-400",
  watching: "bg-sky-500/15 text-sky-300",
  actionable: "bg-emerald-500/15 text-emerald-400",
  invalidated: "bg-red-500/15 text-red-400",
  archived: "bg-zinc-700/50 text-zinc-500",
};

function formatLevel(value?: number): string {
  if (value === undefined) return "—";
  return `$${value.toFixed(2)}`;
}

export function PreviewStockThesis({
  thesis,
  playbooks = [],
}: {
  thesis: StockThesis;
  playbooks?: Playbook[];
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const contextText = useMemo(
    () =>
      buildAiContextPackage({
        scope: "stock-file",
        focusThesis: thesis,
        playbooks,
      }),
    [thesis, playbooks]
  );

  function copyContext() {
    void navigator.clipboard.writeText(contextText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function submitForm(formData: FormData) {
    startTransition(async () => {
      const result = await saveStockThesisAction(formData);
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      setFormError(null);
    });
  }

  const levels = thesis.levels;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-zinc-100">{thesis.ticker}</h1>
                <span className="text-sm text-zinc-500">{thesis.id}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusStyles[thesis.status] ?? "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {STOCK_THESIS_STATUS_LABELS[thesis.status]}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-zinc-500">
                Stock File · {thesis.style} · v{thesis.version}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyContext}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
              >
                {copied ? "Copied" : "Copy AI training block"}
              </button>
              <Link
                href={`/planning?thesis=${thesis.id}`}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                Create scout →
              </Link>
            </div>
          </div>
        </header>

        <div className="space-y-4 px-4 py-4 lg:px-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">Thesis</h2>
            <p className="mt-2 text-sm text-zinc-400">{thesis.thesis}</p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">Current hypothesis</h2>
            <p className="mt-2 text-sm text-violet-300">{thesis.currentHypothesis}</p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">Historical analysis</h2>
            {thesis.historicalAnalysis.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No historical analysis recorded.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {thesis.historicalAnalysis.map((row) => (
                  <li key={row.timeframe} className="text-sm text-zinc-400">
                    <span className="font-medium text-zinc-300">{row.timeframe}</span>
                    <span className="text-zinc-600"> · </span>
                    {row.summary}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">Levels</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm text-zinc-400">
              <p>Major support: {formatLevel(levels.majorSupport)}</p>
              <p>Major resistance: {formatLevel(levels.majorResistance)}</p>
              <p>Primary zone: {formatStockThesisZone(levels.primaryZone)}</p>
              <p>Secondary zone: {formatStockThesisZone(levels.secondaryZone)}</p>
              <p>
                Targets:{" "}
                {levels.targets?.length
                  ? levels.targets.map((t) => formatLevel(t)).join(", ")
                  : "—"}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">Risk rules</h2>
            <div className="mt-3 space-y-2 text-sm text-zinc-400">
              <p>Minimum R:R: {thesis.riskRules.minimumRR}R</p>
              <p>Invalidation: {thesis.riskRules.invalidation}</p>
              {thesis.riskRules.notes ? <p>Notes: {thesis.riskRules.notes}</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-violet-500/30 bg-zinc-900/80 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">Edit (MVP)</h2>
            <form action={submitForm} className="mt-4 space-y-4">
              <input type="hidden" name="id" value={thesis.id} />

              <label className="block text-xs text-zinc-500">
                Status
                <select
                  name="status"
                  defaultValue={thesis.status}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                >
                  {(Object.keys(STOCK_THESIS_STATUS_LABELS) as StockThesisStatus[]).map((key) => (
                    <option key={key} value={key}>
                      {STOCK_THESIS_STATUS_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs text-zinc-500">
                Current hypothesis
                <textarea
                  name="currentHypothesis"
                  rows={3}
                  defaultValue={thesis.currentHypothesis}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </label>

              <label className="block text-xs text-zinc-500">
                Notes
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={thesis.notes ?? ""}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </label>

              {formError ? <p className="text-sm text-red-400">{formError}</p> : null}

              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                Save changes
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
