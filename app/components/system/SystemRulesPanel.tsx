"use client";

import { useState } from "react";
import { saveRulesAction } from "@/app/actions";
import type { ExperimentRules } from "@/lib/types";

export function SystemRulesPanel({ rules }: { rules: ExperimentRules }) {
  const [monthlyLimit, setMonthlyLimit] = useState(String(rules.monthlyLossLimit));
  const [perStockLimit, setPerStockLimit] = useState(String(rules.maxLossPerTicker));
  const [maxTrades, setMaxTrades] = useState(String(rules.maxTrades));
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
        Monthly base cap rolls unused room from the previous calendar month. Per-stock cap applies
        to cumulative loss per ticker across the experiment. Max trades is the sample size.
      </p>

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
