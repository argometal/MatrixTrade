/**
 * Shared ARGUS Help topics — contextual ? panels and Help index.
 */

export type HelpGroup = "basics" | "intelligence" | "browse" | "ops";

export type HelpSection = {
  id: string;
  title: string;
  group: HelpGroup;
  keywords: string[];
  intro?: string;
  items: Array<{ title: string; body: string }>;
  tip?: string;
};

const SECTIONS: HelpSection[] = [
  {
    id: "overview",
    title: "How Argus works",
    group: "basics",
    keywords: ["overview", "evidence", "receive", "create", "link", "deliver"],
    intro:
      "Argus is an evidence organization system — not a CRM or note-taking app. You register what happened, link it to context, browse when you need the full picture, and deliver packages when someone else needs proof.",
    items: [
      {
        title: "Receive → Create → Link → Retrieve → Deliver",
        body: "Evidence arrives (email, file, short register entry). You link it to people, projects, organizations, topics, or events. Browse and search retrieve everything for a subject. Deliver packages evidence for handoff.",
      },
      {
        title: "Long-term memory",
        body: "Organizations and people span years. Projects are bounded engagements. Topics and events anchor evidence across time — pick the lens that matches your question.",
      },
    ],
  },
  {
    id: "verbs",
    title: "Core verbs",
    group: "basics",
    keywords: ["create", "link", "deliver", "verbs"],
    items: [
      {
        title: "Create",
        body: "Add a person, project, topic, event, or organization from the top bar. Pick a type, name it, then link it to what already exists.",
      },
      {
        title: "Link",
        body: "Connect records to people, projects, topics, events, and organizations. Link is how Argus ties email, files, and notes together.",
      },
      {
        title: "Deliver",
        body: "Package scoped evidence for someone else — Activity Summary for a quick read, Evidence Dossier for a defensible archive.",
      },
    ],
  },
  {
    id: "entities",
    title: "Entity types",
    group: "basics",
    keywords: ["organization", "project", "people", "network", "event", "topic", "runbook"],
    items: [
      {
        title: "Organizations",
        body: "Institutional context across the full relationship — status, people, projects, and years of evidence.",
      },
      {
        title: "Projects",
        body: "Bounded business engagements with dates, team, and scoped evidence.",
      },
      {
        title: "People / Network",
        body: "Contacts with auto status (Active / Dormant / Archived), optional Hot priority from recent dense evidence, follow-ups — not strength scores. Do not hand-file 1000 contacts.",
      },
      {
        title: "Events",
        body: "Case anchors — a rig move, incident, meeting, or handover. Evidence hangs from the event.",
      },
      {
        title: "Topics",
        body: "Knowledge binders — permanent subjects that collect linked evidence across years.",
      },
      {
        title: "Runbooks / procedures",
        body: "Execution checklist — cards with optional subtasks and progress.",
      },
    ],
  },
  {
    id: "treemap",
    title: "Intelligence · Treemap",
    group: "intelligence",
    keywords: ["treemap", "tiles", "home", "intel", "size", "evidence", "lens"],
    intro: "Home → Intelligence → Treemap. Full org / project / topic portfolio as nested tiles.",
    items: [
      {
        title: "Read the tiles",
        body: "Tile size = evidence volume. Green tint marks recent activity (≈7d). Empty projects still appear so the portfolio is complete.",
      },
      {
        title: "Click vs ⌘/Ctrl+click",
        body: "Click selects a tile and opens the connection neighborhood below (and the small right dock for one level up). ⌘/Ctrl+click opens the entity’s focused page.",
      },
      {
        title: "Universe filters",
        body: "Toolbar dropdown: Universe · Hot · Patterns · Stale · Trackers — same filters as Portfolio and Tags.",
      },
    ],
    tip: "Tap ? on any canvas for this explanation. Help index has every topic.",
  },
  {
    id: "portfolio",
    title: "Intelligence · Portfolio",
    group: "intelligence",
    keywords: ["portfolio", "bubbles", "recency", "recurrence", "scatter", "amber", "pattern"],
    intro: "Home → Intelligence → Portfolio. Entity triage scatter — where attention should go.",
    items: [
      {
        title: "Axes",
        body: "X = recurrence in the last 30 days. Y = recency. Bubble size = total evidence. Bubbles auto-separate when scores pile up.",
      },
      {
        title: "Amber ring",
        body: "Amber stroke intensity = tag-pattern intensity in that entity’s scope (Patterns, not Trackers).",
      },
      {
        title: "Click vs ⌘/Ctrl+click",
        body: "Click = lens + connection neighborhood below. ⌘/Ctrl+click = open the entity.",
      },
      {
        title: "Universe filters",
        body: "Same toolbar dropdown as Treemap / Tags (Universe · Hot · Patterns · Stale · Trackers).",
      },
    ],
  },
  {
    id: "tags-universe",
    title: "Intelligence · Tags",
    group: "intelligence",
    keywords: ["tags", "universe", "trackers", "flag", "gold", "pattern", "home"],
    intro: "Home → Intelligence → Tags. Tag universe control center — inventory + Flag Trackers.",
    items: [
      {
        title: "Universe plot",
        body: "Axes are evidence windows (recency × recurrence), not scores. Click a tag to inspect evidence and binders.",
      },
      {
        title: "Tracker vs Pattern rings",
        body: "⚑ / amber ring = Tracker (you Flagged watch-on). Gold ring on an unflagged tag = Pattern (system-derived recurrence).",
      },
      {
        title: "Flag / Disable",
        body: "Optional watch. Confirm both ways. Disable turns watch off — the Tag stays on Notes and Topic Tags. Never an easy delete here. Most Tags never need Flag.",
      },
      {
        title: "Filters",
        body: "Universe · Hot (30d) · Patterns · Stale (had evidence, none in 90d) · Trackers — shared with Treemap / Portfolio.",
      },
    ],
  },
  {
    id: "neighborhood",
    title: "Connection neighborhood",
    group: "intelligence",
    keywords: ["neighborhood", "graph", "halo", "tracker", "affinity", "expand", "ego"],
    intro: "Local graph around a selected entity on Home Intelligence (and on entity detail).",
    items: [
      {
        title: "Main graph vs dock",
        body: "Inline main graph = zoom and explore around the selection. Small right dock = one level up / wider context when available.",
      },
      {
        title: "Visual cues",
        body: "Rose/amber halo = Tracker on evidence. Dashed rose edges = shared Tracker (affinity).",
      },
      {
        title: "Focus & open",
        body: "Click a node to focus its direct neighbors (ego view). ⌘/Ctrl+click opens the entity. Expand graph for a larger canvas. Esc / Back leaves focus.",
      },
    ],
  },
  {
    id: "tags-patterns",
    title: "Tags · Trackers · Patterns",
    group: "intelligence",
    keywords: ["tag", "tracker", "pattern", "flag", "note", "topic tags", "90", "three"],
    items: [
      {
        title: "One Tag system",
        body: "Tags live on Notes/emails and as Topic Tags on binders. Same strings. Notes drive evidence; Topic Tags keep binders findable.",
      },
      {
        title: "Patterns (system-derived)",
        body: "Same Tag on ≥ 3 evidence items in a scope, with at least one in the last 90 days. Argus counts repetition — it does not invent meaning for #gap / #quality / etc.",
      },
      {
        title: "Trackers (your watch)",
        body: "Optional. Flag a Tag journal-wide (⚑) only when you want watch. Separate from putting a Tag on a Note. Confirm before Flag or Disable. Disable never deletes the Tag.",
      },
      {
        title: "Where Tags live on an Event",
        body: "Event → Note puts Tags on evidence. Event → Tags manages the universe and optional Flag as Tracker.",
      },
    ],
  },

  {
    id: "event-tags",
    title: "Event · Tags & Trackers",
    group: "intelligence",
    keywords: ["event", "tags", "trackers", "on this event", "note", "flag", "pool"],
    intro:
      "Attached Tags classify this Event. Branch shows neighborhood vocabulary. Trackers watch. Universe is global analysis.",
    items: [
      {
        title: "Tags on this Event",
        body: "Binder Tags (eventTags) only — not Note Tags. Add Tag attaches to this Event. Evidence already on Notes appears under Attach from Notes until you Save Tags.",
      },
      {
        title: "Tags in this branch",
        body: "Evidence Tags on this Event’s Notes, plus Tags from structurally linked Topics and Projects. Not attached until you Add Tag.",
      },
      {
        title: "Trackers",
        body: "Flagged Tags in context (Attached/Branch) plus other journal Trackers for recall (legacy Event Signals). Manage Trackers here; full list is Go to Tags.",
      },
      {
        title: "Go to Tags",
        body: "Opens Home → Intelligence → Tags for the full universe (roles, Patterns, search).",
      },
      {
        title: "Put Tags on a Note",
        body: "Evidence Tags still live on Notes — use Browse branch / Note tab to write Log.topics.",
      },
    ],
  },
  {
    id: "topic-tags",
    title: "Topic · Tags & Trackers",
    group: "intelligence",
    keywords: ["topic", "tags", "trackers", "topic tags", "aliases", "flag"],
    intro:
      "Evidence Tags come from Notes on linked Events. Flag as Tracker is optional (Tags tab). Topic Tags editor below is the only place that removes a binder Tag.",
    items: [
      {
        title: "On this Topic",
        body: "Evidence Tags from notes/emails ∪ Topic Tags (binder aliases). Same Tag system as Events — Tags can exist without Flag.",
      },
      {
        title: "Topic Tags editor",
        body: "Explicit Save — the only place that removes a binder Tag. Flag/Disable Tracker never deletes Tags.",
      },
      {
        title: "Flag / Disable Tracker (optional)",
        body: "Add Tag remembers a name; Flag Tracker or chip click watches it. Never required to keep a Tag on evidence.",
      },
      {
        title: "By linked Event",
        body: "Rollup of Tags from Events linked to this Topic — click to Flag/Disable Tracker with confirm.",
      },
    ],
  },
  {
    id: "project-tags",
    title: "Project · Tags & Trackers",
    group: "intelligence",
    keywords: ["project", "tags", "trackers", "project tags", "binder", "flag"],
    intro:
      "Tags linked to this Project (projectTags) plus evidence Tags detected in this project’s neighborhood.",
    items: [
      {
        title: "Linked to this Project",
        body: "Binder Tags saved on this Project — not Note Tags. Add Tag + Save Tags attaches them to this Project only.",
      },
      {
        title: "Notes on this Project",
        body: "Evidence / pattern Tags counted in this Project’s scope. Attach ones you want on the binder from the editor suggestions.",
      },
      {
        title: "Trackers",
        body: "Optional Flag on Tags in this Project context. Disable never deletes the Tag.",
      },
    ],
  },
  {
    id: "org-tags",
    title: "Organization · Tags",
    group: "intelligence",
    keywords: ["organization", "org", "tags", "patterns", "evidence", "neighborhood"],
    intro:
      "Organizations do not carry binder Tags. The Tags tab shows evidence and pattern Tags detected in this organization’s neighborhood.",
    items: [
      {
        title: "Detected in scope",
        body: "Signal / pattern Tags from Notes and linked activity under this Organization — Manage List rows, same orientation as Organizations browse List.",
      },
      {
        title: "No binder Tags",
        body: "Structural wiring stays on Links. Binder Tags live on Events, Topics, and Projects.",
      },
    ],
  },
  {
    id: "inbox",
    title: "Inbox triage",
    group: "browse",
    keywords: ["inbox", "orphans", "linked", "archive", "converted", "badge", "filters", "email"],
    intro:
      "Status dropdown + grouped Filters. Tap ? on Inbox for this guide; Help index for everything else.",
    items: [
      {
        title: "Orphans",
        body: "Unlinked email / intake — same orphan idea as Topics Orphans and Events Orphans. Needs Link (or Archive). Badge counts Orphans + Linked awaiting triage.",
      },
      {
        title: "Linked",
        body: "Wired to people / projects / orgs / topics / events. Keep triaging Tags if needed, then Archive when done.",
      },
      {
        title: "Archived",
        body: "Modern “done.” Leaves the alert count. Evidence stays under Archived. Legacy email→journal items also appear here with a Journal badge — open the note from the email detail (never a dead end).",
      },
      {
        title: "Converted (deprecated)",
        body: "Removed as an Inbox status. Old converts still exist as data (`convertedLogId`) and show under Archived as Journal. Do not convert emails anymore — Link + Archive; put narrative on Event → Note.",
      },
      {
        title: "Grouped Filters",
        body: "One Filters menu holds Source · Sender · Type · Entity · Tag. Set several at once; Clear removes them.",
      },
      {
        title: "Alert badges",
        body: "Sidebar and bell counts are triage debt — not Trackers or Patterns.",
      },
    ],
  },
  {
    id: "browse-orgs",
    title: "Organizations browse",
    group: "browse",
    keywords: ["organizations", "browse", "relationship", "metrics", "active", "on hold", "archived"],
    intro: "Long-term memory — not a CRM. Which organization do you want to analyze?",
    items: [
      {
        title: "Organization overview",
        body: "Name, status, and a short description — health and context of the relationship at a glance.",
      },
      {
        title: "Status board",
        body: "Active · On Hold · Archived — same portfolio ontology as Projects. Working states are Active or On Hold; Archived hides without deleting.",
      },
      {
        title: "Quick metrics",
        body: "Projects, people, register entries, emails, files, and topics — volume of activity tied to this institution.",
      },
      {
        title: "Last contact",
        body: "When the last interaction happened and what form it took — email or register entry.",
      },
      {
        title: "Relationship age",
        body: "How long this organization has existed in your knowledge base — maturity of the relationship.",
      },
      {
        title: "Activity trend",
        body: "Visual trend of communication and register entries over the last year — relationship activity, not financial.",
      },
      {
        title: "Actionable selection",
        body: "Open the organization that needs attention — the detail page holds everything across years.",
      },
    ],
    tip: "Drag ⋮⋮ to reorder cards or move them onto status labels (board). Drops persist Active / On Hold / Archived. Use Filters when your portfolio grows.",
  },
  {
    id: "browse-projects",
    title: "Projects browse",
    group: "browse",
    keywords: ["projects", "active", "on hold", "archived", "duration"],
    items: [
      {
        title: "Portfolio view",
        body: "Decide which project to open before you dive into evidence. Each card shows status, team, maturity, and recent activity.",
      },
      {
        title: "Status filters",
        body: "Active · On Hold · Archived — same ontology as Organizations. Completed folds into Archived; there is no separate Planning column.",
      },
      {
        title: "Duration progress",
        body: "When start and end dates exist, the bar shows elapsed time through the engagement window.",
      },
      {
        title: "Reorder",
        body: "Drag ⋮⋮ to reorder cards or move them onto status labels (board). Drops persist Active / On Hold / Archived.",
      },
    ],
  },
  {
    id: "browse-other",
    title: "Other browse views",
    group: "browse",
    keywords: ["network", "topics", "events", "orphans"],
    items: [
      {
        title: "Network",
        body: "People portfolio with auto status from evidence (Active / Dormant / Archived + Hot filter), organizations, and follow-ups. Badge shows follow-ups due soon or recently overdue — triage debt, not Trackers.",
      },
      {
        title: "Topics",
        body: "Knowledge binders — master-detail list with linked evidence. Badge shows register entries still needing entity or topic classification (triage, not Patterns).",
      },
      {
        title: "Events",
        body: "Case anchors with linked email and register evidence — chronological detail per event.",
      },
    ],
  },
  {
    id: "browse-network",
    title: "Network browse",
    group: "browse",
    keywords: ["network", "people", "active", "dormant", "hot", "follow-up", "last contact"],
    intro: "People portfolio — status from evidence, optional board pins, follow-ups as triage debt.",
    items: [
      {
        title: "Status",
        body: "Active / Dormant / Archived from linked emails, records, follow-ups, and projects. Hot is a priority filter inside Active. Use 📅 on a card to log last contact.",
      },
      {
        title: "Board & reorder",
        body: "Drag ⋮⋮ to reorder. Board pins are optional; Archive/Restore via board still updates the entity.",
      },
      {
        title: "Follow-ups",
        body: "Sidebar / badge counts are triage debt — not Trackers or Patterns.",
      },
    ],
  },
  {
    id: "browse-events",
    title: "Events browse",
    group: "browse",
    keywords: ["events", "orphans", "linked", "upcoming", "past", "case", "meeting", "milestone"],
    intro:
      "Events are dated occurrences (meetings, jobs, handovers) — latest first. Pick one, then work Notes, Chronicle, Tags, and Links.",
    items: [
      {
        title: "Orphans vs Linked",
        body: "Orphans = no Topic/Org/Project/Person links (needs attention). Linked = wired into the graph.",
      },
      {
        title: "When filters",
        body: "Upcoming / Past narrow by event date. Completed (Archive) leaves Active triage and metric counts.",
      },
      {
        title: "Completed",
        body: "Edit → Mark completed writes Archive. The Event moves to the Completed tab — Notes and Chronicle stay. Delete later only if you need to trim live data.",
      },
      {
        title: "Empty list",
        body: "No events yet → create one and link it. Orphans empty → nothing needs structural links. Otherwise try All or another time cut.",
      },
      {
        title: "Tags on an Event",
        body: "Put Tags on evidence via Note. Detail → Tags manages inventory and optional Flag as Tracker.",
      },
    ],
  },
  {
    id: "event-completed",
    title: "Event · Completed (Archive)",
    group: "browse",
    keywords: ["event", "completed", "archive", "metrics", "delete", "trim"],
    intro:
      "Mark completed uses Archive — the Event leaves active triage and metric counts without deleting evidence.",
    items: [
      {
        title: "How to complete",
        body: "Event → Edit → Mark completed. Same lifecycle field as Archive elsewhere; Events just use clearer copy.",
      },
      {
        title: "What moves",
        body: "Out of Orphans/Linked; into Events → Completed. Project/Topic/Org event pills stop counting it. Notes, Chronicle, Tags, and Links stay.",
      },
      {
        title: "Restore or delete later",
        body: "Restore to active reopens the case. Delete (PIN + name) is optional trimming after Completed — not required to finish work.",
      },
      {
        title: "Not Org/Project Archived",
        body: "Org and Project boards use Active · On Hold · Archived. Past end date or lifecycle completed on a Project folds into Archived on that board. Event Completed = Archive for case triage — separate surface.",
      },
    ],
  },
  {
    id: "event-note",
    title: "Event · Note",
    group: "browse",
    keywords: ["event", "note", "chronicle", "save", "tag", "attachment"],
    intro: "Write atomic evidence for this occurrence. Save appends to Chronicle — it does not overwrite prior Notes.",
    items: [
      {
        title: "Save",
        body: "Body and/or attachments become a Chronicle entry dated to this Event.",
      },
      {
        title: "Tags",
        body: "Optional. Quick chips from linked Topics, or Browse / create. Tagging does not Flag a Tracker — Flag later on Tags.",
      },
      {
        title: "Link email",
        body: "Attach existing inbox evidence to this Event from the header action.",
      },
      {
        title: "Corrections",
        body: "Append a new Note (or delete). Chronicle notes are not edited in the old phone log editor.",
      },
    ],
  },
  {
    id: "event-chronicle",
    title: "Event · Chronicle",
    group: "browse",
    keywords: ["event", "chronicle", "timeline", "notes", "emails", "photos"],
    intro: "All notes, emails, photos, and files on this Event in chronological order.",
    items: [
      {
        title: "What belongs here",
        body: "Evidence hung from this occurrence — not the long-lived Topic stream (that lives on the Topic).",
      },
      {
        title: "Add more",
        body: "Use the Note tab to append, or Link email for inbox items.",
      },
      {
        title: "Read notes here",
        body: "Note body shows in the list. Delete when needed. Do not open the legacy phone note editor from Chronicle.",
      },
    ],
  },
  {
    id: "event-links",
    title: "Event · Links",
    group: "browse",
    keywords: ["event", "links", "metrics", "graph", "neighborhood", "attendees", "counts"],
    intro: "Relations, evidence counts, and local graph around this Event — same Links pattern as Topics, Orgs, and Projects.",
    items: [
      {
        title: "Linked entities",
        body: "Metric pills summarize Orgs, Projects, People, and Topics. Use Link in each section to attach or create.",
      },
      {
        title: "Evidence counts",
        body: "Emails, Notes, and Photos on this Event (Chronicle owns the narrative list).",
      },
      {
        title: "Local graph",
        body: "1–2 hops from explicit links and co-mentions. Click a node to focus; ⌘/Ctrl+click opens it. Tracker affinity shows as dashed rose edges.",
      },
    ],
  },
  {
    id: "event-metrics",
    title: "Event · Links (formerly Metrics)",
    group: "browse",
    keywords: ["event", "metrics", "links"],
    intro: "Renamed to Links — open Event · Links for the same counts and graph.",
    items: [
      {
        title: "Where it moved",
        body: "Event detail → Links tab (metric pills, relation sections, evidence counts, local graph).",
      },
    ],
  },
  {
    id: "browse-topics",
    title: "Topics browse",
    group: "browse",
    keywords: ["topics", "active", "quiet", "orphans", "board", "binders"],
    intro: "Knowledge binders — board or list, then open a Topic for Chronicle, Tags, and Links.",
    items: [
      {
        title: "Status chips",
        body: "Active = recent evidence · Quiet = linked or stale · Orphans = no evidence and no links. Board moves Active↔Quiet update these chips.",
      },
      {
        title: "Orphans",
        body: "Same orphan idea as Events and Inbox — binders that still need links or evidence.",
      },
      {
        title: "Tags on a Topic",
        body: "Detail → Tags = evidence Tags ∪ Topic Tags. Topic Tags editor is the only place that removes a binder Tag.",
      },
      {
        title: "Reorder",
        body: "Drag ⋮⋮ to reorder within search results, or move cards onto board columns (Active / Quiet / Orphans / Archived).",
      },
    ],
  },
  {
    id: "topic-chronicle",
    title: "Topic · Chronicle",
    group: "browse",
    keywords: ["topic", "chronicle", "evidence", "events", "notes", "aggregation"],
    intro:
      "Aggregation lens: Notes, emails, and files on this Topic plus evidence born on linked Events — chronological.",
    items: [
      {
        title: "Where evidence comes from",
        body: "Event-first: Notes are created on Events. When an Event is linked to this Topic, its Chronicle entries appear here (meta shows the Event name).",
      },
      {
        title: "Links vs Chronicle",
        body: "Links lists linked Events, orgs, projects, and people (with metric pills and graph). Chronicle lists the evidence story across those Events (and any topic-direct evidence).",
      },
      {
        title: "Not an audit log",
        body: "Rename, link/unlink, and Tag Flag changes are not Chronicle rows — Chronicle is narrative evidence only.",
      },
    ],
  },
  {
    id: "topic-links",
    title: "Topic · Links",
    group: "browse",
    keywords: ["topic", "links", "connections", "events", "orgs", "projects", "people", "relations", "graph"],
    intro:
      "Same Links pattern as Events, Orgs, and Projects: metric pills, per-kind Link CTAs, evidence counts, and local graph.",
    items: [
      {
        title: "Events",
        body: "Link Events so Notes born on those Events roll into Topic Chronicle. Same link works from the Event side.",
      },
      {
        title: "Orgs · Projects · People",
        body: "Structural relations for context and navigation — not evidence owners. Link from each section (opens Link filtered to that kind).",
      },
      {
        title: "Local graph",
        body: "1–2 hops from explicit links and co-mentions — same graph surface as Event / Org / Project Links.",
      },
    ],
  },
  {
    id: "topic-connections",
    title: "Topic · Links (formerly Connections)",
    group: "browse",
    keywords: ["topic", "connections", "links"],
    intro: "Renamed to Links — open Topic · Links for relations and graph.",
    items: [
      {
        title: "Where it moved",
        body: "Topic detail → Links tab.",
      },
    ],
  },
  {
    id: "org-links",
    title: "Organization · Links",
    group: "browse",
    keywords: ["organization", "links", "people", "projects", "topics", "events", "graph"],
    intro: "Relations for this organization — metric pills, Link CTAs, and local graph (moved here from Overview).",
    items: [
      {
        title: "What to link",
        body: "People, Projects, Topics, and Events. Create new from inside Link.",
      },
      {
        title: "Local graph",
        body: "Neighborhood graph lives on Links (not Overview) so relations stay in one place.",
      },
    ],
  },
  {
    id: "project-links",
    title: "Project · Links",
    group: "browse",
    keywords: ["project", "links", "org", "people", "topics", "events", "graph"],
    intro: "Relations for this project — metric pills, Link CTAs, and local graph (moved here from Overview).",
    items: [
      {
        title: "What to link",
        body: "Organization, People, Topics, and Events within the project story.",
      },
      {
        title: "Local graph",
        body: "Neighborhood graph lives on Links (not Overview) so relations stay in one place.",
      },
    ],
  },
  {
    id: "lifecycle",
    title: "Rename & archive",
    group: "ops",
    keywords: ["rename", "archive", "delete", "completed", "guest", "lock", "security", "event"],
    items: [
      {
        title: "Rename",
        body: "Open an Event or Topic → Edit (next to the title) → Rename. Same for organizations, projects, and contacts — links and evidence stay intact.",
      },
      {
        title: "Event · Mark completed (Archive)",
        body: "Edit → Mark completed stores Archive on the Event. It leaves Orphans/Linked triage and Project/Topic/Org event metric counts, and appears under Events → Completed. Notes, Chronicle, Tags, and Links stay. Restore to active brings it back.",
      },
      {
        title: "Event · Delete (trim later)",
        body: "Optional after Completed. Edit → Delete removes the binder after PIN unlock and typing the name — notes/emails stay. Use when you need to thin live data; prefer Completed first.",
      },
      {
        title: "Archive elsewhere",
        body: "Topics, projects, orgs, and people use Archive / Restore with the same lifecycle field. Org/Project boards fold completed / past end date into Archived (Active · On Hold · Archived).",
      },
      {
        title: "Guest workstation lock",
        body: "Open Argus → Security in the left menu (or Trading → System → Security). Set hours, daily window, and date range. One policy applies to both Argus and MatrixTrade.",
      },
      {
        title: "Project dates",
        body: "Project views default to evidence within start/end dates. Use All dates on the project page to include older or later items.",
      },
      {
        title: "Topics on organizations",
        body: "Org-linked topics have no expiry. Link a topic to a project when you want bounded monitoring inside project dates.",
      },
    ],
  },
  {
    id: "deliver",
    title: "Deliver",
    group: "ops",
    keywords: ["deliver", "summary", "dossier", "export", "zip"],
    items: [
      {
        title: "Activity Summary",
        body: "Quick HTML package — timeline highlights, key people, and recent evidence for a fast read. Best for status updates and handoff summaries.",
      },
      {
        title: "Evidence Dossier",
        body: "Full archive — emails, register entries, attachments, and narrative sections in a defensible ZIP/HTML bundle. Best for audits and formal delivery.",
      },
      {
        title: "Scope",
        body: "Deliver from a person, project, organization, topic, or event. Use date filters and privacy options before generating.",
      },
    ],
  },
];


export const HELP_GROUP_LABELS: { id: HelpGroup | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "basics", label: "Basics" },
  { id: "intelligence", label: "Intelligence" },
  { id: "browse", label: "Browse" },
  { id: "ops", label: "Ops" },
];

export const HELP_SECTIONS: HelpSection[] = SECTIONS;

export function getHelpTopic(id: string): HelpSection | undefined {
  return HELP_SECTIONS.find((section) => section.id === id);
}

export function helpTopicMatches(
  section: HelpSection,
  group: HelpGroup | "all",
  query: string
): boolean {
  if (group !== "all" && section.group !== group) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    section.id,
    section.title,
    section.intro ?? "",
    ...section.keywords,
    ...section.items.flatMap((item) => [item.title, item.body]),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}
