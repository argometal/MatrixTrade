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

/** Match evidence tags, topic aliases, or topic name — same rules as inbox tag filter. */
export function evidenceTagsMatchFilter(
  evidenceTags: string[],
  aliases: string[],
  name: string,
  tag: string
): boolean {
  const normalized = tag.trim().toLowerCase();
  const normCompact = normalizeSignalToken(normalized);
  if (evidenceTags.some((value) => value.toLowerCase() === normalized)) return true;
  if (aliases.some((value) => value.toLowerCase() === normalized)) return true;
  if (normalizeSignalToken(name) === normCompact) return true;
  if (
    aliases.some((value) => normalizeSignalToken(value) === normCompact) ||
    evidenceTags.some((value) => normalizeSignalToken(value) === normCompact)
  ) {
    return true;
  }
  return false;
}
