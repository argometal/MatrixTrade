import { PreviewStockThesis } from "@/app/components/stock-thesis-preview/PreviewStockThesis";
import {
  ensureProfileEvidenceSeeded,
  getActiveEvidenceForProfile,
} from "@/lib/market-evidence";
import { getPlans } from "@/lib/plans";
import { getPlaybooks } from "@/lib/playbooks";
import { buildStockProfileSynthesis } from "@/lib/stock-profile-synthesis";
import { getStockThesisById } from "@/lib/stock-theses";
import { notFound } from "next/navigation";

export default async function StockThesisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [thesis, playbooks, plans] = await Promise.all([
    getStockThesisById(id),
    getPlaybooks(),
    getPlans(),
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

  return (
    <PreviewStockThesis
      thesis={thesis}
      playbooks={playbooks}
      activeEvidence={activeEvidence}
      synthesis={synthesis}
      activePlans={activePlans}
    />
  );
}
