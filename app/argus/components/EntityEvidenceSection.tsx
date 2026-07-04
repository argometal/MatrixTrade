import Link from "next/link";
import type { Entity, InboxItem, Log } from "@/lib/argus/types";
import { InboxCard, LogCard } from "./Cards";
import { EmptyState } from "./ui";
import { ENTITY_PAGE, INBOX, REFERENCES } from "@/lib/argus/ux-copy";

export function EntityEvidenceSection({
  logs,
  linkedInbox,
  entities,
  entityName,
}: {
  logs: Log[];
  linkedInbox: InboxItem[];
  entities: Entity[];
  entityName: string;
}) {
  const hasEvidence = logs.length > 0 || linkedInbox.length > 0;

  return (
    <>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
        {ENTITY_PAGE.linkedDocuments}
      </h2>

      {!hasEvidence ? (
        <EmptyState message={REFERENCES.emptyActivity} />
      ) : (
        <div className="space-y-3">
          {linkedInbox.map((item) => (
            <InboxCard key={item.id} item={item} />
          ))}
          {logs.map((log) => (
            <LogCard key={log.id} log={log} entities={entities} />
          ))}
        </div>
      )}

      {linkedInbox.length > 0 ? (
        <p className="mt-3 text-xs text-zinc-600">
          {INBOX.convertHint}
        </p>
      ) : null}

      <p className="mt-6 text-center">
        <Link href="/argus/journal?capture=1" className="text-sm text-teal-500 underline">
          + {ENTITY_PAGE.addDocumentFor(entityName)}
        </Link>
      </p>
    </>
  );
}
