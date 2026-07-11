"use client";

import type { ProposalSketch } from "@/lib/proposal-sketch";

function fieldToneClass(tone: ProposalSketch["fields"][number]["tone"]): string {
  if (tone === "risk") return "text-red-300";
  if (tone === "reward") return "text-emerald-300";
  if (tone === "accent") return "text-violet-200";
  return "text-zinc-100";
}

function ExpectationGlyph({ direction }: { direction?: ProposalSketch["expectation"] }) {
  if (direction === "up") {
    return <span className="text-emerald-400" aria-hidden>↗</span>;
  }
  if (direction === "down") {
    return <span className="text-red-400" aria-hidden>↘</span>;
  }
  return <span className="text-zinc-500" aria-hidden>→</span>;
}

export function ProposalSketchCard({ sketch }: { sketch: ProposalSketch }) {
  return (
    <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 to-zinc-950/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-300">
            {sketch.action}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-100">{sketch.headline}</p>
        </div>
        <ExpectationGlyph direction={sketch.expectation} />
      </div>

      {sketch.fields.length > 0 ? (
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          {sketch.fields.map((field) => (
            <div
              key={`${field.label}-${field.value}`}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2"
            >
              <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{field.label}</dt>
              <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${fieldToneClass(field.tone)}`}>
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">{sketch.summary}</p>
      )}
    </div>
  );
}
