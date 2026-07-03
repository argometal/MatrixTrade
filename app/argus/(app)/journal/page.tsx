import { Suspense } from "react";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { ArgusAppHeader } from "@/app/argus/components/ArgusAppHeader";
import { JournalHome } from "@/app/argus/components/JournalHome";
import {
  buildEntityPickerBuckets,
  getMemoryStream,
  getRecentActivity,
  getRecentlyAddedEntities,
  getUpcomingReminders,
} from "@/lib/argus/journal-helpers";
import { getEntities, getInboxItems, getLogs, readArgus } from "@/lib/argus/server-storage";
import type { Log } from "@/lib/argus/types";

function getRecentDocuments(logs: Log[], limit: number): Log[] {
  return getMemoryStream(
    logs.filter((l) => l.attachmentIds.length > 0),
    limit
  );
}

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
  const inboxPending = await getInboxItems("pending");

  return (
    <>
      <ArgusAppHeader
        privateConfigured={argusPrivateConfigured()}
        privateUnlocked={includePrivate}
        privateError={Boolean(private_error)}
      />
      <Suspense fallback={null}>
        <JournalHome
          recentActivity={getRecentActivity(logs, 8)}
          upcomingFollowUps={getUpcomingReminders(logs, today, 5)}
          recentEntities={getRecentlyAddedEntities(entities, 6)}
          recentDocuments={getRecentDocuments(logs, 6)}
          inboxItems={inboxPending.slice(0, 4)}
          entities={entities}
          buckets={buckets}
        />
      </Suspense>
    </>
  );
}
