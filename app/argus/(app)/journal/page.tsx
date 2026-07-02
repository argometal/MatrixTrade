import { Suspense } from "react";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { JournalHome } from "@/app/argus/components/JournalHome";
import { PrivatePanel } from "@/app/argus/components/PrivatePanel";
import {
  buildEntityPickerBuckets,
  getMemoryStream,
  getNeedsClassificationLogs,
  getUpcomingReminders,
} from "@/lib/argus/journal-helpers";
import { getEntities, getLogs, readArgus } from "@/lib/argus/server-storage";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ private_error?: string }>;
}) {
  const { private_error } = await searchParams;
  const includePrivate = await hasArgusPrivateUnlock();
  const today = new Date().toISOString().slice(0, 10);
  const entities = await getEntities();
  const logs = await getLogs(includePrivate);
  const data = await readArgus();
  const buckets = buildEntityPickerBuckets(data, includePrivate);

  const needsClassification = getNeedsClassificationLogs(logs, 8);
  const needsIds = new Set(needsClassification.map((l) => l.id));
  const memoryStream = getMemoryStream(
    logs.filter((l) => !needsIds.has(l.id)),
    12
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight text-zinc-50">Journal</h1>
      </header>
      <PrivatePanel privateError={Boolean(private_error)} />
      <Suspense fallback={null}>
        <JournalHome
          memoryStream={memoryStream}
          needsClassification={needsClassification}
          upcomingReminders={getUpcomingReminders(logs, today, 5)}
          entities={entities}
          buckets={buckets}
        />
      </Suspense>
    </>
  );
}
