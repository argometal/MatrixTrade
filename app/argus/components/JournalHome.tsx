"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Entity, Log } from "@/lib/argus/types";
import { ENTITY_TYPE_LABELS } from "@/lib/argus/labels";
import { createLogAction } from "@/app/argus/actions";
import { MemoryComposer, type CaptureIntent } from "./MemoryComposer";
import { MemoryStreamRow } from "./MemoryStreamRow";
import type { EntityPickerBuckets } from "./EntityPicker";

function Section({
  id,
  label,
  children,
  empty,
  action,
}: {
  id?: string;
  label: string;
  children: React.ReactNode;
  empty?: boolean;
  action?: React.ReactNode;
}) {
  if (empty) return null;
  return (
    <section id={id} className="mt-8 first:mt-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-600">{label}</h2>
        {action}
      </div>
      <div className="divide-y divide-zinc-800/50">{children}</div>
    </section>
  );
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left text-[14px] font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900"
    >
      {label}
    </button>
  );
}

function EntityPreviewRow({ entity }: { entity: Entity }) {
  return (
    <Link
      href={`/argus/network/${entity.id}`}
      className="group block py-3 transition"
    >
      <p className="text-[15px] font-medium text-zinc-100 group-hover:text-teal-50">{entity.name}</p>
      <p className="mt-0.5 text-[11px] text-zinc-600">{ENTITY_TYPE_LABELS[entity.type]}</p>
    </Link>
  );
}

export function JournalHome({
  openCases,
  recentEvidence,
  needsClassification,
  upcomingFollowUps,
  recentEntities,
  entities,
  buckets,
}: {
  openCases: Log[];
  recentEvidence: Log[];
  needsClassification: Log[];
  upcomingFollowUps: Log[];
  recentEntities: Entity[];
  entities: Entity[];
  buckets: EntityPickerBuckets;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intentParam = searchParams.get("intent");
  const captureIntent: CaptureIntent | null =
    intentParam === "case" || intentParam === "evidence" || intentParam === "event" || intentParam === "log"
      ? intentParam
      : searchParams.get("capture") === "1"
        ? "log"
        : null;

  const [composerOpen, setComposerOpen] = useState(Boolean(captureIntent));
  const [composerIntent, setComposerIntent] = useState<CaptureIntent>(captureIntent ?? "log");

  useEffect(() => {
    if (captureIntent) {
      setComposerIntent(captureIntent);
      setComposerOpen(true);
    }
  }, [captureIntent]);

  const openComposer = useCallback((intent: CaptureIntent) => {
    setComposerIntent(intent);
    setComposerOpen(true);
  }, []);

  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    if (searchParams.get("capture") || searchParams.get("intent")) {
      router.replace("/argus/journal");
    }
  }, [router, searchParams]);

  const scrollToOpenItems = useCallback(() => {
    const target =
      document.getElementById("needs-classification") ?? document.getElementById("open-cases");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const hasContent =
    openCases.length > 0 ||
    recentEvidence.length > 0 ||
    needsClassification.length > 0 ||
    upcomingFollowUps.length > 0 ||
    recentEntities.length > 0;

  return (
    <>
      {!composerOpen && (
        <>
          <p className="mb-5 text-[15px] text-zinc-500">What are you tracking?</p>

          <div className="grid grid-cols-2 gap-2">
            <ActionButton label="New case" onClick={() => openComposer("case")} />
            <ActionButton label="Add evidence" onClick={() => openComposer("evidence")} />
            <ActionButton label="Log event" onClick={() => openComposer("event")} />
            <ActionButton label="Review open items" onClick={scrollToOpenItems} />
          </div>
        </>
      )}

      {composerOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-zinc-950 px-5 pb-8 pt-16">
          <MemoryComposer
            action={createLogAction}
            buckets={buckets}
            intent={composerIntent}
            onCancel={closeComposer}
            variant="sheet"
            autoFocus
          />
        </div>
      )}

      {!hasContent && !composerOpen && (
        <p className="py-16 text-center text-[15px] leading-relaxed text-zinc-600">
          No open investigations yet.
          <br />
          <span className="text-zinc-500">Start with New case or Add evidence.</span>
        </p>
      )}

      <Section id="open-cases" label="Open cases" empty={openCases.length === 0}>
        {openCases.map((log) => (
          <MemoryStreamRow key={log.id} log={log} entities={entities} />
        ))}
      </Section>

      <Section id="needs-classification" label="Needs classification" empty={needsClassification.length === 0}>
        {needsClassification.map((log) => (
          <MemoryStreamRow key={log.id} log={log} entities={entities} accent="amber" />
        ))}
      </Section>

      <Section label="Recent evidence" empty={recentEvidence.length === 0}>
        {recentEvidence.map((log) => (
          <MemoryStreamRow key={log.id} log={log} entities={entities} />
        ))}
      </Section>

      <Section label="Upcoming follow-ups" empty={upcomingFollowUps.length === 0}>
        {upcomingFollowUps.map((log) => (
          <MemoryStreamRow key={log.id} log={log} entities={entities} />
        ))}
      </Section>

      <Section
        label="People / Entities"
        empty={recentEntities.length === 0}
        action={
          <Link href="/argus/network" className="text-[11px] text-teal-500/90 hover:text-teal-400">
            View all
          </Link>
        }
      >
        {recentEntities.map((entity) => (
          <EntityPreviewRow key={entity.id} entity={entity} />
        ))}
      </Section>
    </>
  );
}
