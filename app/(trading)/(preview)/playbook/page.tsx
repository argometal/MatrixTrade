import { PreviewPlaybook } from "@/app/components/playbook-preview/PreviewPlaybook";
import { computeAllPlaybookStats } from "@/lib/analytics";
import { getPlaybooks } from "@/lib/playbooks";
import { getTrades } from "@/lib/storage";

export default async function PlaybookPage() {
  const [playbooks, trades] = await Promise.all([getPlaybooks(), getTrades()]);
  const stats = computeAllPlaybookStats(playbooks, trades);

  return <PreviewPlaybook stats={stats} />;
}
