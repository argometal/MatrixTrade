"use client";

import { V2Card } from "@/app/argus/v2/components/v2-ui";
import { NetworkConversationPlaybook } from "./NetworkConversationPlaybook";

export function NetworkDialogueGuide({
  entityName,
  email,
  linkedIn,
}: {
  entityName: string;
  email: string | null;
  linkedIn: string | null;
}) {
  return (
    <section className="space-y-4">
      <V2Card className="border-violet-500/20 bg-violet-950/15 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400/90">Start the dialogue</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-50">Contact before evaluation</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Five minutes can be enough. The point is value — not a long interview. With {entityName}, open a real
          conversation when you can; use the playbook below if you need a discreet cheat sheet.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {email ? (
            <a
              href={`mailto:${email}`}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Email
            </a>
          ) : null}
          {linkedIn ? (
            <a
              href={linkedIn}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              LinkedIn
            </a>
          ) : null}
        </div>
      </V2Card>

      <NetworkConversationPlaybook personName={entityName} />
    </section>
  );
}

export { networkConversationNoteTemplate } from "@/lib/argus/network-dialogue";
