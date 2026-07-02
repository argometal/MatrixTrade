import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { classifyLogAction } from "@/app/argus/actions";
import { ClassifyLogForm } from "@/app/argus/components/ClassifyLogForm";
import { EntityChip } from "@/app/argus/components/Cards";
import { Card, EmptyState, formatDate, PageHeader } from "@/app/argus/components/ui";
import { buildEntityPickerBuckets } from "@/lib/argus/journal-helpers";
import { JOURNAL_KIND_LABELS, LOG_SOURCE_LABELS } from "@/lib/argus/labels";
import { getAttachment, getEntity, getInboxItem, getLog, readArgus } from "@/lib/argus/server-storage";

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
  const entities = (
    await Promise.all(log.entityIds.map((eid) => getEntity(eid)))
  ).filter(Boolean);

  const inboxSource = log.inboxItemId ? await getInboxItem(log.inboxItemId) : undefined;

  return (
    <>
      <PageHeader title={log.title} backHref="/argus/journal" />
      {log.classificationStatus === "needs_classification" && (
        <ClassifyLogForm logId={log.id} buckets={buckets} action={classifyLogAction} />
      )}
      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-teal-600/20 px-2.5 py-0.5 text-xs text-teal-400">
            {JOURNAL_KIND_LABELS[log.kind]}
          </span>
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
            {LOG_SOURCE_LABELS[log.source]}
          </span>
          {log.classificationStatus === "needs_classification" && (
            <span className="rounded-full bg-amber-600/20 px-2.5 py-0.5 text-xs text-amber-300">
              Needs classification
            </span>
          )}
          {log.private && (
            <span className="rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs text-violet-300">
              Private
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">{formatDate(log.date)}</p>
        {log.kind === "follow_up" && log.followUpDate && (
          <p className="mt-1 text-xs text-amber-400">Next touch: {formatDate(log.followUpDate)}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {entities.map((e) => e && <EntityChip key={e.id} entity={e} />)}
        </div>
        {log.topics.length > 0 && (
          <p className="mt-2 text-xs text-teal-500">{log.topics.map((t) => `#${t}`).join(" ")}</p>
        )}
        <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-300">{log.body}</p>
        {log.attachmentIds.length > 0 && (
          <div className="mt-4 border-t border-zinc-800 pt-3">
            <p className="mb-2 text-xs font-medium uppercase text-zinc-500">Attachments</p>
            {await Promise.all(
              log.attachmentIds.map(async (aid) => {
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
        {inboxSource && (
          <p className="mt-4 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
            From inbox:{" "}
            <Link href={`/argus/inbox/${inboxSource.id}`} className="text-teal-500 underline">
              view original
            </Link>
            {inboxSource.rawEmail && " · raw email preserved unchanged"}
          </p>
        )}
      </Card>
    </>
  );
}
