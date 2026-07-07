import { Suspense } from "react";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { readArgus } from "@/lib/argus/server-storage";
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
  const data = await readArgus();
  const today = new Date().toISOString().slice(0, 10);
  const rows = buildV2TopicRows(data, includePrivate, today);
  const details = buildV2TopicDetails(data, includePrivate, today);
  const tagChips = buildV2GlobalTopicChips(data, includePrivate);
  const tab = parseV2TopicTab(tabParam);
  const selectedId = selected ?? rows[0]?.id;

  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-zinc-400">Loading topics…</div>}>
      <V2TopicsShell
        rows={rows}
        details={details}
        tagChips={tagChips}
        initialSelectedId={selectedId}
        initialTab={tab}
      />
    </Suspense>
  );
}
