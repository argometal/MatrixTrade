import { Suspense } from "react";
import { hasArgusDeleteAuthUnlock, hasArgusDeleteUnlock, hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusDeleteCodeConfigured, argusPrivateConfigured } from "@/lib/auth/passwords";
import { argusTotpConfigured } from "@/lib/auth/totp";
import { deleteAuthConfigured } from "@/lib/argus/delete-link-check";
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
  searchParams: Promise<{
    selected?: string;
    tab?: string;
    q?: string;
    tag?: string;
    org?: string;
    project?: string;
    entity?: string;
    kind?: string;
    page?: string;
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
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const rows = buildV2TopicRows(data, inboxItems, includePrivate, today);
  const details = buildV2TopicDetails(data, inboxItems, includePrivate, today);
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
