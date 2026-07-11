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

/** Lightweight conversation playbook — technique, not interrogation. No auto-tags or scoring. */
export type NetworkPlaybookPhase = {
  id: string;
  title: string;
  when: string;
  ideas: string[];
  note?: string;
};

export const NETWORK_CONVERSATION_PLAYBOOK: NetworkPlaybookPhase[] = [
  {
    id: "mindset",
    title: "Mindset (5 min is enough)",
    when: "Before you reach out",
    ideas: [
      "Goal: leave them with one useful thought — not extract data.",
      "You are not interviewing. One good question beats eight.",
      "Value can be listening, a perspective, or an intro — not always advice.",
    ],
  },
  {
    id: "open",
    title: "If they want to talk",
    when: "Conversation is flowing",
    ideas: [
      "What are you focused on right now?",
      "What is changing in your world?",
      "How do you see your industry in a few years?",
      "What would you do differently if you started today?",
    ],
    note: "Pick one that fits the moment. Follow their answer — do not queue the next question.",
  },
  {
    id: "busy",
    title: "If they do not want to talk",
    when: "Short answers, no time, cold tone",
    ideas: [
      "Totally fair — I will keep this brief.",
      "No need for a long chat; I wanted to reconnect respectfully.",
      "Happy to catch you another time — what is the best way to reach you?",
    ],
    note: "Leave well. A graceful exit protects the relationship for later.",
  },
  {
    id: "help",
    title: "When to help",
    when: "You heard a real need or friction",
    ideas: [
      "Only offer if you can be specific — vague help feels salesy.",
      "Would it help if I shared X / introduced you to Y?",
      "I know someone dealing with something similar — want a intro?",
      "I can send a short note on Z — no obligation.",
    ],
    note: "Ask permission. Unsolicited fixes feel like pressure.",
  },
  {
    id: "connect",
    title: "When to connect people",
    when: "Clear mutual benefit for both sides",
    ideas: [
      "Not at hello — connect after you understand both contexts.",
      "Both people should gain; you are the bridge, not the hero.",
      "Brief both sides before making the intro.",
    ],
  },
  {
    id: "close",
    title: "Close with value",
    when: "Last 2 minutes — 5 or 45 min both work",
    ideas: [
      "One thing I took from this: …",
      "If anything useful comes up on my side, I will pass it along.",
      "Thanks for your time — really appreciated your view on …",
    ],
  },
  {
    id: "record",
    title: "After — register while fresh",
    when: "Right after the conversation",
    ideas: [
      "What stood out (one line)?",
      "Anything I can help with later?",
      "Anyone they should meet?",
    ],
    note: "Grades and relationship overview come later. This is just your memory.",
  },
];

export function networkConversationNoteTemplate(personName?: string): string {
  const who = personName?.trim() || "Contact";
  return [
    `Conversation with ${who}`,
    "",
    "What they're focused on:",
    "",
    "What stood out:",
    "",
    "How I might help (if anything):",
    "",
    "Follow-up (optional):",
    "",
  ].join("\n");
}

export function selectedIncludesPerson(
  entities: Array<{ id: string; type: string }>,
  selectedIds: string[]
): boolean {
  return selectedIds.some((id) => entities.find((e) => e.id === id)?.type === "person");
}
