import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { requireArgusSession } from "@/lib/auth/require-session";
import { ArgusAddProvider } from "@/app/argus/components/ArgusAddProvider";
import { buildEntityPickerBuckets, buildTagBuckets } from "@/lib/argus/journal-helpers";
import { buildJournalLinkRows } from "@/lib/argus/create-flow-helpers";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { buildV2NavCounts } from "@/lib/argus/v2/loaders";
import { V2DesktopShell } from "./components/V2DesktopShell";
import { V2MobileMenuProvider } from "./components/V2MobileMenuProvider";

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
      <V2MobileMenuProvider counts={navCounts}>
        <V2DesktopShell
          counts={navCounts}
          inboxCount={navCounts.inbox}
          privateConfigured={argusPrivateConfigured()}
          privateUnlocked={includePrivate}
        >
          {children}
        </V2DesktopShell>
      </V2MobileMenuProvider>
    </ArgusAddProvider>
  );
}
