import Link from "next/link";
import type { Entity, Log } from "@/lib/argus/types";
import type { EnrichedInboxItem } from "@/lib/argus/inbox-enrich";
import { LogCard } from "./Cards";
import { EvidenceEmailCard } from "./EvidenceEmailCard";
import { EmptyState } from "./ui";
import { ENTITY_PAGE, REFERENCES } from "@/lib/argus/ux-copy";

export function EntityEvidenceSection({
  logs,
  enrichedInbox,
  entities,
  entityName,
  emailCount,
  logCount,
}: {
  logs: Log[];
  enrichedInbox: EnrichedInboxItem[];
  entities: Entity[];
  entityName: string;
  emailCount: number;
  logCount: number;
}) {
  const hasEvidence = logs.length > 0 || enrichedInbox.length > 0 || emailCount > 0 || logCount > 0;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          {ENTITY_PAGE.linkedDocuments}
        </h2>
        {hasEvidence ? (
          <p className="text-[12px] text-zinc-500">
            {ENTITY_PAGE.evidenceSummary(emailCount, logCount)}
          </p>
        ) : null}
      </div>

      {!hasEvidence ? (
        <EmptyState message={REFERENCES.emptyActivity} />
      ) : (
        <div className="space-y-6">
          {enrichedInbox.length > 0 ? (
            <section>
              <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                {ENTITY_PAGE.linkedEmails(enrichedInbox.length)}
              </h3>
              <div className="space-y-3">
                {enrichedInbox.map(({ item, view, attachments }) => (
                  <EvidenceEmailCard key={item.id} item={item} view={view} attachments={attachments} />
                ))}
              </div>
            </section>
          ) : emailCount > 0 ? (
            <p className="text-sm text-zinc-500">{ENTITY_PAGE.convertedEmailsHint(emailCount)}</p>
          ) : null}

          {logs.length > 0 ? (
            <section>
              <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                {ENTITY_PAGE.linkedRecords(logs.length)}
              </h3>
              <div className="space-y-3">
                {logs.map((log) => (
                  <LogCard key={log.id} log={log} entities={entities} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <p className="mt-6 text-center">
        <Link href="/argus/journal?capture=1" className="text-sm text-teal-500 underline">
          + {ENTITY_PAGE.addDocumentFor(entityName)}
        </Link>
      </p>
    </>
  );
}
