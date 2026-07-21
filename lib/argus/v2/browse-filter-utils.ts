import { normalizeSignalToken } from "./topic-signals";

/** Shared text search for v2 browse lists (topics, network, etc.). */
export function textMatchesBrowseQuery(
  query: string,
  fields: Array<string | undefined | null>
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const compact = normalizeSignalToken(q);
  for (const field of fields) {
    const value = field?.trim().toLowerCase();
    if (!value) continue;
    if (value.includes(q)) return true;
    if (compact.length >= 2 && normalizeSignalToken(value).includes(compact)) return true;
  }
  return false;
}

/** Topics browse: tag chips come from evidence only — Aliases do not inflate tag filters. */
export function topicBrowseTagMatch(evidenceTags: string[], name: string, tag: string): boolean {
  const normalized = tag.trim().toLowerCase();
  const normCompact = normalizeSignalToken(normalized);
  if (evidenceTags.some((value) => value.toLowerCase() === normalized)) return true;
  if (normalizeSignalToken(name) === normCompact) return true;
  if (evidenceTags.some((value) => normalizeSignalToken(value) === normCompact)) return true;
  return false;
}

/** Inbox row filter — may match Aliases / context for finding linked mail. */
export function evidenceTagsMatchFilter(
  evidenceTags: string[],
  aliases: string[],
  name: string,
  tag: string
): boolean {
  if (topicBrowseTagMatch(evidenceTags, name, tag)) return true;
  const normalized = tag.trim().toLowerCase();
  const normCompact = normalizeSignalToken(normalized);
  if (aliases.some((value) => value.toLowerCase() === normalized)) return true;
  if (
    aliases.some((value) => normalizeSignalToken(value) === normCompact)
  ) {
    return true;
  }
  return false;
}
