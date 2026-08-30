"use client";

import type { ReactNode } from "react";
import { matrixTradeHref } from "@/lib/ecosystem-urls";

/**
 * MTA-scoped operational panels inside the ArgusForge shell.
 * Cross-product links are absolute URLs to the MatriXTrade host (env-configurable).
 */
export function MtaScopedPanel({
  section,
}: {
  section: "home" | "library" | "active" | "archive";
}) {
  if (section === "home") {
    return (
      <ScopedShell
        title="MTA · Overview"
        blurb="Trading operational domain. ArgusForge and MTA objects stay separate."
      >
        <LinkCard href={matrixTradeHref("/home-preview")} title="Situation Room" hint="MTA dashboard" />
        <LinkCard href={matrixTradeHref("/trades")} title="Trades" hint="Open and closed trades" />
        <LinkCard href={matrixTradeHref("/stats")} title="Stats" hint="Performance & journal tabs" />
        <LinkCard href={matrixTradeHref("/inbox")} title="Inbox" hint="History / intake" />
      </ScopedShell>
    );
  }

  if (section === "library") {
    return (
      <ScopedShell
        title="MTA · Library"
        blurb="Browse MTA reference surfaces — not ArgusForge Chaos Decks."
      >
        <LinkCard
          href={matrixTradeHref("/stock-theses/new")}
          title="Stock Files"
          hint="New thesis / stock file"
        />
        <LinkCard href={matrixTradeHref("/planning")} title="Planning" hint="Scouting & proposals hub" />
        <LinkCard href={matrixTradeHref("/playbook")} title="Playbook" hint="Playbook library" />
        <LinkCard href={matrixTradeHref("/journal")} title="Journal" hint="Trading journal" />
      </ScopedShell>
    );
  }

  if (section === "active") {
    return (
      <ScopedShell
        title="MTA · Active"
        blurb="Working set: open trades, review queue, live planning — existing MTA routes only."
      >
        <LinkCard href={matrixTradeHref("/trades")} title="Open trades" hint="Active trade workspace" />
        <LinkCard
          href={matrixTradeHref("/trades?tab=review")}
          title="Review queue"
          hint="Pending reviews"
        />
        <LinkCard
          href={matrixTradeHref("/planning")}
          title="Scouting Desk"
          hint="Active proposals / planning"
        />
        <LinkCard
          href={matrixTradeHref("/home-preview")}
          title="Needs attention"
          hint="Situation Room attention"
        />
      </ScopedShell>
    );
  }

  return (
    <ScopedShell
      title="MTA · Archive"
      blurb="Closed / preserved MTA material — not deletion. No ArgusForge archive mix."
    >
      <LinkCard
        href={matrixTradeHref("/trades")}
        title="Closed trades"
        hint="Use trades workspace filters"
      />
      <LinkCard
        href={matrixTradeHref("/stats?tab=journal")}
        title="Journal archive"
        hint="Historical journal"
      />
      <LinkCard
        href={matrixTradeHref("/stats?tab=mistakes")}
        title="Mistakes"
        hint="Preserved mistake log"
      />
      <LinkCard href={matrixTradeHref("/playbook")} title="Playbooks" hint="Stored playbook definitions" />
    </ScopedShell>
  );
}

function ScopedShell({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-bold text-zinc-50">{title}</h2>
        <p className="text-xs text-zinc-500">{blurb}</p>
      </header>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function LinkCard({ href, title, hint }: { href: string; title: string; hint: string }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-14 flex-col justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        <span className="font-semibold text-zinc-100">{title}</span>
        <span className="text-xs text-zinc-500">{hint}</span>
      </a>
    </li>
  );
}
