"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function ArgusMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="argus-ring" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="argus-a" x1="14" y1="12" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5eead4" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#18181b" stroke="url(#argus-ring)" strokeWidth="1.25" />
      <path
        d="M12.5 27.5L20 13l7.5 14.5"
        stroke="url(#argus-a)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15.25 22h9.5" stroke="url(#argus-a)" strokeWidth="2.75" strokeLinecap="round" />
      <circle cx="20" cy="13" r="1.25" fill="#2dd4bf" opacity="0.9" />
    </svg>
  );
}

function isPreviewRoute(pathname: string): boolean {
  return pathname.startsWith("/home-preview") || pathname.startsWith("/trades-preview");
}

export function ArgusCornerEntry() {
  const pathname = usePathname();
  if (pathname.startsWith("/argus")) return null;

  const preview = isPreviewRoute(pathname);

  return (
    <Link
      href="/argus/journal"
      title="ARGUS"
      aria-label="Open ARGUS journal"
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
