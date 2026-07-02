"use client";

import { useState } from "react";
import { inputClass } from "./ui";

type AttachmentMode = "file" | "inbox" | "email" | "image" | "pdf";

const MODES: { id: AttachmentMode; label: string; available: boolean }[] = [
  { id: "file", label: "Upload file", available: true },
  { id: "inbox", label: "Inbox evidence", available: false },
  { id: "email", label: "Email", available: false },
  { id: "image", label: "Image", available: false },
  { id: "pdf", label: "PDF", available: false },
];

export function AttachmentField() {
  const [mode, setMode] = useState<AttachmentMode>("file");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={!m.available}
            onClick={() => m.available && setMode(m.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              mode === m.id && m.available
                ? "bg-teal-600/30 text-teal-300"
                : m.available
                  ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  : "cursor-not-allowed bg-zinc-900 text-zinc-600"
            }`}
          >
            {m.label}
            {!m.available && <span className="ml-1 opacity-60">soon</span>}
          </button>
        ))}
      </div>
      {mode === "file" && (
        <input name="attachment" type="file" className={inputClass} accept="*/*" />
      )}
    </div>
  );
}
