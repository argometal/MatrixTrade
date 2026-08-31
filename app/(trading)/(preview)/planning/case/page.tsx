import { CaseReviewClient } from "@/app/components/case-review/CaseReviewClient";
import { buildCase } from "@/lib/thesis-case";
import { loadMarketRealityForCase } from "@/lib/market-reality";
import { mxtPath } from "@/lib/mxt-paths";
import Link from "next/link";

export default async function PlanningCasePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planId } = await searchParams;
  const id = planId?.trim();

  if (!id) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-400">
        <p>Select a plan to open Case review.</p>
        <p className="mt-2 text-xs text-zinc-600">
          Use{" "}
          <code className="text-zinc-500">/mxt/planning/case?plan=PLAN-…</code>
        </p>
        <Link
          href={mxtPath("/planning")}
          className="mt-4 inline-block text-zinc-300 hover:underline"
        >
          ← Scout
        </Link>
      </div>
    );
  }

  const thesisCase = await buildCase(id);
  if (!thesisCase) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-400">
        <p>Plan not found: {id}</p>
        <Link
          href={mxtPath("/planning")}
          className="mt-4 inline-block text-zinc-300 hover:underline"
        >
          ← Scout
        </Link>
      </div>
    );
  }

  const marketReality = await loadMarketRealityForCase(id);

  return (
    <CaseReviewClient thesisCase={thesisCase} marketReality={marketReality} />
  );
}
