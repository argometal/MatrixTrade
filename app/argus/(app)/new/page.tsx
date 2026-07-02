import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { JournalEntryForm } from "@/app/argus/components/JournalEntryForm";
import { PageHeader } from "@/app/argus/components/ui";
import { buildEntityPickerBuckets } from "@/lib/argus/journal-helpers";
import { readArgus } from "@/lib/argus/server-storage";
import { createLogAction } from "@/app/argus/actions";

export default async function NewLogPage() {
  const includePrivate = await hasArgusPrivateUnlock();
  const data = await readArgus();
  const buckets = buildEntityPickerBuckets(data, includePrivate);

  return (
    <>
      <PageHeader
        title="New entry"
        subtitle="Capture first · classify later"
        backHref="/argus/journal"
      />
      <JournalEntryForm action={createLogAction} buckets={buckets} />
    </>
  );
}
