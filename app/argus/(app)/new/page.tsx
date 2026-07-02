import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { JournalEntryForm } from "@/app/argus/components/JournalEntryForm";
import { PageHeader } from "@/app/argus/components/ui";
import { buildEntityPickerBuckets } from "@/lib/argus/journal-helpers";
import { readArgus } from "@/lib/argus/server-storage";
import { createLogAction } from "@/app/argus/actions";

export default async function NewLogPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const includePrivate = await hasArgusPrivateUnlock();
  const data = await readArgus();
  const buckets = buildEntityPickerBuckets(data, includePrivate);

  const errorMessage =
    error === "entity"
      ? "Select or create at least one entity."
      : error === "content"
        ? "Title and description are required."
        : null;

  return (
    <>
      <PageHeader
        title="New entry"
        subtitle="Capture first · classify later"
        backHref="/argus/journal"
      />
      {errorMessage && (
        <p className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </p>
      )}
      <JournalEntryForm action={createLogAction} buckets={buckets} />
    </>
  );
}
