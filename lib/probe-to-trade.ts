import { getPlansStore } from "./plans-store";
import type { TradePlan } from "./plan-types";
import { deriveLifecycleFromPlan } from "./scout-decision";
import { convertProbe } from "./scout-probe";
import { createTrade, getTrades } from "./storage";
import { suggestNextTradeId } from "./trades-workspace";

export async function createTradeFromProbePlan(plan: TradePlan): Promise<{
  trade?: Awaited<ReturnType<typeof createTrade>>["trade"];
  plan?: TradePlan;
  errors?: string[];
}> {
  if (!plan.probe?.enabled) {
    return { errors: ["No probe on this scout."] };
  }
  if (plan.probe.status !== "active") {
    return { errors: ["Probe must be active before convert."] };
  }
  if (plan.linkedTradeId) {
    return { errors: [`Scout already linked to trade ${plan.linkedTradeId}.`] };
  }

  const entry = plan.plannedEntry;
  const stop = plan.stopPrice ?? plan.probe.stop;
  const shares = plan.probe.shares;

  if (entry === undefined || !Number.isFinite(entry)) {
    return { errors: ["plannedEntry required on scout to create trade from probe."] };
  }
  if (stop === undefined || !Number.isFinite(stop)) {
    return { errors: ["stopPrice (or probe.stop) required to create trade from probe."] };
  }
  if (!shares || shares <= 0) {
    return { errors: ["probe.shares required to create trade from probe."] };
  }

  const trades = await getTrades();
  const tradeId = suggestNextTradeId(trades);

  const created = await createTrade({
    id: tradeId,
    ticker: plan.ticker,
    entry,
    stop,
    shares,
    target: plan.targetPrice,
    playbookId: plan.playbookId,
    thesis: plan.thesis,
    status: "open",
    setup: `Probe convert · ${plan.id}`,
    planId: plan.id,
  });

  if (created.errors?.length) return { errors: created.errors };
  const trade = created.trade!;

  const converted = convertProbe(plan);
  if (converted.errors?.length) return { errors: converted.errors };

  const now = new Date().toISOString();
  const updatedPlan: TradePlan = {
    ...converted.plan!,
    status: "entered",
    linkedTradeId: trade.id,
    scoutLifecycle: deriveLifecycleFromPlan({
      ...converted.plan!,
      status: "entered",
      linkedTradeId: trade.id,
    }),
    updatedAt: now,
  };

  await getPlansStore().upsert(updatedPlan);
  return { trade, plan: updatedPlan };
}
