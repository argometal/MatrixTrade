import type { ArgusData, Entity, InboxItem, Log } from "./types";
import { isDateWithinRange } from "./link-hierarchy";
import { getInboxCardsForEntity, getLinkedInboxForEntity } from "./inbox-entity-links";
import { getEntityHistory } from "./network";
import { filterPrivateInbox } from "./private-access";
import { isActiveRecord } from "./supabase-protection/protected-counts";

export type ProjectScopeOptions = {
  /** When true (default), evidence outside project start/end dates is excluded. */
  respectProjectDates?: boolean;
};

function projectPeople(project: Entity): Set<string> {
  return new Set(project.linkedPersonIds ?? []);
}

function inProjectDateRange(iso: string, project: Entity, respectProjectDates: boolean): boolean {
  if (!respectProjectDates) return true;
  if (!project.startDate && !project.endDate) return true;
  return isDateWithinRange(iso.slice(0, 10), project.startDate, project.endDate);
}

function inboxLinkedToAny(inbox: InboxItem, ids: Set<string>): boolean {
  return (inbox.linkedEntityIds ?? []).some((id) => ids.has(id));
}

function scopeOpts(options?: ProjectScopeOptions): boolean {
  return options?.respectProjectDates !== false;
}

/** Emails linked directly to the project entity. */
export function getDirectProjectInbox(
  inboxItems: InboxItem[],
  projectId: string,
  includePrivate = false,
  project?: Entity,
  options?: ProjectScopeOptions
): InboxItem[] {
  const items = getLinkedInboxForEntity(inboxItems, projectId, includePrivate);
  if (!project) return items;
  const respect = scopeOpts(options);
  return items.filter((item) => inProjectDateRange(item.receivedAt, project, respect));
}

/** Emails linked to project contacts (not the project) within the project date range. */
export function getViaContactProjectInbox(
  inboxItems: InboxItem[],
  project: Entity,
  includePrivate = false,
  options?: ProjectScopeOptions
): InboxItem[] {
  const people = projectPeople(project);
  if (people.size === 0) return [];
  const respect = scopeOpts(options);

  const directIds = new Set(
    getLinkedInboxForEntity(inboxItems, project.id, includePrivate).map((item) => item.id)
  );

  return filterPrivateInbox(
    inboxItems
      .filter(isActiveRecord)
      .filter((item) => item.status !== "archived")
      .filter((item) => !directIds.has(item.id))
      .filter((item) => !(item.linkedEntityIds ?? []).includes(project.id))
      .filter((item) => inboxLinkedToAny(item, people))
      .filter((item) => inProjectDateRange(item.receivedAt, project, respect))
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
    includePrivate
  );
}

export function getAllProjectScopeInbox(
  inboxItems: InboxItem[],
  project: Entity,
  includePrivate = false,
  options?: ProjectScopeOptions
): InboxItem[] {
  return [
    ...getDirectProjectInbox(inboxItems, project.id, includePrivate, project, options),
    ...getViaContactProjectInbox(inboxItems, project, includePrivate, options),
  ];
}

export function getProjectHomeCounts(
  project: Entity,
  logs: Log[],
  inboxItems: InboxItem[],
  includePrivate = false,
  options?: ProjectScopeOptions
): { logCount: number; inboxCount: number; linkedCount: number } {
  const inboxCount = getAllProjectScopeInbox(inboxItems, project, includePrivate, options).length;
  const respect = scopeOpts(options);
  const directLogCount = logs.filter(
    (log) => log.entityIds.includes(project.id) && inProjectDateRange(log.date, project, respect)
  ).length;
  const people = projectPeople(project);
  const viaLogCount =
    people.size === 0
      ? 0
      : logs.filter(
          (log) =>
            !log.entityIds.includes(project.id) &&
            log.entityIds.some((id) => people.has(id)) &&
            inProjectDateRange(log.date, project, respect)
        ).length;
  const logCount = directLogCount + viaLogCount;
  return { logCount, inboxCount, linkedCount: logCount + inboxCount };
}

function getDirectProjectLogs(
  data: ArgusData,
  project: Entity,
  includePrivate: boolean,
  options?: ProjectScopeOptions
): Log[] {
  const respect = scopeOpts(options);
  return getEntityHistory(data, project.id, includePrivate).filter((log) =>
    inProjectDateRange(log.date, project, respect)
  );
}

function getViaContactProjectLogs(
  data: ArgusData,
  project: Entity,
  includePrivate: boolean,
  options?: ProjectScopeOptions
): Log[] {
  const people = projectPeople(project);
  if (people.size === 0) return [];
  const respect = scopeOpts(options);

  const visibleLogs = includePrivate ? data.logs : data.logs.filter((log) => !log.private);
  const directLogIds = new Set(
    getDirectProjectLogs(data, project, includePrivate, options).map((log) => log.id)
  );

  return visibleLogs
    .filter((log) => !directLogIds.has(log.id))
    .filter((log) => !log.entityIds.includes(project.id))
    .filter((log) => log.entityIds.some((id) => people.has(id)))
    .filter((log) => inProjectDateRange(log.date, project, respect))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getProjectEvidenceScope(
  data: ArgusData,
  inboxItems: InboxItem[],
  project: Entity,
  includePrivate: boolean,
  options?: ProjectScopeOptions
) {
  const directInboxAll = getDirectProjectInbox(inboxItems, project.id, includePrivate, project, options);
  const viaContactInboxAll = getViaContactProjectInbox(inboxItems, project, includePrivate, options);
  const directInbox = getInboxCardsForEntity(inboxItems, project.id, includePrivate).filter((item) =>
    inProjectDateRange(item.receivedAt, project, scopeOpts(options))
  );
  const viaContactInbox = viaContactInboxAll.filter(
    (item) => item.status === "pending" || item.status === "linked"
  );

  const directLogs = getDirectProjectLogs(data, project, includePrivate, options);
  const viaContactLogs = getViaContactProjectLogs(data, project, includePrivate, options);

  const emailCount = directInboxAll.length + viaContactInboxAll.length;
  const logCount = directLogs.length + viaContactLogs.length;

  return {
    directInbox,
    viaContactInbox,
    directLogs,
    viaContactLogs,
    emailCount,
    logCount,
    totalCount: emailCount + logCount,
  };
}
