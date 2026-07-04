import {
  attachmentSizeFromStored,
  buildEmailView,
  parseStoredEmailPayload,
  type AttachmentViewModel,
  type EmailViewModel,
} from "./email-view";
import { getAttachment, readAttachmentBytes } from "./server-storage";
import type { InboxItem } from "./types";

export type EnrichedInboxItem = {
  item: InboxItem;
  view: EmailViewModel;
  attachments: AttachmentViewModel[];
};

export async function enrichInboxItems(items: InboxItem[]): Promise<EnrichedInboxItem[]> {
  return Promise.all(
    items.map(async (item) => {
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
      ).filter((att): att is AttachmentViewModel => att !== null);

      return { item, view: emailView, attachments };
    })
  );
}
