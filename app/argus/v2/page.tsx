import { Suspense } from "react";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";
import {
  buildV2FollowUps,
  buildV2HomeTimeline,
  buildV2NavCounts,
  buildV2TagCloud,
} from "@/lib/argus/v2/loaders";
import { buildV2KnowledgeNodes } from "@/lib/argus/v2/intelligence-viz";
import { V2HomeClient } from "./components/V2HomeClient";

export default async function V2HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; view?: string }>;
}) {
  const { view: viewParam } = await searchParams;

  const includePrivate = await hasArgusPrivateUnlock();
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const entities = data.entities.filter((e) => !e.deletedAt);

  const navSignals = buildV2NavCounts(data, inboxItems, includePrivate);
  const followUps = buildV2FollowUps(data, entities, includePrivate, today);
  const homeTimeline = buildV2HomeTimeline(data, inboxItems, includePrivate);
  const tags = buildV2TagCloud(data, inboxItems, includePrivate);
  const knowledgeNodes = buildV2KnowledgeNodes(data, inboxItems, includePrivate, today);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="argus-v2-scroll flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 lg:px-8">
        <div className="mb-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Home</h1>
          <p className="mt-1 text-sm text-zinc-500">Activity, intelligence, and what needs attention</p>
        </div>

        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <V2HomeClient
            nodes={knowledgeNodes}
            tags={tags}
            signals={navSignals}
            initialView={viewParam}
            followUps={followUps}
            homeTimeline={homeTimeline}
          />
        </Suspense>
      </div>
    </div>
  );
}
