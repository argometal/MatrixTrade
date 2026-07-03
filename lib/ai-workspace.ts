/**
 * Provider-neutral AI Workspace constants.
 * Default web entry — user may use any assistant.
 */

/** Web entry point when "Open Assistant" is clicked. Override via ASSISTANT_WEB_URL in .env.local */
export function getAssistantWebUrl(): string {
  const custom = process.env.ASSISTANT_WEB_URL?.trim();
  if (custom) return custom.replace(/\/$/, "");
  return "https://chatgpt.com";
}

/**
 * Future: pre-fill assistant composer (web only, manual send required).
 * NOT used in v1 — see md/integrations/ai-workspace-deeplinks.md
 */
export function buildAssistantPrefillUrl(instructions: string): string {
  const base = getAssistantWebUrl();
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}q=${encodeURIComponent(instructions)}`;
}

export const AI_WORKFLOW_STEPS = [
  "Sync to Worker (System → Bridge)",
  "Open Assistant",
  "Scan QR or paste Snapshot URL in your assistant",
  "Assistant analyzes snapshot",
  "Assistant sends proposals to Worker inbox",
  "Review → Inbox → Apply",
] as const;

export const ANALYSIS_TEMPLATES = [
  "Review my experiment state. What should I focus on next?",
  "Which mistakes cost me the most? What rule should I add?",
  "Compare my playbooks — which should I keep, improve, or retire?",
  "Review unreviewed trades and suggest review priorities.",
  "Analyze snapshot revision and flag inconsistencies.",
] as const;
