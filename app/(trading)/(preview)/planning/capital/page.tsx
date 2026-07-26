import { CapitalPlannerPanel } from "@/app/components/planning-preview/CapitalPlannerPanel";
import { buildCapitalAccountSnapshot } from "@/lib/capital-account";
import { getExternalPositions } from "@/lib/external-position-store";
import { getMonthlyRisk } from "@/lib/storage";

export default async function CapitalPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ position?: string }>;
}) {
  const [positions, monthlyRisk, params] = await Promise.all([
    getExternalPositions(),
    getMonthlyRisk(),
    searchParams,
  ]);
  const account = buildCapitalAccountSnapshot({
    externalPositions: positions,
    monthlyRisk,
  });

  return (
    <div className="h-full overflow-y-auto">
      <CapitalPlannerPanel
        account={account}
        positions={positions}
        focusId={params.position}
      />
    </div>
  );
}
