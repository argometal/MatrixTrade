"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { Entity, Log } from "@/lib/argus/types";
import { createLogAction } from "@/app/argus/actions";
import { MemoryComposer } from "./MemoryComposer";
import { MemoryStreamRow } from "./MemoryStreamRow";
import type { EntityPickerBuckets } from "./EntityPicker";

function StreamBlock({
  label,
  children,
  empty,
}: {
  label?: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) return null;
  return (
    <section className="mt-8 first:mt-0">
      {label && (
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-600">{label}</h2>
      )}
      <div className="divide-y divide-zinc-800/50">{children}</div>
    </section>
  );
}

export function JournalHome({
  memoryStream,
  needsClassification,
  upcomingReminders,
  entities,
  buckets,
}: {
  memoryStream: Log[];
  upcomingReminders: Log[];
  needsClassification: Log[];
  entities: Entity[];
  buckets: EntityPickerBuckets;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [composerOpen, setComposerOpen] = useState(searchParams.get("capture") === "1");

  const openComposer = useCallback(() => setComposerOpen(true), []);
  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    if (searchParams.get("capture")) router.replace("/argus/journal");
  }, [router, searchParams]);

  const hasStream =
    memoryStream.length > 0 || needsClassification.length > 0 || upcomingReminders.length > 0;

  return (
    <>
      {!composerOpen && (
        <button
          type="button"
          onClick={openComposer}
          className="mb-8 w-full rounded-2xl bg-zinc-900/40 px-5 py-5 text-left transition hover:bg-zinc-900/70"
        >
          <span className="text-[17px] text-zinc-600">Remember something...</span>
        </button>
      )}

      {composerOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-zinc-950 px-5 pb-8 pt-16">
          <MemoryComposer
            action={createLogAction}
            buckets={buckets}
            onCancel={closeComposer}
            variant="sheet"
            autoFocus
          />
        </div>
      )}

      {!hasStream && !composerOpen && (
        <p className="py-16 text-center text-[15px] leading-relaxed text-zinc-600">
          Your memory stream is empty.
          <br />
          <span className="text-zinc-500">Tap above and write — nothing else required.</span>
        </p>
      )}

      <StreamBlock label="Needs classification" empty={needsClassification.length === 0}>
        {needsClassification.map((log) => (
          <MemoryStreamRow key={log.id} log={log} entities={entities} accent="amber" />
        ))}
      </StreamBlock>

      <StreamBlock label="Upcoming" empty={upcomingReminders.length === 0}>
        {upcomingReminders.map((log) => (
          <MemoryStreamRow key={log.id} log={log} entities={entities} />
        ))}
      </StreamBlock>

      <StreamBlock label={hasStream && needsClassification.length + upcomingReminders.length > 0 ? "Recent" : undefined} empty={memoryStream.length === 0}>
        {memoryStream.map((log) => (
          <MemoryStreamRow key={log.id} log={log} entities={entities} />
        ))}
      </StreamBlock>
    </>
  );
}
