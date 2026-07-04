import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { deleteLogAction, updateLogAction } from "@/app/argus/actions";
import { ActivityEditPanel } from "@/app/argus/components/ActivityEditPanel";
import { ArgusDeleteForm } from "@/app/argus/components/ArgusDeleteForm";
import { EmptyState, PageHeader } from "@/app/argus/components/ui";
import { buildEntityPickerBuckets, buildTagBuckets } from "@/lib/argus/journal-helpers";
import { TESTING } from "@/lib/argus/ux-copy";
import { getAttachment, getInboxItem, getLog, readArgus } from "@/lib/argus/server-storage";

export default async function LogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includePrivate = await hasArgusPrivateUnlock();
  const log = await getLog(id, includePrivate);

  if (!log) {
    return (
      <>
        <PageHeader title="Not found" backHref="/argus/journal" />
        <EmptyState message="Not found or requires private unlock." />
      </>
    );
  }

  const data = await readArgus();
  const buckets = buildEntityPickerBuckets(data, includePrivate);
  const tagBuckets = buildTagBuckets(data, includePrivate);

  const attachments = (
    await Promise.all(
      log.attachmentIds.map(async (aid) => {
        const att = await getAttachment(aid);
        return att ? { id: att.id, fileName: att.fileName } : null;
      })
    )
  ).filter((a): a is { id: string; fileName: string } => Boolean(a));

  const inboxSource = log.inboxItemId ? await getInboxItem(log.inboxItemId) : undefined;

  return (
    <>
      <PageHeader title={log.title} backHref="/argus/journal" />
      <ActivityEditPanel
        log={log}
        buckets={buckets}
        tagBuckets={tagBuckets}
        attachments={attachments}
        inboxLink={
          inboxSource
            ? { id: inboxSource.id, hasRaw: Boolean(inboxSource.rawEmail) }
            : undefined
        }
        action={updateLogAction}
      />
      <ArgusDeleteForm
        action={deleteLogAction}
        confirmMessage={TESTING.deleteLogConfirm}
        label={TESTING.deleteLog}
      >
        <input type="hidden" name="logId" value={log.id} />
      </ArgusDeleteForm>
    </>
  );
}
