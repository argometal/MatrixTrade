import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { ENTITY_TYPES, ENTITY_TYPE_LABELS, INBOX_SOURCE_LABELS, JOURNAL_KINDS, JOURNAL_KIND_LABELS } from "@/lib/argus/labels";
import { getAttachment, getEntities, getInboxItem, getLog } from "@/lib/argus/server-storage";
import { archiveInboxAction, convertInboxAction } from "@/app/argus/actions";
import { Card, EmptyState, Field, inputClass, PageHeader, textareaClass } from "@/app/argus/components/ui";

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

  const entities = await getEntities();
  const today = new Date().toISOString().slice(0, 10);
  const defaultTitle = item.subject || item.rawText.slice(0, 120);
  const defaultBody = item.rawText;

  const convertedLog =
    item.status === "converted" && item.convertedLogId
      ? await getLog(item.convertedLogId, await hasArgusPrivateUnlock())
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
          <form action={convertInboxAction} className="mb-4 space-y-4">
            <input type="hidden" name="inboxId" value={item.id} />
            <Field label="Link entities">
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-zinc-800 p-3">
                {entities.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="entityIds" value={e.id} />
                    {ENTITY_TYPE_LABELS[e.type]} · {e.name}
                  </label>
                ))}
              </div>
            </Field>
            <details className="rounded-xl border border-zinc-800 p-3">
              <summary className="cursor-pointer text-sm text-zinc-300">Create new entity</summary>
              <div className="mt-3 space-y-3">
                <input name="newEntityName" className={inputClass} placeholder="Name" />
                <select name="newEntityType" className={inputClass} defaultValue="person">
                  {ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ENTITY_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <input name="newEntityNotes" className={inputClass} placeholder="Notes" />
              </div>
            </details>
            <Field label="Convert as">
              <select name="kind" className={inputClass} defaultValue="log">
                {JOURNAL_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {JOURNAL_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title">
              <input name="title" required defaultValue={defaultTitle} className={inputClass} />
            </Field>
            <Field label="Date">
              <input name="date" type="date" required defaultValue={today} className={inputClass} />
            </Field>
            <Field label="Follow-up date (if follow-up)">
              <input name="followUpDate" type="date" className={inputClass} />
            </Field>
            <Field label="Body">
              <textarea name="body" required defaultValue={defaultBody} className={textareaClass} />
            </Field>
            <Field label="Topics (comma-separated)">
              <input name="topics" className={inputClass} placeholder="optional" />
            </Field>
            <label className="flex items-center gap-2 text-sm text-violet-200">
              <input type="checkbox" name="private" />
              Private
            </label>
            <button type="submit" className="w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white">
              Convert to journal
            </button>
          </form>
          <form action={archiveInboxAction}>
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
