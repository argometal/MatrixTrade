"use client";

import { useState } from "react";
import { V2Card, V2SectionTitle } from "@/app/argus/v2/components/v2-ui";

type HelpSection = {
  id: string;
  title: string;
  intro?: string;
  items: Array<{ title: string; body: string }>;
  tip?: string;
};

const SECTIONS: HelpSection[] = [
  {
    id: "overview",
    title: "How Argus works",
    intro:
      "Argus is an evidence organization system — not a CRM or note-taking app. You register what happened, link it to context, browse when you need the full picture, and deliver packages when someone else needs proof.",
    items: [
      {
        title: "Receive → Register → Link → Retrieve → Deliver",
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
    items: [
      {
        title: "Register",
        body: "Record what happened — a sentence is enough. Use the Register button in the top bar. Link to topics, events, or projects as you save, or classify later.",
      },
      {
        title: "Link",
        body: "Connect evidence to entities in the graph. Link is sacred — it is how Argus correlates email, files, and register entries across years.",
      },
      {
        title: "Add context",
        body: "Extend the graph with a new person, organization, project, topic, event, or runbook — then link evidence to it. Use for structure, not for writing long documents.",
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
        body: "Relationship context for contacts — follow-ups, strength signals, and linked evidence.",
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
    id: "inbox",
    title: "Inbox triage",
    items: [
      {
        title: "New",
        body: "Unprocessed evidence — email or intake not yet linked. The inbox badge counts new and in-progress items awaiting triage.",
      },
      {
        title: "Linked",
        body: "Entity links exist but triage may continue — register evidence from the email, add topics, or mark done when complete.",
      },
      {
        title: "Done",
        body: "Converted or fully processed — no longer counts toward the inbox alert. Process tab shows ranked link suggestions.",
      },
      {
        title: "Alert badges",
        body: "Sidebar and bell counts update when items move to Done, when register entries get entities or topic tags, and when follow-ups age out of the active window.",
      },
    ],
  },
  {
    id: "browse-orgs",
    title: "Organizations browse",
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
    id: "lifecycle",
    title: "Rename & archive",
    items: [
      {
        title: "Rename",
        body: "Fix the display name on organizations, projects, topics, events, and contacts — links and evidence stay intact.",
      },
      {
        title: "Archive",
        body: "Archived entities disappear from metrics, treemap, and default browse. Evidence remains — use Deliver or restore later.",
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
    id: "tags-patterns",
    title: "Tags & patterns",
    items: [
      {
        title: "Topics group — tags mark",
        body: "Topics are permanent binders. Tags are lightweight marks on individual evidence (register entry or inbox row). Topics are never flagged as a whole.",
      },
      {
        title: "Frequent tags",
        body: "The tag picker suggests the top 10 most-used tags. The home tag cloud shows 20. You can always create a new tag; unused tags drop off suggestions over time.",
      },
      {
        title: "Recurring patterns",
        body: "When the same tag appears on 3 or more evidence items in a scope — with at least one in the last 90 days — a small pattern badge appears. One-off tags are stored but not alerted.",
      },
      {
        title: "Your definitions",
        body: "You define what gap, quality, failure, or any custom tag means. Argus counts repetition and links to filtered evidence — it does not infer meaning.",
      },
    ],
  },
  {
    id: "browse-projects",
    title: "Projects browse",
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
    items: [
      {
        title: "Network",
        body: "People portfolio with relationship strength, organizations, and follow-up signals. Badge shows follow-ups due soon or recently overdue.",
      },
      {
        title: "Topics",
        body: "Knowledge binders — master-detail list with linked evidence. Badge shows register entries still needing entity or topic classification.",
      },
      {
        title: "Events",
        body: "Case anchors with linked email and register evidence — chronological detail per event.",
      },
    ],
  },
  {
    id: "deliver",
    title: "Deliver",
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

function HelpNav({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  return (
    <nav className="space-y-0.5" aria-label="Help topics">
      {SECTIONS.map((section) => (
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
  const [activeNav, setActiveNav] = useState(SECTIONS[0].id);

  return (
    <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 py-6 lg:px-8">
          <header className="mb-6">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-lg ring-1 ring-violet-500/30">
                ?
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">How Argus works</h1>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
              Central guide for verbs, entity types, browse views, inbox triage, and deliver formats.
            </p>
          </header>

          <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
            <aside className="hidden xl:block">
              <div className="sticky top-6">
                <V2SectionTitle>Topics</V2SectionTitle>
                <HelpNav
                  activeId={activeNav}
                  onSelect={(id) => {
                    setActiveNav(id);
                    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                />
                <p className="mt-6 text-xs text-zinc-600">
                  Extended reference: <span className="text-zinc-500">md/argus/how-argus-works.md</span>
                </p>
              </div>
            </aside>

            <div className="space-y-4">
              {SECTIONS.map((section) => (
                <HelpSectionBlock key={section.id} section={section} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
