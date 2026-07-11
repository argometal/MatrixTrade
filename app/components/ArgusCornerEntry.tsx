"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArgusMark } from "@/app/components/ArgusMark";

function isPreviewRoute(pathname: string): boolean {
  return pathname.startsWith("/home-preview") || pathname.startsWith("/trades-preview");
}

export function ArgusCornerEntry() {
  const pathname = usePathname();
  if (pathname.startsWith("/argus")) return null;

  const preview = isPreviewRoute(pathname);

  return (
    <Link
      href="/argus/v2"
      title="ARGUS"
      aria-label="Open ARGUS"
      className={`group fixed right-4 z-[60] rounded-xl shadow-lg transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 sm:right-6 ${
        preview
          ? "top-14 shadow-black/40 hover:shadow-teal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 lg:top-6"
          : "top-4 shadow-zinc-900/10 hover:shadow-teal-500/20 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 sm:top-6"
      }`}
    >
      <ArgusMark />
      <span className="pointer-events-none absolute -bottom-7 right-0 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-medium tracking-wide text-teal-300 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        ARGUS
      </span>
    </Link>
  );
}
