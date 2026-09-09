function stripSnapshotEnvelope(text: string): string {
  return text
    .replace(/^=== [^\n]+ ===\s*/m, "")
    .replace(/\s*=== END [^\n]+ ===\s*$/m, "")
    .trim();
}

function extractSection(text: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^--- ${escaped} ---\\n[\\s\\S]*?)(?=\\n--- |$)`, "m");
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function removeSection(text: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .replace(new RegExp(`\\n?--- ${escaped} ---\\n[\\s\\S]*?(?=\\n--- |$)`, "m"), "")
    .trim();
}

export function composeUnifiedSnapshot(input: {
  caseSnapshotText?: string | null;
  insightsSnapshotText: string;
}): string {
  const insightsBody = stripSnapshotEnvelope(input.insightsSnapshotText);

  if (!input.caseSnapshotText) {
    const compactInsights = removeSection(insightsBody, "2. CASES");
    return `=== SNAPSHOT ===\n\n${compactInsights}\n\n=== END SNAPSHOT ===\n`;
  }

  const caseBody = stripSnapshotEnvelope(input.caseSnapshotText);
  const universe = extractSection(insightsBody, "1. UNIVERSE");
  const learning = extractSection(insightsBody, "3. LEARNING");
  const attention = extractSection(insightsBody, "4. ATTENTION");

  const sections = [
    `--- FOCUS ---\n${caseBody}`,
    universe,
    learning,
    attention,
  ].filter(Boolean);

  return `=== SNAPSHOT ===\n\n${sections.join("\n\n")}\n\n=== END SNAPSHOT ===\n`;
}
