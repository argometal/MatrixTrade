import { Suspense } from "react";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";
import {
  buildV2EntityRows,
  buildV2FollowUps,
  buildV2HomeTimeline,
  buildV2NavCounts,
  buildV2FocusTagPortfolio,
  buildV2TagCloud,
  buildV2TagEvidenceMap,
  buildV2TagRoleBucketSummary,
  parseV2EntityTab,
  V2_ENTITY_TABS,
  type V2EntityRow,
  type V2EntityTab,
} from "@/lib/argus/v2/loaders";
import { buildV2KnowledgeNodes } from "@/lib/argus/v2/intelligence-viz";
import { V2HomeClient } from "./components/V2HomeClient";

export default async function V2HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; view?: string; layout?: string }>;
}) {
  const sp = await searchParams;
  const viewParam = sp.view;
  const entityTab = parseV2EntityTab(sp.tab);

  const includePrivate = await hasArgusPrivateUnlock();
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const entities = data.entities.filter((e) => !e.deletedAt);

  const navSignals = buildV2NavCounts(data, inboxItems, includePrivate);
  const followUps = buildV2FollowUps(data, entities, includePrivate, today);
  const homeTimeline = buildV2HomeTimeline(data, inboxItems, includePrivate);
  const tags = buildV2TagCloud(data, inboxItems, includePrivate);
  const focusTagPortfolio = buildV2FocusTagPortfolio(data, inboxItems, includePrivate, today);
  const tagRoleBuckets = buildV2TagRoleBucketSummary(data);
  const tagEvidenceByTag = buildV2TagEvidenceMap(data, inboxItems, includePrivate);
  const knowledgeNodes = buildV2KnowledgeNodes(data, inboxItems, includePrivate, today);
  const entityRowsByTab = Object.fromEntries(
    V2_ENTITY_TABS.map((tab) => [
      tab,
      buildV2EntityRows(data, inboxItems, includePrivate, today, tab, 200),
    ])
  ) as Record<V2EntityTab, V2EntityRow[]>;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="argus-v2-scroll flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 lg:px-8">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <V2HomeClient
            nodes={knowledgeNodes}
            tags={tags}
            focusTagPortfolio={focusTagPortfolio}
            signalTags={data.signalTags ?? []}
            tagEvidenceByTag={tagEvidenceByTag}
            tagRoleBuckets={tagRoleBuckets}
            signals={navSignals}
            initialView={viewParam}
            followUps={followUps}
            homeTimeline={homeTimeline}
            entityTab={entityTab}
            entityRowsByTab={entityRowsByTab}
          />
        </Suspense>
      </div>
    </div>
  );
}
