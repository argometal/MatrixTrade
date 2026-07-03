import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { InboxTriagePanel } from "@/app/argus/components/InboxTriagePanel";
import { Card, EmptyState, PageHeader } from "@/app/argus/components/ui";
import { INBOX_SOURCE_LABELS, INBOX_STATUS_LABELS } from "@/lib/argus/labels";
import { buildEntityPickerBuckets, buildTagBuckets } from "@/lib/argus/journal-helpers";
import { getAttachment, getInboxItem, getLog, readArgus } from "@/lib/argus/server-storage";
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
  const tagBuckets = buildTagBuckets(data, includePrivate);
  const defaultTitle = item.subject || item.rawText.slice(0, 120);
  const defaultBody = item.rawText;

  const linkedEntities = (item.linkedEntityIds ?? [])
    .map((eid) => data.entities.find((e) => e.id === eid))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const convertedLog =
    item.status === "converted" && item.convertedLogId
      ? await getLog(item.convertedLogId, includePrivate)
      : undefined;

  const attachments = (
    await Promise.all(item.attachmentIds.map(async (aid) => getAttachment(aid)))
  ).filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <>
      <PageHeader title="Inbox item" backHref="/argus/inbox" />
      <Card className="mb-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
            {INBOX_SOURCE_LABELS[item.source]}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs ${
              item.status === "pending"
                ? "bg-amber-600/20 text-amber-400"
                : item.status === "linked"
                  ? "bg-teal-600/20 text-teal-400"
                  : item.status === "converted"
                    ? "bg-violet-600/20 text-violet-300"
                    : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {INBOX_STATUS_LABELS[item.status]}
          </span>
        </div>
        {item.subject && <h2 className="mt-2 font-semibold text-zinc-100">{item.subject}</h2>}
        {item.from && <p className="mt-2 text-xs text-zinc-500">From: {item.from}</p>}
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
        {attachments.length > 0 && (
          <div className="mt-3 border-t border-zinc-800 pt-3">
            <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
              {INBOX.attachments} ({attachments.length})
            </p>
            {attachments.map((att) => (
              <Link
                key={att.id}
                href={`/api/argus/files/${att.id}`}
                className="block text-xs text-teal-500 underline"
              >
                {att.fileName}
              </Link>
            ))}
          </div>
        )}
      </Card>

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
