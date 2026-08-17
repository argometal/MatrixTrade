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
        body: "Execution checklist with per-entity progress. Existing ARGUS tags classify the template; Patterns still come only from evidence. Matching tags suggest a runbook — you assign it. On a check, ··· → Use as tag… promotes the wording onto the runbook and optionally opens Link to attach it to Topics, Events, or Projects.",
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
        body: "Toolbar: Universe · Hot · Patterns · Stale · Trackers. Hot is Treemap-only — Portfolio and Tags stay on Universe.",
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
        body: "Universe · Patterns · Stale · Trackers (no Hot — Hot is Treemap-only). Default is full Universe.",
      },
    ],
  },
  {
    id: "tags-universe",
    title: "Intelligence · Tags",
    group: "intelligence",
    keywords: ["tags", "universe", "trackers", "flag", "gold", "pattern", "home", "rename"],
    intro: "Home → Intelligence → Tags. Tag manager — Create, Rename, Delete, and Flag Trackers.",
    items: [
      {
        title: "Universe plot",
        body: "Dots on recurrence (X) × recency (Y). Names appear on hover/select only so marks do not pile up. Ranked lists under the plot separate Top by recurrence vs Top by recency.",
      },
      {
        title: "Counters",
        body: "Count = linked uses (Notes/emails, plus a Tag-tab use when that entity has no Note yet). In 30d = recent repetition. Home filters (Patterns / Stale / Trackers) use this same count.",
      },
      {
        title: "Tracker vs Pattern marks",
        body: "Amber dashed ring = Tracker (Flag). Gold stroke = Pattern (≥3 linked uses, fresh within 90d). Pattern is automatic — not Flag.",
      },
      {
        title: "Create",
        body: "Create tag adds a durable Global Tag to the universe. Flag as Tracker afterward if you want to watch it. Binder Tag tabs use the same create pipeline (Notes + Home vocabulary).",
      },
      {
        title: "Rename",
        body: "Select a tag → Rename (or ✎). Updates the string everywhere (Notes, binders, Trackers, Global, runbooks). Not the same as Flag/Disable.",
      },
      {
        title: "Delete",
        body: "Select a tag → Delete. Strips the Tag from Notes/binders/Trackers — Notes stay; only the Tag membership is removed. Confirm before applying. Removing a Tag from an Event/Topic/Project Tags tab strips it from that entity’s Notes only.",
      },
      {
        title: "Flag / Disable",
        body: "Optional watch. Confirm both ways. Flag registers the Tag on Home Tags vocabulary. Disable turns watch off — the Tag stays on Notes and Topic Tags.",
      },
      {
        title: "Filters",
        body: "Universe · Patterns · Stale · Trackers. Default Universe. Hot is Treemap-only. Patterns = same Tag on ≥3 linked uses (Notes or Tag tabs), with at least one in 90 days. Repetition is one count per entity after Tags and Notes are linked.",
      },
    ],
  },
  {
    id: "neighborhood",
    title: "Connection neighborhood",
    group: "intelligence",
    keywords: ["neighborhood", "graph", "halo", "tracker", "affinity", "expand", "ego", "depth"],
    intro: "Local graph around a selected entity on Home Intelligence (and on entity detail).",
    items: [
      {
        title: "Main graph vs dock",
        body: "Inline main graph = zoom and explore around the selection. Small right dock = one level up / wider context when available.",
      },
      {
        title: "Hop depth",
        body: "2 = local default. 3 = wider (Topics→Events). 5 = farther structural neighbors. Canvas budget scales with depth; bridges to visible nodes are always kept so connections stay drawn.",
      },
      {
        title: "Visual cues",
        body: "Rose/amber halo = Tracker on evidence. Dashed rose edges = shared Tracker (affinity).",
      },
      {
        title: "Pan & zoom",
        body: "Drag a node to pin it; Relax soft-reflows the rest; Reset restores the computed layout (session-only). −/+ zoom, ↺↻ turn, optional 3D tilt; Fit resets the camera only.",
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
        body: "Tags are one pipeline: Tag tabs, Notes, and Home Tags share the same strings. Add or delete on a Tag tab updates Notes on that entity. Flag a Tracker to watch it on Home Tags.",
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
        body: "Event → Tags and Event → Note Add are the same pipeline (binder + Notes + Home vocabulary). Removing a Tag from the Tags tab strips it from this Event’s Notes. Trackers Flag the same strings on Home Tags.",
      },
    ],
  },

  {
    id: "event-tags",
    title: "Event · Tags & Trackers",
    group: "intelligence",
    keywords: ["event", "tags", "trackers", "on this event", "note", "flag", "pool"],
    intro:
      "Event Tags are the same system as Notes. Add or Save on this tab writes Notes + Home vocabulary; remove strips the Tag from this Event’s Notes. Trackers are journal Flags — ⚑ shows when a Tag on this Event is Flagged. Branch Topic/Project pools are vocabulary only.",
    items: [
      {
        title: "Tags on this Event",
        body: "Add Tag + Save Tags attaches to this Event, creates a lightweight Note Tag when missing, and registers the Tag on Home Tags. Remove + Save strips the Tag from this Event’s Notes (Notes stay). Evidence already on Notes appears under Attach from Notes until you Save Tags.",
      },
      {
        title: "Tags in this branch",
        body: "Evidence Tags on this Event’s Notes, plus Tags from structurally linked Topics and Projects. Drag ⠿ onto Linked to this Event to attach (then Save Tags). Neighborhood rows are suggestions — they do not make this Event Watched.",
      },
      {
        title: "Trackers",
        body: "Journal Flags that intersect this Event’s binder or Note Tags — the same watch list as Home → Tags. Branch Topic/Project Tags do not count. ⚑ on rows is passive; Flag / Disable only via Manage Trackers. Flagging registers the Tag on Home Tags. Other journal Trackers are recall only.",
      },
      {
        title: "Go to Tags",
        body: "Opens Home → Intelligence → Tags for the full universe (roles, Patterns, search).",
      },
      {
        title: "Note tab Add",
        body: "Clicking Add on the Note tab saves the Tag immediately on Notes, the Tags tab, and Home Tags vocabulary — no note text required. Save on Note is for writing or attachments.",
      },
    ],
  },
  {
    id: "topic-tags",
    title: "Topic · Tags & Trackers",
    group: "intelligence",
    keywords: ["topic", "tags", "trackers", "topic tags", "aliases", "flag", "provenance"],
    intro:
      "Topic Tags are the same pipeline as Notes. Add/Save writes Notes + Home vocabulary; remove strips the Tag from this Topic’s Notes. Tags in this Topic are Topic-direct evidence. By Event separates each linked Event’s binder Tags from its Note Tags. Trackers are journal Flags — Topic does not own Event Trackers.",
    items: [
      {
        title: "Topic Tags",
        body: "Binder Tags on this Topic (topicTags). Add Tag + Save attaches here, on Notes, and on Home Tags. Remove + Save strips the Tag from this Topic’s Notes. Flag never deletes a binder Tag.",
      },
      {
        title: "Tags in this Topic",
        body: "Tags on Notes/emails linked directly to this Topic — not Tags that arrive only through linked Events.",
      },
      {
        title: "By Event",
        body: "One group per linked Event: Event Tags (binder) and On Notes (evidence), with Open Event. ⚑ means that Tag string is Flagged in the journal — not that the Topic owns the Tracker.",
      },
      {
        title: "Trackers",
        body: "Journal Flags that intersect this Topic’s binder or Topic-direct evidence only. Event Trackers appear as ⚑ under By Event, not as Topic-owned Trackers. Manage Trackers to Flag / Disable; row clicks do not toggle.",
      },
      {
        title: "Go to Tags",
        body: "Home → Intelligence → Tags for the full universe. Watched entities use binder ∪ direct evidence ∩ Flags (branch pools excluded).",
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
        body: "Same Tag system as Notes. Add Tag + Save Tags attaches to this Project, Notes, and Home Tags. Remove + Save strips the Tag from this Project’s Notes.",
      },
      {
        title: "Notes on this Project",
        body: "Evidence / pattern Tags counted in this Project’s scope. Attach ones you want on the binder from the editor suggestions.",
      },
      {
        title: "Trackers",
        body: "Optional Flag on Tags in this Project context — the same journal watch list as Home → Tags. Flagging registers the Tag on Home Tags. Disable never deletes the Tag.",
      },
    ],
  },
  {
    id: "org-tags",
    title: "Organization · Tags",
    group: "intelligence",
    keywords: ["organization", "org", "tags", "patterns", "evidence", "trackers", "watched"],
    intro:
      "Organizations do not carry binder Tags. This tab shows Tags on Notes/emails linked directly to this Organization, recurring Patterns from that same evidence, and which of those Tags are journal Trackers (passive ⚑ only).",
    items: [
      {
        title: "Tags in this Organization",
        body: "Evidence Tags from Notes and emails linked directly to this Organization. Tags that exist only on linked Projects, Topics, or Events do not appear here.",
      },
      {
        title: "Patterns",
        body: "Recurring evidence Tags in that same direct scope (unchanged Pattern thresholds). A Tag can appear as both evidence and Pattern — the sections answer different questions.",
      },
      {
        title: "Watched here",
        body: "Intersection of journal Trackers (signalTags) with direct Organization evidence Tags. The Organization does not own Trackers; Flag/Disable stays on Go to Tags.",
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
        body: "Body and/or attachments become a Chronicle entry dated to this Event. Tags alone are not required for Save — use Add on Tags instead.",
      },
      {
        title: "Tags",
        body: "Click Add (or Browse) to save a Tag immediately on Notes and the Tags tab — no note text needed. Both surfaces stay aligned for Patterns.",
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
        body: "Default depth 2 from explicit links and co-mentions (3 / 5 on the graph). Click a node to focus; ⌘/Ctrl+click opens it. Tracker affinity shows as dashed rose edges.",
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
    intro: "Knowledge binders — board or list, then open a Topic (full screen). ← Topics returns to the browse list.",
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
        body: "Default depth 2 (3 / 5 on the graph) — same surface as Event / Org / Project Links. Structural bridges stay drawn for visible nodes.",
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
