import { PreviewStockThesis } from "@/app/components/stock-thesis-preview/PreviewStockThesis";
import { getPlaybooks } from "@/lib/playbooks";
import { getStockThesisById } from "@/lib/stock-theses";
import { notFound } from "next/navigation";

export default async function StockThesisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [thesis, playbooks] = await Promise.all([getStockThesisById(id), getPlaybooks()]);
  if (!thesis) notFound();

  return <PreviewStockThesis thesis={thesis} playbooks={playbooks} />;
}
