import { Suspense } from "react";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";
import {
  buildV2OrganizationBrowseCards,
  buildV2OrganizationBrowseSummary,
} from "@/lib/argus/v2/organization-browse-utils";
import { V2OrganizationsBrowserShell } from "./components/V2OrganizationsBrowserShell";

export default async function V2BrowseOrganizationsPage() {
  const includePrivate = await hasArgusPrivateUnlock();
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const cards = buildV2OrganizationBrowseCards(data, inboxItems, includePrivate, today);
  const summary = buildV2OrganizationBrowseSummary(cards, data);

  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-zinc-500">Loading organizations…</div>}>
      <V2OrganizationsBrowserShell cards={cards} summary={summary} />
    </Suspense>
  );
}
