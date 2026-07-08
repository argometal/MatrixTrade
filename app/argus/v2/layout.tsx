import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { requireArgusSession } from "@/lib/auth/require-session";
import { ArgusAddProvider } from "@/app/argus/components/ArgusAddProvider";
import { buildEntityPickerBuckets, buildTagBuckets } from "@/lib/argus/journal-helpers";
import { buildJournalLinkRows } from "@/lib/argus/create-flow-helpers";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { buildV2NavCounts } from "@/lib/argus/v2/loaders";
import { V2MobileNav, V2Sidebar } from "./components/V2Sidebar";
import { V2TopBar } from "./components/V2TopBar";

export default async function V2Layout({ children }: { children: React.ReactNode }) {
  await requireArgusSession();
  const includePrivate = await hasArgusPrivateUnlock();
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const navCounts = buildV2NavCounts(data, inboxItems, includePrivate);
  const buckets = buildEntityPickerBuckets(data, includePrivate);
  const tagBuckets = buildTagBuckets(data, includePrivate);
  const journalRows = buildJournalLinkRows(data, includePrivate);

  return (
    <ArgusAddProvider buckets={buckets} tagBuckets={tagBuckets} journalRows={journalRows}>
      <div className="min-h-screen bg-zinc-950">
        <V2Sidebar counts={navCounts} />
        <div className="flex h-dvh min-h-0 flex-col overflow-hidden lg:min-h-screen lg:h-auto lg:overflow-visible lg:pl-56 xl:pl-60">
          <V2TopBar
            inboxCount={navCounts.inbox}
            privateConfigured={argusPrivateConfigured()}
            privateUnlocked={includePrivate}
          />
          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-hidden pb-24 lg:overflow-y-visible lg:pb-8 [&:has(.v2-inbox-shell)]:pb-0 lg:[&:has(.v2-inbox-shell)]:pb-0 [&:has(.v2-browse-shell)]:pb-0 lg:[&:has(.v2-browse-shell)]:pb-0">
            {children}
          </main>
          <V2MobileNav inboxCount={navCounts.inbox} />
        </div>
      </div>
    </ArgusAddProvider>
  );
}
