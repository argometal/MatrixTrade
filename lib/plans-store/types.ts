import type { TradePlan } from "../plan-types";

export interface PlansStore {
  readAll(): Promise<TradePlan[]>;
  upsert(plan: TradePlan): Promise<void>;
  upsertMany(plans: TradePlan[]): Promise<void>;
}
