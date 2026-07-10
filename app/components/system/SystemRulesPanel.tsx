"use client";

import { useState } from "react";
import { saveRulesAction } from "@/app/actions";
import type { ExperimentRules } from "@/lib/types";

export function SystemRulesPanel({ rules }: { rules: ExperimentRules }) {
  const [monthlyLimit, setMonthlyLimit] = useState(String(rules.monthlyLossLimit));
  const [perStockLimit, setPerStockLimit] = useState(String(rules.maxLossPerTicker));
  const [maxTrades, setMaxTrades] = useState(String(rules.maxTrades));
  const [carryoverEnabled, setCarryoverEnabled] = useState(rules.carryoverEnabled !== false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("monthlyLossLimit", monthlyLimit);
    formData.set("maxLossPerTicker", perStockLimit);
    formData.set("maxTrades", maxTrades);
    if (carryoverEnabled) {
      formData.set("carryoverEnabled", "on");
    }

    const result = await saveRulesAction(formData);
    setSaving(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setMessage("Rules saved.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-zinc-400">
        Monthly base cap rolls unused room from the previous calendar month when carryover is
        enabled. Per-stock cap applies to cumulative loss per ticker across the experiment. Max
        trades is the sample size.
      </p>

      <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3">
        <input
          type="checkbox"
          checked={carryoverEnabled}
          onChange={(e) => setCarryoverEnabled(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-violet-600 focus:ring-violet-500"
        />
        <span className="text-sm">
          <span className="font-medium text-zinc-200">Enable monthly carryover</span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            When on, unused budget from the prior month adds to this month&apos;s room. When off,
            monthly room is the base cap only.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="font-medium text-zinc-300">Monthly base cap (USD)</span>
          <input
            type="number"
            step="1"
            max="-1"
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
          <span className="mt-1 block text-xs text-zinc-500">Negative, e.g. -300</span>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-zinc-300">Per-stock loss cap (USD)</span>
          <input
            type="number"
            step="1"
            max="-1"
            value={perStockLimit}
            onChange={(e) => setPerStockLimit(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
          <span className="mt-1 block text-xs text-zinc-500">Negative, e.g. -250</span>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-zinc-300">Experiment max trades</span>
          <input
            type="number"
            min="1"
            max="999"
            step="1"
            value={maxTrades}
            onChange={(e) => setMaxTrades(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
          <span className="mt-1 block text-xs text-zinc-500">Strategy sample size</span>
        </label>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save rules"}
      </button>
    </form>
  );
}
