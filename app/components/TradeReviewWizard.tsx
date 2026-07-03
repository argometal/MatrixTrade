"use client";

import { useState } from "react";
import { saveReviewAction } from "@/app/actions";
import { MISTAKE_LABELS, MISTAKE_TYPES } from "@/lib/review";
import type { MistakeType, Trade } from "@/lib/types";

const STEPS = [
  "What happened?",
  "Mistakes",
  "Quality",
  "Lesson",
  "Action",
] as const;

function StarRating({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          name={name}
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-md text-sm font-medium ${
            n <= value
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-400 hover:border-zinc-400"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function TradeReviewWizard({
  trade,
  result,
  rMultiple,
}: {
  trade: Trade;
  result: number | null;
  rMultiple: number | null;
}) {
  const [step, setStep] = useState(0);
  const [mistakes, setMistakes] = useState<MistakeType[]>(
    trade.mistakes?.length ? trade.mistakes : ["none"]
  );
  const [qualityEntry, setQualityEntry] = useState(trade.qualityEntry ?? 3);
  const [qualityExit, setQualityExit] = useState(trade.qualityExit ?? 3);
  const [qualityMgmt, setQualityMgmt] = useState(trade.qualityMgmt ?? 3);

  function toggleMistake(id: MistakeType) {
    if (id === "none") {
      setMistakes(["none"]);
      return;
    }
    setMistakes((prev) => {
      const withoutNone = prev.filter((m) => m !== "none");
      if (withoutNone.includes(id)) {
        const next = withoutNone.filter((m) => m !== id);
        return next.length ? next : ["none"];
      }
      if (withoutNone.length >= 3) return withoutNone;
      return [...withoutNone, id];
    });
  }

  const isLast = step === STEPS.length - 1;

  return (
    <form action={saveReviewAction.bind(null, trade.id)} className="space-y-6">
      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-zinc-900" : "bg-zinc-200"}`}
            title={label}
          />
        ))}
      </div>

      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </p>

      {step === 0 && (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
          <p>
            <span className="font-medium">{trade.id}</span> · {trade.ticker} closed at{" "}
            {trade.exit?.toFixed(2)}
          </p>
          <p>
            Result:{" "}
            <span className={result !== null && result < 0 ? "text-red-600" : "text-emerald-600"}>
              {result !== null ? `${result >= 0 ? "+" : ""}$${result.toFixed(2)}` : "—"}
            </span>
            {rMultiple !== null && (
              <span className="ml-2 text-zinc-500">({rMultiple >= 0 ? "+" : ""}{rMultiple.toFixed(2)}R)</span>
            )}
          </p>
          <p className="text-zinc-600">
            Take 30 seconds: what actually happened? Details go in Obsidian — here we capture what
            matters for patterns.
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">Tap all that apply (max 3).</p>
          <div className="flex flex-wrap gap-2">
            {MISTAKE_TYPES.map((id) => (
              <label
                key={id}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                  mistakes.includes(id)
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white hover:border-zinc-400"
                }`}
              >
                <input
                  type="checkbox"
                  name="mistakes"
                  value={id}
                  checked={mistakes.includes(id)}
                  onChange={() => toggleMistake(id)}
                  className="sr-only"
                />
                {MISTAKE_LABELS[id]}
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Entry quality</p>
            <StarRating name="qualityEntry" value={qualityEntry} onChange={setQualityEntry} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Exit quality</p>
            <StarRating name="qualityExit" value={qualityExit} onChange={setQualityExit} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Management quality</p>
            <StarRating name="qualityMgmt" value={qualityMgmt} onChange={setQualityMgmt} />
          </div>
        </div>
      )}

      {step === 3 && (
        <label className="block space-y-2 text-sm">
          <span className="font-medium">One lesson (optional)</span>
          <textarea
            name="lesson"
            rows={3}
            defaultValue={trade.lesson ?? ""}
            placeholder="What will you remember from this trade?"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-zinc-500 focus:outline-none"
            maxLength={280}
          />
        </label>
      )}

      {step === 4 && (
        <label className="block space-y-2 text-sm">
          <span className="font-medium">One action for next session (optional)</span>
          <textarea
            name="actionItem"
            rows={3}
            defaultValue={trade.actionItem ?? ""}
            placeholder="Concrete rule or behavior to try next time"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 focus:border-zinc-500 focus:outline-none"
            maxLength={280}
          />
        </label>
      )}

      <div className="flex flex-wrap gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Back
          </button>
        )}
        {!isLast ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Continue
          </button>
        ) : (
          <button
            type="submit"
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Save review
          </button>
        )}
      </div>

      {mistakes.map((m) => (
        <input key={m} type="hidden" name="mistakes" value={m} />
      ))}
      <input type="hidden" name="qualityEntry" value={qualityEntry} />
      <input type="hidden" name="qualityExit" value={qualityExit} />
      <input type="hidden" name="qualityMgmt" value={qualityMgmt} />
    </form>
  );
}
