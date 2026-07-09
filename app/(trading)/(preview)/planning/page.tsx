import { PreviewPlanning } from "@/app/components/planning-preview/PreviewPlanning";
import { getPlans } from "@/lib/plans";
import { getPlaybooks } from "@/lib/playbooks";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const [plans, playbooks, params] = await Promise.all([
    getPlans(),
    getPlaybooks(),
    searchParams,
  ]);

  return (
    <PreviewPlanning
      plans={plans}
      playbooks={playbooks}
      focusPlanId={params.plan?.toUpperCase()}
    />
  );
}
