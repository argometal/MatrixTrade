"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function TradingMark({ size = 40 }: { size?: number }) {
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
        <linearGradient id="mt-ring" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a1a1aa" />
          <stop offset="1" stopColor="#52525b" />
        </linearGradient>
        <linearGradient id="mt-line" x1="10" y1="28" x2="30" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fafafa" />
          <stop offset="1" stopColor="#a1a1aa" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#18181b" stroke="url(#mt-ring)" strokeWidth="1.25" />
      <path
        d="M11 27L17 20L22 24L29 13"
        stroke="url(#mt-line)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="29" cy="13" r="2" fill="#fafafa" />
    </svg>
  );
}

export function TradingCornerEntry() {
  const pathname = usePathname();
  if (!pathname.startsWith("/argus")) return null;

  return (
    <Link
      href="/home-preview"
      title="MatrixTrade"
      aria-label="Back to MatrixTrade"
      className="group fixed right-4 top-4 z-50 rounded-xl shadow-lg shadow-black/30 transition hover:scale-105 hover:shadow-zinc-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:right-6 sm:top-6"
    >
      <TradingMark />
      <span className="pointer-events-none absolute -bottom-7 right-0 whitespace-nowrap rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-800 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        Trading
      </span>
    </Link>
  );
}
