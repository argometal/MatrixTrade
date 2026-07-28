import { Suspense } from "react";
import { PreviewPlanning } from "@/app/components/planning-preview/PreviewPlanning";
import { PageHelpPanel } from "@/app/components/preview/PageHelpPanel";
import { getCapitalAccountSnapshot } from "@/lib/capital-account";
import { getActiveCapitalConfiguration } from "@/lib/capital-configuration";
import { listCapitalReservations } from "@/lib/capital-reservation";
import { getMarketEvidence } from "@/lib/market-evidence";
import { getPlans } from "@/lib/plans";
import { getPlaybooks } from "@/lib/playbooks";
import { scoutDeskSnapshotItems } from "@/lib/snapshot-packages";
import { getStockTheses } from "@/lib/stock-theses";
import { isActiveStockThesisStatus } from "@/lib/stock-thesis-types";
import { getExperiment, getMonthlyRisk, getTrades } from "@/lib/storage";
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
    experiment,
    marketEvidence,
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
    getExperiment(),
    getMarketEvidence(),
    getTrades(),
    searchParams,
    settle(listCapitalReservations()),
    settle(getCapitalAccountSnapshot()),
    settle(getActiveCapitalConfiguration()),
  ]);

  const focusPlanId = params.plan?.toUpperCase();
  const focusThesisId = params.thesis?.toUpperCase();
  const activeTheses = stockTheses.filter((t) => isActiveStockThesisStatus(t.status));
  const focusPlan = focusPlanId ? plans.find((p) => p.id === focusPlanId) : undefined;
  const focusThesis =
    (focusThesisId ? stockTheses.find((t) => t.id === focusThesisId) : undefined) ??
    activeTheses[0];
  const suggestedTradeId = suggestNextTradeId(trades);

  const reservations: CapitalReservation[] = reservationsResult ?? [];
  const capitalAccount: CapitalAccountSnapshot | null = accountResult;
  const capitalConfigurationPresent = Boolean(
    configurationResult && configurationResult.status === "active"
  );

  const snapshotItems = scoutDeskSnapshotItems({
    playbooks,
    stockTheses: activeTheses,
    plans,
    monthly,
    experiment,
    marketEvidence,
    focusThesis,
    focusPlan,
  });

  return (
    <Suspense fallback={null}>
      <PageHelpPanel pageId="planning" trigger="icon">
        <PreviewPlanning
          plans={plans}
          playbooks={playbooks}
          stockTheses={stockTheses}
          marketEvidence={marketEvidence}
          monthly={monthly}
          experiment={experiment}
          trades={trades}
          suggestedTradeId={suggestedTradeId}
          focusPlanId={focusPlanId}
          focusThesisId={focusThesisId}
          snapshotItems={snapshotItems}
          reservations={reservations}
          capitalAccount={capitalAccount}
          capitalConfigurationPresent={capitalConfigurationPresent}
        />
      </PageHelpPanel>
    </Suspense>
  );
}
