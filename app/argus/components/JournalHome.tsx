"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Entity, EntityType, Log } from "@/lib/argus/types";
import { ENTITY_TYPE_LABELS } from "@/lib/argus/labels";
import {
  ARGUS_TAGLINE,
  CONTACTS,
  HOME_ACTIONS,
  HOME_EMPTY,
  HOME_PROMPT,
  HOME_SECTIONS,
} from "@/lib/argus/ux-copy";
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

function ContactsStrip({
  hasEntities,
  onCreate,
}: {
  hasEntities: boolean;
  onCreate: (type: EntityType) => void;
}) {
  return (
    <div className="mb-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-600">
          {HOME_SECTIONS.contacts}
        </h2>
        <Link href="/argus/network" className="text-[11px] text-teal-500/90 hover:text-teal-400">
          {CONTACTS.search}
        </Link>
      </div>
      {!hasEntities ? (
        <div className="space-y-2">
          <p className="text-[13px] text-zinc-500">{CONTACTS.emptyNetworkHint}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <ActionButton label={CONTACTS.createFirst} onClick={() => onCreate("person")} />
            <ActionButton label={CONTACTS.createPerson} onClick={() => onCreate("person")} />
            <ActionButton label={CONTACTS.createOrganization} onClick={() => onCreate("company")} />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <ActionButton label={CONTACTS.quickCreate} onClick={() => onCreate("person")} />
          <ActionButton label={CONTACTS.createOrganization} onClick={() => onCreate("company")} />
        </div>
      )}
    </div>
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
  const createEntityParam = searchParams.get("createEntity");
  const captureIntent: CaptureIntent | null =
    intentParam === "case" || intentParam === "evidence" || intentParam === "event" || intentParam === "log"
      ? intentParam
      : searchParams.get("capture") === "1"
        ? "log"
        : null;

  const initialEntityType: EntityType | undefined =
    createEntityParam === "person" ||
    createEntityParam === "company" ||
    createEntityParam === "project" ||
    createEntityParam === "other"
      ? createEntityParam
      : undefined;

  const openEntityPanel = searchParams.get("panel") === "entity" || Boolean(initialEntityType);

  const [composerOpen, setComposerOpen] = useState(Boolean(captureIntent) || openEntityPanel);
  const [composerIntent, setComposerIntent] = useState<CaptureIntent>(captureIntent ?? "log");

  useEffect(() => {
    if (captureIntent) {
      setComposerIntent(captureIntent);
      setComposerOpen(true);
    }
  }, [captureIntent]);

  useEffect(() => {
    if (openEntityPanel) setComposerOpen(true);
  }, [openEntityPanel]);

  const openComposer = useCallback((intent: CaptureIntent) => {
    setComposerIntent(intent);
    setComposerOpen(true);
  }, []);

  const openCreateContact = useCallback(
    (type: EntityType) => {
      setComposerIntent("log");
      setComposerOpen(true);
      router.replace(`/argus/journal?capture=1&intent=log&panel=entity&createEntity=${type}`);
    },
    [router]
  );

  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    if (searchParams.get("capture") || searchParams.get("intent") || searchParams.get("panel")) {
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

  const hasEntities = entities.length > 0;

  return (
    <>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600">{ARGUS_TAGLINE}</p>

      {!composerOpen && (
        <>
          <p className="mb-4 text-[15px] text-zinc-500">{HOME_PROMPT}</p>

          <div className="grid grid-cols-2 gap-2">
            <ActionButton label={HOME_ACTIONS.newItem} onClick={() => openComposer("case")} />
            <ActionButton label={HOME_ACTIONS.addDocument} onClick={() => openComposer("evidence")} />
            <ActionButton label={HOME_ACTIONS.recordUpdate} onClick={() => openComposer("event")} />
            <ActionButton label={HOME_ACTIONS.reviewPending} onClick={scrollToOpenItems} />
          </div>

          <ContactsStrip hasEntities={hasEntities} onCreate={openCreateContact} />
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
            autoFocus={!openEntityPanel}
            initialPanel={openEntityPanel ? "entity" : "none"}
            initialQuickCreateType={initialEntityType}
          />
        </div>
      )}

      {!hasContent && !composerOpen && (
        <p className="py-12 text-center text-[15px] leading-relaxed text-zinc-600">
          {HOME_EMPTY.title}
          <br />
          <span className="text-zinc-500">{HOME_EMPTY.hint}</span>
        </p>
      )}

      <Section id="open-cases" label={HOME_SECTIONS.openItems} empty={openCases.length === 0}>
        {openCases.map((log) => (
          <MemoryStreamRow key={log.id} log={log} entities={entities} />
        ))}
      </Section>

      <Section id="needs-classification" label={HOME_SECTIONS.needsReview} empty={needsClassification.length === 0}>
        {needsClassification.map((log) => (
          <MemoryStreamRow key={log.id} log={log} entities={entities} accent="amber" />
        ))}
      </Section>

      <Section label={HOME_SECTIONS.recentDocuments} empty={recentEvidence.length === 0}>
        {recentEvidence.map((log) => (
          <MemoryStreamRow key={log.id} log={log} entities={entities} />
        ))}
      </Section>

      <Section label={HOME_SECTIONS.upcomingFollowUps} empty={upcomingFollowUps.length === 0}>
        {upcomingFollowUps.map((log) => (
          <MemoryStreamRow key={log.id} log={log} entities={entities} />
        ))}
      </Section>

      <Section
        label={HOME_SECTIONS.recentContacts}
        empty={recentEntities.length === 0}
        action={
          <Link href="/argus/network" className="text-[11px] text-teal-500/90 hover:text-teal-400">
            View all
          </Link>
        }
      >
        {recentEntities.length === 0 ? (
          <p className="py-4 text-[13px] text-zinc-500">
            {CONTACTS.emptyNetwork}.{" "}
            <button
              type="button"
              onClick={() => openCreateContact("person")}
              className="text-teal-500 underline hover:text-teal-400"
            >
              {CONTACTS.createFirst}
            </button>
          </p>
        ) : (
          recentEntities.map((entity) => <EntityPreviewRow key={entity.id} entity={entity} />)
        )}
      </Section>
    </>
  );
}
