"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { V2EntityCreateButton, V2EntityLinkButton } from "./V2CreateEntityButton";
import { V2Badge, V2Card } from "./v2-ui";
import { V2TagPatternBadges } from "./V2TagPatternBadges";
import type { TagPattern } from "@/lib/argus/v2/tag-patterns";

type LinkPerson = { id: string; name: string; subtitle?: string; href: string };
type LinkProject = { id: string; name: string; href: string; meta?: string };

export function V2EntityLinksTab({
  entityId,
  linkedIds,
  people,
  projects,
  organizations,
  topics,
  eventsCount,
  tagPatterns,
  manualTags,
  tagHref,
}: {
  entityId: string;
  linkedIds: string[];
  people: LinkPerson[];
  projects?: LinkProject[];
  organizations?: LinkProject[];
  topics: string[];
  eventsCount: number;
  tagPatterns: TagPattern[];
  manualTags: string[];
  tagHref?: (tag: string) => string;
}) {
  const allTags = [...new Set([...manualTags, ...topics])];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <V2EntityLinkButton
          entityId={entityId}
          linkedIds={linkedIds}
          className="rounded-xl border border-violet-500/40 bg-violet-600/15 px-4 py-2 text-sm font-semibold text-violet-300 hover:bg-violet-600/25"
        />
        <V2EntityCreateButton className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <LinksColumn title="People">
          {people.length === 0 ? (
            <EmptyLinks />
          ) : (
            <ul className="space-y-2">
              {people.map((person) => (
                <li key={person.id}>
                  <Link href={person.href} className="text-sm text-violet-400 hover:text-violet-300">
                    {person.name}
                    {person.subtitle ? <span className="text-zinc-600"> · {person.subtitle}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </LinksColumn>

        {organizations ? (
          <LinksColumn title="Organizations">
            {organizations.length === 0 ? (
              <EmptyLinks />
            ) : (
              <ul className="space-y-2">
                {organizations.map((org) => (
                  <li key={org.id}>
                    <Link href={org.href} className="text-sm text-violet-400 hover:text-violet-300">
                      {org.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </LinksColumn>
        ) : null}

        {projects ? (
          <LinksColumn title="Projects">
            {projects.length === 0 ? (
              <EmptyLinks />
            ) : (
              <ul className="space-y-2">
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link href={project.href} className="text-sm text-violet-400 hover:text-violet-300">
                      {project.name}
                      {project.meta ? <span className="text-zinc-600"> · {project.meta}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </LinksColumn>
        ) : null}

        <LinksColumn title="Topics">
          {topics.length === 0 ? (
            <EmptyLinks />
          ) : (
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <V2Badge key={topic} tone="purple">
                  {topic}
                </V2Badge>
              ))}
            </div>
          )}
        </LinksColumn>

        <LinksColumn title="Events">
          {eventsCount === 0 ? (
            <EmptyLinks />
          ) : (
            <p className="text-sm text-zinc-300">
              {eventsCount} linked event{eventsCount === 1 ? "" : "s"} ·{" "}
              <Link href="/argus/v2/browse/events" className="text-violet-400 hover:text-violet-300">
                Browse
              </Link>
            </p>
          )}
        </LinksColumn>

        <V2Card className="p-4 lg:col-span-2 xl:col-span-3">
          <h3 className="mb-1 text-sm font-semibold text-zinc-100">Tags</h3>
          <p className="mb-4 text-[11px] text-zinc-600">Labels and patterns from links and evidence.</p>
          {tagPatterns.length > 0 ? (
            <V2TagPatternBadges patterns={tagPatterns} className="mb-4" tagHref={tagHref} />
          ) : null}
          {allTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag, index) => (
                <V2Badge key={tag} tone={index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "purple"}>
                  {tag}
                </V2Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-600">No tags yet. Link topics or add labels on the record.</p>
          )}
        </V2Card>
      </div>
    </div>
  );
}

function LinksColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <V2Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-100">{title}</h3>
      {children}
    </V2Card>
  );
}

function EmptyLinks() {
  return <p className="text-sm text-zinc-600">None linked yet.</p>;
}
