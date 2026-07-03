"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Entity, InboxItem, Log } from "@/lib/argus/types";
import { ENTITY_TYPE_LABELS } from "@/lib/argus/labels";
import { HOME_EMPTY, HOME_SECTIONS, INBOX, SECTION_EMPTY } from "@/lib/argus/ux-copy";
import { createLogAction } from "@/app/argus/actions";
import { CaptureFab } from "./CaptureFab";
import { CaptureSheet } from "./CaptureSheet";
import { HomeSectionNav, type HomeSectionId } from "./HomeSectionNav";
import { MemoryStreamRow } from "./MemoryStreamRow";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";

const INBOX_PREVIEW_LIMIT = 4;
const ACTIVITY_PREVIEW_LIMIT = 8;
const FOLLOW_UP_PREVIEW_LIMIT = 5;
const NETWORK_PREVIEW_LIMIT = 6;
const DOCUMENT_PREVIEW_LIMIT = 6;

function SectionPanel({
  label,
  children,
  empty,
  emptyHint,
  action,
}: {
  label: string;
  children: React.ReactNode;
  empty?: boolean;
  emptyHint?: string;
  action?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-600">{label}</h2>
        {action}
      </div>
      {empty && emptyHint ? (
        <p className="py-3 text-[13px] text-zinc-500">{emptyHint}</p>
      ) : (
        <div className="divide-y divide-zinc-800/50">{children}</div>
      )}
    </section>
  );
}

function EntityPreviewRow({ entity }: { entity: Entity }) {
  return (
    <Link href={`/argus/network/${entity.id}`} className="group block py-3 transition">
      <p className="text-[15px] font-medium text-zinc-100 group-hover:text-teal-50">{entity.name}</p>
      <p className="mt-0.5 text-[11px] text-zinc-600">{ENTITY_TYPE_LABELS[entity.type]}</p>
    </Link>
  );
}

function InboxPreviewRow({ item }: { item: InboxItem }) {
  return (
    <Link href={`/argus/inbox/${item.id}`} className="group block py-3 transition">
      <p className="text-[15px] font-medium text-zinc-100 group-hover:text-teal-50">
        {item.subject || item.rawText.slice(0, 80) || "Inbox item"}
      </p>
      <p className="mt-1 line-clamp-1 text-[13px] text-zinc-500">{item.rawText}</p>
    </Link>
  );
}

export function JournalHome({
  recentActivity,
  upcomingFollowUps,
  recentEntities,
  recentDocuments,
  inboxItems,
  entities,
  buckets,
  tagBuckets,
}: {
  recentActivity: Log[];
  upcomingFollowUps: Log[];
  recentEntities: Entity[];
  recentDocuments: Log[];
  inboxItems: InboxItem[];
  entities: Entity[];
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const captureOpen = searchParams.get("capture") === "1";
  const referenceOpen = searchParams.get("reference") === "1";

  const [sheetOpen, setSheetOpen] = useState(captureOpen);
  const [activeSection, setActiveSection] = useState<HomeSectionId>("inbox");

  useEffect(() => {
    if (captureOpen) setSheetOpen(true);
  }, [captureOpen]);

  const openCapture = useCallback(() => setSheetOpen(true), []);

  const closeCapture = useCallback(() => {
    setSheetOpen(false);
    if (searchParams.get("capture") || searchParams.get("reference")) {
      router.replace("/argus/journal");
    }
  }, [router, searchParams]);

  const hasContent =
    recentActivity.length > 0 ||
    upcomingFollowUps.length > 0 ||
    recentEntities.length > 0 ||
    inboxItems.length > 0 ||
    recentDocuments.length > 0;

  const navItems = useMemo(
    () => [
      { id: "activity" as const, label: HOME_SECTIONS.recentActivity },
      {
        id: "followUps" as const,
        label: HOME_SECTIONS.upcomingFollowUps,
        badge: upcomingFollowUps.length,
      },
      { id: "inbox" as const, label: HOME_SECTIONS.inbox, badge: inboxItems.length },
      { id: "network" as const, label: HOME_SECTIONS.recentReferences },
      { id: "documents" as const, label: HOME_SECTIONS.recentDocuments },
    ],
    [inboxItems.length, upcomingFollowUps.length]
  );

  const activityItems = recentActivity.slice(0, ACTIVITY_PREVIEW_LIMIT);
  const followUpItems = upcomingFollowUps.slice(0, FOLLOW_UP_PREVIEW_LIMIT);
  const networkItems = recentEntities.slice(0, NETWORK_PREVIEW_LIMIT);
  const inboxPreviewItems = inboxItems.slice(0, INBOX_PREVIEW_LIMIT);
  const documentItems = recentDocuments.slice(0, DOCUMENT_PREVIEW_LIMIT);

  return (
    <>
      <div className="md:flex md:items-start md:gap-6">
        <HomeSectionNav items={navItems} active={activeSection} onSelect={setActiveSection} />

        <div className="min-w-0 flex-1">
          {!hasContent && !sheetOpen && activeSection === "activity" && (
            <p className="mb-6 py-8 text-center text-[15px] leading-relaxed text-zinc-600">
              {HOME_EMPTY.title}
              <br />
              <span className="text-zinc-500">{HOME_EMPTY.hint}</span>
            </p>
          )}

          {activeSection === "activity" && (
            <SectionPanel
              label={HOME_SECTIONS.recentActivity}
              empty={activityItems.length === 0}
              emptyHint={SECTION_EMPTY.recentActivityHint}
            >
              {activityItems.map((log) => (
                <MemoryStreamRow key={log.id} log={log} entities={entities} />
              ))}
            </SectionPanel>
          )}

          {activeSection === "followUps" && (
            <SectionPanel
              label={HOME_SECTIONS.upcomingFollowUps}
              empty={followUpItems.length === 0}
              emptyHint={SECTION_EMPTY.remindersHint}
            >
              {followUpItems.map((log) => (
                <MemoryStreamRow key={log.id} log={log} entities={entities} accent="amber" />
              ))}
            </SectionPanel>
          )}

          {activeSection === "inbox" && (
            <SectionPanel
              label={HOME_SECTIONS.inbox}
              empty={inboxPreviewItems.length === 0}
              emptyHint={SECTION_EMPTY.inboxHint}
              action={
                inboxItems.length > 0 ? (
                  <Link href="/argus/inbox" className="text-[11px] text-teal-500/90 hover:text-teal-400">
                    {INBOX.title}
                  </Link>
                ) : undefined
              }
            >
              {inboxPreviewItems.map((item) => (
                <InboxPreviewRow key={item.id} item={item} />
              ))}
            </SectionPanel>
          )}

          {activeSection === "network" && (
            <SectionPanel
              label={HOME_SECTIONS.recentReferences}
              empty={networkItems.length === 0}
              action={
                <Link href="/argus/network" className="text-[11px] text-teal-500/90 hover:text-teal-400">
                  View all
                </Link>
              }
            >
              {networkItems.map((entity) => (
                <EntityPreviewRow key={entity.id} entity={entity} />
              ))}
            </SectionPanel>
          )}

          {activeSection === "documents" && (
            <SectionPanel
              label={HOME_SECTIONS.recentDocuments}
              empty={documentItems.length === 0}
              emptyHint={SECTION_EMPTY.documentsHint}
            >
              {documentItems.map((log) => (
                <MemoryStreamRow key={log.id} log={log} entities={entities} />
              ))}
            </SectionPanel>
          )}
        </div>
      </div>

      {!sheetOpen && <CaptureFab onClick={openCapture} />}

      <CaptureSheet
        open={sheetOpen}
        action={createLogAction}
        buckets={buckets}
        tagBuckets={tagBuckets}
        onClose={closeCapture}
        autoOpenReference={referenceOpen}
      />
    </>
  );
}
