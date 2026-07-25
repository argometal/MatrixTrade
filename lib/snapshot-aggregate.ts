/**
 * Read-only aggregate snapshot projection.
 * Assembles existing SnapshotMenuItem text at copy time — no persistence, no mutation.
 * Originating Prompt ID: 24-30
 */

import type { SnapshotMenuItem } from "./snapshot-types";
import { wrapSnapshotText } from "./snapshot-verification";

/** Stable id prefix for aggregate ("Snapshot general") items. */
export const AGGREGATE_SNAPSHOT_ID_PREFIX = "snapshot-general";

export function isAggregateSnapshotItem(
  item: Pick<SnapshotMenuItem, "id"> | null | undefined
): boolean {
  if (!item?.id) return false;
  return (
    item.id === AGGREGATE_SNAPSHOT_ID_PREFIX ||
    item.id.startsWith(`${AGGREGATE_SNAPSHOT_ID_PREFIX}:`) ||
    item.id.startsWith(`${AGGREGATE_SNAPSHOT_ID_PREFIX}-`)
  );
}

/** Eligible modular sources — aggregates never collect other aggregates. */
export function collectEligibleSnapshotItems(
  items: SnapshotMenuItem[]
): SnapshotMenuItem[] {
  return items.filter((item) => !isAggregateSnapshotItem(item));
}

/**
 * Concatenate eligible child snapshot texts in given order with clear section headers.
 * Pure — does not edit children, invent content, or write state.
 */
export function buildAggregateSnapshotText(
  levelLabel: string,
  items: SnapshotMenuItem[]
): string {
  const eligible = collectEligibleSnapshotItems(items);
  const sections = eligible.map((item, index) => {
    const header = [
      `### SOURCE ${index + 1}/${eligible.length}`,
      `id: ${item.id}`,
      `label: ${item.label}`,
      item.description ? `description: ${item.description}` : null,
      "",
      item.text.trim(),
    ]
      .filter((line) => line !== null)
      .join("\n");
    return header;
  });

  const body = [
    `Snapshot general · ${levelLabel}`,
    "Read-only projection of the known snapshot universe at this menu level.",
    "Independent child snapshots remain the canonical sources — this copy does not replace them.",
    "No analysis, persistence, Apply, or Accept.",
    "",
    ...sections.flatMap((section, i) =>
      i === 0 ? [section] : ["", "----------", "", section]
    ),
  ].join("\n");

  return wrapSnapshotText(`Snapshot general · ${levelLabel}`, body);
}

export function buildAggregateSnapshotItem(
  levelKey: string,
  levelLabel: string,
  items: SnapshotMenuItem[]
): SnapshotMenuItem | null {
  const eligible = collectEligibleSnapshotItems(items);
  if (eligible.length === 0) return null;
  return {
    id: `${AGGREGATE_SNAPSHOT_ID_PREFIX}:${levelKey}`,
    label: "Snapshot general",
    description: `Read-only copy of all snapshots under ${levelLabel}`,
    text: buildAggregateSnapshotText(levelLabel, eligible),
  };
}

/**
 * Prepend Snapshot general. Child list is returned unchanged (aggregates stripped if present).
 * Does not nest aggregates inside aggregates.
 */
export function withLeadingAggregateSnapshot(
  levelKey: string,
  levelLabel: string,
  items: SnapshotMenuItem[]
): SnapshotMenuItem[] {
  const base = collectEligibleSnapshotItems(items);
  const aggregate = buildAggregateSnapshotItem(levelKey, levelLabel, base);
  if (!aggregate) return base;
  return [aggregate, ...base];
}
