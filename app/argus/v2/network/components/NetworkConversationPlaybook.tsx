"use client";

import { useState } from "react";
import {
  NETWORK_CONVERSATION_PLAYBOOK,
  networkConversationNoteTemplate,
} from "@/lib/argus/network-dialogue";

export function NetworkConversationPlaybook({
  personName,
  compact = false,
}: {
  personName?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div
      className={`rounded-xl border border-zinc-800/80 bg-zinc-950/50 ${
        compact ? "text-[12px]" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block text-xs font-semibold text-zinc-200">Conversation playbook</span>
          <span className="block text-[10px] text-zinc-600">
            Technique cheat sheet — optional, not an interview
          </span>
        </span>
        <span className="shrink-0 text-[11px] text-violet-300">{open ? "Hide ▲" : "Show ▼"}</span>
      </button>

      {open ? (
        <div className="border-t border-zinc-800/80 px-3.5 pb-3.5 pt-2">
          <div className="space-y-1">
            {NETWORK_CONVERSATION_PLAYBOOK.map((phase) => {
              const isExpanded = expanded === phase.id;
              return (
                <div key={phase.id} className="rounded-lg border border-zinc-800/60 bg-zinc-900/40">
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : phase.id)}
                    className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
                    aria-expanded={isExpanded}
                  >
                    <span className="text-[11px] font-medium text-zinc-300">{phase.title}</span>
                    <span className="text-[10px] text-zinc-600">{isExpanded ? "−" : "+"}</span>
                  </button>
                  {isExpanded ? (
                    <div className="border-t border-zinc-800/60 px-2.5 pb-2.5 pt-2">
                      <p className="text-[10px] text-zinc-500">{phase.when}</p>
                      <ul className="mt-1.5 space-y-1">
                        {phase.ideas.map((idea) => (
                          <li key={idea} className="text-[11px] leading-snug text-zinc-400">
                            · {idea}
                          </li>
                        ))}
                      </ul>
                      {phase.note ? (
                        <p className="mt-2 text-[10px] italic text-zinc-600">{phase.note}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { networkConversationNoteTemplate };
