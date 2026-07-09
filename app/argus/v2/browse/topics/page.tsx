import { Suspense } from "react";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { buildV2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import {
  buildV2GlobalTopicChips,
  buildV2TopicDetails,
  buildV2TopicRows,
  parseV2TopicTab,
} from "@/lib/argus/v2/topic-loaders";
import { V2TopicsShell } from "./components/V2TopicsShell";

export default async function V2BrowseTopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string; tab?: string }>;
}) {
  const { selected, tab: tabParam } = await searchParams;
  const includePrivate = await hasArgusPrivateUnlock();
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const rows = buildV2TopicRows(data, includePrivate, today);
  const details = buildV2TopicDetails(data, includePrivate, today);
  const tagChips = buildV2GlobalTopicChips(data, includePrivate);
  const tab = parseV2TopicTab(tabParam);
  const neighborhood = selected
    ? buildV2EntityNeighborhoodGraph(data, inboxItems, selected, includePrivate, today)
    : null;

  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-zinc-500">Loading topics…</div>}>
      <V2TopicsShell
        rows={rows}
        details={details}
        tagChips={tagChips}
        initialSelectedId={selected}
        initialTab={tab}
        neighborhood={neighborhood}
      />
    </Suspense>
  );
}
