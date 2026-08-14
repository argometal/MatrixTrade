"use client";

import type { Runbook, RunbookProgress } from "@/lib/argus/types";
import { V2EntityRunbooksTab } from "./V2EntityRunbooksTab";

/** Project Runbooks tab — linked templates + per-project progress. */
export function V2ProjectRunbooksTab({
  runbooks,
  projectId,
  libraryRunbooks = [],
  progressRecords = [],
  organizationId,
  organizationName,
  suggestionTags = [],
  tagVocabulary = [],
}: {
  runbooks: Runbook[];
  projectId: string;
  libraryRunbooks?: Runbook[];
  progressRecords?: RunbookProgress[];
  organizationId?: string;
  organizationName?: string;
  suggestionTags?: string[];
  tagVocabulary?: string[];
}) {
  return (
    <V2EntityRunbooksTab
      level="project"
      entityId={projectId}
      linkedRunbooks={runbooks}
      libraryRunbooks={libraryRunbooks}
      progressRecords={progressRecords}
      organizationId={organizationId}
      organizationName={organizationName}
      suggestionTags={suggestionTags}
      tagVocabulary={tagVocabulary}
    />
  );
}
