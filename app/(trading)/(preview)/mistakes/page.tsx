import { PreviewMistakes } from "@/app/components/mistakes-preview/PreviewMistakes";
import { computeMistakeStats } from "@/lib/review";
import { getTrades } from "@/lib/storage";

export default async function MistakesPage() {
  const trades = await getTrades();
  const stats = computeMistakeStats(trades);

  return <PreviewMistakes stats={stats} trades={trades} />;
}
