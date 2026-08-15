import { ScoutAllocationBoard } from "@/app/components/planning-preview/ScoutAllocationBoard";
import { ScoutAllocationProvider } from "@/app/components/planning-preview/ScoutAllocationProvider";
import { getCapitalAccountSnapshot } from "@/lib/capital-account";
import { getActiveCapitalConfiguration } from "@/lib/capital-configuration";
import { listCapitalReservations } from "@/lib/capital-reservation";
import { getPlans } from "@/lib/plans";
import { isWarReadyScoutPlan } from "@/lib/plan-helpers";
import { resolvePlannedRRFromPlan } from "@/lib/plan-risk";
import { getMonthlyRisk } from "@/lib/storage";
import type { CapitalAccountSnapshot } from "@/lib/capital-account";
import type { CapitalReservation } from "@/lib/capital-types";

async function settle<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

export default async function ScoutAllocationBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  const params = await searchParams;
  const [
    plans,
    monthly,
    reservationsResult,
    accountResult,
    configurationResult,
  ] = await Promise.all([
    getPlans(),
    getMonthlyRisk(),
    settle(listCapitalReservations()),
    settle(getCapitalAccountSnapshot()),
    settle(getActiveCapitalConfiguration()),
  ]);

  const reservations: CapitalReservation[] = reservationsResult ?? [];
  const capitalAccount: CapitalAccountSnapshot | null = accountResult;
  const capitalConfigurationPresent = Boolean(
    configurationResult && configurationResult.status === "active"
  );

  const activePlans = plans.filter(isWarReadyScoutPlan);

  const plannedRRByPlanId: Record<string, number | undefined> = {};
  for (const p of activePlans) {
    plannedRRByPlanId[p.id] = resolvePlannedRRFromPlan(p);
  }

  const initialSelectedPlanIds = (params.selected ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="h-full overflow-y-auto">
      <ScoutAllocationProvider
        plans={activePlans}
        reservations={reservations}
        capitalAccount={capitalAccount}
        authorizableLossRoom={monthly.monthlyLossRoom}
        capitalConfigurationPresent={capitalConfigurationPresent}
        plannedRRByPlanId={plannedRRByPlanId}
        initialSelectedPlanIds={initialSelectedPlanIds}
      >
        <ScoutAllocationBoard reservations={reservations} />
      </ScoutAllocationProvider>
    </div>
  );
}
