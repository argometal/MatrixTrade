/** Bookends for large snapshots — user verifies start and end only. */
export function wrapSnapshotText(label: string, body: string): string {
  const tag = label.trim().toUpperCase();
  if (!tag) return body.trim();
  return `=== ${tag} ===\n\n${body.trim()}\n\n=== END ${tag} ===`;
}

/** Primary button title when an entity anchors the snapshot menu. */
export function snapshotButtonTitle(
  entity: string | undefined,
  kind: string
): string {
  const e = entity?.trim();
  if (!e) return kind;
  return `${e} · ${kind}`;
}
