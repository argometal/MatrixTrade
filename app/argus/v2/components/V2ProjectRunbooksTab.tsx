"use client";

import type { Runbook, RunbookProgress } from "@/lib/argus/types";
import { V2EntityRunbooksTab } from "./V2EntityRunbooksTab";

/** Project Runbooks tab — linked templates + per-project progress. */
export function V2ProjectRunbooksTab({
  runbooks,
  projectId,
  libraryRunbooks = [],
  progressRecords = [],
}: {
  runbooks: Runbook[];
  projectId: string;
  libraryRunbooks?: Runbook[];
  progressRecords?: RunbookProgress[];
}) {
  return (
    <V2EntityRunbooksTab
      level="project"
      entityId={projectId}
      linkedRunbooks={runbooks}
      libraryRunbooks={libraryRunbooks}
      progressRecords={progressRecords}
    />
  );
}
