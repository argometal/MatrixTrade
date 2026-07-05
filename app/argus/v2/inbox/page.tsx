import { Suspense } from "react";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { buildEmailView, parseStoredEmailPayload, attachmentSizeFromStored, type AttachmentViewModel } from "@/lib/argus/email-view";
import { enrichInboxItems } from "@/lib/argus/inbox-enrich";
import { buildEntityPickerBuckets, buildTagBuckets } from "@/lib/argus/journal-helpers";
import {
  buildV2InboxDetailEntities,
  buildV2InboxRows,
  parseV2InboxTab,
} from "@/lib/argus/v2/inbox-loaders";
import {
  getAttachment,
  getInboxItems,
  getLog,
  readArgus,
  readAttachmentBytes,
} from "@/lib/argus/server-storage";
import { V2InboxShell } from "./components/V2InboxShell";

export default async function V2InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string; tab?: string }>;
}) {
  const { selected, tab: tabParam } = await searchParams;
  const includePrivate = await hasArgusPrivateUnlock();
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, includePrivate)]);
  const enriched = await enrichInboxItems(inboxItems);
  const today = new Date().toISOString().slice(0, 10);
  const rows = buildV2InboxRows(enriched, data.entities, today);
  const tab = parseV2InboxTab(tabParam);
  const selectedId = selected ?? rows[0]?.id;

  const buckets = buildEntityPickerBuckets(data, includePrivate);
  const tagBuckets = buildTagBuckets(data, includePrivate);

  const details = await Promise.all(
    enriched.map(async ({ item, view, attachments: atts }) => {
      const linkedEntities = buildV2InboxDetailEntities(item, data.entities);
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

      return {
        item,
        view: buildEmailView(item),
        attachments: attachmentViews.length > 0 ? attachmentViews : atts,
        linkedEntities,
        convertedLog,
        defaultTitle: view.subject || view.textBody.slice(0, 120),
        defaultBody: view.textBody,
      };
    })
  );

  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-zinc-500">Loading inbox…</div>}>
      <V2InboxShell
        rows={rows}
        details={details}
        buckets={buckets}
        tagBuckets={tagBuckets}
        linkedEntityRecords={data.entities.filter((e) => !e.deletedAt)}
        initialSelectedId={selectedId}
        initialTab={tab}
      />
    </Suspense>
  );
}
