import type { ArgusData, Entity, InboxItem, Log } from "./types";
import { isDateWithinRange } from "./link-hierarchy";
import {
  getInboxCardsForEntity,
  getLinkedInboxForEntity,
} from "./entity-evidence";
import { getEntityHistory } from "./network";
import { getInboxItems, readArgus } from "./server-storage";
import { filterPrivateInbox } from "./private-access";
import { isActiveRecord } from "./supabase-protection/protected-counts";
import { enrichInboxItems, type EnrichedInboxItem } from "./inbox-enrich";

function projectPeople(project: Entity): Set<string> {
  return new Set(project.linkedPersonIds ?? []);
}

function inProjectDateRange(iso: string, project: Entity): boolean {
  if (!project.startDate && !project.endDate) return true;
  return isDateWithinRange(iso.slice(0, 10), project.startDate, project.endDate);
}

function inboxLinkedToAny(inbox: InboxItem, ids: Set<string>): boolean {
  return (inbox.linkedEntityIds ?? []).some((id) => ids.has(id));
}

/** Emails linked directly to the project entity. */
export function getDirectProjectInbox(
  inboxItems: InboxItem[],
  projectId: string,
  includePrivate = false
): InboxItem[] {
  return getLinkedInboxForEntity(inboxItems, projectId, includePrivate);
}

/** Emails linked to project contacts (not the project) within the project date range. */
export function getViaContactProjectInbox(
  inboxItems: InboxItem[],
  project: Entity,
  includePrivate = false
): InboxItem[] {
  const people = projectPeople(project);
  if (people.size === 0) return [];

  const directIds = new Set(
    getDirectProjectInbox(inboxItems, project.id, includePrivate).map((item) => item.id)
  );

  return filterPrivateInbox(
    inboxItems
      .filter(isActiveRecord)
      .filter((item) => item.status !== "archived")
      .filter((item) => !directIds.has(item.id))
      .filter((item) => !(item.linkedEntityIds ?? []).includes(project.id))
      .filter((item) => inboxLinkedToAny(item, people))
      .filter((item) => inProjectDateRange(item.receivedAt, project))
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
    includePrivate
  );
}

export function getAllProjectScopeInbox(
  inboxItems: InboxItem[],
  project: Entity,
  includePrivate = false
): InboxItem[] {
  return [
    ...getDirectProjectInbox(inboxItems, project.id, includePrivate),
    ...getViaContactProjectInbox(inboxItems, project, includePrivate),
  ];
}

export function getProjectHomeCounts(
  project: Entity,
  logs: Log[],
  inboxItems: InboxItem[],
  includePrivate = false
): { logCount: number; inboxCount: number; linkedCount: number } {
  const inboxCount = getAllProjectScopeInbox(inboxItems, project, includePrivate).length;
  const directLogCount = logs.filter((log) => log.entityIds.includes(project.id)).length;
  const people = projectPeople(project);
  const viaLogCount =
    people.size === 0
      ? 0
      : logs.filter(
          (log) =>
            !log.entityIds.includes(project.id) &&
            log.entityIds.some((id) => people.has(id)) &&
            inProjectDateRange(log.date, project)
        ).length;
  const logCount = directLogCount + viaLogCount;
  return { logCount, inboxCount, linkedCount: logCount + inboxCount };
}

function getDirectProjectLogs(
  data: ArgusData,
  projectId: string,
  includePrivate: boolean
): Log[] {
  return getEntityHistory(data, projectId, includePrivate);
}

function getViaContactProjectLogs(
  data: ArgusData,
  project: Entity,
  includePrivate: boolean
): Log[] {
  const people = projectPeople(project);
  if (people.size === 0) return [];

  const visibleLogs = includePrivate ? data.logs : data.logs.filter((log) => !log.private);
  const directLogIds = new Set(
    getDirectProjectLogs(data, project.id, includePrivate).map((log) => log.id)
  );

  return visibleLogs
    .filter((log) => !directLogIds.has(log.id))
    .filter((log) => !log.entityIds.includes(project.id))
    .filter((log) => log.entityIds.some((id) => people.has(id)))
    .filter((log) => inProjectDateRange(log.date, project))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getProjectEvidenceScope(
  data: ArgusData,
  inboxItems: InboxItem[],
  project: Entity,
  includePrivate: boolean
) {
  const directInboxAll = getDirectProjectInbox(inboxItems, project.id, includePrivate);
  const viaContactInboxAll = getViaContactProjectInbox(inboxItems, project, includePrivate);
  const directInbox = getInboxCardsForEntity(inboxItems, project.id, includePrivate);
  const viaContactInbox = viaContactInboxAll.filter(
    (item) => item.status === "pending" || item.status === "linked"
  );

  const directLogs = getDirectProjectLogs(data, project.id, includePrivate);
  const viaContactLogs = getViaContactProjectLogs(data, project, includePrivate);

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

export async function loadEnrichedProjectEvidence(
  project: Entity,
  includePrivate: boolean
): Promise<{
  directInbox: InboxItem[];
  viaContactInbox: InboxItem[];
  directLogs: Log[];
  viaContactLogs: Log[];
  enrichedInbox: EnrichedInboxItem[];
  viaContactEnrichedInbox: EnrichedInboxItem[];
  emailCount: number;
  logCount: number;
  totalCount: number;
}> {
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const scope = getProjectEvidenceScope(data, inboxItems, project, includePrivate);
  const [enrichedInbox, viaContactEnrichedInbox] = await Promise.all([
    enrichInboxItems(scope.directInbox),
    enrichInboxItems(scope.viaContactInbox),
  ]);

  return {
    ...scope,
    enrichedInbox,
    viaContactEnrichedInbox,
  };
}
