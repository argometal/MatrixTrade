import { Suspense } from "react";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";
import {
  buildV2EventDetails,
  buildV2EventInboxOptions,
  buildV2EventRows,
  parseV2EventTab,
} from "@/lib/argus/v2/event-loaders";
import { V2EventsShell } from "./components/V2EventsShell";

export default async function V2BrowseEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string; tab?: string }>;
}) {
  const { selected, tab: tabParam } = await searchParams;
  const includePrivate = await hasArgusPrivateUnlock();
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, includePrivate)]);
  const today = new Date().toISOString().slice(0, 10);
  const rows = buildV2EventRows(data, includePrivate, today);
  const details = buildV2EventDetails(data, inboxItems, includePrivate, today);
  const inboxOptionsByEvent = Object.fromEntries(
    details.map((d) => [d.id, buildV2EventInboxOptions(inboxItems, d.id, includePrivate, today)])
  );
  const tab = parseV2EventTab(tabParam);

  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-zinc-500">Loading events…</div>}>
      <V2EventsShell
        rows={rows}
        details={details}
        inboxOptionsByEvent={inboxOptionsByEvent}
        initialSelectedId={selected}
        initialTab={tab}
      />
    </Suspense>
  );
}
