import { Suspense } from "react";
import { PreviewPlanning } from "@/app/components/planning-preview/PreviewPlanning";
import { PageHelpPanel } from "@/app/components/preview/PageHelpPanel";
import { getMarketEvidence } from "@/lib/market-evidence";
import { getPlans } from "@/lib/plans";
import { getPlaybooks } from "@/lib/playbooks";
import { scoutDeskSnapshotItems } from "@/lib/snapshot-packages";
import { getStockTheses } from "@/lib/stock-theses";
import { isActiveStockThesisStatus } from "@/lib/stock-thesis-types";
import { getExperiment, getMonthlyRisk } from "@/lib/storage";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; thesis?: string }>;
}) {
  const [plans, playbooks, stockTheses, monthly, experiment, marketEvidence, params] =
    await Promise.all([
      getPlans(),
      getPlaybooks(),
      getStockTheses(),
      getMonthlyRisk(),
      getExperiment(),
      getMarketEvidence(),
      searchParams,
    ]);

  const focusPlanId = params.plan?.toUpperCase();
  const focusThesisId = params.thesis?.toUpperCase();
  const activeTheses = stockTheses.filter((t) => isActiveStockThesisStatus(t.status));
  const focusPlan = focusPlanId ? plans.find((p) => p.id === focusPlanId) : undefined;
  const focusThesis =
    (focusThesisId ? stockTheses.find((t) => t.id === focusThesisId) : undefined) ??
    activeTheses[0];

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
      <PageHelpPanel pageId="planning">
        <PreviewPlanning
          plans={plans}
          playbooks={playbooks}
          stockTheses={stockTheses}
          marketEvidence={marketEvidence}
          monthly={monthly}
          experiment={experiment}
          focusPlanId={focusPlanId}
          focusThesisId={focusThesisId}
          snapshotItems={snapshotItems}
        />
      </PageHelpPanel>
    </Suspense>
  );
}
