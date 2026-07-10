"use client";

import { useEffect } from "react";
import { recordRecentEntity, type V2RecentEntityKind } from "@/lib/argus/v2/recent-entities";

export function V2RecordRecentEntity({
  id,
  kind,
  label,
  href,
}: {
  id: string;
  kind: V2RecentEntityKind;
  label: string;
  href: string;
}) {
  useEffect(() => {
    if (!id || !label.trim()) return;
    recordRecentEntity({ id, kind, label: label.trim(), href });
  }, [href, id, kind, label]);

  return null;
}
