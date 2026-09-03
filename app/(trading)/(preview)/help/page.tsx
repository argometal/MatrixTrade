import Link from "next/link";
import { PAGE_HELP, type PageHelpId } from "@/lib/page-help";
import { mxtPath } from "@/lib/mxt-paths";
import { PageHelpPanel } from "@/app/components/preview/PageHelpPanel";

const TOPIC_HREFS: Partial<Record<PageHelpId, string>> = {
  dashboard: mxtPath("/home-preview"),
  trades: mxtPath("/trades"),
  insights: `${mxtPath("/stats")}?tab=pipeline`,
  planning: mxtPath("/scout"),
  scouting: mxtPath("/scout"),
  playbook: mxtPath("/playbook"),
  inbox: mxtPath("/inbox"),
};

const TOPIC_ORDER: PageHelpId[] = [
  "insights",
  "planning",
  "scouting",
  "trades",
  "playbook",
  "dashboard",
  "inbox",
];

/**
 * MXT Help index — same product family pattern as Argus System → Help.
 * Contextual ? Help remains on individual pages via PageHelpPanel.
 */
export default function MxtHelpPage() {
  return (
    <PageHelpPanel pageId="insights">
      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-6" data-mxt-help-index>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Help
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          MXT help topics. Use the ? Help control on each page for contextual
          guidance. Learning lives inside Insights → Pipeline Performance.
        </p>
        <ul className="mt-8 space-y-3">
          {TOPIC_ORDER.map((id) => {
            const help = PAGE_HELP[id];
            const href = TOPIC_HREFS[id];
            return (
              <li
                key={id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {help.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      {help.summary}
                    </p>
                  </div>
                  {href ? (
                    <Link
                      href={href}
                      className="shrink-0 text-xs text-violet-400 hover:text-violet-300 hover:underline"
                    >
                      Open
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </PageHelpPanel>
  );
}
