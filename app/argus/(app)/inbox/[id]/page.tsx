import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { MemoryComposer } from "@/app/argus/components/MemoryComposer";
import { Card, EmptyState, PageHeader } from "@/app/argus/components/ui";
import { INBOX_SOURCE_LABELS } from "@/lib/argus/labels";
import { buildEntityPickerBuckets } from "@/lib/argus/journal-helpers";
import { getAttachment, getInboxItem, getLog, readArgus } from "@/lib/argus/server-storage";
import { archiveInboxAction, convertInboxAction } from "@/app/argus/actions";
import { INBOX } from "@/lib/argus/ux-copy";

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
  const defaultTitle = item.subject || item.rawText.slice(0, 120);
  const defaultBody = item.rawText;

  const convertedLog =
    item.status === "converted" && item.convertedLogId
      ? await getLog(item.convertedLogId, includePrivate)
      : undefined;

  return (
    <>
      <PageHeader title="Inbox item" backHref="/argus/inbox" />
      <Card className="mb-4">
        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
          {INBOX_SOURCE_LABELS[item.source]} · {item.status}
        </span>
        {item.subject && <h2 className="mt-2 font-semibold text-zinc-100">{item.subject}</h2>}
        {item.from && <p className="mt-1 text-xs text-zinc-500">From: {item.from}</p>}
        {item.to && <p className="text-xs text-zinc-500">To: {item.to}</p>}
        <p className="mt-1 text-xs text-zinc-500">
          Received:{" "}
          {new Date(item.receivedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        {item.attachmentIds.length > 0 && (
          <p className="text-xs text-zinc-500">
            Attachments: {item.attachmentIds.length}
          </p>
        )}
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{item.rawText}</p>
        {item.rawEmail && (
          <details className="mt-4 border-t border-zinc-800 pt-3">
            <summary className="cursor-pointer text-xs font-medium uppercase text-zinc-500">
              Raw email (preserved)
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-zinc-400">
              {item.rawEmail}
            </pre>
          </details>
        )}
        {item.attachmentIds.length > 0 && (
          <div className="mt-3 border-t border-zinc-800 pt-3">
            <p className="mb-2 text-xs font-medium uppercase text-zinc-500">Attachments</p>
            {await Promise.all(
              item.attachmentIds.map(async (aid) => {
                const att = await getAttachment(aid);
                return att ? (
                  <Link
                    key={aid}
                    href={`/api/argus/files/${aid}`}
                    className="block text-xs text-teal-500 underline"
                  >
                    {att.fileName}
                  </Link>
                ) : null;
              })
            )}
          </div>
        )}
      </Card>

      {item.status === "converted" && convertedLog && (
        <Card className="mb-4">
          <p className="text-sm text-zinc-400">
            Converted to log:{" "}
            <Link href={`/argus/logs/${convertedLog.id}`} className="text-teal-500 underline">
              {convertedLog.title}
            </Link>
          </p>
        </Card>
      )}

      {item.status === "pending" && (
        <>
          <MemoryComposer
            action={convertInboxAction}
            buckets={buckets}
            submitLabel={INBOX.addDocument}
            initial={{
              title: defaultTitle,
              body: defaultBody,
              inboxId: item.id,
            }}
          />
          <form action={archiveInboxAction} className="mt-4">
            <input type="hidden" name="inboxId" value={item.id} />
            <button type="submit" className="w-full rounded-xl border border-zinc-700 py-3 text-sm text-zinc-400">
              Archive
            </button>
          </form>
        </>
      )}

      {item.status === "archived" && (
        <EmptyState message="Archived. Original content preserved above." />
      )}
    </>
  );
}
