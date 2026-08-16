import { Suspense } from "react";
import { PreviewPlanning } from "@/app/components/planning-preview/PreviewPlanning";
import { PageHelpPanel } from "@/app/components/preview/PageHelpPanel";
import { getCapitalAccountSnapshot } from "@/lib/capital-account";
import { getActiveCapitalConfiguration } from "@/lib/capital-configuration";
import { listCapitalReservations } from "@/lib/capital-reservation";
import { getPlans } from "@/lib/plans";
import { getPlaybooks } from "@/lib/playbooks";
import { getStockTheses } from "@/lib/stock-theses";
import { getMonthlyRisk, getTrades } from "@/lib/storage";
import { suggestNextTradeId } from "@/lib/trades-workspace";
import type { CapitalAccountSnapshot } from "@/lib/capital-account";
import type { CapitalReservation } from "@/lib/capital-types";

async function settle<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; thesis?: string }>;
}) {
  const [
    plans,
    playbooks,
    stockTheses,
    monthly,
    trades,
    params,
    reservationsResult,
    accountResult,
    configurationResult,
  ] = await Promise.all([
    getPlans(),
    getPlaybooks(),
    getStockTheses(),
    getMonthlyRisk(),
    getTrades(),
    searchParams,
    settle(listCapitalReservations()),
    settle(getCapitalAccountSnapshot()),
    settle(getActiveCapitalConfiguration()),
  ]);

  const focusPlanId = params.plan?.trim() || undefined;
  const focusThesisId = params.thesis?.trim() || undefined;
  const suggestedTradeId = suggestNextTradeId(trades);

  const reservations: CapitalReservation[] = reservationsResult ?? [];
  const capitalAccount: CapitalAccountSnapshot | null = accountResult;
  const capitalConfigurationPresent = Boolean(
    configurationResult && configurationResult.status === "active"
  );

  return (
    <Suspense fallback={null}>
      <PageHelpPanel pageId="planning" trigger="icon">
        <PreviewPlanning
          plans={plans}
          playbooks={playbooks}
          stockTheses={stockTheses}
          monthly={monthly}
          trades={trades}
          suggestedTradeId={suggestedTradeId}
          focusPlanId={focusPlanId}
          focusThesisId={focusThesisId}
          reservations={reservations}
          capitalAccount={capitalAccount}
          capitalConfigurationPresent={capitalConfigurationPresent}
        />
      </PageHelpPanel>
    </Suspense>
  );
}
