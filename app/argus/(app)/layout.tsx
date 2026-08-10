import { ArgusAddProvider } from "@/app/argus/components/ArgusAddProvider";
import { ArgusAppChrome } from "@/app/argus/components/ArgusAppChrome";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { requireArgusSession } from "@/lib/auth/require-session";
import { buildEntityPickerBuckets, buildTagBuckets } from "@/lib/argus/journal-helpers";
import { buildJournalLinkRows } from "@/lib/argus/create-flow-helpers";
import { readArgus } from "@/lib/argus/server-storage";

export default async function ArgusAppLayout({ children }: { children: React.ReactNode }) {
  await requireArgusSession();
  const includePrivate = await hasArgusPrivateUnlock();
  const data = await readArgus();
  const buckets = buildEntityPickerBuckets(data, includePrivate);
  const tagBuckets = buildTagBuckets(data, includePrivate);
  const journalRows = buildJournalLinkRows(data, includePrivate);

  return (
    <ArgusAddProvider buckets={buckets} tagBuckets={tagBuckets} journalRows={journalRows}>
      <ArgusAppChrome>{children}</ArgusAppChrome>
    </ArgusAddProvider>
  );
}
