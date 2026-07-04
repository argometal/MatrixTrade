import Link from "next/link";
import type { Entity, Log } from "@/lib/argus/types";
import type { EnrichedInboxItem } from "@/lib/argus/inbox-enrich";
import { LogCard } from "./Cards";
import { EvidenceEmailCard } from "./EvidenceEmailCard";
import { EmptyState } from "./ui";
import { ENTITY_PAGE, REFERENCES } from "@/lib/argus/ux-copy";

function EmailEvidenceBlock({
  title,
  items,
  hint,
}: {
  title: string;
  items: EnrichedInboxItem[];
  hint?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-zinc-600">{title}</h3>
      {hint ? <p className="mb-3 text-[12px] text-zinc-500">{hint}</p> : null}
      <div className="space-y-3">
        {items.map(({ item, view, attachments }) => (
          <EvidenceEmailCard key={item.id} item={item} view={view} attachments={attachments} />
        ))}
      </div>
    </section>
  );
}

function RecordEvidenceBlock({ title, logs, entities }: { title: string; logs: Log[]; entities: Entity[] }) {
  if (logs.length === 0) return null;
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-zinc-600">{title}</h3>
      <div className="space-y-3">
        {logs.map((log) => (
          <LogCard key={log.id} log={log} entities={entities} />
        ))}
      </div>
    </section>
  );
}

export function EntityEvidenceSection({
  logs,
  enrichedInbox,
  entities,
  entityName,
  emailCount,
  logCount,
  viaContactEnrichedInbox = [],
  viaContactLogs = [],
  scopeHint,
}: {
  logs: Log[];
  enrichedInbox: EnrichedInboxItem[];
  entities: Entity[];
  entityName: string;
  emailCount: number;
  logCount: number;
  viaContactEnrichedInbox?: EnrichedInboxItem[];
  viaContactLogs?: Log[];
  scopeHint?: string;
}) {
  const hasEvidence =
    logs.length > 0 ||
    enrichedInbox.length > 0 ||
    viaContactEnrichedInbox.length > 0 ||
    viaContactLogs.length > 0 ||
    emailCount > 0 ||
    logCount > 0;

  return (
    <>
      {scopeHint ? (
        <p className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-400">
          {scopeHint}
        </p>
      ) : null}

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
          <EmailEvidenceBlock
            title={ENTITY_PAGE.linkedEmails(enrichedInbox.length)}
            items={enrichedInbox}
          />

          {viaContactEnrichedInbox.length > 0 ? (
            <EmailEvidenceBlock
              title={ENTITY_PAGE.projectViaContactEmails(viaContactEnrichedInbox.length)}
              items={viaContactEnrichedInbox}
              hint={ENTITY_PAGE.projectViaContactHint}
            />
          ) : null}

          {enrichedInbox.length === 0 && viaContactEnrichedInbox.length === 0 && emailCount > 0 ? (
            <p className="text-sm text-zinc-500">{ENTITY_PAGE.convertedEmailsHint(emailCount)}</p>
          ) : null}

          <RecordEvidenceBlock
            title={ENTITY_PAGE.linkedRecords(logs.length)}
            logs={logs}
            entities={entities}
          />

          {viaContactLogs.length > 0 ? (
            <RecordEvidenceBlock
              title={ENTITY_PAGE.projectViaContactRecords(viaContactLogs.length)}
              logs={viaContactLogs}
              entities={entities}
            />
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
