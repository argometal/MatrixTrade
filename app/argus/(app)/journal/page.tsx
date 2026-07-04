import { Suspense } from "react";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { isTestingUiEnabled } from "@/lib/argus/data-safety";
import { ArgusAppHeader } from "@/app/argus/components/ArgusAppHeader";
import { ArgusStatusPanel } from "@/app/argus/components/ArgusStatusPanel";
import { JournalHome, type HomeInboxEnriched } from "@/app/argus/components/JournalHome";
import {
  attachmentSizeFromStored,
  buildEmailView,
  parseStoredEmailPayload,
  type AttachmentViewModel,
} from "@/lib/argus/email-view";
import { buildHomeActivityFeed, buildHomeNetworkSummaries, buildHomeProjectSummaries } from "@/lib/argus/home-helpers";
import {
  buildEntityPickerBuckets,
  buildTagBuckets,
  getMemoryStream,
  getRecentActivity,
  getUpcomingReminders,
} from "@/lib/argus/journal-helpers";
import {
  getAttachment,
  getEntities,
  getInboxItems,
  getLogs,
  readArgus,
  readAttachmentBytes,
} from "@/lib/argus/server-storage";
import type { InboxItem, Log } from "@/lib/argus/types";

function getRecentDocuments(logs: Log[], limit: number): Log[] {
  return getMemoryStream(
    logs.filter((l) => l.attachmentIds.length > 0),
    limit
  );
}

async function buildInboxHomeData(inboxPending: InboxItem[]): Promise<HomeInboxEnriched[]> {
  return Promise.all(
    inboxPending.map(async (item) => {
      const emailView = buildEmailView(item);
      const stored = parseStoredEmailPayload(item.rawEmail);
      const attachments = (
        await Promise.all(
          item.attachmentIds.map(async (aid) => {
            const att = await getAttachment(aid);
            if (!att) return null;
            const bytes = await readAttachmentBytes(aid);
            return {
              id: att.id,
              fileName: att.fileName,
              mimeType: att.mimeType,
              sizeBytes: attachmentSizeFromStored(att.fileName, stored, bytes?.length ?? 0),
            } satisfies AttachmentViewModel;
          })
        )
      ).filter((a): a is AttachmentViewModel => a !== null);

      return { item, emailView, attachments };
    })
  );
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ private_error?: string; error?: string; errorLayer?: string; errorMsg?: string }>;
}) {
  const { private_error, error, errorLayer, errorMsg } = await searchParams;
  const includePrivate = await hasArgusPrivateUnlock();
  const today = new Date().toISOString().slice(0, 10);
  const entities = await getEntities();
  const logs = await getLogs(includePrivate);
  const data = await readArgus();
  const buckets = buildEntityPickerBuckets(data, includePrivate);
  const tagBuckets = buildTagBuckets(data, includePrivate);
  const inboxPending = await getInboxItems("pending");
  const allInbox = data.inboxItems;
  const inboxEnriched = await buildInboxHomeData(inboxPending);
  const projects = buildHomeProjectSummaries(entities, logs, allInbox);
  const networkSummaries = buildHomeNetworkSummaries(data, entities, includePrivate, today, 8);
  const activityFeed = buildHomeActivityFeed(entities, logs, 16);

  return (
    <>
      <ArgusAppHeader
        privateConfigured={argusPrivateConfigured()}
        privateUnlocked={includePrivate}
        privateError={Boolean(private_error)}
      />
      <ArgusStatusPanel />
      {errorLayer && errorMsg ? (
        <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          <span className="font-medium uppercase">{errorLayer}:</span> {errorMsg}
        </p>
      ) : null}
      {error === "storage" && !errorMsg ? (
        <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          SUPABASE: Journal writes blocked on this host. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and
          ARGUS_JOURNAL_STORE=supabase on Vercel.
        </p>
      ) : null}
      {error === "destructive" && (
        <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          That action is disabled in production.
        </p>
      )}
      <Suspense fallback={null}>
        <JournalHome
          recentActivity={getRecentActivity(logs, 8)}
          upcomingFollowUps={getUpcomingReminders(logs, today, 50)}
          recentDocuments={getRecentDocuments(logs, 6)}
          inboxEnriched={inboxEnriched}
          projects={projects}
          networkSummaries={networkSummaries}
          activityFeed={activityFeed}
          entities={entities}
          buckets={buckets}
          tagBuckets={tagBuckets}
          showClearAll={isTestingUiEnabled()}
        />
      </Suspense>
    </>
  );
}
