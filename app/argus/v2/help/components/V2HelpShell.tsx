"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { V2Card, V2SectionTitle } from "@/app/argus/v2/components/v2-ui";

type HelpGroup = "basics" | "intelligence" | "browse" | "ops";

type HelpSection = {
  id: string;
  title: string;
  group: HelpGroup;
  keywords: string[];
  intro?: string;
  items: Array<{ title: string; body: string }>;
  tip?: string;
};

const GROUP_LABELS: { id: HelpGroup | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "basics", label: "Basics" },
  { id: "intelligence", label: "Intelligence" },
  { id: "browse", label: "Browse" },
  { id: "ops", label: "Ops" },
];

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
    tip: "Legends stay in Help so the treemap can use the screen. Use ? Help on Home when you forget a cue.",
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
        body: "Confirm both ways. Disable turns watch off — the Tag stays on Notes and Topic Tags. Never an easy delete here.",
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
        body: "Flag a Tag journal-wide (⚑). Separate from Pattern. Confirm before Flag or Disable. Disable never deletes the Tag.",
      },
      {
        title: "Where Tags live on an Event",
        body: "Event → Tags → On this Event = inventory from Notes/emails. Put Tags on evidence via Note → Tags (picker pool + checkmarks).",
      },
    ],
  },
  {
    id: "inbox",
    title: "Inbox triage",
    group: "browse",
    keywords: ["inbox", "orphans", "linked", "archive", "converted", "badge"],
    items: [
      {
        title: "Orphans",
        body: "Unlinked email / intake — same orphan idea as Topics Orphans and Events Orphans. The inbox badge counts Orphans + Linked awaiting triage.",
      },
      {
        title: "Linked",
        body: "Entity links exist but triage may continue — register evidence, add Tags, or Archive when complete.",
      },
      {
        title: "Archive / Converted",
        body: "Archive finishes triage (no longer in the alert count). Converted is the legacy process graveyard.",
      },
      {
        title: "Alert badges",
        body: "Sidebar and bell counts are triage debt (inbox to process, follow-ups due, unclassified evidence) — not Trackers or Patterns.",
      },
    ],
  },
  {
    id: "browse-orgs",
    title: "Organizations browse",
    group: "browse",
    keywords: ["organizations", "browse", "relationship", "metrics"],
    intro: "Long-term memory — not a CRM. Which organization do you want to analyze?",
    items: [
      {
        title: "Organization overview",
        body: "Name, status, and a short description — health and context of the relationship at a glance.",
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
    tip: "Use Filters to narrow by status when your portfolio grows.",
  },
  {
    id: "browse-projects",
    title: "Projects browse",
    group: "browse",
    keywords: ["projects", "planning", "active", "duration"],
    items: [
      {
        title: "Portfolio view",
        body: "Decide which project to open before you dive into evidence. Each card shows status, team, maturity, and recent activity.",
      },
      {
        title: "Status filters",
        body: "Planning, Active, On Hold, Completed, Archived — match the engagement lifecycle.",
      },
      {
        title: "Duration progress",
        body: "When start and end dates exist, the bar shows elapsed time through the engagement window.",
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
    id: "lifecycle",
    title: "Rename & archive",
    group: "ops",
    keywords: ["rename", "archive", "delete", "guest", "lock", "security"],
    items: [
      {
        title: "Rename",
        body: "Open an Event or Topic → Edit (next to the title) → Rename. Same for organizations, projects, and contacts — links and evidence stay intact.",
      },
      {
        title: "Archive / Delete event",
        body: "Edit → Archive hides from Active views (evidence kept). Edit → Delete event removes the binder after PIN unlock and typing the name — notes/emails stay. Your board layout and chip filters persist per browser like card order.",
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

function sectionMatches(section: HelpSection, group: HelpGroup | "all", query: string): boolean {
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

function HelpNav({
  sections,
  activeId,
  onSelect,
}: {
  sections: HelpSection[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="space-y-0.5" aria-label="Help topics">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSelect(section.id)}
          className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
            activeId === section.id
              ? "bg-violet-500/15 text-violet-200"
              : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
          }`}
        >
          {section.title}
        </button>
      ))}
    </nav>
  );
}

function HelpSectionBlock({ section }: { section: HelpSection }) {
  return (
    <section id={section.id} className="scroll-mt-6">
      <V2Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold text-zinc-100">{section.title}</h2>
        {section.intro ? <p className="mt-2 text-sm leading-relaxed text-zinc-500">{section.intro}</p> : null}
        <ul className={`space-y-4 ${section.intro ? "mt-5" : "mt-4"}`}>
          {section.items.map((item) => (
            <li key={item.title}>
              <p className="text-sm font-medium text-violet-300">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.body}</p>
            </li>
          ))}
        </ul>
        {section.tip ? (
          <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
            <p className="text-xs leading-relaxed text-amber-200/90">Tip: {section.tip}</p>
          </div>
        ) : null}
      </V2Card>
    </section>
  );
}

export function V2HelpShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic") ?? "";
  const groupParam = (searchParams.get("group") as HelpGroup | "all" | null) ?? "all";

  const initialGroup: HelpGroup | "all" =
    groupParam === "basics" ||
    groupParam === "intelligence" ||
    groupParam === "browse" ||
    groupParam === "ops"
      ? groupParam
      : topicParam && SECTIONS.some((s) => s.id === topicParam)
        ? SECTIONS.find((s) => s.id === topicParam)!.group
        : "all";

  const [group, setGroup] = useState<HelpGroup | "all">(initialGroup);
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState(topicParam && SECTIONS.some((s) => s.id === topicParam) ? topicParam : SECTIONS[0].id);

  const visible = useMemo(
    () => SECTIONS.filter((section) => sectionMatches(section, group, query)),
    [group, query]
  );

  useEffect(() => {
    if (!topicParam) return;
    const match = SECTIONS.find((s) => s.id === topicParam);
    if (!match) return;
    setGroup(match.group);
    setActiveNav(match.id);
    const timer = window.setTimeout(() => {
      document.getElementById(match.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [topicParam]);

  function selectTopic(id: string) {
    setActiveNav(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("topic", id);
    params.delete("group");
    router.replace(`/argus/v2/help?${params.toString()}`, { scroll: false });
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function changeGroup(next: HelpGroup | "all") {
    setGroup(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("group");
    else params.set("group", next);
    // Keep topic if it still belongs to the group; otherwise clear.
    const topic = params.get("topic");
    if (topic) {
      const section = SECTIONS.find((s) => s.id === topic);
      if (!section || (next !== "all" && section.group !== next)) {
        params.delete("topic");
      }
    }
    const qs = params.toString();
    router.replace(qs ? `/argus/v2/help?${qs}` : "/argus/v2/help", { scroll: false });
  }

  return (
    <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 py-6 lg:px-8">
          <header className="mb-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-lg ring-1 ring-violet-500/30">
                ?
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Help</h1>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
              Filter by topic — Intelligence legends (Treemap, Portfolio, Tags, neighborhood) live here so Home
              canvases stay tall.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div
                className="inline-flex flex-wrap gap-1 rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-0.5"
                role="group"
                aria-label="Help topic group"
              >
                {GROUP_LABELS.map((item) => {
                  const active = group === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => changeGroup(item.id)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition sm:text-xs ${
                        active
                          ? "bg-violet-600/30 text-violet-100 ring-1 ring-violet-500/45"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <label className="block min-w-0 flex-1 sm:max-w-xs">
                <span className="sr-only">Search help</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter topics… e.g. patterns, portfolio"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/40 focus:outline-none"
                />
              </label>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
            <aside className="xl:sticky xl:top-6 xl:self-start">
              <V2SectionTitle>Topics{visible.length !== SECTIONS.length ? ` · ${visible.length}` : ""}</V2SectionTitle>
              {visible.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-600">No topics match. Clear search or switch group.</p>
              ) : (
                <HelpNav sections={visible} activeId={activeNav} onSelect={selectTopic} />
              )}
              <p className="mt-6 hidden text-xs text-zinc-600 xl:block">
                Extended reference: <span className="text-zinc-500">md/argus/how-argus-works.md</span>
              </p>
            </aside>

            <div className="space-y-4">
              {visible.length === 0 ? (
                <V2Card className="p-5">
                  <p className="text-sm text-zinc-500">No help topics match this filter.</p>
                </V2Card>
              ) : (
                visible.map((section) => <HelpSectionBlock key={section.id} section={section} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
