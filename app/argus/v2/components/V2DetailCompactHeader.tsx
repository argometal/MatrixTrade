"use client";

import type { ReactNode } from "react";

/**
 * Detail header wrapper.
 *
 * Compact / “Details · Hide header” chrome is disabled — it pinned a persistent
 * upper bar and left almost no scroll room (especially A06 Topics full detail).
 * Always render the full expanded header; pages scroll the chrome with content.
 */
export function V2DetailCompactHeader({
  expanded,
}: {
  mobileDetail?: boolean;
  compact?: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
  expanded: ReactNode;
  collapsedExtra?: ReactNode;
}) {
  return <div>{expanded}</div>;
}
