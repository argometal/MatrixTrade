import type { TradePlan } from "../plan-types";

export interface PlansStore {
  readAll(): Promise<TradePlan[]>;
  /** Update-or-insert. Prefer {@link insert} for new plan creation. */
  upsert(plan: TradePlan): Promise<void>;
  upsertMany(plans: TradePlan[]): Promise<void>;
  /**
   * Allocate the next global PLAN-<n> id.
   * Supabase: DB sequence. JSON/memory: high-water + max of rows, under lock.
   */
  allocateNextPlanId(): Promise<string>;
  /**
   * Insert-only. Must fail with PlanIdCollisionError (or equivalent) if id exists.
   * Never overwrites another plan.
   */
  insert(plan: TradePlan): Promise<void>;
}
