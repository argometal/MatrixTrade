/** Network dialogue thesis — prompts and flow for contact-first UX. See md/argus/network-intelligence-thesis.md */

export const NETWORK_DIALOGUE_PILLARS = [
  { id: "trust", label: "Trust", hint: "Show up. Be consistent. Keep your word." },
  { id: "help", label: "Help", hint: "Connect, share opportunity, listen — not self-promo." },
  { id: "learn", label: "Learn", hint: "Build a map of their world." },
  { id: "patterns", label: "Patterns", hint: "One chat is noise; many chats are signal." },
] as const;

export const NETWORK_OPENING_QUESTIONS = [
  "What are you working on now?",
  "How do you see your industry in 3–5 years?",
  "What is changing?",
  "What worries you?",
  "Where do you see opportunities?",
  "If you started today, what would you do differently?",
  "What skill do you think will matter most?",
  "What problem is nobody seeing yet?",
] as const;

export const NETWORK_CONTACT_FLOW = [
  { step: 1, label: "Prepare", detail: "Know who they are — role, org, context." },
  { step: 2, label: "Open", detail: "Start with substance, not small talk." },
  { step: 3, label: "Listen", detail: "Their view, problems, opportunities." },
  { step: 4, label: "Help", detail: "Perspective, intro, or resource — if natural." },
  { step: 5, label: "Record", detail: "Register what you learned while fresh." },
  { step: 6, label: "Patterns", detail: "Intelligence emerges across many conversations." },
] as const;

export const NETWORK_CAPTURE_LENSES = [
  "What are they seeing?",
  "What problem do they detect?",
  "What opportunity do they see?",
  "What skill matters to them?",
  "Who should know whom?",
  "What can I contribute?",
] as const;

export function personHasContactEvidence(timelineCount: number): boolean {
  return timelineCount > 0;
}
