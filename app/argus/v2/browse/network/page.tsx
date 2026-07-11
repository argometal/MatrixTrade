import { Suspense } from "react";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";
import {
  buildV2NetworkBrowseCards,
  buildV2NetworkBrowseInsights,
  buildV2NetworkBrowseSummary,
} from "@/lib/argus/v2/network-browse-utils";
import { networkBrowseSnapshotItems } from "@/lib/argus/v2/network-snapshot-packages";
import { V2NetworkBrowserShell } from "./components/V2NetworkBrowserShell";

export default async function V2BrowseNetworkPage() {
  const includePrivate = await hasArgusPrivateUnlock();
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const cards = buildV2NetworkBrowseCards(data, inboxItems, includePrivate, today);
  const summary = buildV2NetworkBrowseSummary(cards);
  const insights = buildV2NetworkBrowseInsights(cards);
  const snapshotItems = networkBrowseSnapshotItems({ cards, summary, insights });

  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-zinc-500">Loading network…</div>}>
      <V2NetworkBrowserShell
        cards={cards}
        summary={summary}
        insights={insights}
        snapshotItems={snapshotItems}
      />
    </Suspense>
  );
}
