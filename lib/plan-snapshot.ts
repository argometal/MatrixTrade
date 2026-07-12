import type { TradePlan } from "./plan-types";
import { resolvePlannedRRFromPlan } from "./plan-risk";
import { formatDecisionSection } from "./scout-decision";
import { formatLayeredEntrySection } from "./layered-entry-types";
import { formatProbeSection } from "./scout-probe";

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

  const lines = ["=== TRADE PLANS (AI) ===", "rr_rule:planned_rr = (target-entry)/(entry-strategy_stop) — never structural invalidation"];

  if (active.length === 0) {
    lines.push("active_plans:0");
  } else {
    lines.push(`active_plans:${active.length}`);
    for (const plan of active) {
      const rr = resolvePlannedRRFromPlan(plan);
      lines.push(
        [
          `- id:${plan.id}`,
          `ticker:${plan.ticker}`,
          `status:${plan.status}`,
          `playbook:${plan.playbookId ?? "none"}`,
          `stock_thesis:${plan.stockThesisId ?? "none"}`,
          `analysis_tf:${plan.analysisTimeframes.join(",")}`,
          `entry_tf:${plan.entryTimeframe}`,
          `entry:${plan.plannedEntry ?? "na"}`,
          `support:${plan.supportLevel ?? "na"}`,
          `strategy_stop:${plan.stopPrice ?? "na"}`,
          `target:${plan.targetPrice ?? "na"}`,
          `planned_rr:${rr !== undefined ? rr.toFixed(2) : "na"}`,
          `valid_until:${plan.validUntil ?? "na"}`,
        ].join(" ")
      );
      if (plan.thesis) lines.push(`  thesis:${plan.thesis.replace(/\s+/g, " ").slice(0, 200)}`);
      if (plan.decision) {
        lines.push(
          `  decision:${plan.decision.verdict} confidence:${plan.decision.decisionConfidence} lifecycle:${plan.scoutLifecycle ?? "open"}`
        );
      }
      if (plan.probe?.enabled) {
        lines.push(`  probe:${plan.probe.status} risk:${plan.probe.riskPercent ?? 0.1}R`);
      }
      if (plan.layeredEntry) {
        lines.push(
          `  layered_entry:${plan.layeredEntry.status} method:${plan.layeredEntry.executionMethod} limits:${plan.layeredEntry.limits.length}`
        );
      }
      const decisionBlock = formatDecisionSection(plan);
      if (decisionBlock) {
        lines.push(decisionBlock.split("\n").map((l) => `  ${l}`).join("\n"));
      }
      const probeBlock = formatProbeSection(plan);
      if (probeBlock) {
        lines.push(probeBlock.split("\n").map((l) => `  ${l}`).join("\n"));
      }
      const layeredBlock = formatLayeredEntrySection(plan);
      if (layeredBlock) {
        lines.push(layeredBlock.split("\n").map((l) => `  ${l}`).join("\n"));
      }
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
