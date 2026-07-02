"use client";

import { useState } from "react";

export function AttachmentField() {
  const [name, setName] = useState("");

  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-zinc-600">Attach</span>
      <input
        name="attachment"
        type="file"
        accept="*/*"
        onChange={(e) => setName(e.target.files?.[0]?.name ?? "")}
        className="mt-2 block w-full text-[13px] text-zinc-500 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-[13px] file:text-zinc-300"
      />
      {name && <span className="mt-1 block text-[12px] text-zinc-600">{name}</span>}
    </label>
  );
}
