/** Shared evidence-mix segments for Overview pulse + Topic Event quick view (experimental donut). */

export type EvidenceMixSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export const EVIDENCE_MIX_COLORS = {
  notes: "#a78bfa",
  emails: "#38bdf8",
  events: "#fb7185",
  people: "#34d399",
  topics: "#fbbf24",
  attachments: "#a1a1aa",
} as const;

export function buildEvidenceMix(parts: {
  notes?: number;
  emails?: number;
  events?: number;
  people?: number;
  topics?: number;
  attachments?: number;
}): EvidenceMixSegment[] {
  const segments: EvidenceMixSegment[] = [];
  if ((parts.notes ?? 0) > 0) {
    segments.push({ key: "notes", label: "Notes", value: parts.notes!, color: EVIDENCE_MIX_COLORS.notes });
  }
  if ((parts.emails ?? 0) > 0) {
    segments.push({ key: "emails", label: "Emails", value: parts.emails!, color: EVIDENCE_MIX_COLORS.emails });
  }
  if ((parts.events ?? 0) > 0) {
    segments.push({ key: "events", label: "Events", value: parts.events!, color: EVIDENCE_MIX_COLORS.events });
  }
  if ((parts.people ?? 0) > 0) {
    segments.push({ key: "people", label: "People", value: parts.people!, color: EVIDENCE_MIX_COLORS.people });
  }
  if ((parts.topics ?? 0) > 0) {
    segments.push({ key: "topics", label: "Topics", value: parts.topics!, color: EVIDENCE_MIX_COLORS.topics });
  }
  if ((parts.attachments ?? 0) > 0) {
    segments.push({
      key: "attachments",
      label: "Files",
      value: parts.attachments!,
      color: EVIDENCE_MIX_COLORS.attachments,
    });
  }
  return segments;
}

export function evidenceMixTotal(segments: EvidenceMixSegment[]): number {
  return segments.reduce((sum, s) => sum + s.value, 0);
}
