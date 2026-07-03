"use client";

import { useState } from "react";

export function ShowQrPanel({
  qrDataUrl,
  caption,
  url,
}: {
  qrDataUrl: string;
  caption: string;
  url: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        {open ? "Hide QR" : "Show QR"}
      </button>
      {open && (
        <div className="flex flex-col items-center rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:max-w-xs">
          <p className="mb-3 text-center text-sm text-zinc-600">{caption}</p>
          <div className="rounded-md border border-zinc-200 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={caption}
              width={220}
              height={220}
              className="block h-[220px] w-[220px]"
            />
          </div>
          <p className="mt-3 break-all text-center font-mono text-xs text-zinc-500">{url}</p>
        </div>
      )}
    </div>
  );
}
