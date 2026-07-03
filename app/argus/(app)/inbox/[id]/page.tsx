import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { EmailViewer } from "@/app/argus/components/EmailViewer";
import { InboxTriagePanel } from "@/app/argus/components/InboxTriagePanel";
import { EmptyState, PageHeader } from "@/app/argus/components/ui";
import {
  attachmentSizeFromStored,
  buildEmailView,
  parseStoredEmailPayload,
  type AttachmentViewModel,
} from "@/lib/argus/email-view";
import { buildEntityPickerBuckets, buildTagBuckets } from "@/lib/argus/journal-helpers";
import { getAttachment, getInboxItem, getLog, readArgus, readAttachmentBytes } from "@/lib/argus/server-storage";

export default async function InboxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getInboxItem(id);

  if (!item) {
    return (
      <>
        <PageHeader title="Not found" backHref="/argus/inbox" />
        <EmptyState message="Inbox item not found." />
      </>
    );
  }

  const includePrivate = await hasArgusPrivateUnlock();
  const data = await readArgus();
  const buckets = buildEntityPickerBuckets(data, includePrivate);
  const tagBuckets = buildTagBuckets(data, includePrivate);
  const emailView = buildEmailView(item);
  const defaultTitle = emailView.subject || emailView.textBody.slice(0, 120);
  const defaultBody = emailView.textBody;

  const linkedEntities = (item.linkedEntityIds ?? [])
    .map((eid) => data.entities.find((e) => e.id === eid))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const convertedLog =
    item.status === "converted" && item.convertedLogId
      ? await getLog(item.convertedLogId, includePrivate)
      : undefined;

  const storedPayload = parseStoredEmailPayload(item.rawEmail);
  const attachmentViews: AttachmentViewModel[] = (
    await Promise.all(
      item.attachmentIds.map(async (aid) => {
        const att = await getAttachment(aid);
        if (!att) return null;
        const bytes = await readAttachmentBytes(aid);
        return {
          id: att.id,
          fileName: att.fileName,
          mimeType: att.mimeType,
          sizeBytes: attachmentSizeFromStored(att.fileName, storedPayload, bytes?.length ?? 0),
        };
      })
    )
  ).filter((a): a is AttachmentViewModel => a !== null);

  return (
    <>
      <PageHeader title="Inbox item" backHref="/argus/inbox" />
      <EmailViewer
        view={emailView}
        attachments={attachmentViews}
        status={item.status}
        source={item.source}
      />
      <InboxTriagePanel
        item={item}
        linkedEntities={linkedEntities}
        buckets={buckets}
        tagBuckets={tagBuckets}
        convertedLog={convertedLog}
        defaultTitle={defaultTitle}
        defaultBody={defaultBody}
      />
    </>
  );
}
