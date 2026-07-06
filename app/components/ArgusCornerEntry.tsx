"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArgusMark } from "@/app/components/ArgusMark";

export function ArgusCornerEntry() {
  const pathname = usePathname();
  if (pathname.startsWith("/argus")) return null;

  return (
    <Link
      href="/argus/journal"
      title="ARGUS"
      aria-label="Open ARGUS journal"
      className="group fixed right-4 top-4 z-[100] rounded-xl shadow-lg shadow-zinc-900/10 transition hover:scale-105 hover:shadow-teal-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 sm:right-6 sm:top-6"
    >
      <ArgusMark />
      <span className="pointer-events-none absolute -bottom-7 right-0 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-medium tracking-wide text-teal-300 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        ARGUS
      </span>
    </Link>
  );
}
