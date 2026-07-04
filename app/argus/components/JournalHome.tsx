"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import type { Entity, InboxItem, Log } from "@/lib/argus/types";
import type { AttachmentViewModel, EmailViewModel } from "@/lib/argus/email-view";
import type { HomeNetworkSummary, HomeProjectSummary, HomeActivityItem } from "@/lib/argus/home-helpers";
import { entityDetailHref, entityKindLabel } from "@/lib/argus/reference-types";
import { HOME_DETAIL, HOME_EMPTY, HOME_NAV, INBOX, SECTION_EMPTY, TESTING, ENTITY_CREATE, ACTIVITY_SORT } from "@/lib/argus/ux-copy";
import { clearAllArgusDataAction } from "@/app/argus/actions";
import { ArgusClearAllForm } from "./ArgusDeleteForm";
import { HomeDetailHeader } from "./HomeDetailHeader";
import { HomeInboxCard } from "./HomeInboxCard";
import { HomeLogCard, HomeNetworkCard } from "./HomeNetworkCard";
import { HomeProjectCard } from "./HomeProjectCard";
import { HomeSectionNav, type HomeSectionId } from "./HomeSectionNav";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";

const ACTIVITY_PREVIEW_LIMIT = 8;
const ACTIVITY_SORT_KEY = "argus-activity-sort";
const FOLLOW_UP_PREVIEW_LIMIT = 5;
const DOCUMENT_PREVIEW_LIMIT = 6;

export type HomeInboxEnriched = {
  item: InboxItem;
  emailView: EmailViewModel;
  attachments: AttachmentViewModel[];
};

function DetailList({ children, empty, emptyHint }: { children: React.ReactNode; empty?: boolean; emptyHint?: string }) {
  if (empty && emptyHint) {
    return <p className="py-6 text-[13px] text-zinc-500">{emptyHint}</p>;
  }
  return <div className="space-y-3">{children}</div>;
}

export function JournalHome({
  recentActivity,
  upcomingFollowUps,
  recentDocuments,
  inboxEnriched,
  projects,
  networkSummaries,
  activityFeed,
  entities,
  buckets,
  tagBuckets,
  showClearAll = false,
}: {
  recentActivity: Log[];
  upcomingFollowUps: Log[];
  recentDocuments: Log[];
  inboxEnriched: HomeInboxEnriched[];
  projects: HomeProjectSummary[];
  networkSummaries: HomeNetworkSummary[];
  activityFeed: HomeActivityItem[];
  entities: Entity[];
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
  showClearAll?: boolean;
}) {
  const [activeSection, setActiveSection] = useState<HomeSectionId>("inbox");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activitySort, setActivitySort] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    const stored = localStorage.getItem(ACTIVITY_SORT_KEY);
    if (stored === "newest" || stored === "oldest") {
      setActivitySort(stored);
    }
  }, []);

  const hasContent =
    recentActivity.length > 0 ||
    upcomingFollowUps.length > 0 ||
    projects.some((p) => p.linkedCount > 0) ||
    inboxEnriched.length > 0 ||
    recentDocuments.length > 0 ||
    networkSummaries.length > 0;

  const activityItems = useMemo(() => {
    const base = activityFeed.slice(0, ACTIVITY_PREVIEW_LIMIT);
    return activitySort === "oldest" ? [...base].reverse() : base;
  }, [activityFeed, activitySort]);
  const followUpItems = upcomingFollowUps.slice(0, FOLLOW_UP_PREVIEW_LIMIT);
  const documentItems = recentDocuments.slice(0, DOCUMENT_PREVIEW_LIMIT);
  const activeProjects = projects.filter((p) => p.linkedCount > 0);

  const navItems = useMemo(
    () => [
      { id: "activity" as const, label: HOME_NAV.activity },
      { id: "followUps" as const, label: HOME_NAV.followUps, badge: upcomingFollowUps.length },
      { id: "inbox" as const, label: HOME_NAV.inbox, badge: inboxEnriched.length },
      { id: "projects" as const, label: HOME_NAV.projects, badge: activeProjects.length || undefined },
      { id: "network" as const, label: HOME_NAV.network },
      { id: "documents" as const, label: HOME_NAV.documents },
    ],
    [activeProjects.length, inboxEnriched.length, upcomingFollowUps.length]
  );

  function selectSection(id: HomeSectionId) {
    setActiveSection(id);
    setExpandedId(null);
  }

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  function linkedEntitiesFor(item: InboxItem): Entity[] {
    return (item.linkedEntityIds ?? [])
      .map((eid) => entities.find((e) => e.id === eid))
      .filter((e): e is Entity => Boolean(e));
  }

  function toggleActivitySort() {
    setActivitySort((current) => {
      const next = current === "newest" ? "oldest" : "newest";
      localStorage.setItem(ACTIVITY_SORT_KEY, next);
      return next;
    });
  }

  const detailHeader = (() => {
    switch (activeSection) {
      case "activity":
        return {
          title: HOME_NAV.activity,
          subtitle: HOME_DETAIL.activityCount(activityItems.length),
          action: (
            <button
              type="button"
              onClick={toggleActivitySort}
              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              {activitySort === "newest" ? ACTIVITY_SORT.newest : ACTIVITY_SORT.oldest}
            </button>
          ),
        };
      case "followUps":
        return {
          title: HOME_NAV.followUps,
          subtitle: HOME_DETAIL.followUpPending(upcomingFollowUps.length),
        };
      case "inbox":
        return {
          title: HOME_NAV.inbox,
          subtitle: HOME_DETAIL.inboxPending(inboxEnriched.length),
          action:
            inboxEnriched.length > 0 ? (
              <Link href="/argus/inbox" className="text-[11px] text-teal-500/90 hover:text-teal-400">
                {INBOX.title}
              </Link>
            ) : undefined,
        };
      case "projects":
        return {
          title: HOME_NAV.projects,
          subtitle: HOME_DETAIL.projectCount(projects.length),
        };
      case "network":
        return {
          title: HOME_NAV.network,
          subtitle: `${networkSummaries.length} contacts`,
          action: (
            <Link href="/argus/network" className="text-[11px] text-teal-500/90 hover:text-teal-400">
              View all
            </Link>
          ),
        };
      case "documents":
        return {
          title: HOME_NAV.documents,
          subtitle: HOME_DETAIL.documentCount(documentItems.length),
        };
      default:
        return { title: HOME_NAV.inbox };
    }
  })();

  return (
    <>
      <div className="md:flex md:items-start md:gap-8">
        <HomeSectionNav items={navItems} active={activeSection} onSelect={selectSection} />

        <div className="min-w-0 flex-1">
          {!hasContent && activeSection === "activity" ? (
            <p className="mb-6 py-8 text-center text-[15px] leading-relaxed text-zinc-600">
              {HOME_EMPTY.title}
              <br />
              <span className="text-zinc-500">{HOME_EMPTY.hint}</span>
            </p>
          ) : null}

          <HomeDetailHeader
            title={detailHeader.title}
            subtitle={detailHeader.subtitle}
            action={detailHeader.action}
          />

          {activeSection === "activity" ? (
            <DetailList empty={activityItems.length === 0} emptyHint={SECTION_EMPTY.recentActivityHint}>
              {activityItems.map((item) =>
                item.type === "log" ? (
                  <HomeLogCard
                    key={`log-${item.log.id}`}
                    log={item.log}
                    entities={entities}
                    expanded={expandedId === item.log.id}
                    onToggle={() => toggleExpanded(item.log.id)}
                  />
                ) : (
                  <Link
                    key={`entity-${item.entity.id}`}
                    href={entityDetailHref(item.entity)}
                    className="block rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700"
                  >
                    <p className="text-[15px] font-medium text-zinc-100">{item.entity.name}</p>
                    <p className="mt-0.5 text-[13px] text-zinc-500">{entityKindLabel(item.entity)}</p>
                  </Link>
                )
              )}
            </DetailList>
          ) : null}

          {activeSection === "followUps" ? (
            <DetailList empty={followUpItems.length === 0} emptyHint={SECTION_EMPTY.remindersHint}>
              {followUpItems.map((log) => (
                <HomeLogCard
                  key={log.id}
                  log={log}
                  entities={entities}
                  expanded={expandedId === log.id}
                  onToggle={() => toggleExpanded(log.id)}
                  accent="amber"
                />
              ))}
            </DetailList>
          ) : null}

          {activeSection === "inbox" ? (
            <DetailList empty={inboxEnriched.length === 0} emptyHint={SECTION_EMPTY.inboxHint}>
              {inboxEnriched.map(({ item, emailView, attachments }) => (
                <HomeInboxCard
                  key={item.id}
                  item={item}
                  view={emailView}
                  attachments={attachments}
                  linkedEntities={linkedEntitiesFor(item)}
                  buckets={buckets}
                  tagBuckets={tagBuckets}
                  expanded={expandedId === item.id}
                  onToggle={() => toggleExpanded(item.id)}
                />
              ))}
            </DetailList>
          ) : null}

          {activeSection === "projects" ? (
            <DetailList empty={projects.length === 0} emptyHint={ENTITY_CREATE.emptyProjects}>
              {projects.map((summary) => (
                <HomeProjectCard
                  key={summary.entity.id}
                  summary={summary}
                  expanded={expandedId === summary.entity.id}
                  onToggle={() => toggleExpanded(summary.entity.id)}
                />
              ))}
            </DetailList>
          ) : null}

          {activeSection === "network" ? (
            <DetailList empty={networkSummaries.length === 0} emptyHint={ENTITY_CREATE.emptyNetwork}>
              {networkSummaries.map((summary) => (
                <HomeNetworkCard
                  key={summary.intelligence.entity.id}
                  summary={summary}
                  expanded={expandedId === summary.intelligence.entity.id}
                  onToggle={() => toggleExpanded(summary.intelligence.entity.id)}
                />
              ))}
            </DetailList>
          ) : null}

          {activeSection === "documents" ? (
            <DetailList empty={documentItems.length === 0} emptyHint={SECTION_EMPTY.documentsHint}>
              {documentItems.map((log) => (
                <HomeLogCard
                  key={log.id}
                  log={log}
                  entities={entities}
                  expanded={expandedId === log.id}
                  onToggle={() => toggleExpanded(log.id)}
                />
              ))}
            </DetailList>
          ) : null}
        </div>
      </div>

      {showClearAll ? (
        <ArgusClearAllForm
          action={clearAllArgusDataAction}
          confirmMessage={TESTING.clearAllConfirm}
          label={TESTING.clearAll}
          hint={TESTING.clearAllHint}
        />
      ) : null}
    </>
  );
}
