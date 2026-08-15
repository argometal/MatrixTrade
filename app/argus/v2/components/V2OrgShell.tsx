"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Entity, Runbook, RunbookProgress } from "@/lib/argus/types";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import type { V2TimelineEntry } from "@/lib/argus/v2/mock-data";
import type { TagPattern } from "@/lib/argus/v2/tag-patterns";
import { V2Badge } from "./v2-ui";
import { V2PrivateEvidenceGate } from "./V2PrivateEvidenceGate";
import { V2EntityTimelineSection } from "./V2EntityTimelineSection";
import { V2EntityChronicleRail } from "./V2EntityChronicleRail";
import { V2EntityLinksTab } from "./V2EntityLinksTab";
import { V2TagPatternBadges } from "./V2TagPatternBadges";
import { V2IntelHelpLink } from "./V2IntelHelpLink";
import { V2EntityRunbooksTab } from "./V2EntityRunbooksTab";
import { V2RelationshipChart } from "./V2RelationshipChart";
import {
  V2ContactPill,
  V2LegacyLink,
  V2MetricRows,
  V2MorePeopleHint,
  V2PanelCard,
  V2PanelHeader,
  V2PanelLinkAction,
  V2PersonListItem,
  V2ProjectListItem,
  V2SummaryStatCard,
} from "./V2RightPanel";
import { V2OverviewBinderPulse } from "./V2OverviewBinderPulse";
import type { EvidenceMixSegment } from "@/lib/argus/v2/evidence-mix";
import { LINK_HIERARCHY } from "@/lib/argus/ux-copy";
import {
  TAG_MANAGE_LIST_CLASS,
  TAG_MANAGE_ROW_CLASS,
  TAG_MANAGE_ROW_TRACKER_CLASS,
} from "./tag-manage-list";

const TABS = ["Overview", "Timeline", "Runbooks", "Tags", "Links"] as const;
type OrgTab = (typeof TABS)[number];

function parseOrgTab(raw: string | null): OrgTab {
  if (!raw) return "Overview";
  const hit = TABS.find((t) => t.toLowerCase() === raw.toLowerCase());
  return hit ?? "Overview";
}

export type V2OrgShellProps = {
  entity: Entity;
  privateLocked: boolean;
  privateConfigured: boolean;
  returnTo: string;
  timeline: V2TimelineEntry[];
  neighborhood: V2EntityNeighborhoodGraph;
  linkedPeople: Entity[];
  orgProjects: Entity[];
  recentProjects: Array<{ id: string; name: string; status: string; year: string }>;
  tagPatterns: TagPattern[];
  /** Unique Tags on Notes/emails linked directly to this Organization. */
  directEvidenceTags?: string[];
  /** signalTags ∩ direct Organization evidence (passive Trackers present here). */
  watchedHere?: string[];
  signalTags?: string[];
  stats: {
    emails: number;
    emailsDelta: string;
    people: number;
    projects: number;
    topics: number;
    events: number;
    firstContact: string;
    lastActivity: string;
    isActiveToday: boolean;
  };
  relationshipFacts: Array<{ label: string; value: string }>;
  networkStatus: "Active" | "Dormant" | "Archived";
  sparkline: number[];
  chartStartYear: number;
  chartEndYear: number;
  linkedTopics: Array<{ id: string; name: string; href: string }>;
  linkedEvents: Array<{ id: string; name: string; href: string }>;
  linkModalIds: string[];
  evidenceMix: EvidenceMixSegment[];
  structuralMix: EvidenceMixSegment[];
  runbooks?: Runbook[];
  progressRecords?: RunbookProgress[];
  peerOrganizations?: Array<{ id: string; name: string }>;
  tagVocabulary?: string[];
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function V2OrgShell(props: V2OrgShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseOrgTab(searchParams.get("tab"));
  const {
    entity,
    privateLocked,
    privateConfigured,
    returnTo,
    timeline,
    neighborhood,
    linkedPeople,
    orgProjects,
    recentProjects,
    tagPatterns,
    directEvidenceTags = [],
    watchedHere = [],
    signalTags = [],
    stats,
    networkStatus,
    relationshipFacts,
    sparkline,
    chartStartYear,
    chartEndYear,
    linkedTopics,
    linkedEvents,
    linkModalIds,
    evidenceMix,
    structuralMix,
    runbooks = [],
    progressRecords = [],
    peerOrganizations = [],
    tagVocabulary = [],
  } = props;

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  function setTab(next: OrgTab) {
    replaceParams((params) => {
      if (next === "Overview") params.delete("tab");
      else params.set("tab", next);
      // Keep returnTo so "Back to project" survives tab switches while editing from a project.
      if (next !== "Runbooks") params.delete("runbook");
    });
  }

  const morePeople = Math.max(0, linkedPeople.length - 4);
  const moreProjects = Math.max(0, orgProjects.length - 3);

  return (
    <>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-800/80 pb-px">
        {TABS.map((entry) => {
          const hint =
            entry === "Timeline" && timeline.length > 0
              ? ` · ${timeline.length}`
              : entry === "Runbooks" && runbooks.length > 0
                ? ` · ${runbooks.length}`
                : "";
          return (
            <button
              key={entry}
              type="button"
              onClick={() => setTab(entry)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                tab === entry
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {entry}
              {hint ? <span className="ml-1 text-[11px] tabular-nums text-zinc-600">{hint}</span> : null}
            </button>
          );
        })}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
              <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <V2SummaryStatCard
                  kind="email"
                  value={String(stats.emails)}
                  label="Emails"
                  delta={stats.emailsDelta}
                  href={`/argus/v2/inbox?entity=${entity.id}`}
                />
                <V2SummaryStatCard
                  kind="people"
                  value={String(stats.people)}
                  label="People"
                  href={`/argus/v2/browse/network?org=${entity.id}`}
                  linkLabel="View all"
                />
                <V2SummaryStatCard
                  kind="projects"
                  value={String(stats.projects)}
                  label="Projects"
                  href={`/argus/v2/browse/projects?org=${entity.id}`}
                  linkLabel="View all"
                />
                <V2SummaryStatCard
                  kind="topics"
                  value={String(stats.topics)}
                  label="Topics"
                  href={`/argus/v2/browse/topics?org=${entity.id}`}
                  linkLabel="Browse"
                />
                <V2SummaryStatCard
                  kind="events"
                  value={String(stats.events)}
                  label="Events"
                  href={`/argus/v2/browse/events?entity=${entity.id}`}
                  linkLabel="Browse"
                />
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:w-44 lg:flex-col">
                <V2ContactPill label="First contact" value={stats.firstContact} />
                <V2ContactPill label="Last activity" value={stats.lastActivity} active={stats.isActiveToday} />
              </div>
            </div>

            <V2OverviewBinderPulse
              title="What this organization is made of"
              subtitle="Evidence vs graph binders — same counts as the chips, as one pulse."
              evidenceMix={evidenceMix}
              structuralMix={structuralMix}
              tagPatterns={tagPatterns}
              onOpenTimeline={() => setTab("Timeline")}
              onOpenTags={() => setTab("Tags")}
            />
          </div>

          <aside className="space-y-4">
            <V2PanelCard>
              <V2PanelHeader title="Relationship status" />
              <p className="mb-1 text-3xl font-bold text-zinc-50">{networkStatus}</p>
              <p className="mb-4 text-sm text-zinc-500">
                Derived from evidence dates and follow-ups — same Network vocabulary as people browse.
              </p>
              <V2RelationshipChart points={sparkline} startYear={chartStartYear} endYear={chartEndYear} />
              <div className="border-t border-zinc-800/80 pt-4">
                <V2MetricRows
                  metrics={relationshipFacts.map((m) => ({
                    label: m.label,
                    value: m.value,
                    highlight: false,
                  }))}
                />
              </div>
            </V2PanelCard>

            <V2PrivateEvidenceGate locked={privateLocked} privateConfigured={privateConfigured} returnTo={returnTo}>
              <V2EntityChronicleRail entries={timeline} onOpenChronicle={() => setTab("Timeline")} />
            </V2PrivateEvidenceGate>

            <V2PanelCard>
              <V2PanelHeader
                title="Key People"
                action={
                  linkedPeople.length > 0 ? (
                    <V2PanelLinkAction href={`/argus/v2/network/${entity.id}`}>View all</V2PanelLinkAction>
                  ) : undefined
                }
              />
              {linkedPeople.length === 0 ? (
                <p className="text-sm text-zinc-500">Link people on the organization record.</p>
              ) : (
                <>
                  <ul className="space-y-4">
                    {linkedPeople.slice(0, 4).map((person, index) => (
                      <V2PersonListItem
                        key={person.id}
                        href={`/argus/v2/network/${person.id}`}
                        name={person.name}
                        subtitle={person.alias || "Contact"}
                        initials={initials(person.name)}
                        badge={
                          index === 0 ? (
                            <V2Badge tone="purple">Primary Contact</V2Badge>
                          ) : (
                            <V2Badge tone="default">Contact</V2Badge>
                          )
                        }
                        active
                      />
                    ))}
                  </ul>
                  <V2MorePeopleHint
                    people={linkedPeople.slice(4).map((p) => ({ initials: initials(p.name) }))}
                    moreCount={morePeople}
                  />
                </>
              )}
            </V2PanelCard>

            <V2PanelCard>
              <V2PanelHeader
                title="Recent Projects"
                action={
                  recentProjects.length > 0 ? (
                    <V2PanelLinkAction href="/argus/v2/browse/projects">View all</V2PanelLinkAction>
                  ) : undefined
                }
              />
              {recentProjects.length === 0 ? (
                <p className="text-sm text-zinc-500">Link this org on a project record.</p>
              ) : (
                <>
                  <ul className="space-y-2.5">
                    {recentProjects.map((project) => (
                      <li key={project.id}>
                        <V2ProjectListItem
                          href={`/argus/v2/projects/${project.id}`}
                          name={project.name}
                          status={project.status}
                          year={project.year}
                          statusTone={project.status === "Completed" ? "green" : "blue"}
                        />
                      </li>
                    ))}
                  </ul>
                  {moreProjects > 0 ? (
                    <p className="mt-3 text-xs font-medium text-violet-400">+{moreProjects} more projects</p>
                  ) : null}
                </>
              )}
            </V2PanelCard>

            <V2LegacyLink href={`/argus/v2/network/${entity.id}`}>Open legacy network view →</V2LegacyLink>
          </aside>
        </div>
      ) : null}

      {tab === "Timeline" ? (
        <V2PrivateEvidenceGate locked={privateLocked} privateConfigured={privateConfigured} returnTo={returnTo}>
          <V2EntityTimelineSection
            entries={timeline}
            subtitle="All time · Notes, emails, and linked Topics / Events"
          />
        </V2PrivateEvidenceGate>
      ) : null}

      {tab === "Runbooks" ? (
        <V2EntityRunbooksTab
          level="organization"
          entityId={entity.id}
          linkedRunbooks={runbooks}
          progressRecords={progressRecords}
          peerOrganizations={peerOrganizations}
          tagVocabulary={tagVocabulary}
        />
      ) : null}

      {tab === "Tags" ? (
        <V2PrivateEvidenceGate locked={privateLocked} privateConfigured={privateConfigured} returnTo={returnTo}>
          <section className="space-y-6" aria-label="Organization tags">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Tags in this Organization</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Evidence Tags from Notes and emails linked directly to this Organization. Organizations do not
                  carry binder Tags — structural links stay on Links.
                </p>
              </div>
              <V2IntelHelpLink topic="org-tags" label="Organization Tags" />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">Direct evidence</p>
              {directEvidenceTags.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No Tags on evidence linked directly to this Organization.
                </p>
              ) : (
                <div className={TAG_MANAGE_LIST_CLASS} role="list" aria-label="Direct evidence tags">
                  {directEvidenceTags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/argus/v2/browse/topics?tag=${encodeURIComponent(tag)}&org=${entity.id}`}
                      role="listitem"
                      className={TAG_MANAGE_ROW_CLASS}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-bold text-violet-200"
                        aria-hidden
                      >
                        #
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">#{tag}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-zinc-800/80 pt-5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Patterns</h3>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                  Recurring evidence
                </p>
              </div>
              {tagPatterns.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  {directEvidenceTags.length === 0
                    ? "No recurring Pattern has formed yet — Patterns need repeated Tags on direct evidence."
                    : "Direct evidence Tags are present, but no recurring Pattern has formed yet."}
                </p>
              ) : (
                <V2TagPatternBadges
                  patterns={tagPatterns}
                  signalTags={signalTags}
                  tagHref={(tag) =>
                    `/argus/v2/browse/topics?tag=${encodeURIComponent(tag)}&org=${entity.id}`
                  }
                />
              )}
            </div>

            <div className="space-y-2 border-t border-zinc-800/80 pt-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Watched here</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Journal Trackers that also appear on direct Organization evidence. This Organization does not
                    own Trackers — Flag and Disable stay on Tags.
                  </p>
                </div>
                <Link
                  href="/argus/v2?intel=tags"
                  className="shrink-0 text-[11px] font-medium text-amber-200/90 hover:text-amber-100"
                >
                  Go to Tags →
                </Link>
              </div>
              {watchedHere.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No watched Tags intersect direct evidence for this Organization.
                </p>
              ) : (
                <div className={TAG_MANAGE_LIST_CLASS} role="list" aria-label="Watched tags here">
                  {watchedHere.map((tag) => (
                    <div key={tag} role="listitem" className={TAG_MANAGE_ROW_TRACKER_CLASS}>
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-xs font-bold text-amber-100"
                        aria-hidden
                      >
                        ⚑
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-amber-100">#{tag}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-200/70">
                        Tracker
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </V2PrivateEvidenceGate>
      ) : null}

      {tab === "Links" ? (
        <V2PrivateEvidenceGate locked={privateLocked} privateConfigured={privateConfigured} returnTo={returnTo}>
          <V2EntityLinksTab
            entityId={entity.id}
            linkedIds={linkModalIds}
            helpTopic="org-links"
            helpLabel="Organization Links"
            intro={LINK_HIERARCHY.inboxLinkHint}
            metrics={[
              { icon: "👤", label: "People", count: stats.people },
              { icon: "📁", label: "Proj", count: stats.projects },
              { icon: "🏷", label: "Topics", count: stats.topics },
              { icon: "📅", label: "Events", count: stats.events },
            ]}
            sections={[
              {
                title: "People",
                linkLabel: "Link person",
                initialFilter: "person",
                subtitle: LINK_HIERARCHY.topicLinkPeople,
                browseHref: `/argus/v2/browse/network?org=${entity.id}`,
                entities: linkedPeople.map((p) => ({
                  id: p.id,
                  name: p.name,
                  href: `/argus/v2/network/${p.id}`,
                  icon: "👤",
                  meta: p.alias || undefined,
                })),
              },
              {
                title: "Projects",
                linkLabel: "Link project",
                initialFilter: "project",
                subtitle: LINK_HIERARCHY.topicLinkProjects,
                browseHref: `/argus/v2/browse/projects?org=${entity.id}`,
                entities: orgProjects.map((p) => ({
                  id: p.id,
                  name: p.name,
                  href: `/argus/v2/projects/${p.id}`,
                  icon: "📁",
                  meta: p.endDate?.slice(0, 4) || p.startDate?.slice(0, 4),
                })),
              },
              {
                title: "Topics",
                linkLabel: "Link topic",
                initialFilter: "topic",
                subtitle: "Link Topics related to this organization.",
                browseHref: `/argus/v2/browse/topics?org=${entity.id}`,
                entities: linkedTopics.map((t) => ({ ...t, icon: "🏷" })),
                tone: "topic",
              },
              {
                title: "Events",
                linkLabel: "Link event",
                initialFilter: "event",
                subtitle: LINK_HIERARCHY.topicLinkEvents,
                browseHref: `/argus/v2/browse/events?entity=${entity.id}`,
                entities: linkedEvents.map((e) => ({ ...e, icon: "📅" })),
                tone: "event",
              },
            ]}
            evidenceCounts={[{ label: "Emails", value: stats.emails }]}
            neighborhood={neighborhood}
            entityName={entity.name}
            tagPatterns={tagPatterns}
            signalTags={signalTags}
            // ORDER 001: Org does not use binder Tags — structural links only.
            manualTags={[]}
            tagHref={(tag) => `/argus/v2/browse/topics?tag=${encodeURIComponent(tag)}&org=${entity.id}`}
            tagsHeading="Linked to this Organization"
          />
        </V2PrivateEvidenceGate>
      ) : null}
    </>
  );
}
