import { Suspense } from "react";
import { hasArgusDeleteAuthUnlock, hasArgusDeleteUnlock, hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusDeleteCodeConfigured, argusPrivateConfigured } from "@/lib/auth/passwords";
import { argusTotpConfigured } from "@/lib/auth/totp";
import { deleteAuthConfigured } from "@/lib/argus/delete-link-check";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { migrateLegacyEventRecordIfNeeded } from "@/app/argus/actions";
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
  searchParams: Promise<{
    selected?: string;
    tab?: string;
    delete_error?: string;
    delete_auth_error?: string;
    totp_required?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;
  const { selected, tab: tabParam } = sp;
  const [includePrivate, deleteUnlocked, deleteAuthUnlocked] = await Promise.all([
    hasArgusPrivateUnlock(),
    hasArgusDeleteUnlock(),
    hasArgusDeleteAuthUnlock(),
  ]);
  if (selected) {
    await migrateLegacyEventRecordIfNeeded(selected);
  }
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
        privateConfigured={argusPrivateConfigured()}
        privateUnlocked={includePrivate}
        deleteUnlocked={deleteUnlocked}
        deleteAuthUnlocked={deleteAuthUnlocked}
        deleteCodeConfigured={argusDeleteCodeConfigured()}
        totpConfigured={argusTotpConfigured()}
        deleteAuthConfigured={deleteAuthConfigured()}
        deleteError={sp.delete_error === "1" || sp.error === "pin"}
        deleteAuthError={sp.delete_auth_error === "1"}
        totpRequired={sp.totp_required === "1"}
      />
    </Suspense>
  );
}
