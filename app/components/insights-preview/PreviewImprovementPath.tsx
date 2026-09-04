"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  authorizeImprovementHypothesisTestingAction,
  authorizeImprovementMethodChangeAction,
  createImprovementHypothesisAction,
  linkPlanToImprovementHypothesisAction,
  setImprovementHypothesisVerdictAction,
} from "@/app/actions";
import { MAF_COMPONENT_LABELS } from "@/lib/maf-types";
import {
  IMPROVEMENT_HYPOTHESIS_STATUS_LABELS,
  type ImprovementEvidenceSummary,
  type ImprovementHypothesis,
} from "@/lib/improvement-hypothesis-types";
import { summarizeImprovementEvidence } from "@/lib/improvement-hypothesis-evidence-summary";
import type { InsightsCaseRow } from "@/lib/insights-case-spine-types";

export function PreviewImprovementPath({
  hypotheses,
  caseSpine,
  focusPlanId,
}: {
  hypotheses: ImprovementHypothesis[];
  caseSpine: InsightsCaseRow[];
  focusPlanId?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [linkPlanById, setLinkPlanById] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const summaries = useMemo(() => {
    const map = new Map<string, ImprovementEvidenceSummary>();
    for (const h of hypotheses) {
      map.set(
        h.id,
        summarizeImprovementEvidence({
          hypothesisId: h.id,
          originPlanId: h.originPlanId,
          evidencePlanIds: h.evidencePlanIds,
          caseSpine,
        })
      );
    }
    return map;
  }, [hypotheses, caseSpine]);

  function run(
    label: string,
    action: (fd: FormData) => Promise<{ ok: boolean; error?: string; hypothesisId?: string }>,
    fields: Record<string, string>
  ) {
    startTransition(async () => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(fields)) fd.set(k, v);
      const result = await action(fd);
      setMessage(
        result.ok
          ? `${label} OK${result.hypothesisId ? ` — ${result.hypothesisId}` : ""}`
          : `${label} failed: ${result.error ?? "unknown"}`
      );
    });
  }

  const focus = focusPlanId?.trim().toUpperCase() ?? "";

  return (
    <section
      className="rounded-2xl border border-zinc-800 bg-zinc-900/40"
      data-improvement-path
    >
      <div className="border-b border-zinc-800 px-3 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">
          Improvement Path
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Accepted MAF deficiency → Improvement Hypothesis → future evidence →
          human verdict → optional method-change authorization. Origin Case is
          never confirming evidence. Does not mutate Playbooks. Evidence
          &quot;review ready&quot; hint is provisional UI guidance only.
        </p>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="flex flex-wrap items-end gap-2">
          <button
            type="button"
            disabled={pending || !focus}
            onClick={() =>
              run("Create hypothesis", createImprovementHypothesisAction, {
                originPlanId: focus,
              })
            }
            className="inline-flex h-9 items-center rounded-xl border border-zinc-600 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100 disabled:opacity-40"
            data-testid="improvement-create-from-focus"
          >
            Create from focus plan
          </button>
          <span className="text-xs text-zinc-500">
            Focus: {focus || "(set Focus plan above)"}
          </span>
        </div>

        {message ? (
          <p
            className="text-xs text-zinc-300"
            data-testid="improvement-path-message"
          >
            {message}
          </p>
        ) : null}

        {hypotheses.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No Improvement Hypotheses yet. Accept a MAF deficiency (e.g.
            entry_quality → OLE), set Focus plan, then create.
          </p>
        ) : (
          <ul className="space-y-3">
            {hypotheses.map((h) => {
              const summary = summaries.get(h.id);
              return (
                <li
                  key={h.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
                  data-improvement-hypothesis={h.id}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">
                        {h.id} · {h.candidateLabel}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {IMPROVEMENT_HYPOTHESIS_STATUS_LABELS[h.status]} ·{" "}
                        {MAF_COMPONENT_LABELS[h.componentId] ?? h.componentId} ·{" "}
                        {h.ticker}
                      </p>
                    </div>
                    <Link
                      href={`/mxt/scout/case?plan=${encodeURIComponent(h.originPlanId)}`}
                      className="text-xs text-violet-400 hover:underline"
                    >
                      Origin {h.originPlanId}
                    </Link>
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">
                    Change: {h.changeUnderTest}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Apply when: {h.applicability}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    MAF {h.originMafExperimentId} · Evidence plans:{" "}
                    {h.evidencePlanIds.length
                      ? h.evidencePlanIds.join(", ")
                      : "(none yet)"}
                  </p>
                  {summary ? (
                    <p className="mt-1 text-xs text-amber-200/80">
                      Evidence: {summary.suggestionReason}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {h.status === "proposed" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(
                            "Authorize testing",
                            authorizeImprovementHypothesisTestingAction,
                            { hypothesisId: h.id }
                          )
                        }
                        className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200"
                      >
                        Authorize testing
                      </button>
                    ) : null}

                    {h.status === "testing" ||
                    h.status === "insufficient_evidence" ||
                    h.status === "supported" ||
                    h.status === "rejected" ? (
                      <>
                        <input
                          type="text"
                          placeholder="Future PLAN-…"
                          value={linkPlanById[h.id] ?? ""}
                          onChange={(e) =>
                            setLinkPlanById((prev) => ({
                              ...prev,
                              [h.id]: e.target.value,
                            }))
                          }
                          className="h-8 w-32 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200"
                        />
                        <button
                          type="button"
                          disabled={pending || !(linkPlanById[h.id] ?? "").trim()}
                          onClick={() =>
                            run(
                              "Link evidence plan",
                              linkPlanToImprovementHypothesisAction,
                              {
                                hypothesisId: h.id,
                                planId: (linkPlanById[h.id] ?? "").trim(),
                              }
                            )
                          }
                          className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200 disabled:opacity-40"
                        >
                          Link evidence
                        </button>
                        {(
                          [
                            "supported",
                            "rejected",
                            "insufficient_evidence",
                          ] as const
                        ).map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              run(
                                `Verdict ${status}`,
                                setImprovementHypothesisVerdictAction,
                                { hypothesisId: h.id, status }
                              )
                            }
                            className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200"
                          >
                            {IMPROVEMENT_HYPOTHESIS_STATUS_LABELS[status]}
                          </button>
                        ))}
                      </>
                    ) : null}

                    {h.status === "supported" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(
                            "Authorize method change",
                            authorizeImprovementMethodChangeAction,
                            { hypothesisId: h.id }
                          )
                        }
                        className="rounded-lg border border-amber-700/60 px-2.5 py-1 text-xs text-amber-200"
                      >
                        Authorize method change
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
