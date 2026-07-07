import { Suspense } from "react";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";
import {
  buildV2ProjectBrowseCards,
  buildV2ProjectBrowseSummary,
} from "@/lib/argus/v2/project-browse-utils";
import { V2ProjectsBrowserShell } from "./components/V2ProjectsBrowserShell";

export default async function V2BrowseProjectsPage() {
  const includePrivate = await hasArgusPrivateUnlock();
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const cards = buildV2ProjectBrowseCards(data, inboxItems, includePrivate, today);
  const summary = buildV2ProjectBrowseSummary(cards);

  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-zinc-500">Loading projects…</div>}>
      <V2ProjectsBrowserShell
        cards={cards}
        summary={summary}
        privateConfigured={argusPrivateConfigured()}
        privateUnlocked={includePrivate}
      />
    </Suspense>
  );
}
