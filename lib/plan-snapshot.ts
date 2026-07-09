import type { TradePlan } from "./plan-types";

export function formatPlansSnapshotSection(plans: TradePlan[]): string {
  const active = plans.filter((p) => p.status === "watching" || p.status === "ready");
  const evaluate = plans.filter(
    (p) =>
      (p.status === "failed" || p.status === "expired") &&
      p.outcome?.recordedAt
  );
  const needsReview = plans.filter(
    (p) => (p.status === "failed" || p.status === "expired") && !p.outcome?.recordedAt
  );

  const lines = ["=== TRADE PLANS (AI) ==="];

  if (active.length === 0) {
    lines.push("active_plans:0");
  } else {
    lines.push(`active_plans:${active.length}`);
    for (const plan of active) {
      lines.push(
        [
          `- id:${plan.id}`,
          `ticker:${plan.ticker}`,
          `status:${plan.status}`,
          `playbook:${plan.playbookId ?? "none"}`,
          `analysis_tf:${plan.analysisTimeframes.join(",")}`,
          `entry_tf:${plan.entryTimeframe}`,
          `entry:${plan.plannedEntry ?? "na"}`,
          `support:${plan.supportLevel ?? "na"}`,
          `stop:${plan.stopPrice ?? "na"}`,
          `target:${plan.targetPrice ?? "na"}`,
          `rr:${plan.plannedRR ?? "na"}`,
          `valid_until:${plan.validUntil ?? "na"}`,
        ].join(" ")
      );
      if (plan.thesis) lines.push(`  thesis:${plan.thesis.replace(/\s+/g, " ").slice(0, 200)}`);
    }
  }

  if (needsReview.length > 0) {
    lines.push(`plans_needing_review:${needsReview.length}`);
    for (const plan of needsReview) {
      lines.push(`- ${plan.id} ${plan.ticker} status:${plan.status}`);
    }
  }

  if (evaluate.length > 0) {
    lines.push(`plans_with_outcomes:${evaluate.length}`);
    for (const plan of evaluate.slice(0, 10)) {
      const o = plan.outcome!;
      lines.push(
        `- ${plan.id} ${plan.ticker} strategy_valid:${o.strategyStillValid ? "yes" : "no"} reason:${o.reason ?? "na"} lesson:${(o.lesson ?? "").slice(0, 120)}`
      );
    }
  }

  return lines.join("\n");
}
