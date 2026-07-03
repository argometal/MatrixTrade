import Link from "next/link";
import {
  attachmentDownloadUrl,
  attachmentPreviewUrl,
  canPreviewInline,
  formatFileSize,
  type AttachmentViewModel,
} from "@/lib/argus/email-view";
import { INBOX } from "@/lib/argus/ux-copy";

export function InboxAttachmentList({ attachments }: { attachments: AttachmentViewModel[] }) {
  if (attachments.length === 0) return null;

  return (
    <section className="mt-4 border-t border-zinc-800 pt-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {INBOX.attachments} ({attachments.length})
      </h3>
      <ul className="mt-3 space-y-4">
        {attachments.map((att) => {
          const preview = canPreviewInline(att.mimeType);
          return (
            <li key={att.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">{att.fileName}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {att.mimeType} · {formatFileSize(att.sizeBytes)}
                  </p>
                </div>
                <Link
                  href={attachmentDownloadUrl(att.id)}
                  className="shrink-0 rounded-lg border border-teal-800/60 bg-teal-950/40 px-3 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-900/40"
                >
                  {INBOX.downloadAttachment}
                </Link>
              </div>
              {preview && att.mimeType.startsWith("image/") && (
                <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachmentPreviewUrl(att.id)}
                    alt={att.fileName}
                    className="max-h-80 w-full object-contain"
                  />
                </div>
              )}
              {preview && att.mimeType === "application/pdf" && (
                <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                  <iframe
                    title={att.fileName}
                    src={attachmentPreviewUrl(att.id)}
                    className="h-80 w-full bg-white"
                    sandbox=""
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
