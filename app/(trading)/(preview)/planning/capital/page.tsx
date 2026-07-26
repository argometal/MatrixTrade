import { CapitalPlannerPanel } from "@/app/components/planning-preview/CapitalPlannerPanel";
import { getCapitalAccountSnapshot } from "@/lib/capital-account";
import { getExternalPositions } from "@/lib/external-position-store";
import type { CapitalAccountSnapshot } from "@/lib/capital-account";
import type { ExternalPosition } from "@/lib/external-position-types";

export default async function CapitalPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ position?: string }>;
}) {
  const params = await searchParams;

  const [positionsResult, accountResult] = await Promise.allSettled([
    getExternalPositions(),
    getCapitalAccountSnapshot(),
  ]);

  const positions: ExternalPosition[] =
    positionsResult.status === "fulfilled" ? positionsResult.value : [];
  const positionsError =
    positionsResult.status === "rejected"
      ? positionsResult.reason instanceof Error
        ? positionsResult.reason.message
        : "External Positions failed to load"
      : undefined;

  const account: CapitalAccountSnapshot | null =
    accountResult.status === "fulfilled" ? accountResult.value : null;
  const capitalError =
    accountResult.status === "rejected"
      ? accountResult.reason instanceof Error
        ? accountResult.reason.message
        : "Capital Account failed to load"
      : undefined;

  return (
    <div className="h-full overflow-y-auto">
      <CapitalPlannerPanel
        account={account}
        positions={positions}
        focusId={params.position}
        capitalError={capitalError}
        positionsError={positionsError}
      />
    </div>
  );
}
