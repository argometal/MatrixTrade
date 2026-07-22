"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppCornerDock } from "@/app/components/AppCornerDock";
import { ArgusMark } from "@/app/components/ArgusMark";

/** MtA routes only — hidden while already inside Argus. */
export function ArgusCornerEntry() {
  const pathname = usePathname();
  if (pathname.startsWith("/argus")) return null;

  return (
    <AppCornerDock bellHref="/inbox" bellLabel="MtA inbox" placement="matrix">
      <Link
        href="/argus/v2"
        title="ARGUS"
        aria-label="Open ARGUS"
        className="group relative shrink-0 rounded-xl shadow-lg shadow-black/30 transition hover:scale-105 hover:shadow-teal-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        <ArgusMark />
        <span className="pointer-events-none absolute -bottom-7 right-0 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-medium tracking-wide text-teal-300 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          ARGUS
        </span>
      </Link>
    </AppCornerDock>
  );
}
