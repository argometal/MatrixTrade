import { PreviewPlanning } from "@/app/components/planning-preview/PreviewPlanning";
import { getPlans } from "@/lib/plans";
import { getPlaybooks } from "@/lib/playbooks";
import { getStockTheses } from "@/lib/stock-theses";
import { getExperiment, getMonthlyRisk } from "@/lib/storage";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; thesis?: string }>;
}) {
  const [plans, playbooks, stockTheses, monthly, experiment, params] = await Promise.all([
    getPlans(),
    getPlaybooks(),
    getStockTheses(),
    getMonthlyRisk(),
    getExperiment(),
    searchParams,
  ]);

  return (
    <PreviewPlanning
      plans={plans}
      playbooks={playbooks}
      stockTheses={stockTheses}
      monthly={monthly}
      experiment={experiment}
      focusPlanId={params.plan?.toUpperCase()}
      focusThesisId={params.thesis?.toUpperCase()}
    />
  );
}
