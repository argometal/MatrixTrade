import { PreviewJournal } from "@/app/components/journal-preview/PreviewJournal";
import { getPlaybooks } from "@/lib/playbooks";
import { getTrades } from "@/lib/storage";

export default async function JournalPage() {
  const [trades, playbooks] = await Promise.all([getTrades(), getPlaybooks()]);

  const closed = trades
    .filter((t) => t.status === "closed")
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));

  return <PreviewJournal closed={closed} playbooks={playbooks} />;
}
