import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { requireArgusSession } from "@/lib/auth/require-session";
import { ArgusAddProvider } from "@/app/argus/components/ArgusAddProvider";
import { buildEntityPickerBuckets, buildTagBuckets } from "@/lib/argus/journal-helpers";
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

  return (
    <ArgusAddProvider buckets={buckets} tagBuckets={tagBuckets}>
      <div className="flex min-h-screen bg-zinc-950">
        <V2Sidebar counts={navCounts} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <V2TopBar />
          <main className="flex-1 overflow-x-hidden pb-24 lg:pb-8 [&:has(.v2-inbox-shell)]:overflow-hidden [&:has(.v2-inbox-shell)]:pb-0 lg:[&:has(.v2-inbox-shell)]:pb-0 [&:has(.v2-browse-shell)]:overflow-hidden [&:has(.v2-browse-shell)]:pb-0 lg:[&:has(.v2-browse-shell)]:pb-0">
            {children}
          </main>
          <V2MobileNav inboxCount={navCounts.inbox} />
        </div>
      </div>
    </ArgusAddProvider>
  );
}
