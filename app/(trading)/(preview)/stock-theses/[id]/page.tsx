import { PreviewStockThesis } from "@/app/components/stock-thesis-preview/PreviewStockThesis";
import {
  ensureProfileEvidenceSeeded,
  getActiveEvidenceForProfile,
} from "@/lib/market-evidence";
import { getMtaeTimeframeMaps } from "@/lib/mtae-store";
import { getPlans } from "@/lib/plans";
import { getPlaybooks } from "@/lib/playbooks";
import { stockProfileSnapshotItems } from "@/lib/snapshot-packages";
import { buildStockFileAnalyzePackage } from "@/lib/stock-file-analyze";
import { buildStockProfileSynthesis } from "@/lib/stock-profile-synthesis";
import { getStockThesisById } from "@/lib/stock-theses";
import { notFound } from "next/navigation";

export default async function StockThesisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [thesis, playbooks, plans, mtaePresets] = await Promise.all([
    getStockThesisById(id),
    getPlaybooks(),
    getPlans(),
    getMtaeTimeframeMaps(),
  ]);
  if (!thesis) notFound();

  await ensureProfileEvidenceSeeded(thesis.id);
  const activeEvidence = await getActiveEvidenceForProfile(thesis.id);
  const synthesis = buildStockProfileSynthesis(thesis, activeEvidence);
  const activePlans = plans.filter(
    (p) =>
      p.stockThesisId === thesis.id &&
      (p.status === "watching" || p.status === "ready")
  );
  const snapshotItems = stockProfileSnapshotItems({
    thesis,
    playbooks,
    plans,
    activeEvidence,
  });
  const analyzePackage = buildStockFileAnalyzePackage({
    thesis,
    playbooks,
    plans,
    activeEvidence,
    mtaePresets,
  });

  return (
    <PreviewStockThesis
      thesis={thesis}
      playbooks={playbooks}
      activeEvidence={activeEvidence}
      synthesis={synthesis}
      activePlans={activePlans}
      snapshotItems={snapshotItems}
      analyzePackage={analyzePackage}
    />
  );
}
