/** Static preview data for /argus/v2 design shells — replace with live data during migration. */

export type V2TimelineKind = "journal" | "email" | "meeting" | "event";

export interface V2TimelineEntry {
  id: string;
  date: string;
  time?: string;
  kind: V2TimelineKind;
  journalSubtype?: "log" | "note";
  title: string;
  body?: string;
  tags?: string[];
  author?: string;
  protected?: boolean;
}

export interface V2PersonPreview {
  id: string;
  name: string;
  role: string;
  initials: string;
  status?: "active" | "away";
}

export interface V2ProjectPreview {
  id: string;
  name: string;
  status: "In Progress" | "Completed" | "Planning";
  year: string;
}

export const V2_NAV_COUNTS = {
  inbox: 12,
  organizations: 42,
  projects: 31,
  people: 124,
  topics: 68,
  events: 18,
  network: 24,
  followUps: 7,
  reminders: 5,
} as const;

export const V2_HOME_STATS = [
  { label: "Journal Entries", value: "1,247", delta: "+18 this week", icon: "journal" as const },
  { label: "Emails", value: "892", delta: "+11 this week", icon: "email" as const },
  { label: "People", value: "124", delta: "+3 this week", icon: "people" as const },
  { label: "Organizations", value: "42", delta: "+2 this week", icon: "org" as const },
  { label: "Projects", value: "31", delta: "No change", icon: "project" as const },
];

export const V2_RECENT_ACTIVITY = [
  {
    id: "ra1",
    title: "Daily Log — Drilling performance discussion",
    meta: "Well A · Log · Victor Alejandro",
    time: "18:40",
    kind: "journal" as const,
  },
  {
    id: "ra2",
    title: "Re: BHA vibration analysis results",
    meta: "Email · Earl Leal · Petronas",
    time: "Yesterday",
    kind: "email" as const,
  },
  {
    id: "ra3",
    title: "Suriname campaign kickoff meeting",
    meta: "Meeting · Petronas · 4 attendees",
    time: "Yesterday",
    kind: "meeting" as const,
  },
  {
    id: "ra4",
    title: "Follow-up — contract terms review",
    meta: "Note · Pawel Wlodarczyk",
    time: "Jun 29",
    kind: "journal" as const,
  },
];

export const V2_FOLLOW_UPS = [
  { id: "fu1", title: "Follow up with Earl about ROP data", due: "Overdue", tone: "danger" as const },
  { id: "fu2", title: "Send report to Petronas team", due: "Due soon", tone: "warning" as const },
  { id: "fu3", title: "Review contract terms", due: "Upcoming", tone: "muted" as const },
];

export const V2_HOME_TIMELINE: V2TimelineEntry[] = [
  {
    id: "ht1",
    date: "2026-06-29",
    time: "18:40",
    kind: "journal",
    journalSubtype: "log",
    title: "Daily Log — Day 32",
    body: "ROP improved after BHA change. Vibration levels within acceptable range.",
    tags: ["Well A"],
    author: "Victor Alejandro",
  },
  {
    id: "ht2",
    date: "2026-06-29",
    time: "14:22",
    kind: "email",
    title: "Email from Earl Leal",
    body: "Re: BHA vibration analysis — attached the latest MWD data for review.",
    tags: ["Petronas"],
  },
  {
    id: "ht3",
    date: "2026-06-28",
    time: "10:00",
    kind: "meeting",
    title: "Weekly ops review",
    body: "Discussed NPT reduction plan and next BHA run.",
    tags: ["Operations"],
    protected: true,
  },
];

export const V2_ENTITY_ROWS = {
  organizations: [
    { name: "Petronas", type: "Oil & Gas Company", people: 186, last: "Today", active: true },
    { name: "ExxonMobil", type: "Oil & Gas Company", people: 94, last: "2d ago", active: true },
    { name: "Halliburton", type: "Service Company", people: 42, last: "1w ago", active: false },
  ],
  projects: [
    { name: "Well A — BHA Optimization", type: "Drilling", people: 8, last: "Today", active: true },
    { name: "Suriname Drilling Campaign", type: "Campaign", people: 14, last: "Yesterday", active: true },
  ],
  people: [
    { name: "Earl Leal", type: "Directional Driller", people: 0, last: "Today", active: true },
    { name: "Pawel Wlodarczyk", type: "Drilling Engineer", people: 0, last: "2d ago", active: true },
  ],
};

export const V2_TAGS = [
  { name: "drilling", count: 48, color: "violet" },
  { name: "rop", count: 32, color: "emerald" },
  { name: "bop", count: 18, color: "amber" },
  { name: "performance", count: 24, color: "sky" },
  { name: "petronas", count: 56, color: "orange" },
];

export const V2_ORG_DEMO = {
  id: "demo",
  name: "Petronas",
  badge: "Organization",
  industry: "Oil & Gas Company",
  description: "Global energy company",
  location: "Kuala Lumpur, Malaysia",
  website: "petronas.com",
  since: "1993",
  status: "Active" as const,
  stats: {
    journalEntries: 312,
    journalDelta: "+18 this month",
    emails: 186,
    emailsDelta: "+9 this month",
    people: 24,
    projects: 15,
    firstContact: "May 12, 1993",
    lastActivity: "Today",
  },
  relationshipScore: 4.3,
  relationshipLabel: "Strong Relationship",
  metrics: [
    { label: "Engagement", value: "High", tone: "good" as const },
    { label: "Collaboration", value: "Strong", tone: "good" as const },
    { label: "Trust", value: "High", tone: "good" as const },
    { label: "Future Potential", value: "High", tone: "good" as const },
  ],
  linkedPeople: [
    { id: "p1", name: "Earl Leal", role: "Directional Driller", initials: "EL" },
    { id: "p2", name: "Pawel Wlodarczyk", role: "Drilling Engineer", initials: "PW" },
    { id: "p3", name: "Sarah Chen", role: "Project Manager", initials: "SC" },
    { id: "p4", name: "Marcus Webb", role: "Operations Lead", initials: "MW" },
  ] satisfies V2PersonPreview[],
  recentProjects: [
    { id: "demo", name: "Well A — BHA Optimization", status: "Completed", year: "2026" },
    { id: "p2", name: "Suriname Drilling Campaign", status: "In Progress", year: "2026" },
    { id: "p3", name: "Digital Drilling Integration", status: "In Progress", year: "2025" },
  ] satisfies V2ProjectPreview[],
};

export const V2_ORG_TIMELINE: V2TimelineEntry[] = [
  {
    id: "ot1",
    date: "2026-06-29",
    time: "18:40",
    kind: "journal",
    journalSubtype: "log",
    title: "2026 Q2 Relationship Review",
    body: "Strong collaboration on Well A. Discussed Suriname campaign scope and digital integration roadmap.",
    tags: ["relationship", "review"],
    author: "Victor Alejandro",
    protected: true,
  },
  {
    id: "ot2",
    date: "2026-06-29",
    time: "14:22",
    kind: "email",
    title: "Re: Suriname Drilling Campaign",
    body: "Confirming rig availability and personnel assignments for Q3 mobilization.",
    tags: ["campaign"],
  },
  {
    id: "ot3",
    date: "2026-06-28",
    time: "10:00",
    kind: "meeting",
    title: "Operational Excellence Workshop",
    body: "Joint session on ROP optimization and NPT reduction strategies.",
    tags: ["workshop", "operations"],
    author: "Earl Leal",
  },
  {
    id: "ot4",
    date: "2026-06-15",
    time: "09:30",
    kind: "journal",
    journalSubtype: "note",
    title: "Contract renewal discussion",
    body: "Initial terms reviewed. Legal review scheduled for July.",
    tags: ["contract"],
    protected: true,
  },
];

export const V2_ORG_MOBILE = {
  stats: { projects: 8, people: 24, journalEntries: 153, emails: 412 },
  linkedPeople: [
    { id: "p1", name: "Earl Leal", role: "Directional Driller", initials: "EL" },
    { id: "p2", name: "Pawel Wlodarczyk", role: "Drilling Engineer", initials: "PW" },
    { id: "p3", name: "Sarah Chen", role: "Project Manager", initials: "SC" },
  ],
};

export const V2_PROJECT_DEMO = {
  id: "demo",
  name: "Well A — BHA Optimization",
  status: "Completed" as const,
  startDate: "Jan 15, 2026",
  endDate: "Mar 28, 2026",
  organization: "Petronas",
  location: "Offshore Malaysia",
  durationDays: 73,
  about:
    "Optimization of BHA for Well A to reduce vibration and improve ROP. Focus on MWD data analysis and iterative BHA design changes.",
  waterDepth: "1,250 m",
  stats: { people: 8, journalEntries: 42, emails: 37, files: 26 },
  metrics: [
    { label: "Avg ROP", value: "18.6 m/hr", trend: "+12%", tone: "good" as const },
    { label: "BHA Failures", value: "0", trend: undefined, tone: "good" as const },
    { label: "NPT (hrs)", value: "4.2", trend: "-18%", tone: "good" as const },
    { label: "Cost Saving Est.", value: "$320K", trend: undefined, tone: "good" as const },
  ],
  people: [
    { id: "p1", name: "Victor Alejandro", role: "Lead", initials: "VA" },
    { id: "p2", name: "Earl Leal", role: "Support", initials: "EL" },
    { id: "p3", name: "Pawel Wlodarczyk", role: "Engineer", initials: "PW" },
    { id: "p4", name: "Sarah Chen", role: "Coordinator", initials: "SC" },
  ] satisfies V2PersonPreview[],
  linkedTopics: ["BHA", "Optimization", "Vibration"],
  linkedEvents: 5,
};

export const V2_PROJECT_TIMELINE: V2TimelineEntry[] = [
  {
    id: "pt1",
    date: "2026-03-28",
    time: "18:40",
    kind: "journal",
    journalSubtype: "log",
    title: "Well completed — Final results",
    body: "Reached TD at 5,682 mMD. Final ROP 18.6 m/hr. Zero BHA failures on last run.",
    tags: ["results", "bha"],
    author: "Victor Alejandro",
    protected: true,
  },
  {
    id: "pt2",
    date: "2026-03-20",
    time: "11:15",
    kind: "email",
    title: "BHA approval for final run",
    body: "Petronas approved final BHA configuration. Proceed with TD drilling.",
    tags: ["approval"],
  },
  {
    id: "pt3",
    date: "2026-02-14",
    time: "09:00",
    kind: "journal",
    journalSubtype: "log",
    title: "Mid-project review",
    body: "Vibration reduced 40% after stabilizer change. ROP trending up.",
    tags: ["review", "performance"],
    author: "Earl Leal",
  },
  {
    id: "pt4",
    date: "2026-01-15",
    time: "08:00",
    kind: "meeting",
    title: "Project kickoff",
    body: "Team aligned on objectives, KPIs, and communication plan.",
    tags: ["kickoff"],
  },
];
